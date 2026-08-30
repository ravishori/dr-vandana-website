/**
 * Phase F1-B — Option B security regression matrix.
 * Proves patient/psychologist isolation at the service layer.
 * No clinical resources.
 *
 * N/A (not exposed in Option B): patient notification inbox / cross-user
 * notification IDOR — outbox is worker-only with no user-facing retrieval API.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { cancelAppointment } from "@/lib/appointments/lifecycle";
import {
  getPatientAppointmentDetail,
  listPatientAppointments,
} from "@/lib/appointments/patient-portal";
import { listPracticeAppointments } from "@/lib/appointments/queries";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  createBookingTestWorld,
  insertTestAppointment,
} from "@/lib/appointments/test-support";
import { addMinutes } from "@/lib/appointments/timezone";
import { authorizationService } from "@/lib/identity/authorization";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { loadPrincipal } from "@/lib/identity/principal";
import { patientProfiles, sessions, users } from "@/lib/identity/schema";
import {
  createSession,
  readSession,
  revokeSession,
} from "@/lib/identity/sessions";
import {
  getPracticePatientDetail,
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import { getPracticeSettings } from "@/lib/practice/settings";
import { appointments } from "@/lib/appointments/schema";

const STRONG_PASSWORD = "correct-horse-battery";

async function psychologistPrincipal(
  ctx: Parameters<typeof createSession>[0],
  userId: string,
) {
  const created = await createSession(ctx, {
    userId,
    roles: ["PSYCHOLOGIST"],
    ip: "203.0.113.80",
    mfaCompleted: true,
  });
  const session = await readSession(ctx, created.token);
  assert.ok(session);
  return loadPrincipal(ctx, session);
}

describe("F1-B Option B security matrix", () => {
  it("enforces patient profile and appointment isolation", async () => {
    const w = await createBookingTestWorld();
    try {
      const startsAt = addMinutes(w.ctx.now(), 24 * 60);
      const appointmentId = await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt,
        endsAt: addMinutes(startsAt, 50),
      });
      const [apt] = await w.ctx.db
        .select({ publicId: appointments.publicId, version: appointments.version })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      assert.ok(apt);

      const ownProfile = authorizationService.canAccess(w.patientA.principal, {
        roles: ["PATIENT"],
        resourceType: "patient_profile",
        resourceId: w.patientA.principal.patientProfileId as string,
      });
      assert.equal(ownProfile.allowed, true);

      const [profileB] = await w.ctx.db
        .select({ id: patientProfiles.id })
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, w.patientB.userId))
        .limit(1);
      assert.ok(profileB);
      const crossProfile = authorizationService.canAccess(w.patientA.principal, {
        roles: ["PATIENT"],
        resourceType: "patient_profile",
        resourceId: profileB.id,
      });
      assert.equal(crossProfile.allowed, false);

      const ownList = await listPatientAppointments(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(ownList.ok, true);
      if (ownList.ok) {
        assert.equal(ownList.items.some((item) => item.publicId === apt.publicId), true);
      }

      const ownDetail = await getPatientAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        apt.publicId,
      );
      assert.equal(ownDetail.ok, true);

      const crossDetail = await getPatientAppointmentDetail(
        w.ctx,
        w.patientB.principal,
        apt.publicId,
      );
      assert.equal(crossDetail.ok, false);
      if (!crossDetail.ok) {
        assert.equal("appointment" in crossDetail, false);
      }

      const ownCancel = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.81",
        publicId: apt.publicId,
        expectedVersion: apt.version,
      });
      // Ownership allows the attempt; business rules may still reject (notice window).
      if (!ownCancel.ok) {
        assert.notEqual(
          "message" in ownCancel &&
            typeof ownCancel.message === "string" &&
            /not found|inaccessible/i.test(ownCancel.message),
          true,
        );
      }

      const foreignId = await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientB.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: addMinutes(w.ctx.now(), 48 * 60),
        endsAt: addMinutes(w.ctx.now(), 48 * 60 + 50),
      });
      const [foreign] = await w.ctx.db
        .select({ publicId: appointments.publicId, version: appointments.version })
        .from(appointments)
        .where(eq(appointments.id, foreignId))
        .limit(1);
      assert.ok(foreign);

      const crossCancel = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.82",
        publicId: foreign.publicId,
        expectedVersion: foreign.version,
      });
      assert.equal(crossCancel.ok, false);
      const [unchanged] = await w.ctx.db
        .select({ status: appointments.status, version: appointments.version })
        .from(appointments)
        .where(eq(appointments.id, foreignId))
        .limit(1);
      assert.equal(unchanged?.status, "CONFIRMED");
      assert.equal(unchanged?.version, foreign.version);
    } finally {
      await w.close();
    }
  });

  it("denies patient principals from practice and admin-style operations", async () => {
    const w = await createBookingTestWorld();
    try {
      const practiceList = await listPracticePatients(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(practiceList.ok, false);

      const settings = await getPracticeSettings(w.ctx, w.patientA.principal);
      assert.equal(settings.ok, false);

      const practiceAppointments = await listPracticeAppointments(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(practiceAppointments.ok, false);

      const adminConfig = authorizationService.canAccess(w.patientA.principal, {
        roles: ["SUPER_ADMIN"],
        permission: "MANAGE_SYSTEM_SETTINGS",
      });
      assert.equal(adminConfig.allowed, false);

      const clinical = authorizationService.canAccess(w.patientA.principal, {
        permission: "VIEW_PRIVATE_CLINICAL_NOTES",
      });
      assert.equal(clinical.allowed, false);
    } finally {
      await w.close();
    }
  });

  it("denies logged-out and revoked sessions from protected operations", async () => {
    const w = await createBookingTestWorld();
    try {
      // Logged-out: callers pass null principal after failed cookie/session load.
      const anonList = await listPatientAppointments(w.ctx, null, {});
      assert.equal(anonList.ok, false);
      const anonPractice = await listPracticePatients(w.ctx, null, {});
      assert.equal(anonPractice.ok, false);

      const created = await createSession(w.ctx, {
        userId: w.patientA.userId,
        roles: ["PATIENT"],
        ip: "203.0.113.83",
        mfaCompleted: true,
      });
      const live = await readSession(w.ctx, created.token);
      assert.ok(live);
      await revokeSession(w.ctx, live.sessionId);
      assert.equal(await readSession(w.ctx, created.token), null);
      // Revoked token cannot resolve a principal; protected ops deny null.
      assert.equal((await listPatientAppointments(w.ctx, null, {})).ok, false);
      assert.equal((await listPracticePatients(w.ctx, null, {})).ok, false);

      const expiredCreated = await createSession(w.ctx, {
        userId: w.patientA.userId,
        roles: ["PATIENT"],
        ip: "203.0.113.84",
        mfaCompleted: true,
      });
      await w.ctx.db
        .update(sessions)
        .set({
          absoluteExpiresAt: new Date(w.ctx.now().getTime() - 1000),
          expiresAt: new Date(w.ctx.now().getTime() - 1000),
        })
        .where(eq(sessions.id, expiredCreated.sessionId));
      assert.equal(await readSession(w.ctx, expiredCreated.token), null);
      assert.equal((await listPracticePatients(w.ctx, null, {})).ok, false);
    } finally {
      await w.close();
    }
  });

  it("enforces cross-psychologist patient isolation and tampered publicIds", async () => {
    const w = await createBookingTestWorld();
    try {
      const startsAt = addMinutes(w.ctx.now(), 24 * 60);
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt,
        endsAt: addMinutes(startsAt, 50),
      });

      const listedA = await listPracticePatients(
        w.ctx,
        w.psychologistPrincipal,
        {},
      );
      assert.equal(listedA.ok, true);
      if (!listedA.ok) {
        assert.fail("expected psychologist A patient list");
      }
      const patientAPublicId = listedA.items[0]!.publicId;

      const other = await provisionPrivilegedUser(w.ctx, {
        role: "PSYCHOLOGIST",
        email: "psych-b@example.test",
        password: STRONG_PASSWORD,
        displayName: "Psychologist B",
      });
      assert.equal(other.ok, true);
      if (!other.ok) {
        assert.fail("expected psychologist B provision");
      }
      const seededB = await seedTestPracticeConfiguration(
        w.ctx.db,
        other.userId,
        w.ctx.now(),
      );
      const psychB = await psychologistPrincipal(w.ctx, other.userId);

      await insertTestAppointment(w.ctx, {
        psychologistUserId: other.userId,
        patientUserId: w.patientB.userId,
        appointmentTypeId: seededB.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: addMinutes(w.ctx.now(), 36 * 60),
        endsAt: addMinutes(w.ctx.now(), 36 * 60 + 50),
      });

      const listedB = await listPracticePatients(w.ctx, psychB, {});
      assert.equal(listedB.ok, true);
      if (!listedB.ok) {
        assert.fail("expected psychologist B patient list");
      }
      const patientBPublicId = listedB.items[0]!.publicId;
      assert.notEqual(patientAPublicId, patientBPublicId);

      const ownOk = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        patientAPublicId,
      );
      assert.equal(ownOk.ok, true);

      const crossGet = await getPracticePatientDetail(
        w.ctx,
        psychB,
        patientAPublicId,
      );
      assert.equal(crossGet.ok, false);
      if (!crossGet.ok) {
        assert.equal("patient" in crossGet, false);
      }

      const [before] = await w.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          status: users.status,
        })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientAPublicId))
        .limit(1);
      assert.ok(before);

      const crossUpdate = await updatePracticePatientProfile(w.ctx, psychB, {
        patientPublicId: patientAPublicId,
        displayName: "Unauthorized Rename",
        status: "SUSPENDED",
      });
      assert.equal(crossUpdate.ok, false);

      const [after] = await w.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          status: users.status,
        })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientAPublicId))
        .limit(1);
      assert.equal(after?.displayName, before.displayName);
      assert.equal(after?.status, before.status);

      const [beforeB] = await w.ctx.db
        .select({ displayName: patientProfiles.displayName })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientBPublicId))
        .limit(1);

      const tampered = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: patientBPublicId,
          displayName: "Should Not Stick",
          status: "SUSPENDED",
        },
      );
      assert.equal(tampered.ok, false);

      const [afterB] = await w.ctx.db
        .select({ displayName: patientProfiles.displayName, status: users.status })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientBPublicId))
        .limit(1);
      assert.equal(afterB?.displayName, beforeB?.displayName);
      assert.notEqual(afterB?.status, "SUSPENDED");

      const validUpdate = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: patientAPublicId,
          displayName: "Authorized Rename",
          status: "ACTIVE",
        },
      );
      assert.equal(validUpdate.ok, true);
      const allowed = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        patientAPublicId,
      );
      assert.equal(allowed.ok, true);
      if (allowed.ok) {
        assert.equal(allowed.patient.displayName, "Authorized Rename");
      }
    } finally {
      await w.close();
    }
  });
});

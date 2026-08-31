import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { addMinutes } from "@/lib/appointments/timezone";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  createBookingTestWorld,
  insertTestAppointment,
} from "@/lib/appointments/test-support";
import { loadPrincipal } from "@/lib/identity/principal";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { patientProfiles, users } from "@/lib/identity/schema";
import { createSession, readSession } from "@/lib/identity/sessions";
import { getPracticeDashboardSummary } from "@/lib/practice/dashboard";
import {
  getPracticePatientDetail,
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import {
  getPracticeSettings,
  savePracticeSettings,
} from "@/lib/practice/settings";

describe("practice management (non-clinical)", () => {
  it("lists only patients with appointments for the psychologist and denies outsiders", async () => {
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

      const listed = await listPracticePatients(
        w.ctx,
        w.psychologistPrincipal,
        {},
      );
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        return;
      }
      assert.equal(listed.total, 1);
      assert.ok(listed.items[0]?.publicId.startsWith("PAT-"));

      const denied = await listPracticePatients(w.ctx, null, {});
      assert.equal(denied.ok, false);

      const patientDenied = await listPracticePatients(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(patientDenied.ok, false);

      const detail = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        listed.items[0]!.publicId,
      );
      assert.equal(detail.ok, true);
      if (detail.ok) {
        assert.equal(detail.patient.appointmentCount, 1);
      }

      const missing = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        "PAT-23456789",
      );
      assert.equal(missing.ok, false);

      const summary = await getPracticeDashboardSummary(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(summary.ok, true);
      if (summary.ok) {
        assert.equal(summary.summary.patients, 1);
        assert.equal(typeof summary.summary.completed, "number");
      }

      const updated = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: listed.items[0]!.publicId,
          displayName: "Updated Patient Name",
          status: "SUSPENDED",
        },
      );
      assert.equal(updated.ok, true);
      const after = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        listed.items[0]!.publicId,
      );
      assert.equal(after.ok, true);
      if (after.ok) {
        assert.equal(after.patient.displayName, "Updated Patient Name");
        assert.equal(after.patient.status, "SUSPENDED");
      }
    } finally {
      await w.close();
    }
  });

  it("denies a second psychologist from reading or updating an unrelated patient", async () => {
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

      const listed = await listPracticePatients(
        w.ctx,
        w.psychologistPrincipal,
        {},
      );
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        assert.fail("expected psychologist A patient list");
      }
      const patientPublicId = listed.items[0]!.publicId;

      const other = await provisionPrivilegedUser(w.ctx, {
        role: "PSYCHOLOGIST",
        email: "other-psy@example.test",
        password: "correct-horse-battery",
        displayName: "Other Psychologist",
      });
      assert.equal(other.ok, true);
      if (!other.ok) {
        assert.fail("expected second psychologist provision");
      }
      const otherSession = await createSession(w.ctx, {
        userId: other.userId,
        roles: ["PSYCHOLOGIST"],
        ip: "203.0.113.70",
        mfaCompleted: true,
      });
      const otherSessionRow = await readSession(w.ctx, otherSession.token);
      assert.ok(otherSessionRow);
      const otherPrincipal = await loadPrincipal(w.ctx, otherSessionRow);

      const deniedDetail = await getPracticePatientDetail(
        w.ctx,
        otherPrincipal,
        patientPublicId,
      );
      assert.equal(deniedDetail.ok, false);

      const [before] = await w.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          status: users.status,
        })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientPublicId))
        .limit(1);

      const deniedUpdate = await updatePracticePatientProfile(
        w.ctx,
        otherPrincipal,
        {
          patientPublicId,
          displayName: "Hijacked Name",
          status: "DISABLED",
        },
      );
      assert.equal(deniedUpdate.ok, false);

      const [after] = await w.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          status: users.status,
        })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.publicId, patientPublicId))
        .limit(1);
      assert.equal(after?.displayName, before?.displayName);
      assert.equal(after?.status, before?.status);
    } finally {
      await w.close();
    }
  });

  it("rejects tampered patientPublicId belonging to another psychologist", async () => {
    const w = await createBookingTestWorld();
    try {
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: addMinutes(w.ctx.now(), 24 * 60),
        endsAt: addMinutes(w.ctx.now(), 24 * 60 + 50),
      });

      const other = await provisionPrivilegedUser(w.ctx, {
        role: "PSYCHOLOGIST",
        email: "psy-owner-b@example.test",
        password: "correct-horse-battery",
        displayName: "Owner B",
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
      await insertTestAppointment(w.ctx, {
        psychologistUserId: other.userId,
        patientUserId: w.patientB.userId,
        appointmentTypeId: seededB.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: addMinutes(w.ctx.now(), 30 * 60),
        endsAt: addMinutes(w.ctx.now(), 30 * 60 + 50),
      });

      const [patientB] = await w.ctx.db
        .select({ publicId: users.publicId, displayName: patientProfiles.displayName })
        .from(users)
        .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
        .where(eq(users.id, w.patientB.userId))
        .limit(1);
      assert.ok(patientB);

      const listedOwn = await listPracticePatients(
        w.ctx,
        w.psychologistPrincipal,
        {},
      );
      assert.equal(listedOwn.ok, true);
      if (!listedOwn.ok) {
        assert.fail("expected psychologist A patient list");
      }

      const allowOwn = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: listedOwn.items[0]!.publicId,
          displayName: "Own Patient OK",
          status: "ACTIVE",
        },
      );
      assert.equal(allowOwn.ok, true);

      const denyForeign = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: patientB.publicId,
          displayName: "Foreign Hijack",
          status: "SUSPENDED",
        },
      );
      assert.equal(denyForeign.ok, false);

      const [stillB] = await w.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          status: users.status,
        })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.id, w.patientB.userId))
        .limit(1);
      assert.equal(stillB?.displayName, patientB.displayName);
      assert.notEqual(stillB?.status, "SUSPENDED");
    } finally {
      await w.close();
    }
  });

  it("loads and saves practice settings for the psychologist", async () => {
    const w = await createBookingTestWorld();
    try {
      const before = await getPracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(before.ok, true);
      if (!before.ok) {
        return;
      }
      assert.ok(before.settings.appointmentTypes.length >= 1);

      const form = new FormData();
      form.set("slotGranularityMinutes", "30");
      form.set("minimumNoticeMinutes", "60");
      form.set("maximumAdvanceDays", "30");
      form.set("cancellationMinimumNoticeMinutes", "120");
      for (let day = 1; day <= 7; day += 1) {
        if (day <= 5) {
          form.set(`hourActive_${day}`, "on");
        }
        form.set(`opens_${day}`, "10:00");
        form.set(`closes_${day}`, "16:00");
      }
      const saved = await savePracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
        form,
      );
      assert.equal(saved.ok, true);

      const after = await getPracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(after.ok, true);
      if (after.ok) {
        assert.equal(after.settings.minimumNoticeMinutes, 60);
        assert.equal(
          after.settings.hours.find((h) => h.dayOfWeek === 1)?.opensLocal,
          "10:00",
        );
      }
    } finally {
      await w.close();
    }
  });
});

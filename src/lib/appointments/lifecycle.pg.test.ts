import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requestAppointment } from "@/lib/appointments/booking";
import {
  completeAppointment,
  confirmAppointment,
  markAppointmentNoShow,
  rescheduleAppointment,
} from "@/lib/appointments/lifecycle";
import { appointments } from "@/lib/appointments/schema";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  activateTestPatient,
  type TestPatientActor,
} from "@/lib/appointments/test-support";
import { zonedCivilToUtc } from "@/lib/appointments/timezone";
import { seedIdentityCatalog } from "@/lib/identity/catalog";
import { loadIdentityConfig } from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import { generateUuid } from "@/lib/identity/crypto";
import {
  applyIdentityMigrationSql,
  practiceSchema,
  type IdentityDb,
} from "@/lib/identity/db";
import { createMemoryEmailService } from "@/lib/identity/email-service";
import { createOtpService, createTestOtpProvider } from "@/lib/identity/otp";
import { loadPrincipal } from "@/lib/identity/principal";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";
import { createSession, readSession } from "@/lib/identity/sessions";
import {
  TEST_MFA_KEY,
  TEST_SESSION_SECRET,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";

const url = process.env.APPOINTMENT_PG_URL;
const enabled = Boolean(url && /^postgres(ql)?:\/\//.test(url));

function ist(day: number, hour: number, minute = 0) {
  return zonedCivilToUtc({
    year: 2026,
    month: 8,
    day,
    hour,
    minute,
    second: 0,
  });
}

describe("phase 2D postgres lifecycle concurrency", { skip: !enabled }, () => {
  let admin: ReturnType<typeof postgres>;
  let sqlA: ReturnType<typeof postgres>;
  let sqlB: ReturnType<typeof postgres>;
  let ctxA: IdentityContext;
  let ctxB: IdentityContext;
  let appointmentTypePublicId = "";
  let psychologistPrincipal: AuthorizationPrincipal;
  let patientA: TestPatientActor;
  let patientB: TestPatientActor;

  before(async () => {
    if (!url) {
      return;
    }
    admin = postgres(url, { max: 1, prepare: false });
    await admin.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    await applyIdentityMigrationSql((statement) => admin.unsafe(statement));
    const db = drizzle(admin, { schema: practiceSchema }) as IdentityDb;
    let nowMs = Date.UTC(2026, 7, 14, 9, 0, 0);
    const config = loadIdentityConfig({
      nodeEnv: "test",
      sessionSecret: TEST_SESSION_SECRET,
      mfaEncryptionKey: TEST_MFA_KEY,
      otpProvider: "test",
      appBaseUrl: "http://localhost:3000",
      registrationEnabled: true,
      identityProvisionEnabled: true,
      databaseUrl: url,
    });
    await seedIdentityCatalog(db, new Date(nowMs));
    const email = createMemoryEmailService();
    const otpProvider = createTestOtpProvider();
    const rateLimit = createMemoryRateLimiter();
    const base = {
      db,
      config,
      now: () => new Date(nowMs),
      email,
      rateLimit,
    };
    const seedCtx: IdentityContext = {
      ...base,
      otp: createOtpService(base, otpProvider),
    };
    const world: IdentityTestWorld = {
      ctx: seedCtx,
      email,
      otpProvider,
      advanceMs(ms: number) {
        nowMs += ms;
      },
      async close() {
        /* connections closed in after() */
      },
    };
    const psychologist = await provisionPrivilegedUser(seedCtx, {
      role: "PSYCHOLOGIST",
      email: "vandana-lifecycle@example.test",
      password: "correct-horse-battery",
      displayName: "Dr. Vandana Rajiv Chaudhary",
    });
    if (!psychologist.ok) {
      throw new Error("psychologist_provision_failed");
    }
    const seeded = await seedTestPracticeConfiguration(
      db,
      psychologist.userId,
      seedCtx.now(),
    );
    appointmentTypePublicId = seeded.appointmentTypePublicId;
    const session = await createSession(seedCtx, {
      userId: psychologist.userId,
      roles: ["PSYCHOLOGIST"],
      mfaCompleted: true,
    });
    const loaded = await readSession(seedCtx, session.token);
    assert.ok(loaded);
    psychologistPrincipal = await loadPrincipal(seedCtx, loaded);
    patientA = await activateTestPatient(world, "pg-life-a@example.test", "9876543230");
    patientB = await activateTestPatient(world, "pg-life-b@example.test", "9876543231");
    sqlA = postgres(url, { max: 1, prepare: false });
    sqlB = postgres(url, { max: 1, prepare: false });
    ctxA = { ...seedCtx, db: drizzle(sqlA, { schema: practiceSchema }) as IdentityDb };
    ctxB = { ...seedCtx, db: drizzle(sqlB, { schema: practiceSchema }) as IdentityDb };
  });

  after(async () => {
    await sqlA?.end({ timeout: 5 });
    await sqlB?.end({ timeout: 5 });
    await admin?.end({ timeout: 5 });
  });

  async function book(ctx: IdentityContext, principal: TestPatientActor["principal"], start: Date) {
    const result = await requestAppointment(ctx, {
      principal,
      ipAddress: "203.0.113.90",
      appointmentTypePublicId,
      requestedStart: start.toISOString(),
      idempotencyKey: generateUuid(),
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("book_failed");
    }
    return result.appointment;
  }

  it("admits exactly one concurrent confirmation", async () => {
    const booked = await book(ctxA, patientA.principal, ist(17, 10, 0));
    const results = await Promise.all([
      confirmAppointment(ctxA, {
        principal: psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
      confirmAppointment(ctxB, {
        principal: psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok).length, 1);
  });

  it("admits exactly one of complete and no-show", async () => {
    const booked = await book(ctxA, patientB.principal, ist(17, 11, 0));
    const confirmed = await confirmAppointment(ctxA, {
      principal: psychologistPrincipal,
      publicId: booked.publicId,
    });
    assert.equal(confirmed.ok, true);
    const results = await Promise.all([
      completeAppointment(ctxA, {
        principal: psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
      markAppointmentNoShow(ctxB, {
        principal: psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const [row] = await ctxA.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.ok(row.status === "COMPLETED" || row.status === "NO_SHOW");
  });

  it("protects a target slot under concurrent reschedule", async () => {
    const first = await book(ctxA, patientA.principal, ist(18, 10, 0));
    const second = await book(ctxA, patientB.principal, ist(18, 11, 0));
    await confirmAppointment(ctxA, {
      principal: psychologistPrincipal,
      publicId: first.publicId,
    });
    await confirmAppointment(ctxA, {
      principal: psychologistPrincipal,
      publicId: second.publicId,
    });
    const target = ist(18, 15, 0).toISOString();
    const results = await Promise.all([
      rescheduleAppointment(ctxA, {
        principal: psychologistPrincipal,
        publicId: first.publicId,
        requestedStart: target,
      }),
      rescheduleAppointment(ctxB, {
        principal: psychologistPrincipal,
        publicId: second.publicId,
        requestedStart: target,
      }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const rows = await ctxA.db.select().from(appointments);
    assert.equal(rows.filter((row) => row.startsAt.toISOString() === target).length, 1);
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requestAppointment } from "@/lib/appointments/booking";
import { BOOKING_SAFE_MESSAGES } from "@/lib/appointments/constants";
import { appointments } from "@/lib/appointments/schema";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import { zonedCivilToUtc } from "@/lib/appointments/timezone";
import { seedIdentityCatalog } from "@/lib/identity/catalog";
import { loadIdentityConfig } from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import {
  applyIdentityMigrationSql,
  practiceSchema,
  type IdentityDb,
} from "@/lib/identity/db";
import { createMemoryEmailService } from "@/lib/identity/email-service";
import { createOtpService, createTestOtpProvider } from "@/lib/identity/otp";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";
import { generateUuid } from "@/lib/identity/crypto";
import {
  TEST_MFA_KEY,
  TEST_SESSION_SECRET,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";
import {
  activateTestPatient,
  type TestPatientActor,
} from "@/lib/appointments/test-support";

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

describe("phase 2C postgres exclusion concurrency", { skip: !enabled }, () => {
  let admin: ReturnType<typeof postgres>;
  let sqlA: ReturnType<typeof postgres>;
  let sqlB: ReturnType<typeof postgres>;
  let ctxA: IdentityContext;
  let ctxB: IdentityContext;
  let appointmentTypePublicId = "";
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
      email: "vandana@example.test",
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
    patientA = await activateTestPatient(world, "pg-a@example.test", "9876543210");
    patientB = await activateTestPatient(world, "pg-b@example.test", "9876543211");

    sqlA = postgres(url, { max: 1, prepare: false });
    sqlB = postgres(url, { max: 1, prepare: false });
    const dbA = drizzle(sqlA, { schema: practiceSchema }) as IdentityDb;
    const dbB = drizzle(sqlB, { schema: practiceSchema }) as IdentityDb;
    ctxA = { ...seedCtx, db: dbA };
    ctxB = { ...seedCtx, db: dbB };
  });

  after(async () => {
    await sqlA?.end({ timeout: 5 });
    await sqlB?.end({ timeout: 5 });
    await admin?.end({ timeout: 5 });
  });

  it("lets the exclusion constraint admit exactly one concurrent booking", async () => {
    const start = ist(17, 10, 0).toISOString();
    const results = await Promise.all([
      requestAppointment(ctxA, {
        principal: patientA.principal,
        ipAddress: "203.0.113.80",
        appointmentTypePublicId,
        requestedStart: start,
        idempotencyKey: generateUuid(),
      }),
      requestAppointment(ctxB, {
        principal: patientB.principal,
        ipAddress: "203.0.113.81",
        appointmentTypePublicId,
        requestedStart: start,
        idempotencyKey: generateUuid(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const conflicts = results.filter(
      (result) => !result.ok && result.code === "SLOT_UNAVAILABLE",
    );
    assert.equal(successes.length, 1);
    assert.equal(conflicts.length, 1);
    assert.equal(
      conflicts[0] && !conflicts[0].ok ? conflicts[0].message : "",
      BOOKING_SAFE_MESSAGES.slotUnavailable,
    );
    const rows = await ctxA.db.select({ id: appointments.id }).from(appointments);
    assert.equal(rows.length, 1);
    const serialized = JSON.stringify(results);
    assert.doesNotMatch(serialized, /23P01|exclusion|appointments_blocking/i);
  });
});

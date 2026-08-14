import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requestAppointment } from "@/lib/appointments/booking";
import { appointmentNotificationDeliveries } from "@/lib/appointments/schema";
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
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";
import {
  TEST_MFA_KEY,
  TEST_SESSION_SECRET,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";
import { TEST_NOTIFICATION_SETTINGS } from "@/lib/notifications/constants";
import { createStaticConsentReader } from "@/lib/notifications/consent";
import { claimDeliveries } from "@/lib/notifications/dispatcher";
import { createRecordingEmailSender } from "@/lib/notifications/email-adapter";
import { createTestWhatsAppService } from "@/lib/notifications/whatsapp";
import { processNotificationBatch } from "@/lib/notifications/dispatcher";

const url = process.env.APPOINTMENT_PG_URL;
const enabled = Boolean(url && /^postgres(ql)?:\/\//.test(url));

describe("phase 2F postgres notification claim concurrency", { skip: !enabled }, () => {
  let admin: ReturnType<typeof postgres>;
  let sqlA: ReturnType<typeof postgres>;
  let sqlB: ReturnType<typeof postgres>;
  let ctxA: IdentityContext;
  let ctxB: IdentityContext;
  let appointmentTypePublicId = "";
  let patientA: TestPatientActor;

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
    patientA = await activateTestPatient(world, "pg-notify@example.test", "9876543299");

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

  it("lets only one of two workers claim the same delivery", async () => {
    const start = zonedCivilToUtc({
      year: 2026,
      month: 8,
      day: 17,
      hour: 10,
      minute: 0,
      second: 0,
    }).toISOString();
    const booked = await requestAppointment(ctxA, {
      principal: patientA.principal,
      ipAddress: "203.0.113.90",
      appointmentTypePublicId,
      requestedStart: start,
      idempotencyKey: generateUuid(),
    });
    assert.equal(booked.ok, true);
    const expandDeps = {
      db: ctxA.db,
      now: ctxA.now,
      email: createRecordingEmailSender(),
      whatsapp: createTestWhatsAppService(),
      consent: createStaticConsentReader(false),
      settings: { ...TEST_NOTIFICATION_SETTINGS, batchSize: 0 },
      nodeEnv: "test",
      auditCtx: ctxA,
      whatsappDispatchEnabled: false,
    };
    await processNotificationBatch(expandDeps);
    const pending = await ctxA.db.select().from(appointmentNotificationDeliveries);
    assert.ok(pending.length > 0);

    const [claimedA, claimedB] = await Promise.all([
      claimDeliveries({
        ...expandDeps,
        db: ctxA.db,
        settings: { ...TEST_NOTIFICATION_SETTINGS, batchSize: 50 },
      }),
      claimDeliveries({
        ...expandDeps,
        db: ctxB.db,
        settings: { ...TEST_NOTIFICATION_SETTINGS, batchSize: 50 },
      }),
    ]);
    const intersection = claimedA.filter((id) => claimedB.includes(id));
    assert.equal(intersection.length, 0);
    assert.equal(claimedA.length + claimedB.length, pending.length);
  });
});

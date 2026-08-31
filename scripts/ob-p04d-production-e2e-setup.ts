/**
 * O-B-P04D Production synthetic E2E setup ceremony.
 * Requires operator env SYNTHETIC_PRODUCTION_E2E_PASSWORD (never printed).
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { isPostgresUrl, loadIdentityConfig } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { createMemoryEmailService } from "../src/lib/identity/email-service";
import { createOtpService, createUnconfiguredOtpProvider } from "../src/lib/identity/otp";
import { createMemoryRateLimiter } from "../src/lib/identity/rate-limit";
import {
  runProductionSyntheticE2eSetup,
  SYNTHETIC_PRODUCTION_E2E,
} from "../src/lib/identity/provision-synthetic-production-e2e";

async function main() {
  const password = process.env.SYNTHETIC_PRODUCTION_E2E_PASSWORD;
  if (!password) {
    console.error("Set SYNTHETIC_PRODUCTION_E2E_PASSWORD in the environment.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must point at PostgreSQL.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });
  try {
    const db = drizzle(sql, { schema: practiceSchema });
    const config = loadIdentityConfig({
      nodeEnv: "development",
      identityProvisionEnabled: false,
      registrationEnabled: false,
      databaseUrl: url,
      sessionSecret: process.env.AUTH_SESSION_SECRET,
    });
    const base = {
      db,
      config,
      now: () => new Date(),
      email: createMemoryEmailService(),
      rateLimit: createMemoryRateLimiter(),
    };
    const ctx = {
      ...base,
      otp: createOtpService(base, createUnconfiguredOtpProvider()),
    };

    const result = await runProductionSyntheticE2eSetup(ctx, {
      password,
      databaseUrlForGuard: url,
      registrationEnabled: process.env.PATIENT_REGISTRATION_ENABLED === "true",
      whatsAppEnabled: process.env.TWILIO_WHATSAPP_ENABLED === "true",
      syntheticProductionE2eEnabled:
        process.env.SYNTHETIC_PRODUCTION_E2E_ENABLED === "true",
      ceremonyProfile: process.env.O_B_P04D_CEREMONY_PROFILE,
      nodeEnv: process.env.NODE_ENV,
      requestedStartIso: "2026-09-01T04:30:00.000Z",
    });

    if (!result.ok) {
      console.error(result.message);
      process.exit(1);
    }

    console.info(
      JSON.stringify({
        operation: "obP04dProductionE2eSetup",
        psychologistPublicId: result.psychologistPublicId,
        patientPublicId: result.patientPublicId,
        appointmentPublicId: result.appointmentPublicId,
        appointmentTypePublicId: result.appointmentTypePublicId,
        outboxId: result.outboxId,
        outboxEventKey: result.outboxEventKey,
        outboxStatus: result.outboxStatus,
        createdPsychologist: result.createdPsychologist,
        createdPatient: result.createdPatient,
        patientEmail: SYNTHETIC_PRODUCTION_E2E.patient.email,
        psychologistDisplayName: SYNTHETIC_PRODUCTION_E2E.psychologist.displayName,
      }),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("O-B-P04D Production E2E setup failed.");
  process.exit(1);
});

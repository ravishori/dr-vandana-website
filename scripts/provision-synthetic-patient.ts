/**
 * Staging-only synthetic PATIENT provisioning CLI.
 * Refuses production NODE_ENV, non-staging DATABASE_URL, and enabled public registration.
 * Credentials via environment only — never printed.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { isPostgresUrl, loadIdentityConfig } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { createMemoryEmailService } from "../src/lib/identity/email-service";
import { createOtpService, createUnconfiguredOtpProvider } from "../src/lib/identity/otp";
import { createMemoryRateLimiter } from "../src/lib/identity/rate-limit";
import { seedIdentityCatalog } from "../src/lib/identity/catalog";
import {
  provisionSyntheticStagingPatient,
  SYNTHETIC_STAGING_PATIENT,
} from "../src/lib/identity/provision-synthetic-patient";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing synthetic patient provision when NODE_ENV=production.");
    process.exit(1);
  }
  if (process.env.SYNTHETIC_PATIENT_PROVISION_ENABLED !== "true") {
    console.error(
      "Set SYNTHETIC_PATIENT_PROVISION_ENABLED=true for staging synthetic patient provisioning.",
    );
    process.exit(1);
  }
  if (process.env.PATIENT_REGISTRATION_ENABLED === "true") {
    console.error(
      "Refusing synthetic patient provision while PATIENT_REGISTRATION_ENABLED=true.",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must point at PostgreSQL.");
    process.exit(1);
  }

  const password = process.env.SYNTHETIC_PATIENT_PASSWORD;
  if (!password) {
    console.error(
      "Set SYNTHETIC_PATIENT_PASSWORD in the environment (do not pass as a CLI argument).",
    );
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const db = drizzle(sql, { schema: practiceSchema });
    const config = loadIdentityConfig({
      nodeEnv: "development",
      identityProvisionEnabled: false,
      registrationEnabled: false,
      databaseUrl: url,
    });
    await seedIdentityCatalog(db, new Date());
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

    const result = await provisionSyntheticStagingPatient(ctx, {
      password,
      databaseUrlForGuard: url,
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: true,
      nodeEnv: process.env.NODE_ENV,
    });

    if (!result.ok) {
      console.error(result.message);
      process.exit(1);
    }

    console.info(
      [
        result.created ? "Created" : "Reused",
        "synthetic PATIENT",
        `publicId=${result.publicId}`,
        `displayName=${SYNTHETIC_STAGING_PATIENT.displayName}`,
        `email=${SYNTHETIC_STAGING_PATIENT.email}`,
        `status=${result.status}`,
        "role=PATIENT",
      ].join(" "),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("Synthetic patient provisioning failed.");
  process.exit(1);
});

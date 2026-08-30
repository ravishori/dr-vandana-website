/**
 * Development/staging privileged user provisioning.
 * Refuses to run when NODE_ENV=production.
 * Credentials must be supplied via environment variables — nothing is committed.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { isPostgresUrl, loadIdentityConfig } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { createMemoryEmailService } from "../src/lib/identity/email-service";
import { createOtpService, createUnconfiguredOtpProvider } from "../src/lib/identity/otp";
import { createMemoryRateLimiter } from "../src/lib/identity/rate-limit";
import { provisionPrivilegedUser, type ProvisionInput } from "../src/lib/identity/provision";
import { seedIdentityCatalog } from "../src/lib/identity/catalog";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to provision identity users in production via this script.");
    process.exit(1);
  }
  if (process.env.IDENTITY_PROVISION_ENABLED !== "true") {
    console.error("Set IDENTITY_PROVISION_ENABLED=true for local provisioning.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must point at PostgreSQL.");
    process.exit(1);
  }
  const role = process.env.PROVISION_ROLE;
  const email = process.env.PROVISION_EMAIL;
  const password = process.env.PROVISION_PASSWORD;
  const displayName = process.env.PROVISION_DISPLAY_NAME;
  if (
    (role !== "PSYCHOLOGIST" && role !== "SUPER_ADMIN" && role !== "STAFF") ||
    !email ||
    !password ||
    !displayName
  ) {
    console.error(
      "Set PROVISION_ROLE, PROVISION_EMAIL, PROVISION_PASSWORD, and PROVISION_DISPLAY_NAME.",
    );
    process.exit(1);
  }

  const mustChangePassword = process.env.PROVISION_MUST_CHANGE_PASSWORD === "true";

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const db = drizzle(sql, { schema: practiceSchema });
    const config = loadIdentityConfig({
      nodeEnv: "development",
      identityProvisionEnabled: true,
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
    const input: ProvisionInput = {
      role,
      email,
      password,
      displayName,
      mobile: process.env.PROVISION_MOBILE,
      mustChangePassword,
    };
    const result = await provisionPrivilegedUser(ctx, input);
    if (!result.ok) {
      console.error(result.message);
      process.exit(1);
    }
    console.info(
      `Provisioned ${role} public id ${result.publicId}` +
        (mustChangePassword ? " (must change password)" : ""),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("Provisioning failed.");
  process.exit(1);
});

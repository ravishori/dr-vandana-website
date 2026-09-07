/**
 * Toggle the per-account MFA exemption (users.mfa_exempt) for one existing
 * PSYCHOLOGIST or SUPER_ADMIN account, identified by email or mobile number.
 *
 * This does not touch MFA_REQUIRED_ROLES or any other account — it only
 * flips the override column on the single matched user.
 *
 * Refuses to run when NODE_ENV=production, matching every other operator
 * script in this repo (scripts/provision-identity-user.ts). Production
 * accounts must be updated by an operator following the existing production
 * change-control process (see docs/PRODUCTION_DATABASE_RUNBOOK.md), running
 * the equivalent statement documented in that runbook.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";

import { isPostgresUrl } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { isValidEmail, normalizeEmail, normalizeMobile } from "../src/lib/identity/normalize";
import { users } from "../src/lib/identity/schema";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to change MFA exemption in production via this script.");
    process.exit(1);
  }
  if (process.env.IDENTITY_PROVISION_ENABLED !== "true") {
    console.error("Set IDENTITY_PROVISION_ENABLED=true for local/staging use.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must point at PostgreSQL.");
    process.exit(1);
  }

  const identifier = process.env.TARGET_IDENTIFIER;
  const exemptRaw = process.env.TARGET_MFA_EXEMPT;
  if (!identifier || (exemptRaw !== "true" && exemptRaw !== "false")) {
    console.error(
      "Set TARGET_IDENTIFIER (email or mobile) and TARGET_MFA_EXEMPT (true|false).",
    );
    process.exit(1);
  }
  const mfaExempt = exemptRaw === "true";

  const emailNormalized = isValidEmail(identifier) ? normalizeEmail(identifier) : null;
  const mobileNormalized = emailNormalized ? null : normalizeMobile(identifier);
  if (!emailNormalized && !mobileNormalized) {
    console.error("TARGET_IDENTIFIER is not a valid email or mobile number.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const db = drizzle(sql, { schema: practiceSchema });
    const [user] = await db
      .select({ id: users.id, publicId: users.publicId })
      .from(users)
      .where(
        emailNormalized
          ? eq(users.emailNormalized, emailNormalized)
          : eq(users.mobileNormalized, mobileNormalized as string),
      )
      .limit(1);
    if (!user) {
      console.error("No matching account found.");
      process.exit(1);
    }
    await db.update(users).set({ mfaExempt }).where(eq(users.id, user.id));
    console.info(`Updated ${user.publicId}: mfa_exempt=${mfaExempt}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("Update failed.");
  process.exit(1);
});

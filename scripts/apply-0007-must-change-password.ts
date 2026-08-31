/**
 * Apply only drizzle/0007_must_change_password.sql to staging.
 * Fail-closed: staging target guard + APPLY_IDENTITY_MIGRATION=true.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

import { assertStagingMigrateTarget } from "../src/lib/identity/migrate-target-guard";

async function main() {
  const target = assertStagingMigrateTarget(process.env.DATABASE_URL);
  if (!target.ok) {
    console.error(target.reason);
    process.exit(1);
  }
  if (process.env.APPLY_IDENTITY_MIGRATION !== "true") {
    console.error(
      "Refusing to migrate. Set APPLY_IDENTITY_MIGRATION=true after taking a backup.",
    );
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
  }

  const sqlText = readFileSync(
    join(process.cwd(), "drizzle", "0007_must_change_password.sql"),
    "utf8",
  );
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await sql.unsafe(sqlText);
    const rows = await sql.unsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'must_change_password'
    `);
    if (!rows.length) {
      console.error("must_change_password column missing after apply.");
      process.exit(1);
    }
    console.info("Applied 0007_must_change_password on staging.");
    console.info("Column verified: must_change_password");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("0007 migration failed.");
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
  process.exit(1);
});

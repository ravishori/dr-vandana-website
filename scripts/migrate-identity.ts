import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { seedIdentityCatalog } from "../src/lib/identity/catalog";
import { isPostgresUrl } from "../src/lib/identity/config";
import { applyIdentityMigrationSql, practiceSchema } from "../src/lib/identity/db";
import {
  formatSchemaVerification,
  verifyPracticeSchema,
} from "../src/lib/identity/schema-verification";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must be a postgres:// or postgresql:// URL.");
    process.exit(1);
  }
  const databaseUrl = url;
  if (process.env.APPLY_IDENTITY_MIGRATION !== "true") {
    console.error(
      "Refusing to migrate. Set APPLY_IDENTITY_MIGRATION=true after taking a backup.",
    );
    process.exit(1);
  }
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await applyIdentityMigrationSql((statement) => sql.unsafe(statement));
    const db = drizzle(sql, { schema: practiceSchema });
    await seedIdentityCatalog(db, new Date());
    const verification = await verifyPracticeSchema(async (text) => {
      const rows = await sql.unsafe(text);
      return rows as unknown as Record<string, unknown>[];
    });
    if (verification.status !== "PASS") {
      console.error(formatSchemaVerification(verification));
      console.error(
        "Migration applied but required production constraints are missing. btree_gist and appointments_blocking_occupied_excl are mandatory.",
      );
      process.exit(1);
    }
    console.info("Identity migration applied.");
    console.info("SCHEMA PASS");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed.");
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
  process.exit(1);
});

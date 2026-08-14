import postgres from "postgres";

import { seedIdentityCatalog } from "../src/lib/identity/catalog";
import { isPostgresUrl } from "../src/lib/identity/config";
import { applyIdentityMigrationSql, practiceSchema } from "../src/lib/identity/db";
import { drizzle } from "drizzle-orm/postgres-js";

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
    console.info("Identity migration applied.");
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

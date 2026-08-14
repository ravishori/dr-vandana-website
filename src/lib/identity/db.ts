import { readFileSync } from "node:fs";
import { join } from "node:path";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  isPostgresUrl,
  type IdentityRuntimeConfig,
} from "@/lib/identity/config";
import { identitySchema } from "@/lib/identity/schema";

export type IdentityDb = PostgresJsDatabase<typeof identitySchema>;

const globalForIdentity = globalThis as unknown as {
  drvIdentitySql?: ReturnType<typeof postgres>;
  drvIdentityDb?: IdentityDb;
};

function createPostgresClient(url: string) {
  return postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export function getIdentityDb(config: IdentityRuntimeConfig): IdentityDb {
  if (!isPostgresUrl(config.databaseUrl)) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  if (globalForIdentity.drvIdentityDb && globalForIdentity.drvIdentitySql) {
    return globalForIdentity.drvIdentityDb;
  }
  const sql = createPostgresClient(config.databaseUrl as string);
  const db = drizzle(sql, { schema: identitySchema });
  globalForIdentity.drvIdentitySql = sql;
  globalForIdentity.drvIdentityDb = db;
  return db;
}

export function resetIdentityDbForTests(): void {
  globalForIdentity.drvIdentitySql = undefined;
  globalForIdentity.drvIdentityDb = undefined;
}

export function readIdentityMigrationSql(): string {
  return readFileSync(
    join(process.cwd(), "drizzle/0001_identity_foundation.sql"),
    "utf8",
  );
}

export async function applyIdentityMigrationSql(
  execSql: (sql: string) => Promise<unknown>,
): Promise<void> {
  await execSql(readIdentityMigrationSql());
}

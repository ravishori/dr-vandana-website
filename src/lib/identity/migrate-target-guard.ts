/**
 * Fail-closed staging target guard for identity migrations.
 * Parses DATABASE_URL locally — does not open a database connection.
 * No production bypass is provided.
 */

export type MigrateTargetGuardResult =
  | { ok: true; hostname: string; database: string }
  | { ok: false; reason: string };

const STAGING_SERVER_LABEL = "pg-dr-vandana-staging";
const PRODUCTION_SERVER_LABEL = "pg-dr-vandana-prod";
const STAGING_DATABASE = "dr_vandana_db_staging";
const PRODUCTION_DATABASE = "dr_vandana_db";

function isPostgresScheme(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function hostnameLooksLikeStaging(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === STAGING_SERVER_LABEL ||
    host.startsWith(`${STAGING_SERVER_LABEL}.`)
  );
}

function hostnameLooksLikeProduction(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === PRODUCTION_SERVER_LABEL ||
    host.startsWith(`${PRODUCTION_SERVER_LABEL}.`)
  );
}

/**
 * Validate that a DATABASE_URL is an explicit Azure staging target.
 * Missing, malformed, production, or ambiguous URLs fail closed.
 */
export function assertStagingMigrateTarget(
  databaseUrl: string | undefined,
): MigrateTargetGuardResult {
  if (databaseUrl == null || databaseUrl.trim().length === 0) {
    return { ok: false, reason: "DATABASE_URL is missing." };
  }

  const trimmed = databaseUrl.trim();
  if (!isPostgresScheme(trimmed)) {
    return {
      ok: false,
      reason: "DATABASE_URL must be a postgres:// or postgresql:// URL.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "DATABASE_URL is malformed and cannot be parsed." };
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname) {
    return { ok: false, reason: "DATABASE_URL hostname is missing." };
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")).trim();
  if (!database) {
    return { ok: false, reason: "DATABASE_URL database name is missing." };
  }

  // Reject production markers before allowing staging.
  if (hostnameLooksLikeProduction(hostname)) {
    return {
      ok: false,
      reason: "Refusing to migrate: DATABASE_URL host is production (pg-dr-vandana-prod).",
    };
  }

  if (database === PRODUCTION_DATABASE) {
    return {
      ok: false,
      reason: "Refusing to migrate: DATABASE_URL database is production (dr_vandana_db).",
    };
  }

  const stagingHost = hostnameLooksLikeStaging(hostname);
  const stagingDatabase = database === STAGING_DATABASE;

  if (stagingHost && stagingDatabase) {
    return { ok: true, hostname, database };
  }

  if (stagingHost && !stagingDatabase) {
    return {
      ok: false,
      reason:
        "Refusing to migrate: staging host must use database dr_vandana_db_staging.",
    };
  }

  if (!stagingHost && stagingDatabase) {
    return {
      ok: false,
      reason:
        "Refusing to migrate: database dr_vandana_db_staging requires host pg-dr-vandana-staging.",
    };
  }

  return {
    ok: false,
    reason:
      "Refusing to migrate: DATABASE_URL is not an explicit staging target (pg-dr-vandana-staging / dr_vandana_db_staging).",
  };
}

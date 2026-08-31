/**
 * Fail-closed authorization for the dedicated Production notification worker.
 * Parses environment locally — does not open network connections or log secrets.
 *
 * This is NOT a generic Production bypass. It requires:
 * - the fixed hosted-worker execution profile (ACA Job container env only)
 * - an explicit Production PostgreSQL target
 * - absence of public-server platform markers (e.g. Vercel)
 * - registration and WhatsApp remain disabled
 */

export type ProductionWorkerGuardResult =
  | { ok: true; hostname: string; database: string }
  | { ok: false; reason: string };

/** Set only on the Azure Container Apps Job container — not on the public web app. */
export const PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE =
  "production-hosted-v1" as const;

const EXECUTION_PROFILE_ENV = "NOTIFICATION_WORKER_EXECUTION_PROFILE";

const PRODUCTION_SERVER_LABEL = "pg-dr-vandana-prod";
const STAGING_SERVER_LABEL = "pg-dr-vandana-staging";
const PRODUCTION_DATABASE = "dr_vandana_db";
const STAGING_DATABASE = "dr_vandana_db_staging";

function readEnv(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function isTruthyFlag(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function isPostgresScheme(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function hostnameLooksLikeProduction(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === PRODUCTION_SERVER_LABEL ||
    host.startsWith(`${PRODUCTION_SERVER_LABEL}.`)
  );
}

function hostnameLooksLikeStaging(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === STAGING_SERVER_LABEL ||
    host.startsWith(`${STAGING_SERVER_LABEL}.`)
  );
}

function parseDatabaseTarget(
  databaseUrl: string | undefined,
): ProductionWorkerGuardResult {
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

  if (hostnameLooksLikeStaging(hostname) || database === STAGING_DATABASE) {
    return {
      ok: false,
      reason:
        "Refusing Production worker: DATABASE_URL targets staging infrastructure.",
    };
  }

  if (!hostnameLooksLikeProduction(hostname)) {
    return {
      ok: false,
      reason:
        "Refusing Production worker: DATABASE_URL host is not pg-dr-vandana-prod.",
    };
  }

  if (database !== PRODUCTION_DATABASE) {
    return {
      ok: false,
      reason:
        "Refusing Production worker: DATABASE_URL database is not dr_vandana_db.",
    };
  }

  const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
  if (sslmode !== "require") {
    return {
      ok: false,
      reason:
        "Refusing Production worker: DATABASE_URL must include sslmode=require.",
    };
  }

  return { ok: true, hostname, database };
}

function isPublicWebRuntime(env: NodeJS.ProcessEnv): boolean {
  if (readEnv(env, "VERCEL")) {
    return true;
  }
  if (readEnv(env, "AWS_LAMBDA_FUNCTION_NAME")) {
    return true;
  }
  if (readEnv(env, "NETLIFY")) {
    return true;
  }
  return false;
}

/**
 * Authorize the dedicated Production notification worker entrypoint only.
 */
export function assertProductionNotificationWorkerAuthorization(
  env: NodeJS.ProcessEnv = process.env,
): ProductionWorkerGuardResult {
  if (env.NODE_ENV !== "production") {
    return {
      ok: false,
      reason:
        "Refusing Production worker: NODE_ENV must be production for the hosted worker entrypoint.",
    };
  }

  const profile = readEnv(env, EXECUTION_PROFILE_ENV);
  if (profile !== PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE) {
    return {
      ok: false,
      reason:
        "Refusing Production worker: NOTIFICATION_WORKER_EXECUTION_PROFILE is missing or invalid.",
    };
  }

  if (isPublicWebRuntime(env)) {
    return {
      ok: false,
      reason:
        "Refusing Production worker: public web runtime markers detected.",
    };
  }

  if (isTruthyFlag(readEnv(env, "PATIENT_REGISTRATION_ENABLED"))) {
    return {
      ok: false,
      reason: "Refusing Production worker: PATIENT_REGISTRATION_ENABLED must be false.",
    };
  }

  if (isTruthyFlag(readEnv(env, "TWILIO_WHATSAPP_ENABLED"))) {
    return {
      ok: false,
      reason: "Refusing Production worker: TWILIO_WHATSAPP_ENABLED must be false.",
    };
  }

  return parseDatabaseTarget(readEnv(env, "DATABASE_URL"));
}

export function formatProductionWorkerGuardFailure(
  result: Extract<ProductionWorkerGuardResult, { ok: false }>,
): string {
  return result.reason;
}

/**
 * Fail-closed guard for O-B-P04D Production synthetic E2E ceremony.
 * Operator/CLI only — not a public registration or worker bypass.
 */

export type ProductionSyntheticE2eGuardResult =
  | { ok: true; hostname: string; database: string }
  | { ok: false; reason: string };

export const PRODUCTION_SYNTHETIC_E2E_EXECUTION_PROFILE =
  "production-e2e-v1" as const;

const PROFILE_ENV = "O_B_P04D_CEREMONY_PROFILE";

const PRODUCTION_SERVER_LABEL = "pg-dr-vandana-prod";
const STAGING_SERVER_LABEL = "pg-dr-vandana-staging";
const PRODUCTION_DATABASE = "dr_vandana_db";
const STAGING_DATABASE = "dr_vandana_db_staging";

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function isTruthyFlag(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function isPostgresScheme(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function parseProductionDatabaseTarget(
  databaseUrl: string | undefined,
): ProductionSyntheticE2eGuardResult {
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
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")).trim();

  if (
    hostname.includes(STAGING_SERVER_LABEL) ||
    database === STAGING_DATABASE
  ) {
    return {
      ok: false,
      reason: "Refusing Production E2E: DATABASE_URL targets staging.",
    };
  }

  if (
    !hostname.includes(PRODUCTION_SERVER_LABEL) ||
    database !== PRODUCTION_DATABASE
  ) {
    return {
      ok: false,
      reason: "Refusing Production E2E: DATABASE_URL must target pg-dr-vandana-prod / dr_vandana_db.",
    };
  }

  if (parsed.searchParams.get("sslmode")?.toLowerCase() !== "require") {
    return {
      ok: false,
      reason: "Refusing Production E2E: DATABASE_URL must include sslmode=require.",
    };
  }

  return { ok: true, hostname, database };
}

export function assertProductionSyntheticE2eAllowed(
  env: NodeJS.ProcessEnv = process.env,
): ProductionSyntheticE2eGuardResult {
  if (env.NODE_ENV === "production") {
    return {
      ok: false,
      reason:
        "Refusing Production E2E ceremony when NODE_ENV=production. Run the ceremony CLI on an operator workstation.",
    };
  }

  if (!isTruthyFlag(readEnv(env, "SYNTHETIC_PRODUCTION_E2E_ENABLED"))) {
    return {
      ok: false,
      reason: "Set SYNTHETIC_PRODUCTION_E2E_ENABLED=true for Production synthetic E2E.",
    };
  }

  const profile = readEnv(env, PROFILE_ENV);
  if (profile !== PRODUCTION_SYNTHETIC_E2E_EXECUTION_PROFILE) {
    return {
      ok: false,
      reason: "O_B_P04D_CEREMONY_PROFILE must be production-e2e-v1.",
    };
  }

  if (isTruthyFlag(readEnv(env, "PATIENT_REGISTRATION_ENABLED"))) {
    return {
      ok: false,
      reason: "Refusing Production E2E while PATIENT_REGISTRATION_ENABLED=true.",
    };
  }

  if (isTruthyFlag(readEnv(env, "TWILIO_WHATSAPP_ENABLED"))) {
    return {
      ok: false,
      reason: "Refusing Production E2E while TWILIO_WHATSAPP_ENABLED=true.",
    };
  }

  return parseProductionDatabaseTarget(readEnv(env, "DATABASE_URL"));
}

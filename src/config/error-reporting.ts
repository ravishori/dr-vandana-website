import type { ErrorSeverity } from "@/lib/observability/error-types";
import { ERROR_SEVERITY_RANK } from "@/lib/observability/error-types";

/**
 * Server-only error reporting configuration.
 * Never import from Client Components.
 *
 * Environment variables:
 * - ERROR_NOTIFY_EMAIL
 * - ERROR_EMAIL_ENABLED
 * - ERROR_EMAIL_MIN_SEVERITY (INFO|WARNING|ERROR|CRITICAL)
 * - ERROR_EMAIL_COOLDOWN_SECONDS
 * - TEST_ERROR_REPORTING (development-only synthetic path)
 *
 * Alert cooldown uses process-local memory. On serverless/multi-instance
 * hosts this is not globally distributed — document as a production limitation.
 */

function readNonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  const normalized = value.toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseSeverity(value: string | undefined): ErrorSeverity {
  switch (value?.toUpperCase()) {
    case "INFO":
    case "WARNING":
    case "ERROR":
    case "CRITICAL":
      return value.toUpperCase() as ErrorSeverity;
    default:
      return "ERROR";
  }
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getErrorReportingConfig() {
  const notifyEmail = readNonEmptyEnv("ERROR_NOTIFY_EMAIL");
  const minSeverity = parseSeverity(readNonEmptyEnv("ERROR_EMAIL_MIN_SEVERITY"));
  const cooldownRaw = readNonEmptyEnv("ERROR_EMAIL_COOLDOWN_SECONDS");
  const cooldownSeconds = cooldownRaw
    ? Number.parseInt(cooldownRaw, 10)
    : 300;

  return {
    notifyEmail:
      notifyEmail && looksLikeEmail(notifyEmail) ? notifyEmail : undefined,
    emailEnabled: parseBoolean(readNonEmptyEnv("ERROR_EMAIL_ENABLED"), true),
    minSeverity,
    cooldownSeconds:
      Number.isFinite(cooldownSeconds) && cooldownSeconds > 0
        ? cooldownSeconds
        : 300,
    testReportingEnabled:
      process.env.NODE_ENV !== "production" &&
      parseBoolean(readNonEmptyEnv("TEST_ERROR_REPORTING"), false),
  } as const;
}

export function meetsEmailSeverityThreshold(
  severity: ErrorSeverity,
  minimum: ErrorSeverity,
): boolean {
  return ERROR_SEVERITY_RANK[severity] >= ERROR_SEVERITY_RANK[minimum];
}

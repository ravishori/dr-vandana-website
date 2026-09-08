import {
  getAppointmentEmailConfig,
  getSmtpTransportConfig,
} from "@/config/appointment-email";
import { getErrorReportingConfig } from "@/config/error-reporting";
import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
import { isAiLlmConfigured } from "@/config/ai";
import { doctorPortalConfig, isDoctorAuthConfigured } from "@/config/doctor-portal";
import { resolveArticlesStoreMode } from "@/lib/articles/store";
import { resolveCommunicationsStoreMode } from "@/lib/communications/store";
import { resolveDoctorLoginRateLimitMode } from "@/lib/doctor-auth/login-rate-limit";
import { logStructured } from "@/lib/observability/logger";

export type DoctorPortalConfigIssue = {
  code: string;
  message: string;
  variables: string[];
};

/**
 * Collect production doctor-portal configuration issues.
 * Never includes secret values — variable names and status only.
 */
export function collectDoctorPortalConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
  nodeEnv = env.NODE_ENV,
): DoctorPortalConfigIssue[] {
  if (nodeEnv !== "production") {
    return [];
  }

  const issues: DoctorPortalConfigIssue[] = [];

  if (!env[doctorPortalConfig.loginEmailEnvKey]?.trim()) {
    issues.push({
      code: "DOCTOR_AUTH_MISCONFIGURED",
      message: "Doctor login email is missing.",
      variables: [doctorPortalConfig.loginEmailEnvKey],
    });
  }

  if (!env[doctorPortalConfig.passwordHashEnvKey]?.trim()) {
    issues.push({
      code: "DOCTOR_AUTH_MISCONFIGURED",
      message:
        "Doctor password hash is missing. Production requires DOCTOR_PASSWORD_HASH (plaintext DOCTOR_PASSWORD is not accepted).",
      variables: [doctorPortalConfig.passwordHashEnvKey],
    });
  }

  const secret = env[doctorPortalConfig.sessionSecretEnvKey]?.trim();
  if (!secret || secret.length < 32) {
    issues.push({
      code: "DOCTOR_AUTH_MISCONFIGURED",
      message:
        "Doctor session secret is missing or shorter than 32 characters.",
      variables: [doctorPortalConfig.sessionSecretEnvKey],
    });
  }

  if (!isDoctorAuthConfigured(env)) {
    issues.push({
      code: "DOCTOR_AUTH_MISCONFIGURED",
      message: "Doctor authentication is not fully configured for production.",
      variables: [
        doctorPortalConfig.loginEmailEnvKey,
        doctorPortalConfig.passwordHashEnvKey,
        doctorPortalConfig.sessionSecretEnvKey,
      ],
    });
  }

  const articlesMode = resolveArticlesStoreMode(
    nodeEnv,
    env.ARTICLES_STORE,
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN,
  );
  if (articlesMode !== "upstash") {
    issues.push({
      code: "ARTICLES_STORE_MISCONFIGURED",
      message:
        "Production articles store must be upstash with Upstash credentials. Memory/file are rejected.",
      variables: [
        "ARTICLES_STORE",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ],
    });
  }

  const communicationsMode = resolveCommunicationsStoreMode(
    nodeEnv,
    env.COMMUNICATIONS_STORE,
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN,
  );
  if (communicationsMode !== "upstash") {
    issues.push({
      code: "COMMUNICATIONS_STORE_MISCONFIGURED",
      message:
        "Production communications store must be upstash with Upstash credentials. Memory/file are rejected.",
      variables: [
        "COMMUNICATIONS_STORE",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ],
    });
  }

  if (!hasUpstashCredentials(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)) {
    issues.push({
      code: "UPSTASH_MISCONFIGURED",
      message: "Upstash Redis credentials are missing.",
      variables: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    });
  }

  const loginRateMode = resolveDoctorLoginRateLimitMode(
    nodeEnv,
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN,
  );
  if (loginRateMode !== "upstash") {
    issues.push({
      code: "DOCTOR_LOGIN_RATE_LIMIT_MISCONFIGURED",
      message:
        "Doctor login rate limiting requires Upstash in production (no memory fallback).",
      variables: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    });
  }

  const smtp = getSmtpTransportConfig();
  const appointmentEmail = getAppointmentEmailConfig();
  if (!smtp.ok || !appointmentEmail.ok) {
    issues.push({
      code: "SMTP_CONFIGURATION_ERROR",
      message:
        "SMTP configuration required for communications email delivery is incomplete.",
      variables: [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
        "APPOINTMENT_TO_EMAIL",
      ],
    });
  }

  return issues;
}

/**
 * Non-throwing startup validation for required server configuration.
 * Logs safe operational warnings only — never secret values.
 */
export function validateServerConfigAtStartup(): void {
  try {
    const smtp = getSmtpTransportConfig();
    const appointmentEmail = getAppointmentEmailConfig();
    const errorReporting = getErrorReportingConfig();
    const rateLimitMode = resolveAppointmentRateLimitStoreMode();

    if (!smtp.ok) {
      logStructured("ERROR", {
        code: "SMTP_CONFIGURATION_ERROR",
        source: "CONFIGURATION",
        message: "SMTP transport configuration is incomplete.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (!appointmentEmail.ok) {
      logStructured("ERROR", {
        code: "CONFIG_MISSING",
        source: "CONFIGURATION",
        message: "Appointment email destination configuration is incomplete.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (errorReporting.emailEnabled && !errorReporting.notifyEmail) {
      logStructured("WARNING", {
        code: "CONFIG_MISSING",
        source: "CONFIGURATION",
        message:
          "ERROR_NOTIFY_EMAIL is missing while error email alerts are enabled.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (rateLimitMode === "misconfigured") {
      logStructured("ERROR", {
        code: "RATE_LIMIT_MISCONFIGURED",
        source: "CONFIGURATION",
        message:
          "Production rate limiting is misconfigured. Set APPOINTMENT_RATE_LIMIT_STORE=upstash with Upstash credentials.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (rateLimitMode === "upstash" && !hasUpstashCredentials()) {
      logStructured("ERROR", {
        code: "RATE_LIMIT_MISCONFIGURED",
        source: "CONFIGURATION",
        message:
          "APPOINTMENT_RATE_LIMIT_STORE=upstash but Upstash credentials are missing.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (!isAiLlmConfigured()) {
      logStructured("INFO", {
        code: "AI_PROVIDER_FALLBACK",
        source: "CONFIGURATION",
        message:
          "Ask Dr. Vandana AI is using the educational retrieval fallback because AI_API_KEY is not configured.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (
      process.env.NODE_ENV === "production" &&
      process.env.APPOINTMENT_RATE_LIMIT_STORE === "memory"
    ) {
      logStructured("ERROR", {
        code: "RATE_LIMIT_MISCONFIGURED",
        source: "CONFIGURATION",
        message:
          "APPOINTMENT_RATE_LIMIT_STORE=memory is not production-safe and is rejected.",
        operation: "validateServerConfigAtStartup",
      });
    }

    for (const issue of collectDoctorPortalConfigIssues()) {
      logStructured("ERROR", {
        code: issue.code,
        source: "CONFIGURATION",
        message: issue.message,
        variables: issue.variables,
        operation: "validateServerConfigAtStartup",
      });
    }
  } catch {
    logStructured("ERROR", {
      code: "APP_UNEXPECTED_ERROR",
      source: "CONFIGURATION",
      message: "Server configuration validation failed safely.",
      operation: "validateServerConfigAtStartup",
    });
  }
}

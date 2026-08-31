import {
  getAppointmentEmailConfig,
  getSmtpTransportConfig,
} from "@/config/appointment-email";
import { getErrorReportingConfig } from "@/config/error-reporting";
import {
  describeUpstashCredentialPresence,
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
import { isAiLlmConfigured } from "@/config/ai";
import {
  isPsychologistAuthConfigured,
  resolveQuestionStoreMode,
} from "@/config/question-portal";
import { logStructured } from "@/lib/observability/logger";

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
          "APPOINTMENT_RATE_LIMIT_STORE=upstash but usable HTTPS Upstash REST credentials were not resolved.",
        operation: "validateServerConfigAtStartup",
        ...describeUpstashCredentialPresence(),
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

    if (!isPsychologistAuthConfigured()) {
      logStructured("WARNING", {
        code: "CONFIG_MISSING",
        source: "CONFIGURATION",
        message:
          "Psychologist portal login is not fully configured (email, password hash, and SESSION_SECRET).",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (resolveQuestionStoreMode() === "misconfigured") {
      logStructured("ERROR", {
        code: "CONFIG_MISSING",
        source: "CONFIGURATION",
        message:
          "Question portal storage is misconfigured. Set QUESTION_STORE=upstash with Upstash credentials, or sqlite with a persistent path on a Node host.",
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

    if (
      process.env.NODE_ENV === "production" &&
      process.env.PATIENT_REGISTRATION_ENABLED === "true"
    ) {
      logStructured("ERROR", {
        code: "IDENTITY_PRODUCTION_GATE",
        source: "CONFIGURATION",
        message:
          "PATIENT_REGISTRATION_ENABLED is set in production. Patient registration is not production-ready until PostgreSQL, OTP, email, privacy/terms, and security gates are approved.",
        operation: "validateServerConfigAtStartup",
      });
    }

    if (
      process.env.NODE_ENV === "production" &&
      process.env.OTP_PROVIDER &&
      ["test", "mock", "dev"].includes(
        process.env.OTP_PROVIDER.trim().toLowerCase(),
      )
    ) {
      logStructured("ERROR", {
        code: "OTP_PRODUCTION_FORBIDDEN",
        source: "CONFIGURATION",
        message:
          "OTP_PROVIDER test/mock/dev is forbidden in production. Identity OTP will fail closed.",
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

import {
  getAppointmentEmailConfig,
  getSmtpTransportConfig,
} from "@/config/appointment-email";
import { getErrorReportingConfig } from "@/config/error-reporting";
import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
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
          "APPOINTMENT_RATE_LIMIT_STORE=upstash but Upstash credentials are missing.",
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
  } catch {
    logStructured("ERROR", {
      code: "APP_UNEXPECTED_ERROR",
      source: "CONFIGURATION",
      message: "Server configuration validation failed safely.",
      operation: "validateServerConfigAtStartup",
    });
  }
}

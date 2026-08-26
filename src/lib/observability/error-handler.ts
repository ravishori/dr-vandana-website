import type {
  AppEnvironment,
  ErrorCode,
  ErrorEvent,
  ErrorSeverity,
  ReportExceptionInput,
  ReportExceptionResult,
} from "@/lib/observability/error-types";
import { sendErrorAlertEmail } from "@/lib/observability/error-mailer";
import { logErrorEvent, logStructured } from "@/lib/observability/logger";
import {
  safeDevStack,
  safeErrorMessage,
  safeErrorName,
  sanitizeErrorText,
  sanitizeOperation,
  sanitizeRoute,
} from "@/lib/observability/error-sanitizer";

function resolveEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function createCorrelationId(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
      : Math.random().toString(16).slice(2, 14);
  return `ERR-${id}`;
}

function defaultSeverity(
  source: ReportExceptionInput["source"],
  code: ErrorCode,
): ErrorSeverity {
  if (code === "SMTP_CONFIGURATION_ERROR" || code === "CONFIG_MISSING") {
    return "CRITICAL";
  }
  if (source === "CONFIGURATION") {
    return "ERROR";
  }
  if (source === "FRONTEND") {
    return "ERROR";
  }
  return "ERROR";
}

function defaultMessage(code: ErrorCode, error: unknown): string {
  const fromError = safeErrorMessage(error, "");
  if (fromError) {
    return fromError;
  }
  switch (code) {
    case "SMTP_DELIVERY_FAILED":
      return "Email delivery failed.";
    case "SMTP_CONFIGURATION_ERROR":
      return "Email configuration is incomplete.";
    case "FRONTEND_RUNTIME_ERROR":
      return "A frontend runtime error occurred.";
    case "CONFIG_MISSING":
      return "Required configuration is missing.";
    default:
      return "An unexpected application error occurred.";
  }
}

/**
 * Normalize an arbitrary exception into a privacy-safe ErrorEvent.
 */
export function normalizeError(input: ReportExceptionInput): ErrorEvent {
  const correlationId = createCorrelationId();
  const eventId = createCorrelationId().replace("ERR-", "EVT-");
  const severity =
    input.severity ?? defaultSeverity(input.source, input.code);
  const message = sanitizeErrorText(
    input.message ?? defaultMessage(input.code, input.error),
    400,
  );

  return {
    eventId,
    timestamp: new Date().toISOString(),
    severity,
    source: input.source,
    code: input.code,
    message,
    route: sanitizeRoute(input.route),
    operation: sanitizeOperation(input.operation),
    environment: resolveEnvironment(),
    correlationId,
  };
}

/**
 * Central exception reporter: sanitize → log → optional admin email.
 * Never throws. Never logs appointment payloads or secrets.
 */
export async function reportException(
  input: ReportExceptionInput,
): Promise<ReportExceptionResult> {
  try {
    const event = normalizeError(input);
    logErrorEvent(event);

    const stack = safeDevStack(input.error);
    if (stack) {
      logStructured("DEBUG", {
        correlationId: event.correlationId,
        errorName: safeErrorName(input.error),
        stack,
      });
    }

    let emailed = false;
    if (!input.skipEmail) {
      const alert = await sendErrorAlertEmail(event);
      emailed = alert.sent;
    }

    return {
      correlationId: event.correlationId,
      eventId: event.eventId,
      emailed,
    };
  } catch {
    // Absolute last resort — never crash the application.
    try {
      logStructured("ERROR", {
        code: "APP_UNEXPECTED_ERROR",
        message: "Exception reporter failed safely.",
        source: "UNKNOWN",
      });
    } catch {
      // ignore
    }
    const fallbackId = createCorrelationId();
    return {
      correlationId: fallbackId,
      eventId: fallbackId.replace("ERR-", "EVT-"),
      emailed: false,
    };
  }
}

/**
 * Future database adapters can call this helper with safe metadata only.
 * Do not pass SQL text, params, or records.
 */
export async function reportDatabaseException(input: {
  code: "DATABASE_CONNECTION_FAILED" | "DATABASE_QUERY_FAILED";
  operation: string;
  message?: string;
  error?: unknown;
  route?: string;
}): Promise<ReportExceptionResult> {
  return reportException({
    source: "DATABASE",
    code: input.code,
    operation: input.operation,
    message: input.message ?? "A database operation failed.",
    route: input.route,
    error: input.error,
  });
}

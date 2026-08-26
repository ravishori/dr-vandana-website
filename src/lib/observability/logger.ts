import type { ErrorEvent } from "@/lib/observability/error-types";

export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

const LOG_RANK: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
};

function minLogLevel(): LogLevel {
  return process.env.NODE_ENV === "production" ? "INFO" : "DEBUG";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_RANK[level] >= LOG_RANK[minLogLevel()];
}

/**
 * Structured JSON logging. Never pass appointment payloads or secrets here.
 */
export function logStructured(
  level: LogLevel,
  payload: Record<string, unknown>,
): void {
  if (!shouldLog(level)) {
    return;
  }

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  });

  try {
    if (level === "ERROR" || level === "CRITICAL") {
      console.error(line);
      return;
    }
    if (level === "WARNING") {
      console.warn(line);
      return;
    }
    console.info(line);
  } catch {
    // Logging must never throw.
  }
}

export function logErrorEvent(event: ErrorEvent): void {
  const level: LogLevel =
    event.severity === "CRITICAL"
      ? "CRITICAL"
      : event.severity === "ERROR"
        ? "ERROR"
        : event.severity === "WARNING"
          ? "WARNING"
          : "INFO";

  logStructured(level, {
    eventId: event.eventId,
    correlationId: event.correlationId,
    severity: event.severity,
    source: event.source,
    code: event.code,
    message: event.message,
    route: event.route,
    operation: event.operation,
    environment: event.environment,
  });
}

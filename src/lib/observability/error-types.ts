export type ErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type ErrorSource =
  | "FRONTEND"
  | "SERVER"
  | "SERVER_ACTION"
  | "API"
  | "DATABASE"
  | "EMAIL"
  | "CONFIGURATION"
  | "UNKNOWN";

export type ErrorCode =
  | "APP_UNEXPECTED_ERROR"
  | "CONFIG_MISSING"
  | "CONFIG_INVALID"
  | "APPOINTMENT_VALIDATION_FAILED"
  | "APPOINTMENT_ABUSE_BLOCKED"
  | "APPOINTMENT_RATE_LIMITED"
  | "RATE_LIMIT_STORE_UNAVAILABLE"
  | "RATE_LIMIT_MISCONFIGURED"
  | "SMTP_CONFIGURATION_ERROR"
  | "SMTP_CONNECTION_FAILED"
  | "SMTP_DELIVERY_FAILED"
  | "DATABASE_CONNECTION_FAILED"
  | "DATABASE_QUERY_FAILED"
  | "FRONTEND_RUNTIME_ERROR"
  | "API_REQUEST_FAILED"
  | "ERROR_REPORT_REJECTED"
  | "TEST_SYNTHETIC_ERROR"
  | "UNKNOWN_ERROR";

export type AppEnvironment = "development" | "staging" | "production";

/**
 * Safe operational error event. Must never contain appointment/PII/secrets.
 */
export type ErrorEvent = {
  eventId: string;
  timestamp: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  code: ErrorCode;
  message: string;
  route?: string;
  operation?: string;
  environment: AppEnvironment;
  correlationId: string;
};

export type ReportExceptionInput = {
  error?: unknown;
  severity?: ErrorSeverity;
  source: ErrorSource;
  code: ErrorCode;
  message?: string;
  route?: string;
  operation?: string;
  /** When true, never send an admin email (prevents alert recursion). */
  skipEmail?: boolean;
};

export type ReportExceptionResult = {
  correlationId: string;
  eventId: string;
  emailed: boolean;
};

export const ERROR_SEVERITY_RANK: Record<ErrorSeverity, number> = {
  INFO: 10,
  WARNING: 20,
  ERROR: 30,
  CRITICAL: 40,
};

const SENSITIVE_KEY =
  /(password|passwd|secret|token|authorization|cookie|api[_-]?key|smtp|credential|connectionstring|bearer|refresh|session|formdata|requestbody|fullname|phone|email|briefreason|contactvalue)/i;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d[\d\s().-]{8,}\d)\b/g;
const BEARER_PATTERN = /bearer\s+[a-z0-9._\-]+/gi;
const LONG_SECRET_PATTERN = /\b(?:sk|pk|key|token)[_-][a-z0-9\-_]{8,}\b/gi;
const ASSIGNMENT_SECRET_PATTERN =
  /\b(?:password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/gi;

export function sanitizeErrorText(value: string, maxLength = 400): string {
  let next = value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(LONG_SECRET_PATTERN, "[redacted-secret]")
    .replace(ASSIGNMENT_SECRET_PATTERN, "[redacted-secret]")
    .replace(/\s+/g, " ")
    .trim();

  if (next.length > maxLength) {
    next = `${next.slice(0, maxLength)}…`;
  }

  return next;
}

export function sanitizeRoute(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 200) {
    return undefined;
  }
  // Strip query/hash to avoid leaking sensitive params.
  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  return pathOnly.slice(0, 200);
}

export function sanitizeOperation(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function safeErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return sanitizeErrorText(error.name, 80);
  }
  return "UnknownError";
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === "string") {
    return sanitizeErrorText(error.message, 400) || fallback;
  }
  if (typeof error === "string") {
    return sanitizeErrorText(error, 400) || fallback;
  }
  return fallback;
}

/**
 * Development-only sanitized stack. Never include in production alert emails.
 */
export function safeDevStack(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  if (!(error instanceof Error) || !error.stack) {
    return undefined;
  }
  return sanitizeErrorText(error.stack, 1200);
}

export function containsSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

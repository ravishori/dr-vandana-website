/**
 * Server-oriented appointment submission hardening configuration.
 * Import only from Server Actions / server modules — not Client Components.
 *
 * Rate-limit store modes (APPOINTMENT_RATE_LIMIT_STORE):
 * - unset / memory + non-production → process-local memory (dev)
 * - "upstash" → distributed Upstash Redis (required for production)
 * - "memory" in production → misconfigured (fail-closed, never allowed)
 * - unset in production → misconfigured (fail-closed, never allowed)
 *
 * Production never falls back to memory or unavailable→allow.
 *
 * Upstash credentials (server-only):
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * Deployment target (BRD): Vercel or Node.js containerized hosting.
 * Platform-native application-level Server Action rate limiting is not
 * configured in-repo; Upstash provides shared state across instances.
 */
export const appointmentSubmissionConfig = {
  honeypotFieldName: "website",
  rateLimit: {
    enabled: true,
    /** Sliding window for overall attempts (shared-IP friendly). */
    windowMs: 15 * 60 * 1000,
    maxAttempts: 10,
    /** Short burst protection. */
    burstWindowMs: 60 * 1000,
    burstMaxAttempts: 4,
  },
  errorReportRateLimit: {
    enabled: true,
    windowMs: 60 * 1000,
    maxAttempts: 10,
  },
} as const;

export type AppointmentRateLimitStoreMode =
  | "memory-dev"
  | "memory-opt-in"
  | "upstash"
  | "misconfigured";

export function resolveAppointmentRateLimitStoreMode(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  storeEnv: string | undefined = process.env.APPOINTMENT_RATE_LIMIT_STORE,
): AppointmentRateLimitStoreMode {
  const store = storeEnv?.trim().toLowerCase();

  if (nodeEnv === "production") {
    if (store === "upstash") {
      return "upstash";
    }
    // memory / unset / unknown → never allow silent unprotected production.
    return "misconfigured";
  }

  if (store === "upstash") {
    return "upstash";
  }
  if (store === "memory") {
    return "memory-opt-in";
  }
  return "memory-dev";
}

export function hasUpstashCredentials(
  url: string | undefined = process.env.UPSTASH_REDIS_REST_URL,
  token: string | undefined = process.env.UPSTASH_REDIS_REST_TOKEN,
): boolean {
  return Boolean(url?.trim() && token?.trim());
}

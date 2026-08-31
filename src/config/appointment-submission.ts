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
 * Upstash credentials (server-only), preferred order:
 * - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (canonical)
 * - UPSTASH_REDIS_REST_KV_REST_API_URL + UPSTASH_REDIS_REST_KV_REST_API_TOKEN
 *   (Vercel Upstash integration naming; kept as compatibility fallback)
 * - KV_REST_API_URL + KV_REST_API_TOKEN (@upstash/redis fromEnv fallback names)
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

export type UpstashCredentialSource =
  | "UPSTASH_REDIS_REST_*"
  | "UPSTASH_REDIS_REST_KV_REST_API_*"
  | "KV_REST_API_*"
  | "explicit";

export type UpstashRestCredentials = {
  url: string;
  token: string;
  source: UpstashCredentialSource;
};

function asHttpsRestPair(
  url: string | undefined,
  token: string | undefined,
  source: UpstashCredentialSource,
): UpstashRestCredentials | null {
  const trimmedUrl = url?.trim() ?? "";
  const trimmedToken = token?.trim() ?? "";
  if (!trimmedUrl || !trimmedToken) {
    return null;
  }
  if (!trimmedUrl.startsWith("https://")) {
    return null;
  }
  return { url: trimmedUrl, token: trimmedToken, source };
}

/**
 * Read Upstash REST credentials for server-side rate limiting.
 * Trims whitespace (common when pasting into Vercel).
 * Requires HTTPS REST URL — never logs or returns secrets to clients.
 *
 * Call with zero arguments to resolve from process.env (canonical + fallbacks).
 * Call with explicit url/token to validate a specific pair (tests/overrides).
 */
export function readUpstashRestCredentials(
  url?: string,
  token?: string,
): UpstashRestCredentials | null {
  if (arguments.length > 0) {
    return asHttpsRestPair(url, token, "explicit");
  }

  return (
    asHttpsRestPair(
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.UPSTASH_REDIS_REST_TOKEN,
      "UPSTASH_REDIS_REST_*",
    ) ??
    asHttpsRestPair(
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
      "UPSTASH_REDIS_REST_KV_REST_API_*",
    ) ??
    asHttpsRestPair(
      process.env.KV_REST_API_URL,
      process.env.KV_REST_API_TOKEN,
      "KV_REST_API_*",
    )
  );
}

/** Non-secret metadata for ops logs when credentials fail to resolve. */
export function describeUpstashCredentialPresence(): Record<string, boolean> {
  const primaryUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const primaryToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  const kvUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL?.trim() ?? "";
  const kvToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN?.trim() ?? "";
  const legacyUrl = process.env.KV_REST_API_URL?.trim() ?? "";
  const legacyToken = process.env.KV_REST_API_TOKEN?.trim() ?? "";
  return {
    primaryUrlPresent: Boolean(primaryUrl),
    primaryUrlHttps: primaryUrl.startsWith("https://"),
    primaryTokenPresent: Boolean(primaryToken),
    kvPrefixedUrlPresent: Boolean(kvUrl),
    kvPrefixedUrlHttps: kvUrl.startsWith("https://"),
    kvPrefixedTokenPresent: Boolean(kvToken),
    legacyKvUrlPresent: Boolean(legacyUrl),
    legacyKvUrlHttps: legacyUrl.startsWith("https://"),
    legacyKvTokenPresent: Boolean(legacyToken),
    resolved: readUpstashRestCredentials() !== null,
  };
}

export function hasUpstashCredentials(
  url?: string,
  token?: string,
): boolean {
  if (arguments.length > 0) {
    return readUpstashRestCredentials(url, token) !== null;
  }
  return readUpstashRestCredentials() !== null;
}

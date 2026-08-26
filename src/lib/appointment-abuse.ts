import {
  appointmentSubmissionConfig,
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
  type AppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
import {
  enforceUpstashAppointmentLimit,
  enforceUpstashErrorReportLimit,
} from "@/lib/rate-limit/upstash-store";

export type AbuseRejectionReason =
  | "invalid_request"
  | "honeypot"
  | "rate_limited";

export type AbuseCheckResult =
  | { ok: true }
  | { ok: false; reason: AbuseRejectionReason };

type MemoryBucket = {
  timestamps: number[];
};

/**
 * Process-local attempt timestamps keyed by a transient IP-derived id.
 * Dev / explicit single-instance only — never a production fallback.
 */
const memoryBuckets = new Map<string, MemoryBucket>();

export function isHoneypotTriggered(website: unknown): boolean {
  if (website == null) {
    return false;
  }
  if (typeof website !== "string") {
    return true;
  }
  return website.trim().length > 0;
}

/**
 * Best-effort client IP for abuse prevention only.
 *
 * Trust model (Vercel / reverse-proxy deployments per BRD):
 * - Prefer `x-vercel-forwarded-for` when present (platform-controlled on Vercel)
 * - Else use the first `x-forwarded-for` hop as set by the trusted edge
 * - Else `x-real-ip`
 *
 * Direct Node without a trusted proxy may see spoofable XFF; production
 * should terminate TLS at a platform edge that overwrites these headers.
 */
export function getClientIpFromHeaders(headerStore: Headers): string {
  const vercelForwarded = headerStore
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (vercelForwarded) {
    return vercelForwarded;
  }

  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function pruneTimestamps(
  timestamps: number[],
  windowMs: number,
  now: number,
): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export type RateLimitDenialReason =
  | "rate_limited"
  | "store_unavailable"
  | "misconfigured";

export type RateLimitEvaluation =
  | {
      allowed: true;
      mode: AppointmentRateLimitStoreMode;
    }
  | {
      allowed: false;
      mode: AppointmentRateLimitStoreMode;
      reason: RateLimitDenialReason;
      retryAfterSeconds?: number;
    };

function evaluateMemoryRateLimit(
  scope: "appointment" | "error-report",
  clientIp: string,
  mode: Extract<AppointmentRateLimitStoreMode, "memory-dev" | "memory-opt-in">,
  now: number = Date.now(),
): RateLimitEvaluation {
  const config =
    scope === "appointment"
      ? {
          enabled: appointmentSubmissionConfig.rateLimit.enabled,
          windowMs: appointmentSubmissionConfig.rateLimit.windowMs,
          maxAttempts: appointmentSubmissionConfig.rateLimit.maxAttempts,
          burstWindowMs: appointmentSubmissionConfig.rateLimit.burstWindowMs,
          burstMaxAttempts:
            appointmentSubmissionConfig.rateLimit.burstMaxAttempts,
        }
      : {
          enabled: appointmentSubmissionConfig.errorReportRateLimit.enabled,
          windowMs: appointmentSubmissionConfig.errorReportRateLimit.windowMs,
          maxAttempts:
            appointmentSubmissionConfig.errorReportRateLimit.maxAttempts,
          burstWindowMs:
            appointmentSubmissionConfig.errorReportRateLimit.windowMs,
          burstMaxAttempts:
            appointmentSubmissionConfig.errorReportRateLimit.maxAttempts,
        };

  if (!config.enabled) {
    return { allowed: true, mode };
  }

  const retentionMs = Math.max(config.windowMs, config.burstWindowMs);
  const key = `${scope}:${clientIp}`;
  const existing = memoryBuckets.get(key);
  const timestamps = pruneTimestamps(
    existing?.timestamps ?? [],
    retentionMs,
    now,
  );

  const burstCount = timestamps.filter(
    (timestamp) => now - timestamp < config.burstWindowMs,
  ).length;
  const windowCount = timestamps.filter(
    (timestamp) => now - timestamp < config.windowMs,
  ).length;

  if (
    burstCount >= config.burstMaxAttempts ||
    windowCount >= config.maxAttempts
  ) {
    memoryBuckets.set(key, { timestamps });
    return {
      allowed: false,
      mode,
      reason: "rate_limited",
      retryAfterSeconds: 60,
    };
  }

  timestamps.push(now);
  memoryBuckets.set(key, { timestamps });
  return { allowed: true, mode };
}

export type RateLimitCheckOptions = {
  nodeEnv?: string;
  storeEnv?: string;
  upstashUrl?: string;
  upstashToken?: string;
};

async function enforceForScope(
  scope: "appointment" | "error-report",
  clientIp: string,
  options?: RateLimitCheckOptions,
): Promise<RateLimitEvaluation> {
  const mode = resolveAppointmentRateLimitStoreMode(
    options?.nodeEnv,
    options?.storeEnv,
  );

  if (mode === "misconfigured") {
    return { allowed: false, mode, reason: "misconfigured" };
  }

  if (mode === "upstash") {
    const credentialsConfigured =
      options &&
      (options.upstashUrl !== undefined || options.upstashToken !== undefined)
        ? hasUpstashCredentials(options.upstashUrl, options.upstashToken)
        : hasUpstashCredentials();

    if (!credentialsConfigured) {
      return { allowed: false, mode: "misconfigured", reason: "misconfigured" };
    }

    const result =
      scope === "appointment"
        ? await enforceUpstashAppointmentLimit(clientIp)
        : await enforceUpstashErrorReportLimit(clientIp);

    if (!result.ok) {
      return {
        allowed: false,
        mode: "upstash",
        reason: "store_unavailable",
      };
    }

    if (!result.allowed) {
      return {
        allowed: false,
        mode: "upstash",
        reason: "rate_limited",
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }

    return { allowed: true, mode: "upstash" };
  }

  return evaluateMemoryRateLimit(scope, clientIp, mode);
}

/**
 * Distributed-aware appointment rate limit.
 * Production without Upstash → denied (fail-closed). Never memory-fallback in prod.
 */
export async function checkAppointmentRateLimit(
  clientIp: string,
  options?: RateLimitCheckOptions,
): Promise<RateLimitEvaluation> {
  return enforceForScope("appointment", clientIp, options);
}

/**
 * Distributed-aware error-report rate limit.
 * Production without Upstash → denied (fail-closed).
 */
export async function checkErrorReportRateLimit(
  clientIp: string,
  options?: RateLimitCheckOptions,
): Promise<RateLimitEvaluation> {
  return enforceForScope("error-report", clientIp, options);
}

/** Test/support helper — does not run in normal request paths. */
export function resetAppointmentRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
}

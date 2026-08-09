import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { appointmentSubmissionConfig } from "@/config/appointment-submission";

let redisClient: Redis | null = null;
let appointmentBurst: Ratelimit | null = null;
let appointmentWindow: Ratelimit | null = null;
let errorReportLimit: Ratelimit | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    // Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function getAppointmentLimiters(): {
  burst: Ratelimit;
  window: Ratelimit;
} {
  if (!appointmentBurst || !appointmentWindow) {
    const redis = getRedis();
    const { rateLimit } = appointmentSubmissionConfig;

    appointmentBurst = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        rateLimit.burstMaxAttempts,
        `${Math.floor(rateLimit.burstWindowMs / 1000)} s`,
      ),
      prefix: "drvandana:rl:appointment:burst",
      analytics: false,
    });

    appointmentWindow = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        rateLimit.maxAttempts,
        `${Math.floor(rateLimit.windowMs / 1000)} s`,
      ),
      prefix: "drvandana:rl:appointment:window",
      analytics: false,
    });
  }

  return { burst: appointmentBurst, window: appointmentWindow };
}

function getErrorReportLimiter(): Ratelimit {
  if (!errorReportLimit) {
    const redis = getRedis();
    const { errorReportRateLimit } = appointmentSubmissionConfig;

    errorReportLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        errorReportRateLimit.maxAttempts,
        `${Math.floor(errorReportRateLimit.windowMs / 1000)} s`,
      ),
      prefix: "drvandana:rl:error-report",
      analytics: false,
    });
  }

  return errorReportLimit;
}

export type UpstashLimitResult =
  | { ok: true; allowed: true }
  | { ok: true; allowed: false; retryAfterSeconds: number }
  | { ok: false; reason: "store_error" };

function retryAfterSeconds(reset: number): number {
  const seconds = Math.ceil((reset - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

/**
 * Atomic distributed appointment limits (burst + window).
 * Stores only rate-limit counters under opaque key prefixes — never form data.
 */
export async function enforceUpstashAppointmentLimit(
  clientIp: string,
): Promise<UpstashLimitResult> {
  try {
    const { burst, window } = getAppointmentLimiters();
    const identity = `ip:${clientIp}`;

    const burstResult = await burst.limit(identity);
    if (!burstResult.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(burstResult.reset),
      };
    }

    const windowResult = await window.limit(identity);
    if (!windowResult.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(windowResult.reset),
      };
    }

    return { ok: true, allowed: true };
  } catch {
    return { ok: false, reason: "store_error" };
  }
}

export async function enforceUpstashErrorReportLimit(
  clientIp: string,
): Promise<UpstashLimitResult> {
  try {
    const limiter = getErrorReportLimiter();
    const result = await limiter.limit(`ip:${clientIp}`);

    if (!result.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }

    return { ok: true, allowed: true };
  } catch {
    return { ok: false, reason: "store_error" };
  }
}

/** Test helper — clears cached Redis/ratelimit clients. */
export function resetUpstashClientsForTests(): void {
  redisClient = null;
  appointmentBurst = null;
  appointmentWindow = null;
  errorReportLimit = null;
}

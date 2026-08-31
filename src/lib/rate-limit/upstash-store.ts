import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  appointmentSubmissionConfig,
  readUpstashRestCredentials,
} from "@/config/appointment-submission";
import { logStructured } from "@/lib/observability/logger";

let redisClient: Redis | null = null;
let appointmentBurst: Ratelimit | null = null;
let appointmentWindow: Ratelimit | null = null;
let errorReportLimit: Ratelimit | null = null;
let aiAskLimit: Ratelimit | null = null;
let aiAskLimitPerMinute = 12;
let questionSubmitLimit: Ratelimit | null = null;
let questionLoginLimit: Ratelimit | null = null;

function classifyUpstashError(error: unknown): {
  errorClass: string;
  httpStatus: number | null;
} {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/\b([45]\d\d)\b/);
  const httpStatus = statusMatch ? Number(statusMatch[1]) : null;
  const lower = message.toLowerCase();
  let errorClass = "unknown";
  if (httpStatus === 401 || lower.includes("unauthorized")) {
    errorClass = "auth_failure";
  } else if (httpStatus === 403 || lower.includes("forbidden")) {
    errorClass = "forbidden";
  } else if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused")
  ) {
    errorClass = "network_failure";
  } else if (lower.includes("upstash_credentials_missing")) {
    errorClass = "missing_credentials";
  }
  return { errorClass, httpStatus };
}

function recordUpstashStoreFailure(
  operation: string,
  error: unknown,
): void {
  const { errorClass, httpStatus } = classifyUpstashError(error);
  logStructured("ERROR", {
    operation,
    code: "UPSTASH_STORE_ERROR",
    source: "CONFIGURATION",
    errorClass,
    httpStatus,
    // Never log URL, token, Authorization, or raw exception messages
    // (messages can embed request URLs).
  });
}

/**
 * Explicit REST client using trimmed UPSTASH_REDIS_REST_URL/TOKEN.
 * Avoids Redis.fromEnv() so whitespace-padded Vercel secrets cannot
 * pass presence checks then fail authentication.
 */
function getRedis(): Redis {
  if (!redisClient) {
    const credentials = readUpstashRestCredentials();
    if (!credentials) {
      throw new Error("UPSTASH_CREDENTIALS_MISSING");
    }
    redisClient = new Redis({
      url: credentials.url,
      token: credentials.token,
    });
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
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashAppointmentLimit", error);
    return { ok: false, reason: "store_error" };
  }
}

export async function enforceUpstashAiAskLimit(
  clientIp: string,
  requestsPerMinute: number,
): Promise<UpstashLimitResult> {
  try {
    if (!aiAskLimit || aiAskLimitPerMinute !== requestsPerMinute) {
      aiAskLimitPerMinute = requestsPerMinute;
      aiAskLimit = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(requestsPerMinute, "60 s"),
        prefix: "drvandana:rl:ai:ask",
        analytics: false,
      });
    }

    const result = await aiAskLimit.limit(`ip:${clientIp}`);
    if (!result.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }
    return { ok: true, allowed: true };
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashAiAskLimit", error);
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
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashErrorReportLimit", error);
    return { ok: false, reason: "store_error" };
  }
}

export async function enforceUpstashQuestionLimit(
  clientIp: string,
  maxAttempts: number,
): Promise<UpstashLimitResult> {
  try {
    if (!questionSubmitLimit) {
      questionSubmitLimit = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(maxAttempts, "900 s"),
        prefix: "drvandana:rl:qportal:submit",
        analytics: false,
      });
    }
    const result = await questionSubmitLimit.limit(`ip:${clientIp}`);
    if (!result.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }
    return { ok: true, allowed: true };
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashQuestionLimit", error);
    return { ok: false, reason: "store_error" };
  }
}

export async function enforceUpstashQuestionLoginLimit(
  clientIp: string,
  maxAttempts: number,
): Promise<UpstashLimitResult> {
  try {
    if (!questionLoginLimit) {
      questionLoginLimit = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(maxAttempts, "900 s"),
        prefix: "drvandana:rl:qportal:login",
        analytics: false,
      });
    }
    const result = await questionLoginLimit.limit(`ip:${clientIp}`);
    if (!result.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }
    return { ok: true, allowed: true };
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashQuestionLoginLimit", error);
    return { ok: false, reason: "store_error" };
  }
}
const identityLimiters = new Map<string, Ratelimit>();

export async function enforceUpstashIdentityLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<UpstashLimitResult> {
  try {
    const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
    const cacheKey = `${maxAttempts}:${windowSeconds}`;
    let limiter = identityLimiters.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s`),
        prefix: "drvandana:rl:identity",
        analytics: false,
      });
      identityLimiters.set(cacheKey, limiter);
    }
    const result = await limiter.limit(key);
    if (!result.success) {
      return {
        ok: true,
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }
    return { ok: true, allowed: true };
  } catch (error) {
    recordUpstashStoreFailure("enforceUpstashIdentityLimit", error);
    return { ok: false, reason: "store_error" };
  }
}

export function resetUpstashClientsForTests(): void {
  redisClient = null;
  appointmentBurst = null;
  appointmentWindow = null;
  errorReportLimit = null;
  aiAskLimit = null;
  questionSubmitLimit = null;
  questionLoginLimit = null;
  identityLimiters.clear();
}

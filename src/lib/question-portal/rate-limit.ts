import { questionPortalConfig } from "@/config/question-portal";
import { getClientIpFromHeaders, type RateLimitEvaluation } from "@/lib/appointment-abuse";
import {
  enforceUpstashQuestionLimit,
  enforceUpstashQuestionLoginLimit,
} from "@/lib/rate-limit/upstash-store";
import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";

type MemoryBucket = { timestamps: number[] };
const buckets = new Map<string, MemoryBucket>();

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function memoryLimit(
  key: string,
  windowMs: number,
  maxAttempts: number,
  burstWindowMs: number,
  burstMax: number,
  now = Date.now(),
): RateLimitEvaluation {
  const mode = resolveAppointmentRateLimitStoreMode();
  if (mode === "misconfigured") {
    return { allowed: false, mode, reason: "misconfigured" };
  }
  if (mode === "upstash") {
    return { allowed: false, mode, reason: "misconfigured" };
  }
  const existing = buckets.get(key);
  const timestamps = prune(existing?.timestamps ?? [], windowMs, now);
  const burstCount = timestamps.filter(
    (timestamp) => now - timestamp < burstWindowMs,
  ).length;
  if (timestamps.length >= maxAttempts || burstCount >= burstMax) {
    buckets.set(key, { timestamps });
    return {
      allowed: false,
      mode,
      reason: "rate_limited",
      retryAfterSeconds: 60,
    };
  }
  timestamps.push(now);
  buckets.set(key, { timestamps });
  return { allowed: true, mode };
}

export async function checkQuestionSubmitRateLimit(
  clientIp: string,
): Promise<RateLimitEvaluation> {
  const mode = resolveAppointmentRateLimitStoreMode();
  if (mode === "upstash") {
    if (!hasUpstashCredentials()) {
      return { allowed: false, mode: "misconfigured", reason: "misconfigured" };
    }
    const result = await enforceUpstashQuestionLimit(
      clientIp,
      questionPortalConfig.rateLimit.maxAttempts,
    );
    if (!result.ok) {
      return { allowed: false, mode: "upstash", reason: "store_unavailable" };
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
  return memoryLimit(
    `qsubmit:${clientIp}`,
    questionPortalConfig.rateLimit.windowMs,
    questionPortalConfig.rateLimit.maxAttempts,
    questionPortalConfig.rateLimit.burstWindowMs,
    questionPortalConfig.rateLimit.burstMaxAttempts,
  );
}

export async function checkQuestionLoginRateLimit(
  clientIp: string,
): Promise<RateLimitEvaluation> {
  const mode = resolveAppointmentRateLimitStoreMode();
  if (mode === "upstash") {
    if (!hasUpstashCredentials()) {
      return { allowed: false, mode: "misconfigured", reason: "misconfigured" };
    }
    const result = await enforceUpstashQuestionLoginLimit(
      clientIp,
      questionPortalConfig.loginRateLimit.maxAttempts,
    );
    if (!result.ok) {
      return { allowed: false, mode: "upstash", reason: "store_unavailable" };
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
  return memoryLimit(
    `qlogin:${clientIp}`,
    questionPortalConfig.loginRateLimit.windowMs,
    questionPortalConfig.loginRateLimit.maxAttempts,
    questionPortalConfig.loginRateLimit.windowMs,
    questionPortalConfig.loginRateLimit.maxAttempts,
  );
}

export { getClientIpFromHeaders };
export type { RateLimitEvaluation };

export function resetQuestionRateLimitMemoryForTests(): void {
  buckets.clear();
}

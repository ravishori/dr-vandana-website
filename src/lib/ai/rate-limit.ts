import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
  type AppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
import { aiConfig } from "@/config/ai";
import { enforceUpstashAiAskLimit } from "@/lib/rate-limit/upstash-store";

type MemoryBucket = { timestamps: number[] };

const memoryBuckets = new Map<string, MemoryBucket>();

export type AiRateLimitEvaluation =
  | { allowed: true; mode: AppointmentRateLimitStoreMode }
  | {
      allowed: false;
      mode: AppointmentRateLimitStoreMode;
      reason: "rate_limited" | "store_unavailable" | "misconfigured";
      retryAfterSeconds?: number;
    };

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function evaluateMemory(
  clientIp: string,
  mode: Extract<AppointmentRateLimitStoreMode, "memory-dev" | "memory-opt-in">,
  now = Date.now(),
): AiRateLimitEvaluation {
  const windowMs = 60_000;
  const maxAttempts = aiConfig.rateLimitPerMinute;
  const key = `ai-ask:${clientIp}`;
  const existing = memoryBuckets.get(key);
  const timestamps = prune(existing?.timestamps ?? [], windowMs, now);

  if (timestamps.length >= maxAttempts) {
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

export async function checkAiAskRateLimit(
  clientIp: string,
): Promise<AiRateLimitEvaluation> {
  const mode = resolveAppointmentRateLimitStoreMode();

  if (mode === "misconfigured") {
    return { allowed: false, mode, reason: "misconfigured" };
  }

  if (mode === "upstash") {
    if (!hasUpstashCredentials()) {
      return { allowed: false, mode: "misconfigured", reason: "misconfigured" };
    }
    const result = await enforceUpstashAiAskLimit(
      clientIp,
      aiConfig.rateLimitPerMinute,
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

  return evaluateMemory(clientIp, mode);
}

export function resetAiAskRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
}

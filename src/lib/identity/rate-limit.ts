import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";
import { enforceUpstashIdentityLimit } from "@/lib/rate-limit/upstash-store";

export type IdentityRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type IdentityRateLimiter = {
  consume: (key: string, maxAttempts: number, windowMs: number) => Promise<IdentityRateLimitResult>;
};

export function createMemoryRateLimiter(): IdentityRateLimiter {
  const buckets = new Map<string, number[]>();

  return {
    async consume(key, maxAttempts, windowMs) {
      const now = Date.now();
      const existing = buckets.get(key) ?? [];
      const pruned = existing.filter((stamp) => now - stamp < windowMs);
      if (pruned.length >= maxAttempts) {
        buckets.set(key, pruned);
        const oldest = pruned[0] ?? now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + windowMs - now) / 1000),
        );
        return { allowed: false, retryAfterSeconds };
      }
      pruned.push(now);
      buckets.set(key, pruned);
      return { allowed: true };
    },
  };
}

export function createIdentityRateLimiter(): IdentityRateLimiter {
  const memory = createMemoryRateLimiter();
  return {
    async consume(key, maxAttempts, windowMs) {
      const mode = resolveAppointmentRateLimitStoreMode();
      if (mode === "misconfigured") {
        return { allowed: false, retryAfterSeconds: 60 };
      }
      if (mode === "upstash") {
        if (!hasUpstashCredentials()) {
          return { allowed: false, retryAfterSeconds: 60 };
        }
        const result = await enforceUpstashIdentityLimit(
          key,
          maxAttempts,
          windowMs,
        );
        if (!result.ok) {
          return { allowed: false, retryAfterSeconds: 60 };
        }
        if (!result.allowed) {
          return {
            allowed: false,
            retryAfterSeconds: result.retryAfterSeconds,
          };
        }
        return { allowed: true };
      }
      return memory.consume(key, maxAttempts, windowMs);
    },
  };
}

export const IDENTITY_RATE_LIMITS = {
  registerIp: { max: 5, windowMs: 15 * 60 * 1000 },
  loginIp: { max: 8, windowMs: 15 * 60 * 1000 },
  loginAccount: { max: 8, windowMs: 15 * 60 * 1000 },
  passwordResetIp: { max: 5, windowMs: 15 * 60 * 1000 },
  passwordResetEmail: { max: 3, windowMs: 15 * 60 * 1000 },
  emailResendIp: { max: 5, windowMs: 15 * 60 * 1000 },
  otpSendIp: { max: 5, windowMs: 15 * 60 * 1000 },
  otpSendAccount: { max: 5, windowMs: 15 * 60 * 1000 },
  otpVerifyIp: { max: 10, windowMs: 15 * 60 * 1000 },
  mfaVerifyIp: { max: 10, windowMs: 15 * 60 * 1000 },
} as const;

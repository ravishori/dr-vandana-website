import { Redis } from "@upstash/redis";

import { doctorPortalConfig } from "@/config/doctor-portal";

/**
 * Doctor login abuse protection.
 * Counts failed attempts only (IP + email). Never stores passwords or secrets.
 *
 * Production: distributed Upstash only — fail CLOSED if unavailable.
 * Development/test: local memory fallback is allowed.
 */

export type LoginRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterSeconds: number;
      reason: "RATE_LIMITED" | "STORE_UNAVAILABLE";
    };

export type LoginAttemptStore = {
  getFailureTimestamps(key: string): Promise<number[]>;
  addFailureTimestamp(key: string, at: number): Promise<void>;
  clearFailures(key: string): Promise<void>;
};

export type DoctorLoginRateLimitMode = "upstash" | "memory" | "misconfigured";

const { maxFailedAttempts, windowMs } = doctorPortalConfig.loginRateLimit;

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((stamp) => now - stamp < windowMs);
}

function retryAfterSeconds(timestamps: number[], now: number): number {
  if (timestamps.length === 0) {
    return Math.ceil(windowMs / 1000);
  }
  const oldest = Math.min(...timestamps);
  const seconds = Math.ceil((oldest + windowMs - now) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

export function createMemoryLoginAttemptStore(): LoginAttemptStore {
  const buckets = new Map<string, number[]>();
  return {
    async getFailureTimestamps(key: string): Promise<number[]> {
      return [...(buckets.get(key) ?? [])];
    },
    async addFailureTimestamp(key: string, at: number): Promise<void> {
      const next = prune([...(buckets.get(key) ?? []), at], at);
      buckets.set(key, next);
    },
    async clearFailures(key: string): Promise<void> {
      buckets.delete(key);
    },
  };
}

export function createUpstashLoginAttemptStore(redis: Redis): LoginAttemptStore {
  const prefix = "drvandana:doctor:login:fail:";
  return {
    async getFailureTimestamps(key: string): Promise<number[]> {
      const value = await redis.get<number[]>(`${prefix}${key}`);
      return Array.isArray(value) ? value : [];
    },
    async addFailureTimestamp(key: string, at: number): Promise<void> {
      const current = await this.getFailureTimestamps(key);
      const next = prune([...current, at], at);
      await redis.set(`${prefix}${key}`, next, { px: windowMs });
    },
    async clearFailures(key: string): Promise<void> {
      await redis.del(`${prefix}${key}`);
    },
  };
}

function hasUpstashEnv(
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): boolean {
  return Boolean(upstashUrl?.trim() && upstashToken?.trim());
}

/**
 * Resolve doctor login rate-limit store mode.
 * Production never falls back to memory.
 */
export function resolveDoctorLoginRateLimitMode(
  nodeEnv = process.env.NODE_ENV,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): DoctorLoginRateLimitMode {
  const upstashReady = hasUpstashEnv(upstashUrl, upstashToken);
  if (nodeEnv === "production") {
    return upstashReady ? "upstash" : "misconfigured";
  }
  if (upstashReady) {
    return "upstash";
  }
  return "memory";
}

const memoryStore = createMemoryLoginAttemptStore();
let overrideStore: LoginAttemptStore | null = null;
let overrideMode: DoctorLoginRateLimitMode | null = null;

export function setDoctorLoginAttemptStoreForTests(
  store: LoginAttemptStore | null,
): void {
  overrideStore = store;
}

export function setDoctorLoginRateLimitModeForTests(
  mode: DoctorLoginRateLimitMode | null,
): void {
  overrideMode = mode;
}

function resolveMode(): DoctorLoginRateLimitMode {
  return overrideMode ?? resolveDoctorLoginRateLimitMode();
}

function resolveStore(mode: DoctorLoginRateLimitMode): LoginAttemptStore {
  if (overrideStore) {
    return overrideStore;
  }
  if (mode === "upstash") {
    return createUpstashLoginAttemptStore(Redis.fromEnv());
  }
  if (mode === "memory") {
    return memoryStore;
  }
  throw new Error("DOCTOR_LOGIN_RATE_LIMIT_MISCONFIGURED");
}

export function buildDoctorLoginRateLimitKey(ip: string, email: string): string {
  const normalizedIp = ip.trim().toLowerCase() || "unknown";
  const normalizedEmail = email.trim().toLowerCase() || "unknown";
  return `ip:${normalizedIp}|email:${normalizedEmail}`;
}

/**
 * Production: fail CLOSED when the distributed store is unavailable.
 * Development/test: local memory fallback is permitted.
 */
export async function checkDoctorLoginRateLimit(
  ip: string,
  email: string,
): Promise<LoginRateLimitResult> {
  const mode = resolveMode();
  if (mode === "misconfigured") {
    return {
      allowed: false,
      retryAfterSeconds: 60,
      reason: "STORE_UNAVAILABLE",
    };
  }

  try {
    const store = resolveStore(mode);
    const key = buildDoctorLoginRateLimitKey(ip, email);
    const now = Date.now();
    const timestamps = prune(await store.getFailureTimestamps(key), now);
    if (timestamps.length >= maxFailedAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(timestamps, now),
        reason: "RATE_LIMITED",
      };
    }
    return { allowed: true };
  } catch {
    if (process.env.NODE_ENV === "production" || mode === "upstash") {
      return {
        allowed: false,
        retryAfterSeconds: 60,
        reason: "STORE_UNAVAILABLE",
      };
    }
    // Non-production memory path only: fail open on unexpected local errors.
    return { allowed: true };
  }
}

export async function recordDoctorLoginFailure(
  ip: string,
  email: string,
): Promise<void> {
  const mode = resolveMode();
  if (mode === "misconfigured") {
    return;
  }
  try {
    const store = resolveStore(mode);
    await store.addFailureTimestamp(
      buildDoctorLoginRateLimitKey(ip, email),
      Date.now(),
    );
  } catch {
    // Ignore store write errors after an already-rejected attempt.
  }
}

export async function clearDoctorLoginFailures(
  ip: string,
  email: string,
): Promise<void> {
  const mode = resolveMode();
  if (mode === "misconfigured") {
    return;
  }
  try {
    const store = resolveStore(mode);
    await store.clearFailures(buildDoctorLoginRateLimitKey(ip, email));
  } catch {
    // ignore
  }
}

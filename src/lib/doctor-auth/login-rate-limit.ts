import { Redis } from "@upstash/redis";

import { doctorPortalConfig } from "@/config/doctor-portal";

/**
 * Doctor login abuse protection.
 * Counts failed attempts only (IP + email). Never stores passwords or secrets.
 */

export type LoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type LoginAttemptStore = {
  getFailureTimestamps(key: string): Promise<number[]>;
  addFailureTimestamp(key: string, at: number): Promise<void>;
  clearFailures(key: string): Promise<void>;
};

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

function createUpstashLoginAttemptStore(redis: Redis): LoginAttemptStore {
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

function hasUpstashEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

const memoryStore = createMemoryLoginAttemptStore();
let overrideStore: LoginAttemptStore | null = null;

export function setDoctorLoginAttemptStoreForTests(
  store: LoginAttemptStore | null,
): void {
  overrideStore = store;
}

function resolveStore(): LoginAttemptStore {
  if (overrideStore) {
    return overrideStore;
  }
  if (hasUpstashEnv()) {
    try {
      return createUpstashLoginAttemptStore(Redis.fromEnv());
    } catch {
      return memoryStore;
    }
  }
  return memoryStore;
}

export function buildDoctorLoginRateLimitKey(ip: string, email: string): string {
  const normalizedIp = ip.trim().toLowerCase() || "unknown";
  const normalizedEmail = email.trim().toLowerCase() || "unknown";
  return `ip:${normalizedIp}|email:${normalizedEmail}`;
}

/**
 * On store failure, fail open so Redis outages cannot lock out the doctor.
 */
export async function checkDoctorLoginRateLimit(
  ip: string,
  email: string,
): Promise<LoginRateLimitResult> {
  try {
    const store = resolveStore();
    const key = buildDoctorLoginRateLimitKey(ip, email);
    const now = Date.now();
    const timestamps = prune(await store.getFailureTimestamps(key), now);
    if (timestamps.length >= maxFailedAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(timestamps, now),
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function recordDoctorLoginFailure(
  ip: string,
  email: string,
): Promise<void> {
  try {
    const store = resolveStore();
    await store.addFailureTimestamp(
      buildDoctorLoginRateLimitKey(ip, email),
      Date.now(),
    );
  } catch {
    // ignore store errors
  }
}

export async function clearDoctorLoginFailures(
  ip: string,
  email: string,
): Promise<void> {
  try {
    const store = resolveStore();
    await store.clearFailures(buildDoctorLoginRateLimitKey(ip, email));
  } catch {
    // ignore store errors
  }
}

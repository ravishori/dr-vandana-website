import { Redis } from "@upstash/redis";

/**
 * Content-admin login abuse protection.
 * Counts failed attempts only (does not lock out on successful auth).
 * Never stores passwords, hashes, or session secrets.
 */

export const CMS_LOGIN_RATE_LIMIT = {
  maxFailedAttempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export type LoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type LoginAttemptStore = {
  getFailureTimestamps(key: string): Promise<number[]>;
  addFailureTimestamp(key: string, at: number): Promise<void>;
  clearFailures(key: string): Promise<void>;
};

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((stamp) => now - stamp < windowMs);
}

function retryAfterSeconds(timestamps: number[], now: number): number {
  if (timestamps.length === 0) {
    return Math.ceil(CMS_LOGIN_RATE_LIMIT.windowMs / 1000);
  }
  const oldest = Math.min(...timestamps);
  const seconds = Math.ceil(
    (oldest + CMS_LOGIN_RATE_LIMIT.windowMs - now) / 1000,
  );
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

export function createMemoryLoginAttemptStore(): LoginAttemptStore {
  const buckets = new Map<string, number[]>();
  return {
    async getFailureTimestamps(key: string): Promise<number[]> {
      return [...(buckets.get(key) ?? [])];
    },
    async addFailureTimestamp(key: string, at: number): Promise<void> {
      const next = prune(
        [...(buckets.get(key) ?? []), at],
        at,
        CMS_LOGIN_RATE_LIMIT.windowMs,
      );
      buckets.set(key, next);
    },
    async clearFailures(key: string): Promise<void> {
      buckets.delete(key);
    },
  };
}

function createUpstashLoginAttemptStore(redis: Redis): LoginAttemptStore {
  const prefix = "drvandana:cms:login:fail:";
  return {
    async getFailureTimestamps(key: string): Promise<number[]> {
      const value = await redis.get<number[]>(`${prefix}${key}`);
      return Array.isArray(value) ? value : [];
    },
    async addFailureTimestamp(key: string, at: number): Promise<void> {
      const current = await this.getFailureTimestamps(key);
      const next = prune([...current, at], at, CMS_LOGIN_RATE_LIMIT.windowMs);
      await redis.set(`${prefix}${key}`, next, {
        px: CMS_LOGIN_RATE_LIMIT.windowMs,
      });
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

export function setLoginAttemptStoreForTests(
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

export function buildLoginRateLimitKey(ip: string, email: string): string {
  const normalizedIp = ip.trim().toLowerCase() || "unknown";
  const normalizedEmail = email.trim().toLowerCase() || "unknown";
  return `ip:${normalizedIp}|email:${normalizedEmail}`;
}

/**
 * Returns whether another login attempt is allowed for this IP+email pair.
 * On store failure, fails open (allows attempt) so Redis outages cannot lock out the admin.
 */
export async function checkContentAdminLoginRateLimit(
  ip: string,
  email: string,
  now = Date.now(),
): Promise<LoginRateLimitResult> {
  const key = buildLoginRateLimitKey(ip, email);
  try {
    const store = resolveStore();
    const failures = prune(
      await store.getFailureTimestamps(key),
      now,
      CMS_LOGIN_RATE_LIMIT.windowMs,
    );
    if (failures.length >= CMS_LOGIN_RATE_LIMIT.maxFailedAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(failures, now),
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function recordContentAdminLoginFailure(
  ip: string,
  email: string,
  now = Date.now(),
): Promise<void> {
  const key = buildLoginRateLimitKey(ip, email);
  try {
    await resolveStore().addFailureTimestamp(key, now);
  } catch {
    // Fail open — do not block authentication paths on telemetry store errors.
  }
}

export async function clearContentAdminLoginFailures(
  ip: string,
  email: string,
): Promise<void> {
  const key = buildLoginRateLimitKey(ip, email);
  try {
    await resolveStore().clearFailures(key);
  } catch {
    // Ignore clear failures.
  }
}

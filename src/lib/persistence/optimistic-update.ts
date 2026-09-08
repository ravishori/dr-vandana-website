/**
 * Optimistic concurrency helpers for versioned document stores.
 * Lost updates are rejected via compare-and-set on a monotonic revision.
 */

export class ConcurrencyConflictError extends Error {
  constructor(message = "CONCURRENCY_CONFLICT") {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export type VersionedDocument = {
  revision: number;
};

export async function runOptimisticUpdate<T extends VersionedDocument>(options: {
  read: () => Promise<T>;
  compareAndSet: (expectedRevision: number, next: T) => Promise<boolean>;
  mutator: (current: T) => T | Promise<T>;
  clone: (value: T) => T;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await options.read();
    const expectedRevision =
      typeof current.revision === "number" && Number.isFinite(current.revision)
        ? current.revision
        : 0;
    const drafted = await options.mutator(options.clone(current));
    const next: T = {
      ...drafted,
      revision: expectedRevision + 1,
    };
    const saved = await options.compareAndSet(expectedRevision, next);
    if (saved) {
      return next;
    }
  }

  throw new ConcurrencyConflictError();
}

/** Lua: compare revision key, then set document + revision atomically. */
export const REDIS_COMPARE_AND_SET_LUA = `
local current = redis.call('GET', KEYS[2])
if (not current) then
  current = '0'
end
if current ~= ARGV[1] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3])
return 1
`;

import { Redis } from "@upstash/redis";

import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
  isCommunicationsBundle,
  updateCommunicationsBundle,
  type CommunicationsRepository,
} from "@/lib/communications/repository";
import { REDIS_COMPARE_AND_SET_LUA } from "@/lib/persistence/optimistic-update";
import type { CommunicationsBundle } from "@/types/communications";

export const COMMUNICATIONS_REDIS_KEY = "drvandana:communications:bundle:v1";
export const COMMUNICATIONS_REDIS_REVISION_KEY =
  "drvandana:communications:bundle:v1:rev";

export class UpstashCommunicationsRepository
  implements CommunicationsRepository
{
  private readonly redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? Redis.fromEnv();
  }

  async read(): Promise<CommunicationsBundle> {
    const [value, revisionRaw] = await Promise.all([
      this.redis.get<CommunicationsBundle | string>(COMMUNICATIONS_REDIS_KEY),
      this.redis.get<string | number>(COMMUNICATIONS_REDIS_REVISION_KEY),
    ]);

    let parsed: unknown = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return emptyCommunicationsBundle();
      }
    }

    if (!parsed || !isCommunicationsBundle(parsed)) {
      return emptyCommunicationsBundle();
    }
    const fromDoc = cloneCommunicationsBundle(
      parsed as CommunicationsBundle,
    );
    const fromKey =
      typeof revisionRaw === "number"
        ? revisionRaw
        : typeof revisionRaw === "string" && revisionRaw.trim()
          ? Number(revisionRaw)
          : NaN;
    return {
      ...fromDoc,
      revision: Number.isFinite(fromKey) ? fromKey : fromDoc.revision,
    };
  }

  async write(bundle: CommunicationsBundle): Promise<void> {
    const normalized = cloneCommunicationsBundle(bundle);
    await this.redis.set(COMMUNICATIONS_REDIS_KEY, normalized);
    await this.redis.set(
      COMMUNICATIONS_REDIS_REVISION_KEY,
      String(normalized.revision),
    );
  }

  async compareAndSet(
    expectedRevision: number,
    next: CommunicationsBundle,
  ): Promise<boolean> {
    const normalized = cloneCommunicationsBundle(next);
    const payload = JSON.stringify(normalized);
    const result = await this.redis.eval(
      REDIS_COMPARE_AND_SET_LUA,
      [COMMUNICATIONS_REDIS_KEY, COMMUNICATIONS_REDIS_REVISION_KEY],
      [String(expectedRevision), payload, String(normalized.revision)],
    );
    return result === 1 || result === "1";
  }

  async update(
    mutator: (
      current: CommunicationsBundle,
    ) => CommunicationsBundle | Promise<CommunicationsBundle>,
  ): Promise<CommunicationsBundle> {
    return updateCommunicationsBundle(this, mutator);
  }

  async ensureSeeded(): Promise<void> {
    const current = await this.read();
    if (!current.conversations) {
      await this.write(emptyCommunicationsBundle());
    }
  }
}

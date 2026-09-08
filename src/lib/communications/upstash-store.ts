import { Redis } from "@upstash/redis";

import {
  cloneCommunicationsBundle,
  emptyCommunicationsBundle,
  isCommunicationsBundle,
  type CommunicationsRepository,
} from "@/lib/communications/repository";
import type { CommunicationsBundle } from "@/types/communications";

export const COMMUNICATIONS_REDIS_KEY = "drvandana:communications:bundle:v1";

export class UpstashCommunicationsRepository
  implements CommunicationsRepository
{
  private readonly redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? Redis.fromEnv();
  }

  async read(): Promise<CommunicationsBundle> {
    const value = await this.redis.get<CommunicationsBundle>(
      COMMUNICATIONS_REDIS_KEY,
    );
    if (!value || !isCommunicationsBundle(value)) {
      return emptyCommunicationsBundle();
    }
    return cloneCommunicationsBundle(value);
  }

  async write(bundle: CommunicationsBundle): Promise<void> {
    await this.redis.set(
      COMMUNICATIONS_REDIS_KEY,
      cloneCommunicationsBundle(bundle),
    );
  }

  async ensureSeeded(): Promise<void> {
    const current = await this.read();
    if (!current.conversations) {
      await this.write(emptyCommunicationsBundle());
    }
  }
}

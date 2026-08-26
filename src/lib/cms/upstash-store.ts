import { Redis } from "@upstash/redis";

import { cmsSeedBundle } from "@/data/cms/seed";
import {
  cloneBundle,
  emptyBundle,
  type CmsRepository,
} from "@/lib/cms/repository";
import type { CmsContentBundle } from "@/types/cms";

const REDIS_KEY = "drvandana:cms:content-bundle:v1";

export class UpstashCmsRepository implements CmsRepository {
  private readonly redis: Redis;

  constructor() {
    this.redis = Redis.fromEnv();
  }

  async read(): Promise<CmsContentBundle> {
    const value = await this.redis.get<CmsContentBundle>(REDIS_KEY);
    if (!value) {
      return emptyBundle();
    }
    return cloneBundle(value);
  }

  async write(bundle: CmsContentBundle): Promise<void> {
    await this.redis.set(REDIS_KEY, cloneBundle(bundle));
  }

  async ensureSeeded(seed: CmsContentBundle = cmsSeedBundle): Promise<void> {
    const current = await this.read();
    if (
      current.articles.length === 0 &&
      current.resources.length === 0 &&
      current.videos.length === 0
    ) {
      await this.write(seed);
    }
  }
}

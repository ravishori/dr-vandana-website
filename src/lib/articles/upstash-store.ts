import { Redis } from "@upstash/redis";

import {
  articlesSeedBundle,
  cloneArticlesBundle,
  emptyArticlesBundle,
} from "@/data/articles/seed";
import {
  isArticlesBundle,
  type ArticlesRepository,
} from "@/lib/articles/repository";
import type { ArticlesBundle } from "@/types/articles";

export const ARTICLES_REDIS_KEY = "drvandana:articles:bundle:v1";

export class UpstashArticlesRepository implements ArticlesRepository {
  private readonly redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? Redis.fromEnv();
  }

  async read(): Promise<ArticlesBundle> {
    const value = await this.redis.get<ArticlesBundle>(ARTICLES_REDIS_KEY);
    if (!value || !isArticlesBundle(value)) {
      return emptyArticlesBundle();
    }
    return cloneArticlesBundle(value);
  }

  async write(bundle: ArticlesBundle): Promise<void> {
    await this.redis.set(ARTICLES_REDIS_KEY, cloneArticlesBundle(bundle));
  }

  async ensureSeeded(seed: ArticlesBundle = articlesSeedBundle): Promise<void> {
    const current = await this.read();
    if (current.articles.length === 0) {
      await this.write(seed);
    }
  }
}

import { Redis } from "@upstash/redis";

import {
  articlesSeedBundle,
  cloneArticlesBundle,
  emptyArticlesBundle,
} from "@/data/articles/seed";
import {
  isArticlesBundle,
  normalizeArticlesBundle,
  updateArticlesBundle,
  type ArticlesRepository,
} from "@/lib/articles/repository";
import {
  REDIS_COMPARE_AND_SET_LUA,
} from "@/lib/persistence/optimistic-update";
import type { ArticlesBundle } from "@/types/articles";

export const ARTICLES_REDIS_KEY = "drvandana:articles:bundle:v1";
export const ARTICLES_REDIS_REVISION_KEY = "drvandana:articles:bundle:v1:rev";

export class UpstashArticlesRepository implements ArticlesRepository {
  private readonly redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis ?? Redis.fromEnv();
  }

  async read(): Promise<ArticlesBundle> {
    const [value, revisionRaw] = await Promise.all([
      this.redis.get<ArticlesBundle | string>(ARTICLES_REDIS_KEY),
      this.redis.get<string | number>(ARTICLES_REDIS_REVISION_KEY),
    ]);

    let parsed: unknown = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        return emptyArticlesBundle();
      }
    }

    if (!parsed || !isArticlesBundle(parsed)) {
      return emptyArticlesBundle();
    }
    const fromDoc = normalizeArticlesBundle(cloneArticlesBundle(parsed));
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

  async write(bundle: ArticlesBundle): Promise<void> {
    const normalized = normalizeArticlesBundle(cloneArticlesBundle(bundle));
    await this.redis.set(ARTICLES_REDIS_KEY, normalized);
    await this.redis.set(ARTICLES_REDIS_REVISION_KEY, String(normalized.revision));
  }

  async compareAndSet(
    expectedRevision: number,
    next: ArticlesBundle,
  ): Promise<boolean> {
    const normalized = normalizeArticlesBundle(cloneArticlesBundle(next));
    const payload = JSON.stringify(normalized);
    const result = await this.redis.eval(
      REDIS_COMPARE_AND_SET_LUA,
      [ARTICLES_REDIS_KEY, ARTICLES_REDIS_REVISION_KEY],
      [String(expectedRevision), payload, String(normalized.revision)],
    );
    return result === 1 || result === "1";
  }

  async update(
    mutator: (current: ArticlesBundle) => ArticlesBundle | Promise<ArticlesBundle>,
  ): Promise<ArticlesBundle> {
    return updateArticlesBundle(this, mutator, cloneArticlesBundle);
  }

  async ensureSeeded(seed: ArticlesBundle = articlesSeedBundle): Promise<void> {
    await this.update((current) => {
      if (current.articles.length > 0) {
        return current;
      }
      return cloneArticlesBundle(seed);
    });
  }
}

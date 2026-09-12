import { articlesSeedBundle } from "@/data/articles/seed";
import { FileArticlesRepository } from "@/lib/articles/file-store";
import { MemoryArticlesRepository } from "@/lib/articles/memory-store";
import type { ArticlesRepository } from "@/lib/articles/repository";
import { UpstashArticlesRepository } from "@/lib/articles/upstash-store";

export type ArticlesStoreMode = "memory" | "file" | "upstash" | "misconfigured";

export const ARTICLES_PRODUCTION_STORE_ERROR =
  "ARTICLES_STORE_MISCONFIGURED: Production requires a durable articles store. Set ARTICLES_STORE=upstash together with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. File and memory stores are not permitted in production.";

function hasUpstashCredentials(
  upstashUrl?: string,
  upstashToken?: string,
): boolean {
  return Boolean(upstashUrl?.trim() && upstashToken?.trim());
}

/**
 * Resolve articles persistence mode.
 * Production fail-closed: only durable Upstash is allowed.
 */
export function resolveArticlesStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.ARTICLES_STORE,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): ArticlesStoreMode {
  const store = storeEnv?.trim().toLowerCase();
  const upstashReady = hasUpstashCredentials(upstashUrl, upstashToken);
  const isProduction = nodeEnv === "production";

  if (isProduction) {
    if (store === "memory" || store === "file") {
      return "misconfigured";
    }
    if (store && store !== "upstash") {
      return "misconfigured";
    }
    return upstashReady ? "upstash" : "misconfigured";
  }

  if (store === "memory") {
    return "memory";
  }
  if (store === "file") {
    return "file";
  }
  if (store === "upstash") {
    return upstashReady ? "upstash" : "misconfigured";
  }
  if (upstashReady) {
    return "upstash";
  }
  if (nodeEnv === "test") {
    return "memory";
  }
  return "file";
}

let repository: ArticlesRepository | null = null;

export async function getArticlesRepository(): Promise<ArticlesRepository> {
  if (!repository) {
    const mode = resolveArticlesStoreMode();
    if (mode === "misconfigured") {
      throw new Error(ARTICLES_PRODUCTION_STORE_ERROR);
    }
    if (mode === "upstash") {
      repository = new UpstashArticlesRepository();
    } else if (mode === "memory") {
      repository = new MemoryArticlesRepository();
    } else {
      repository = new FileArticlesRepository(
        process.env.ARTICLES_DATABASE_PATH?.trim() ||
          "data/articles/articles-store.json",
      );
    }
  }
  await repository.ensureSeeded(articlesSeedBundle);
  return repository;
}

export function setArticlesRepositoryForTests(
  next: ArticlesRepository | null,
): void {
  repository = next;
}

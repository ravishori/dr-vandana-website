import { cmsConfig } from "@/config/cms";
import { cmsSeedBundle } from "@/data/cms/seed";
import { FileCmsRepository } from "@/lib/cms/file-store";
import { MemoryCmsRepository } from "@/lib/cms/memory-store";
import type { CmsRepository } from "@/lib/cms/repository";
import { UpstashCmsRepository } from "@/lib/cms/upstash-store";

export type CmsStoreMode = "memory" | "file" | "upstash" | "misconfigured";

export const CMS_PRODUCTION_STORE_ERROR =
  "CMS_STORE_MISCONFIGURED: Production requires a durable CMS store. Set CMS_STORE=upstash together with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. File and memory stores are not permitted in production.";

function hasUpstashCredentials(
  upstashUrl?: string,
  upstashToken?: string,
): boolean {
  return Boolean(upstashUrl?.trim() && upstashToken?.trim());
}

/**
 * Resolve CMS persistence mode.
 * Production fail-closed: only durable Upstash is allowed.
 * Development/test: memory and file remain available.
 */
export function resolveCmsStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env[cmsConfig.storeEnvKey],
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): CmsStoreMode {
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

let repository: CmsRepository | null = null;

export async function getCmsRepository(): Promise<CmsRepository> {
  if (!repository) {
    const mode = resolveCmsStoreMode();
    if (mode === "misconfigured") {
      throw new Error(CMS_PRODUCTION_STORE_ERROR);
    }
    if (mode === "upstash") {
      repository = new UpstashCmsRepository();
    } else if (mode === "memory") {
      repository = new MemoryCmsRepository();
    } else {
      repository = new FileCmsRepository(
        process.env[cmsConfig.filePathEnvKey]?.trim() ||
          cmsConfig.defaultFilePath,
      );
    }
  }
  await repository.ensureSeeded(cmsSeedBundle);
  return repository;
}

export function setCmsRepositoryForTests(next: CmsRepository | null): void {
  repository = next;
}

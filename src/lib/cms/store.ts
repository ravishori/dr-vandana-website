import { cmsConfig } from "@/config/cms";
import { cmsSeedBundle } from "@/data/cms/seed";
import { FileCmsRepository } from "@/lib/cms/file-store";
import { MemoryCmsRepository } from "@/lib/cms/memory-store";
import type { CmsRepository } from "@/lib/cms/repository";
import { UpstashCmsRepository } from "@/lib/cms/upstash-store";

export type CmsStoreMode = "memory" | "file" | "upstash" | "misconfigured";

export function resolveCmsStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env[cmsConfig.storeEnvKey],
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): CmsStoreMode {
  const store = storeEnv?.trim().toLowerCase();
  if (store === "memory") {
    return "memory";
  }
  if (store === "file") {
    return "file";
  }
  if (store === "upstash") {
    return upstashUrl?.trim() && upstashToken?.trim()
      ? "upstash"
      : "misconfigured";
  }
  if (upstashUrl?.trim() && upstashToken?.trim()) {
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
      throw new Error("CMS_STORE_MISCONFIGURED");
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

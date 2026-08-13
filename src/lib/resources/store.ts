import { curatedResourceSeed } from "@/data/resources/seed";
import { MemoryResourceRepository } from "@/lib/resources/memory-store";
import type { ResourceRepository } from "@/lib/resources/repository";
import { SqliteResourceRepository } from "@/lib/resources/sqlite-store";
import { UpstashResourceRepository } from "@/lib/resources/upstash-store";

export type ResourceStoreMode = "memory" | "sqlite" | "upstash" | "misconfigured";

export function resolveResourceStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.RESOURCE_STORE,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): ResourceStoreMode {
  const store = storeEnv?.trim().toLowerCase();
  if (store === "memory") {
    return nodeEnv === "production" ? "misconfigured" : "memory";
  }
  if (store === "sqlite") {
    return "sqlite";
  }
  if (store === "upstash") {
    return upstashUrl?.trim() && upstashToken?.trim()
      ? "upstash"
      : "misconfigured";
  }
  if (upstashUrl?.trim() && upstashToken?.trim()) {
    return "upstash";
  }
  if (nodeEnv === "production") {
    // Public catalogue can still render from in-process seed via memory
    // fallback only when explicitly forced; prefer fail-open to seed memory
    // for read-only browsing when no store is configured.
    return "memory";
  }
  return "sqlite";
}

let repository: ResourceRepository | null = null;

export async function getResourceRepository(): Promise<ResourceRepository> {
  if (!repository) {
    const mode = resolveResourceStoreMode();
    if (mode === "misconfigured") {
      throw new Error("RESOURCE_STORE_MISCONFIGURED");
    }
    if (mode === "upstash") {
      repository = new UpstashResourceRepository();
    } else if (mode === "memory") {
      repository = new MemoryResourceRepository();
    } else {
      repository = new SqliteResourceRepository(
        process.env.RESOURCE_DATABASE_PATH?.trim() ||
          "data/resource-library.sqlite",
      );
    }
  }
  await repository.ensureSeeded(curatedResourceSeed);
  return repository;
}

export function setResourceRepositoryForTests(
  next: ResourceRepository | null,
): void {
  repository = next;
}

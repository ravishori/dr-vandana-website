import {
  curatedCrisisSeed,
  initialCrisisVerifications,
} from "@/data/crisis/seed";
import { MemoryCrisisRepository } from "@/lib/crisis/memory-store";
import type { CrisisRepository } from "@/lib/crisis/repository";
import { SqliteCrisisRepository } from "@/lib/crisis/sqlite-store";
import { UpstashCrisisRepository } from "@/lib/crisis/upstash-store";

export type CrisisStoreMode = "memory" | "sqlite" | "upstash" | "misconfigured";

export function resolveCrisisStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.CRISIS_STORE,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): CrisisStoreMode {
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
    // Prefer fail-open to in-process seed for public safety pages when no
    // durable store is configured; admin writes will not persist.
    return "memory";
  }
  return "sqlite";
}

let repository: CrisisRepository | null = null;

export async function getCrisisRepository(): Promise<CrisisRepository> {
  if (!repository) {
    const mode = resolveCrisisStoreMode();
    if (mode === "misconfigured") {
      throw new Error("CRISIS_STORE_MISCONFIGURED");
    }
    if (mode === "upstash") {
      repository = new UpstashCrisisRepository();
    } else if (mode === "memory") {
      repository = new MemoryCrisisRepository();
    } else {
      repository = new SqliteCrisisRepository(
        process.env.CRISIS_DATABASE_PATH?.trim() || "data/crisis-resources.sqlite",
      );
    }
  }
  await repository.ensureSeeded(curatedCrisisSeed, initialCrisisVerifications);
  return repository;
}

export function setCrisisRepositoryForTests(
  next: CrisisRepository | null,
): void {
  repository = next;
}

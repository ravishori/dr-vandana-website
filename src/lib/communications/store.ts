import { FileCommunicationsRepository } from "@/lib/communications/file-store";
import { MemoryCommunicationsRepository } from "@/lib/communications/memory-store";
import type { CommunicationsRepository } from "@/lib/communications/repository";
import { UpstashCommunicationsRepository } from "@/lib/communications/upstash-store";

export type CommunicationsStoreMode =
  | "memory"
  | "file"
  | "upstash"
  | "misconfigured";

export const COMMUNICATIONS_PRODUCTION_STORE_ERROR =
  "COMMUNICATIONS_STORE_MISCONFIGURED: Production requires a durable communications store. Set COMMUNICATIONS_STORE=upstash together with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. File and memory stores are not permitted in production.";

function hasUpstashCredentials(
  upstashUrl?: string,
  upstashToken?: string,
): boolean {
  return Boolean(upstashUrl?.trim() && upstashToken?.trim());
}

export function resolveCommunicationsStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.COMMUNICATIONS_STORE,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): CommunicationsStoreMode {
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

let repository: CommunicationsRepository | null = null;

export async function getCommunicationsRepository(): Promise<CommunicationsRepository> {
  if (!repository) {
    const mode = resolveCommunicationsStoreMode();
    if (mode === "misconfigured") {
      throw new Error(COMMUNICATIONS_PRODUCTION_STORE_ERROR);
    }
    if (mode === "upstash") {
      repository = new UpstashCommunicationsRepository();
    } else if (mode === "memory") {
      repository = new MemoryCommunicationsRepository();
    } else {
      repository = new FileCommunicationsRepository(
        process.env.COMMUNICATIONS_DATABASE_PATH?.trim() ||
          "data/communications/communications-store.json",
      );
    }
  }
  await repository.ensureSeeded();
  return repository;
}

export function setCommunicationsRepositoryForTests(
  next: CommunicationsRepository | null,
): void {
  repository = next;
}

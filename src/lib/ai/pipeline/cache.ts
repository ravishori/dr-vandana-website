import { createHash } from "node:crypto";

import { aiConfig } from "@/config/ai";
import { KNOWLEDGE_CORPUS_VERSION } from "@/lib/ai/pipeline/debug";
import type { AskAiResponse } from "@/types/ai";

type CacheEntry = {
  expiresAt: number;
  value: AskAiResponse;
};

const cache = new Map<string, CacheEntry>();

export function educationalCacheKey(question: string, language: string): string {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256")
    .update(`${KNOWLEDGE_CORPUS_VERSION}:${language}:${normalized}`)
    .digest("hex");
}

export function getCachedEducationalAnswer(key: string): AskAiResponse | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return {
    ...entry.value,
    conversation_id: entry.value.conversation_id,
  };
}

export function setCachedEducationalAnswer(
  key: string,
  value: AskAiResponse,
): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + aiConfig.cacheTtlMs,
  });
}

export function resetEducationalCacheForTests(): void {
  cache.clear();
}

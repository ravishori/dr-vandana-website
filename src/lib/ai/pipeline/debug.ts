/** Bump when approved knowledge content changes to invalidate answer cache. */
export const KNOWLEDGE_CORPUS_VERSION = "2026-09-02-v5-relevance-lock";

export function logAskAiDebug(payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development" && process.env.ASK_AI_DEBUG !== "1") {
    return;
  }
  console.info(
    JSON.stringify({
      tag: "ASK_AI_DEBUG",
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

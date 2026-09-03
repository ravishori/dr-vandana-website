/**
 * Ask Dr. Vandana AI — server configuration.
 * Import only from server modules. Never expose API keys to the client.
 */

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function readOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const aiConfig = {
  provider: (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase(),
  model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
  apiKey: readOptionalString(process.env.AI_API_KEY),
  apiBaseUrl:
    readOptionalString(process.env.AI_API_BASE_URL) ?? "https://api.openai.com/v1",
  vectorDatabaseUrl: readOptionalString(process.env.VECTOR_DATABASE_URL),
  maxQuestionLength: readPositiveInt(
    process.env.MAX_QUESTION_LENGTH,
    2_000,
    80,
    8_000,
  ),
  maxOutputTokens: readPositiveInt(process.env.MAX_TOKENS, 700, 120, 2_000),
  rateLimitPerMinute: readPositiveInt(
    process.env.RATE_LIMIT_PER_MINUTE,
    12,
    3,
    60,
  ),
  retrievalLimit: 5,
  minRetrievalScore: 0.12,
  conversationTtlMs: 30 * 60 * 1000,
  maxConversationTurns: 8,
  cacheTtlMs: 10 * 60 * 1000,
} as const;

export type AiProviderMode = "openai-compatible" | "educational-fallback";

export function resolveAiProviderMode(
  provider = aiConfig.provider,
  apiKey = aiConfig.apiKey,
): AiProviderMode {
  if (provider === "fallback" || provider === "educational") {
    return "educational-fallback";
  }
  if (provider === "openai" || provider === "openai-compatible") {
    return apiKey ? "openai-compatible" : "educational-fallback";
  }
  return apiKey ? "openai-compatible" : "educational-fallback";
}

export function isAiLlmConfigured(): boolean {
  return resolveAiProviderMode() === "openai-compatible";
}

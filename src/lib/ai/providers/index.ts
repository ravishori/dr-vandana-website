import { resolveAiProviderMode } from "@/config/ai";
import { EducationalFallbackProvider } from "@/lib/ai/providers/educational-fallback";
import { OpenAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { AIProvider } from "@/lib/ai/providers/types";

export function createAiProvider(): AIProvider {
  const mode = resolveAiProviderMode();
  if (mode === "openai-compatible") {
    return new OpenAiCompatibleProvider();
  }
  return new EducationalFallbackProvider();
}

export type { AIProvider } from "@/lib/ai/providers/types";

import { resolveAiProviderMode } from "@/config/ai";
import { ControlledAnswerProvider } from "@/lib/ai/answers/controlled-composer";
import { OpenAiCompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { AIProvider } from "@/lib/ai/providers/types";

export function createAiProvider(): AIProvider {
  const mode = resolveAiProviderMode();
  if (mode === "openai-compatible") {
    return new OpenAiCompatibleProvider();
  }
  return new ControlledAnswerProvider();
}

export type { AIProvider } from "@/lib/ai/providers/types";

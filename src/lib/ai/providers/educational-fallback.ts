import {
  composeControlledAnswer,
  ControlledAnswerProvider,
  extractRelatedQuestionsV2,
  extractUsedSources,
} from "@/lib/ai/answers/controlled-composer";
import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import type { AIProvider, GenerateResponseInput } from "@/lib/ai/providers/types";
import type { RetrievedChunk, SafetyCategory } from "@/types/ai";

/** @deprecated Use ControlledAnswerProvider. Kept for test compatibility. */
export class EducationalFallbackProvider implements AIProvider {
  readonly name = "educational-fallback";
  private readonly inner = new ControlledAnswerProvider();

  async generateResponse(input: GenerateResponseInput): Promise<string> {
    return this.inner.generateResponse(input);
  }
}

export function composeEducationalAnswer(input: GenerateResponseInput): string {
  return composeControlledAnswer({
    question: input.question,
    intent: input.intent ?? "GENERAL_EDUCATION",
    topic: input.topic ?? "general-education",
    category: input.category,
    primary: input.retrieved[0] ?? null,
    secondary: input.retrieved.slice(1),
  });
}

export function extractRelatedQuestions(
  answer: string,
  retrieved: readonly RetrievedChunk[],
  topic = retrieved[0]?.topic ?? "general-education",
): string[] {
  return extractRelatedQuestionsV2(answer, retrieved, topic);
}

export function extractCaseStudySlug(
  retrieved: readonly RetrievedChunk[],
): string | undefined {
  for (const chunk of retrieved) {
    if (chunk.corpus !== "CASE_STUDY_KNOWLEDGE") {
      continue;
    }
    const match = chunk.related_routes.find((route) =>
      route.includes("/psychology/case-studies/"),
    );
    if (match) {
      return match.split("/").filter(Boolean).at(-1);
    }
  }
  return undefined;
}

export function shouldShowSupportCta(category: SafetyCategory): boolean {
  return (
    category === "PERSONAL_MENTAL_HEALTH" ||
    category === "DIAGNOSTIC_REQUEST" ||
    category === "DR_VANDANA_SPECIFIC" ||
    category === "SAFE_EDUCATIONAL"
  );
}

export { INSUFFICIENT_VANDANA_METHODOLOGY };

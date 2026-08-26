import { questionPortalConfig } from "@/config/question-portal";
import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { EducationalFallbackProvider } from "@/lib/ai/providers/educational-fallback";
import { stripObviousPii } from "@/lib/ai/safety/post-process";
import type { QuestionSubmissionRecord } from "@/types/question-portal";

export type AiDraftResult =
  | { ok: true; draft: string; requiresReview: true }
  | { ok: false; reason: "unavailable" | "provider_error" };

/**
 * Optional educational draft helper for psychologist review.
 * Never sends mail, never publishes, and never diagnoses.
 */
export async function createAiAssistedDraft(
  record: QuestionSubmissionRecord,
): Promise<AiDraftResult> {
  try {
    const sanitized = stripObviousPii(record.question);
    const result = await runAskPipeline(
      {
        question: `Please provide a brief educational draft a psychologist could review (not send automatically): ${sanitized}`,
        language: "en",
      },
      crypto.randomUUID(),
      { provider: new EducationalFallbackProvider() },
    );
    if (!result.ok) {
      return { ok: false, reason: "unavailable" };
    }
    const draft = [
      "AI-assisted draft — requires psychologist review before any use.",
      "This is educational wording only. It is not a diagnosis or a message to send as-is.",
      "",
      result.response.answer,
    ].join("\n");
    if (draft.length > questionPortalConfig.maxResponseLength) {
      return {
        ok: true,
        draft: draft.slice(0, questionPortalConfig.maxResponseLength),
        requiresReview: true,
      };
    }
    return { ok: true, draft, requiresReview: true };
  } catch {
    return { ok: false, reason: "provider_error" };
  }
}

import { z } from "zod";

import { aiConfig } from "@/config/ai";
import type { AskAiRequest, SupportedLanguage } from "@/types/ai";

export const askAiRequestSchema = z
  .object({
    question: z.string(),
    conversation_id: z.string().uuid().optional(),
    language: z.enum(["en", "hi", "mr"]).optional(),
  })
  .strict();

export type AskValidationError = {
  code: "EMPTY_QUESTION" | "QUESTION_TOO_LONG" | "INVALID_REQUEST";
  message: string;
};

export type AskValidationResult =
  | { ok: true; value: Required<Pick<AskAiRequest, "question">> & AskAiRequest }
  | { ok: false; error: AskValidationError };

export function validateAskRequest(input: unknown): AskValidationResult {
  const parsed = askAiRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Please enter a psychology question to continue.",
      },
    };
  }

  const question = parsed.data.question.trim();
  if (!question) {
    return {
      ok: false,
      error: {
        code: "EMPTY_QUESTION",
        message: "Please enter a question so I can help.",
      },
    };
  }

  if (question.length > aiConfig.maxQuestionLength) {
    return {
      ok: false,
      error: {
        code: "QUESTION_TOO_LONG",
        message: `Please shorten your question to ${aiConfig.maxQuestionLength} characters or fewer.`,
      },
    };
  }

  return {
    ok: true,
    value: {
      question,
      conversation_id: parsed.data.conversation_id,
      language: parsed.data.language,
    },
  };
}

export function resolveLanguage(
  language: SupportedLanguage | undefined,
): SupportedLanguage {
  return language ?? "en";
}

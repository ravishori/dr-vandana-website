import { z } from "zod";

import { questionPortalConfig } from "@/config/question-portal";
import { isBasicEmail } from "@/lib/appointment-form";
import {
  QUESTION_CATEGORIES,
  QUESTION_PRIORITIES,
  QUESTION_STATUSES,
  RESPONSE_METHODS,
  type QuestionCategory,
  type QuestionPriority,
  type QuestionStatus,
} from "@/types/question-portal";

export type PublicQuestionFormValues = {
  name: string;
  email: string;
  question: string;
  category: string;
  preferredResponseMethod: string;
  consentGiven: boolean;
};

export type PublicQuestionFormErrors = Partial<
  Record<keyof PublicQuestionFormValues, string>
>;

function trimCollapsed(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePublicQuestionInput(
  input: PublicQuestionFormValues,
): PublicQuestionFormValues {
  return {
    name: trimCollapsed(input.name).slice(0, questionPortalConfig.maxNameLength),
    email: trimCollapsed(input.email).toLowerCase(),
    question: typeof input.question === "string" ? input.question.trim() : "",
    category: trimCollapsed(input.category),
    preferredResponseMethod: trimCollapsed(input.preferredResponseMethod),
    consentGiven: input.consentGiven === true,
  };
}

export const publicQuestionSchema = z
  .object({
    name: z.string().max(questionPortalConfig.maxNameLength).optional(),
    email: z.string().optional(),
    question: z
      .string()
      .min(12, "Please enter a question with a little more detail.")
      .max(
        questionPortalConfig.maxQuestionLength,
        `Please shorten your question to ${questionPortalConfig.maxQuestionLength} characters or fewer.`,
      ),
    category: z.string().optional(),
    preferredResponseMethod: z.string().optional(),
    consentGiven: z.literal(true, {
      error: "Please confirm the privacy acknowledgement.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.email && !isBasicEmail(data.email)) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Please enter a valid email address, or leave it blank.",
      });
    }
    if (
      data.category &&
      !QUESTION_CATEGORIES.includes(data.category as QuestionCategory)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Please choose a listed category, or leave it blank.",
      });
    }
    if (
      data.preferredResponseMethod &&
      !RESPONSE_METHODS.includes(
        data.preferredResponseMethod as (typeof RESPONSE_METHODS)[number],
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredResponseMethod"],
        message: "Please choose a valid response preference.",
      });
    }
  });

export const psychologistUpdateSchema = z.object({
  publicReferenceId: z.string().min(4).max(24),
  status: z.enum(QUESTION_STATUSES).optional(),
  priority: z.enum(QUESTION_PRIORITIES).optional(),
  internalNotes: z.string().max(questionPortalConfig.maxNotesLength).optional(),
  psychologistResponse: z
    .string()
    .max(questionPortalConfig.maxResponseLength)
    .optional(),
  publicationStatus: z
    .enum(["PRIVATE", "PENDING_APPROVAL", "APPROVED_FOR_PUBLICATION"])
    .optional(),
});

export type PsychologistUpdateInput = z.infer<typeof psychologistUpdateSchema>;

export function flattenQuestionFieldErrors(
  error: z.ZodError,
): PublicQuestionFormErrors {
  const fieldErrors: PublicQuestionFormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    if (!fieldErrors[key as keyof PublicQuestionFormValues]) {
      fieldErrors[key as keyof PublicQuestionFormValues] = issue.message;
    }
  }
  return fieldErrors;
}

export function isQuestionStatus(value: string): value is QuestionStatus {
  return QUESTION_STATUSES.includes(value as QuestionStatus);
}

export function isQuestionPriority(value: string): value is QuestionPriority {
  return QUESTION_PRIORITIES.includes(value as QuestionPriority);
}

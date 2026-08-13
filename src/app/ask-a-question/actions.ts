"use server";

import { headers } from "next/headers";

import { questionPortalCopy } from "@/data/question-portal";
import { isHoneypotTriggered } from "@/lib/appointment-abuse";
import { checkQuestionSubmitRateLimit, getClientIpFromHeaders } from "@/lib/question-portal/rate-limit";
import { submitPsychologyQuestion } from "@/lib/question-portal/service";
import type { PublicQuestionFormValues } from "@/lib/question-portal/schema";
import { reportException } from "@/lib/observability/error-handler";

export type SubmitQuestionActionResult =
  | { success: true; publicReferenceId: string; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof PublicQuestionFormValues, string>>;
    };

export async function submitPublicQuestionAction(
  input: PublicQuestionFormValues & { website?: string },
): Promise<SubmitQuestionActionResult> {
  try {
    if (isHoneypotTriggered(input.website)) {
      return { success: false, message: questionPortalCopy.abuseRejectedMessage };
    }

    const headerStore = await headers();
    const clientIp = getClientIpFromHeaders(headerStore);
    const rateLimit = await checkQuestionSubmitRateLimit(clientIp);
    if (!rateLimit.allowed) {
      if (rateLimit.reason === "rate_limited") {
        return { success: false, message: questionPortalCopy.rateLimitedMessage };
      }
      await reportException({
        source: "CONFIGURATION",
        code:
          rateLimit.reason === "misconfigured"
            ? "RATE_LIMIT_MISCONFIGURED"
            : "RATE_LIMIT_STORE_UNAVAILABLE",
        severity: "CRITICAL",
        message: "Question submission rate limiting is unavailable.",
        operation: "submitPublicQuestionAction",
        route: "/ask-a-question",
      });
      return { success: false, message: questionPortalCopy.deliveryFailedMessage };
    }

    const result = await submitPsychologyQuestion(input);
    if (!result.ok) {
      return {
        success: false,
        message: result.message,
        fieldErrors: result.fieldErrors,
      };
    }
    return {
      success: true,
      publicReferenceId: result.publicReferenceId,
      message: questionPortalCopy.successMessage,
    };
  } catch {
    await reportException({
      source: "API",
      code: "APP_UNEXPECTED_ERROR",
      severity: "ERROR",
      message: "Question submission failed unexpectedly.",
      operation: "submitPublicQuestionAction",
      route: "/ask-a-question",
    });
    return { success: false, message: questionPortalCopy.deliveryFailedMessage };
  }
}

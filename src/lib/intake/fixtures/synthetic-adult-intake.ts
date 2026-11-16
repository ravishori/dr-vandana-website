/**
 * SYNTHETIC FIXTURE - NOT CLINICAL CONTENT - NOT APPROVED (register OD-G1).
 *
 * Placeholder questions that only exercise the engine (sections follow the
 * owner-approved structure; the wording is deliberately meaningless). Real
 * question wording must be written or approved by Dr. Vandana and published
 * as a new version with an approval record before any patient sees it.
 */
import { approve } from "@/lib/intake/definition";
import type { QuestionnaireDefinition } from "@/lib/intake/types";

const nonAnswer = ["prefer_not_to_answer", "skipped", "discuss_in_person"] as const;

export const SYNTHETIC_INTAKE_ID = "synthetic-adult-intake";

export function syntheticAdultIntake(version = 1): QuestionnaireDefinition {
  return approve(
    {
      id: SYNTHETIC_INTAKE_ID,
      version,
      locale: "en",
      audience: "adult",
      contentStatus: "SYNTHETIC_FIXTURE",
      status: "draft",
      approval: null,
      sections: [
        {
          id: "s1-consent",
          title: "Welcome, privacy and consent",
          optional: false,
          questions: [
            {
              id: "q-consent",
              kind: "yes_no_unsure",
              prompt: "[SYNTHETIC] Placeholder consent acknowledgement",
              required: true,
              allowedNonAnswerStates: [],
            },
          ],
        },
        {
          id: "s2-basic",
          title: "Basic patient information",
          optional: false,
          questions: [
            {
              id: "q-contact-pref",
              kind: "single_choice",
              prompt: "[SYNTHETIC] Placeholder contact preference",
              options: [
                { code: "email", label: "Option one" },
                { code: "phone", label: "Option two" },
              ],
              allowedNonAnswerStates: nonAnswer,
            },
          ],
        },
        {
          id: "s3-main",
          title: "Main concerns and reason for seeking support",
          optional: false,
          questions: [
            {
              id: "q-main-text",
              kind: "long_text",
              prompt: "[SYNTHETIC] Placeholder free-text question",
              allowedNonAnswerStates: nonAnswer,
            },
            {
              id: "q-has-previous",
              kind: "yes_no_unsure",
              prompt: "[SYNTHETIC] Placeholder yes/no/unsure question",
              allowedNonAnswerStates: nonAnswer,
            },
          ],
        },
        {
          id: "s6-previous",
          title: "Previous psychological and relevant health support",
          optional: true,
          questions: [
            {
              id: "q-previous-detail",
              kind: "short_text",
              prompt: "[SYNTHETIC] Placeholder follow-up (shown only after a yes)",
              showIf: { type: "answer_equals", questionId: "q-has-previous", value: "yes" },
              allowedNonAnswerStates: nonAnswer,
            },
            {
              id: "q-count",
              kind: "number",
              prompt: "[SYNTHETIC] Placeholder number question",
              min: 0,
              max: 50,
              allowedNonAnswerStates: nonAnswer,
              showIf: { type: "answer_equals", questionId: "q-has-previous", value: "yes" },
            },
          ],
        },
        {
          id: "s7-goals",
          title: "Strengths, support network and counselling goals",
          optional: true,
          questions: [
            {
              id: "q-multi",
              kind: "multiple_choice",
              prompt: "[SYNTHETIC] Placeholder multiple-choice question",
              options: [
                { code: "a", label: "Option A" },
                { code: "b", label: "Option B" },
                { code: "c", label: "Option C" },
              ],
              allowedNonAnswerStates: nonAnswer,
            },
          ],
        },
      ],
    },
    "synthetic-fixture",
    "2026-11-16T00:00:00.000Z",
  );
}

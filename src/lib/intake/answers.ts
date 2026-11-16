import { canonicalJson, sha256, visibleQuestions } from "@/lib/intake/definition";
import type {
  AnswerEntry,
  AnswerValue,
  PatientNonAnswerState,
  Question,
  QuestionnaireDefinition,
  ResponseState,
  SubmittedAnswer,
} from "@/lib/intake/types";
import { PATIENT_NON_ANSWER_STATES } from "@/lib/intake/types";

export type AnswerInput = { state: ResponseState; value?: AnswerValue };

/** Validates one patient answer against its question. Returns an error code or null. */
export function validateAnswer(q: Question, input: AnswerInput): string | null {
  if (input.state === "not_reached" || input.state === "not_applicable") {
    return "state_not_selectable_by_patient";
  }
  if (input.state !== "answered") {
    if (!PATIENT_NON_ANSWER_STATES.includes(input.state as PatientNonAnswerState)) {
      return "unknown_state";
    }
    if (q.required) return "required_question_cannot_be_declined";
    if (!q.allowedNonAnswerStates.includes(input.state as PatientNonAnswerState)) {
      return "state_not_allowed_for_question";
    }
    return null;
  }
  const v = input.value;
  switch (q.kind) {
    case "single_choice":
    case "yes_no_unsure": {
      const codes =
        q.kind === "yes_no_unsure" ? ["yes", "no", "unsure"] : (q.options ?? []).map((o) => o.code);
      return typeof v === "string" && codes.includes(v) ? null : "invalid_choice";
    }
    case "multiple_choice": {
      const codes = (q.options ?? []).map((o) => o.code);
      return Array.isArray(v) &&
        v.length > 0 &&
        new Set(v).size === v.length &&
        v.every((x) => codes.includes(x))
        ? null
        : "invalid_choice";
    }
    case "short_text":
    case "long_text": {
      const max = q.maxLength ?? (q.kind === "short_text" ? 200 : 4000);
      return typeof v === "string" && v.trim().length > 0 && v.length <= max ? null : "invalid_text";
    }
    case "number": {
      if (typeof v !== "number" || !Number.isFinite(v)) return "invalid_number";
      if (q.min !== undefined && v < q.min) return "number_out_of_range";
      if (q.max !== undefined && v > q.max) return "number_out_of_range";
      return null;
    }
    case "date":
      return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
        ? null
        : "invalid_date";
  }
}

export type Progress = {
  visibleCount: number;
  answeredCount: number;
  /** Visible questions with no recorded state yet. */
  unansweredIds: string[];
  /** Visible required questions not answered. */
  missingRequiredIds: string[];
  sections: { id: string; visible: number; recorded: number }[];
};

export function computeProgress(
  def: QuestionnaireDefinition,
  answers: Record<string, AnswerEntry>,
): Progress {
  const visible = visibleQuestions(def, answers);
  const ids = new Set(visible.map((q) => q.id));
  const unanswered = visible.filter((q) => !answers[q.id]).map((q) => q.id);
  const missingRequired = visible
    .filter((q) => q.required && answers[q.id]?.state !== "answered")
    .map((q) => q.id);
  return {
    visibleCount: visible.length,
    answeredCount: visible.filter((q) => answers[q.id]?.state === "answered").length,
    unansweredIds: unanswered,
    missingRequiredIds: missingRequired,
    sections: def.sections.map((s) => ({
      id: s.id,
      visible: s.questions.filter((q) => ids.has(q.id)).length,
      recorded: s.questions.filter((q) => ids.has(q.id) && answers[q.id]).length,
    })),
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

/**
 * Build the immutable list of answers for a submission:
 *  - visible + recorded      -> the recorded state/value
 *  - visible + not recorded  -> not_reached (never invented as "no")
 *  - hidden by a rule        -> not_applicable, value dropped
 * Throws when a visible required question is not answered.
 */
export function buildSubmittedAnswers(
  def: QuestionnaireDefinition,
  answers: Record<string, AnswerEntry>,
): readonly SubmittedAnswer[] {
  const progress = computeProgress(def, answers);
  if (progress.missingRequiredIds.length > 0) {
    throw new Error(`incomplete_required:${progress.missingRequiredIds.join(",")}`);
  }
  const visible = new Set(visibleQuestions(def, answers).map((q) => q.id));
  const out: SubmittedAnswer[] = [];
  for (const section of def.sections) {
    for (const q of section.questions) {
      if (!visible.has(q.id)) {
        out.push({ questionId: q.id, state: "not_applicable", value: null, provenance: "patient_reported" });
        continue;
      }
      const a = answers[q.id];
      out.push(
        a
          ? { questionId: q.id, state: a.state, value: a.state === "answered" ? a.value : null, provenance: "patient_reported" }
          : { questionId: q.id, state: "not_reached", value: null, provenance: "patient_reported" },
      );
    }
  }
  return deepFreeze(out);
}

export function snapshotHash(answers: readonly SubmittedAnswer[], contentHash: string): string {
  return sha256(canonicalJson({ contentHash, answers }));
}

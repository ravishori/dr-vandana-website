/**
 * Digital intake - domain types (questionnaire engine, V1 scope).
 *
 * Owner-approved scope (register IN-1..IN-8): adults only, English first,
 * progressive sections, safety-related questions clinician-led (not asked in
 * this asynchronous form), doctor retains all interpretation.
 *
 * No question text is approved yet (OD-G1). Only an explicitly labelled
 * SYNTHETIC_FIXTURE may be served, and only when the engine is configured to
 * allow synthetic content (tests and local development).
 */
export const RESPONSE_STATES = [
  "answered",
  "prefer_not_to_answer",
  "skipped",
  "discuss_in_person",
  "not_reached",
  "not_applicable",
] as const;
export type ResponseState = (typeof RESPONSE_STATES)[number];

/** States a patient may choose instead of answering. */
export const PATIENT_NON_ANSWER_STATES = [
  "prefer_not_to_answer",
  "skipped",
  "discuss_in_person",
] as const;
export type PatientNonAnswerState = (typeof PATIENT_NON_ANSWER_STATES)[number];

export const QUESTION_KINDS = [
  "single_choice",
  "multiple_choice",
  "short_text",
  "long_text",
  "number",
  "date",
  "yes_no_unsure",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/** Who supplied a piece of information. Never merged into one field. */
export type Provenance =
  | "patient_reported"
  | "patient_clarification"
  | "clinician_entered";

/**
 * Conditional display rules. Deliberately limited: they may reference only
 * earlier CHOICE questions, so no rule can depend on free text.
 */
export type Condition =
  | { type: "answer_equals"; questionId: string; value: string }
  | { type: "answer_in"; questionId: string; values: string[] }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] };

export type Question = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options?: { code: string; label: string }[];
  /** Only consent and contact basics should be required; clinical items never. */
  required?: boolean;
  allowedNonAnswerStates: readonly PatientNonAnswerState[];
  showIf?: Condition;
  maxLength?: number;
  min?: number;
  max?: number;
};

export type Section = {
  id: string;
  title: string;
  optional: boolean;
  questions: Question[];
};

export type ContentStatus = "SYNTHETIC_FIXTURE" | "CLINICALLY_APPROVED";

export type QuestionnaireDefinition = {
  id: string;
  version: number;
  locale: string;
  audience: string;
  contentStatus: ContentStatus;
  status: "draft" | "approved" | "retired";
  approval: { approvedBy: string; approvedAt: string; contentHash: string } | null;
  sections: Section[];
};

export type AnswerValue = string | string[] | number | null;

export type AnswerEntry = {
  state: ResponseState;
  value: AnswerValue;
  provenance: "patient_reported";
  savedAt: string;
};

export type Draft = {
  id: string;
  patientId: string;
  questionnaireId: string;
  /** Pinned to the version the patient started on. */
  version: number;
  answers: Record<string, AnswerEntry>;
  draftVersion: number;
  status: "open" | "submitted";
  createdAt: string;
  updatedAt: string;
};

export type SubmittedAnswer = {
  questionId: string;
  state: ResponseState;
  value: AnswerValue;
  provenance: "patient_reported";
};

/** Immutable once created. */
export type Submission = {
  id: string;
  patientId: string;
  draftId: string;
  questionnaireId: string;
  version: number;
  contentHash: string;
  submittedAt: string;
  answers: readonly SubmittedAnswer[];
  snapshotHash: string;
};

export const REVIEW_OUTCOMES = [
  "reviewed_no_further_intake_action",
  "reviewed_discuss_in_consultation",
  "reviewed_followup_action_created",
  "reviewed_further_assessment_or_referral_to_consider",
  "review_incomplete",
] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

/** Workflow task, NOT a risk alert. Identical in form for every submission. */
export type IntakeReviewTask = {
  id: string;
  patientId: string;
  submissionId: string;
  submittedAt: string;
  questionnaireVersion: number;
  reviewDueAt: string;
  dueRule: string;
  status: "pending" | "reviewed" | "incomplete";
  reviewedAt: string | null;
  reviewedBy: string | null;
  outcome: ReviewOutcome | null;
  relatedConsultationId: string | null;
  relatedFollowUpTaskId: string | null;
  /** Set when the task was raised by a patient clarification. */
  clarificationId: string | null;
};

export type Clarification = {
  id: string;
  submissionId: string;
  patientId: string;
  questionId: string | null;
  text: string;
  provenance: "patient_clarification";
  createdAt: string;
};

export type Annotation = {
  id: string;
  submissionId: string;
  authorUserId: string;
  text: string;
  provenance: "clinician_entered";
  createdAt: string;
};

export type Actor = {
  userId: string;
  roles: readonly string[];
  mfaCompleted: boolean;
};

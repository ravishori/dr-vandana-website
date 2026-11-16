/**
 * Pre-consultation brief: a deterministic, template-based re-presentation of
 * what the patient submitted. Facts only.
 *
 * Rules (owner direction, Doc 28):
 *  - no AI, no inference, no scoring, no flags, no highlighting, no ordering by
 *    content: sections and questions appear in questionnaire order;
 *  - free text is shown verbatim;
 *  - every patient item is labelled "Patient-reported"; later additions are
 *    labelled as patient clarifications; clinician notes are shown in a
 *    separate block labelled "Clinician-entered";
 *  - unanswered, skipped, declined and "discuss in person" items are preserved
 *    and listed distinctly;
 *  - the review state comes only from the explicit review task: building or
 *    opening a brief never marks anything reviewed.
 */
import type {
  Annotation,
  Clarification,
  IntakeReviewTask,
  Question,
  QuestionnaireDefinition,
  ResponseState,
  Submission,
  SubmittedAnswer,
} from "@/lib/intake/types";

export const BRIEF_STATIC_LINES = {
  compiled:
    "Compiled automatically from patient-submitted answers. No clinical interpretation has been made.",
  safety:
    "Safety-related questions are clinician-led and were not asked in this form.",
  syntheticBanner: "SYNTHETIC TEST CONTENT - NOT A REAL PATIENT SUBMISSION",
} as const;

const PATIENT_LABEL = "Patient-reported";
const CLARIFICATION_LABEL = "Patient clarification (added after submission)";
const CLINICIAN_LABEL = "Clinician-entered (not patient-reported)";

const STATE_TEXT: Record<Exclude<ResponseState, "answered">, string> = {
  prefer_not_to_answer: "Preferred not to answer",
  skipped: "Skipped",
  discuss_in_person: "Prefers to discuss in person",
  not_reached: "Not answered (not reached)",
  not_applicable: "Not applicable (follow-up not shown)",
};

export type BriefItem = {
  questionId: string;
  prompt: string;
  state: ResponseState;
  /** Verbatim text, option labels, or the stated state; never interpreted. */
  display: string;
  provenance: typeof PATIENT_LABEL;
};

export type PreConsultationBrief = {
  header: {
    patientReference: string;
    submissionId: string;
    submittedAt: string;
    questionnaireId: string;
    questionnaireVersion: number;
    syntheticContent: boolean;
  };
  banner: string | null;
  sections: { id: string; title: string; optional: boolean; items: BriefItem[] }[];
  /** Same items, grouped by why there is no answer; questionnaire order inside each group. */
  notProvided: { state: Exclude<ResponseState, "answered">; items: BriefItem[] }[];
  clarifications: { id: string; createdAt: string; questionId: string | null; text: string; label: typeof CLARIFICATION_LABEL }[];
  clinicianNotes: { id: string; createdAt: string; authorUserId: string; text: string; label: typeof CLINICIAN_LABEL }[];
  review: {
    status: "pending" | "reviewed" | "incomplete";
    reviewedAt: string | null;
    reviewedBy: string | null;
    outcome: string | null;
  };
  staticLines: string[];
};

function displayFor(q: Question, a: SubmittedAnswer): string {
  if (a.state !== "answered") return STATE_TEXT[a.state];
  const v = a.value;
  if (q.kind === "yes_no_unsure") {
    return v === "yes" ? "Yes" : v === "no" ? "No" : v === "unsure" ? "Unsure" : String(v);
  }
  if (q.kind === "single_choice" || q.kind === "multiple_choice") {
    const labels = new Map((q.options ?? []).map((o) => [o.code, o.label]));
    const codes = Array.isArray(v) ? v : [String(v)];
    return codes.map((c) => labels.get(c) ?? c).join("; ");
  }
  return String(v);
}

export function buildPreConsultationBrief(
  def: QuestionnaireDefinition,
  submission: Submission,
  context: {
    clarifications: readonly Clarification[];
    annotations: readonly Annotation[];
    /** The task created with the original submission (not clarification tasks). */
    reviewTask: IntakeReviewTask;
  },
): PreConsultationBrief {
  const byQuestion = new Map(submission.answers.map((a) => [a.questionId, a]));
  const sections = def.sections.map((s) => ({
    id: s.id,
    title: s.title,
    optional: s.optional,
    items: s.questions.map((q): BriefItem => {
      const a = byQuestion.get(q.id) ?? {
        questionId: q.id,
        state: "not_reached" as const,
        value: null,
        provenance: "patient_reported" as const,
      };
      return {
        questionId: q.id,
        prompt: q.prompt,
        state: a.state,
        display: displayFor(q, a),
        provenance: PATIENT_LABEL,
      };
    }),
  }));

  const groups: PreConsultationBrief["notProvided"] = [];
  for (const state of [
    "not_reached",
    "skipped",
    "prefer_not_to_answer",
    "discuss_in_person",
  ] as const) {
    const items = sections.flatMap((s) => s.items).filter((i) => i.state === state);
    if (items.length > 0) groups.push({ state, items });
  }

  const synthetic = def.contentStatus === "SYNTHETIC_FIXTURE";
  return {
    header: {
      patientReference: submission.patientId,
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
      questionnaireId: def.id,
      questionnaireVersion: def.version,
      syntheticContent: synthetic,
    },
    banner: synthetic ? BRIEF_STATIC_LINES.syntheticBanner : null,
    sections,
    notProvided: groups,
    clarifications: [...context.clarifications]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((c) => ({ id: c.id, createdAt: c.createdAt, questionId: c.questionId, text: c.text, label: CLARIFICATION_LABEL })),
    clinicianNotes: [...context.annotations]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((n) => ({ id: n.id, createdAt: n.createdAt, authorUserId: n.authorUserId, text: n.text, label: CLINICIAN_LABEL })),
    review: {
      status: context.reviewTask.status,
      reviewedAt: context.reviewTask.reviewedAt,
      reviewedBy: context.reviewTask.reviewedBy,
      outcome: context.reviewTask.outcome,
    },
    staticLines: [BRIEF_STATIC_LINES.compiled, BRIEF_STATIC_LINES.safety],
  };
}

/** Plain-text rendering; the same structure always renders the same text. */
export function renderBriefText(b: PreConsultationBrief): string {
  const L: string[] = [];
  if (b.banner) L.push(b.banner, "");
  L.push("PRE-CONSULTATION BRIEF");
  L.push(`Patient reference: ${b.header.patientReference}`);
  L.push(`Submission: ${b.header.submissionId} (submitted ${b.header.submittedAt})`);
  L.push(`Questionnaire: ${b.header.questionnaireId} version ${b.header.questionnaireVersion}`);
  L.push(
    `Review status: ${b.review.status}` +
      (b.review.reviewedAt ? ` (${b.review.reviewedAt}, outcome: ${b.review.outcome})` : " (not yet reviewed by the psychologist)"),
  );
  L.push("");
  for (const s of b.sections) {
    L.push(`## ${s.title}${s.optional ? " (optional section)" : ""}`);
    for (const i of s.items) {
      L.push(`- ${i.prompt}`, `  ${i.provenance}: ${i.display}`);
    }
    L.push("");
  }
  L.push("## Not provided");
  if (b.notProvided.length === 0) L.push("(every shown question has an answer)");
  for (const g of b.notProvided) {
    L.push(`${STATE_TEXT[g.state]}:`);
    for (const i of g.items) L.push(`- ${i.prompt}`);
  }
  L.push("");
  L.push("## Patient clarifications");
  if (b.clarifications.length === 0) L.push("(none)");
  for (const c of b.clarifications) {
    L.push(`- ${c.label}, ${c.createdAt}${c.questionId ? `, about ${c.questionId}` : ""}:`, `  ${c.text}`);
  }
  L.push("");
  L.push("## Clinician notes");
  if (b.clinicianNotes.length === 0) L.push("(none)");
  for (const n of b.clinicianNotes) {
    L.push(`- ${n.label}, ${n.createdAt}:`, `  ${n.text}`);
  }
  L.push("");
  L.push(...b.staticLines);
  return L.join("\n");
}

/**
 * Intake service (domain layer, in-memory store only).
 *
 * Principles enforced here:
 *  - original patient submissions are immutable; later additions are separate
 *    rows with their own provenance (clarification / clinician annotation);
 *  - every successful submission creates the standard review task in the SAME
 *    transaction (a submission never exists without its task);
 *  - the patient is told "received" until a psychologist explicitly reviews;
 *  - nothing here scores, classifies, diagnoses or prioritises anything.
 * It does not touch the database, notifications or any route, and the feature
 * stays disabled until the owner releases it.
 */
import {
  buildSubmittedAnswers,
  computeProgress,
  snapshotHash,
  validateAnswer,
  type AnswerInput,
  type Progress,
} from "@/lib/intake/answers";
import {
  DEFAULT_INTAKE_CONFIG,
  allQuestions,
  assertServable,
  visibleQuestions,
  type IntakeEngineConfig,
} from "@/lib/intake/definition";
import type { IntakeStore, Tx } from "@/lib/intake/store";
import type {
  Actor,
  Annotation,
  Clarification,
  Draft,
  IntakeReviewTask,
  QuestionnaireDefinition,
  ReviewOutcome,
  Submission,
} from "@/lib/intake/types";
import { REVIEW_OUTCOMES } from "@/lib/intake/types";
import { computeIntakeReviewDue } from "@/lib/practice-schedule/intake-review-due";
import type { DeclaredHolidays } from "@/lib/practice-schedule/schedule";

export class IntakeError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export type IntakeServiceDeps = {
  store: IntakeStore;
  now: () => Date;
  newId: () => string;
  config?: IntakeEngineConfig;
  holidays?: () => DeclaredHolidays;
  /**
   * OD-I2 (open): does a patient clarification raise a new review task?
   * Proposed default is yes so the doctor sees it; owner decides.
   */
  clarificationRaisesReviewTask?: boolean;
};

export type DraftView = {
  draft: Draft;
  definition: QuestionnaireDefinition;
  visibleQuestionIds: string[];
  progress: Progress;
};

export class DefinitionRegistry {
  private defs: QuestionnaireDefinition[] = [];
  constructor(private readonly config: IntakeEngineConfig = DEFAULT_INTAKE_CONFIG) {}

  publish(def: QuestionnaireDefinition): void {
    assertServable(def, this.config);
    if (this.defs.some((d) => d.id === def.id && d.version === def.version)) {
      throw new IntakeError("version_already_published");
    }
    this.defs.push(structuredClone(def));
  }

  retire(id: string, version: number): void {
    const d = this.defs.find((x) => x.id === id && x.version === version);
    if (d) d.status = "retired";
  }

  get(id: string, version: number): QuestionnaireDefinition | null {
    const d = this.defs.find((x) => x.id === id && x.version === version);
    return d ? structuredClone(d) : null;
  }

  /** Latest approved (not retired) version, used only for NEW drafts. */
  latestApproved(id: string): QuestionnaireDefinition | null {
    const list = this.defs
      .filter((d) => d.id === id && d.status === "approved")
      .sort((a, b) => b.version - a.version);
    return list[0] ? structuredClone(list[0]) : null;
  }
}

export class IntakeService {
  private readonly config: IntakeEngineConfig;

  constructor(
    private readonly deps: IntakeServiceDeps,
    private readonly registry: DefinitionRegistry,
  ) {
    this.config = deps.config ?? DEFAULT_INTAKE_CONFIG;
  }

  private iso(): string {
    return this.deps.now().toISOString();
  }

  private definitionFor(draft: { questionnaireId: string; version: number }): QuestionnaireDefinition {
    const def = this.registry.get(draft.questionnaireId, draft.version);
    if (!def) throw new IntakeError("definition_not_found");
    return def;
  }

  private ownDraft(tx: Tx, patientId: string, draftId: string): Draft {
    const draft = tx.state.drafts[draftId];
    // Same error for "missing" and "someone else's": no existence oracle.
    if (!draft || draft.patientId !== patientId) throw new IntakeError("draft_not_found");
    return draft;
  }

  /** Start a draft on the latest approved version, or resume the open one. */
  async startOrResumeDraft(patientId: string, questionnaireId: string): Promise<DraftView> {
    return this.deps.store.transaction(async (tx) => {
      const existing = Object.values(tx.state.drafts).find(
        (d) => d.patientId === patientId && d.questionnaireId === questionnaireId && d.status === "open",
      );
      if (existing) return this.view(existing);
      const def = this.registry.latestApproved(questionnaireId);
      if (!def) throw new IntakeError("no_approved_version");
      const now = this.iso();
      const draft: Draft = {
        id: this.deps.newId(),
        patientId,
        questionnaireId,
        version: def.version,
        answers: {},
        draftVersion: 1,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      tx.state.drafts[draft.id] = draft;
      return this.view(draft);
    });
  }

  private view(draft: Draft): DraftView {
    const def = this.definitionFor(draft);
    return {
      draft: structuredClone(draft),
      definition: def,
      visibleQuestionIds: visibleQuestions(def, draft.answers).map((q) => q.id),
      progress: computeProgress(def, draft.answers),
    };
  }

  /** Save one answer. Optimistic concurrency on `expectedDraftVersion`. */
  async saveAnswer(
    patientId: string,
    draftId: string,
    questionId: string,
    input: AnswerInput,
    expectedDraftVersion: number,
  ): Promise<DraftView> {
    return this.deps.store.transaction(async (tx) => {
      const draft = this.ownDraft(tx, patientId, draftId);
      if (draft.status !== "open") throw new IntakeError("draft_already_submitted");
      if (draft.draftVersion !== expectedDraftVersion) throw new IntakeError("draft_version_conflict");
      const def = this.definitionFor(draft);
      const q = allQuestions(def).find((x) => x.id === questionId);
      if (!q) throw new IntakeError("unknown_question");
      if (!visibleQuestions(def, draft.answers).some((x) => x.id === questionId)) {
        throw new IntakeError("question_not_visible");
      }
      const problem = validateAnswer(q, input);
      if (problem) throw new IntakeError(problem);
      draft.answers[questionId] = {
        state: input.state,
        value: input.state === "answered" ? (input.value ?? null) : null,
        provenance: "patient_reported",
        savedAt: this.iso(),
      };
      draft.draftVersion += 1;
      draft.updatedAt = this.iso();
      return this.view(draft);
    });
  }

  /**
   * Submit. Atomic: submission row, the standard review task and the draft
   * status change commit together or not at all. Idempotent per draft and per
   * optional idempotency key: a repeat returns the original submission and
   * creates no second task.
   */
  async submit(
    patientId: string,
    draftId: string,
    options: { idempotencyKey?: string; consultationStart?: Date | null; consultationId?: string | null } = {},
  ): Promise<{ submission: Submission; task: IntakeReviewTask; duplicate: boolean }> {
    return this.deps.store.transaction(async (tx) => {
      const draft = this.ownDraft(tx, patientId, draftId);

      const priorId =
        (options.idempotencyKey ? tx.state.submissionByKey[`${patientId}:${options.idempotencyKey}`] : undefined) ??
        tx.state.submissionByDraft[draftId];
      if (priorId) {
        const submission = tx.state.submissions[priorId];
        if (submission.draftId !== draftId) throw new IntakeError("idempotency_key_reuse");
        const task = Object.values(tx.state.tasks).find(
          (t) => t.submissionId === priorId && t.clarificationId === null,
        )!;
        return { submission: structuredClone(submission), task: structuredClone(task), duplicate: true };
      }
      if (draft.status !== "open") throw new IntakeError("draft_already_submitted");

      const def = this.definitionFor(draft);
      let answers;
      try {
        answers = buildSubmittedAnswers(def, draft.answers);
      } catch (e) {
        throw new IntakeError(e instanceof Error ? e.message : "incomplete");
      }
      const submittedAt = this.iso();
      const hash = def.approval!.contentHash;
      const submission: Submission = Object.freeze({
        id: this.deps.newId(),
        patientId,
        draftId,
        questionnaireId: def.id,
        version: def.version,
        contentHash: hash,
        submittedAt,
        answers,
        snapshotHash: snapshotHash(answers, hash),
      });
      tx.state.submissions[submission.id] = submission;
      tx.state.submissionByDraft[draftId] = submission.id;
      if (options.idempotencyKey) {
        tx.state.submissionByKey[`${patientId}:${options.idempotencyKey}`] = submission.id;
      }
      draft.status = "submitted";
      tx.failpoint("after_submission_insert");

      const due = computeIntakeReviewDue(
        { submittedAt: this.deps.now(), consultationStart: options.consultationStart ?? null },
        { holidays: this.deps.holidays?.() },
      );
      const task: IntakeReviewTask = {
        id: this.deps.newId(),
        patientId,
        submissionId: submission.id,
        submittedAt,
        questionnaireVersion: def.version,
        reviewDueAt: due.dueAt.toISOString(),
        dueRule: due.rule,
        status: "pending",
        reviewedAt: null,
        reviewedBy: null,
        outcome: null,
        relatedConsultationId: options.consultationId ?? null,
        relatedFollowUpTaskId: null,
        clarificationId: null,
      };
      tx.state.tasks[task.id] = task;
      tx.failpoint("after_task_insert");
      return { submission: structuredClone(submission), task: structuredClone(task), duplicate: false };
    });
  }

  /** The only status shown to a patient. "Reviewed" is never implied. */
  patientStatus(patientId: string, submissionId: string): "received" {
    const s = this.deps.store.read().submissions[submissionId];
    if (!s || s.patientId !== patientId) throw new IntakeError("submission_not_found");
    return "received";
  }

  /** Patient adds information after submitting; separate row, own provenance. */
  async addClarification(
    patientId: string,
    submissionId: string,
    text: string,
    questionId: string | null = null,
  ): Promise<Clarification> {
    return this.deps.store.transaction(async (tx) => {
      const s = tx.state.submissions[submissionId];
      if (!s || s.patientId !== patientId) throw new IntakeError("submission_not_found");
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 4000) throw new IntakeError("invalid_text");
      if (questionId && !s.answers.some((a) => a.questionId === questionId)) {
        throw new IntakeError("unknown_question");
      }
      const c: Clarification = {
        id: this.deps.newId(),
        submissionId,
        patientId,
        questionId,
        text: trimmed,
        provenance: "patient_clarification",
        createdAt: this.iso(),
      };
      tx.state.clarifications[c.id] = c;
      if (this.deps.clarificationRaisesReviewTask ?? true) {
        const due = computeIntakeReviewDue(
          { submittedAt: this.deps.now() },
          { holidays: this.deps.holidays?.() },
        );
        const task: IntakeReviewTask = {
          id: this.deps.newId(),
          patientId,
          submissionId,
          submittedAt: this.iso(),
          questionnaireVersion: s.version,
          reviewDueAt: due.dueAt.toISOString(),
          dueRule: due.rule,
          status: "pending",
          reviewedAt: null,
          reviewedBy: null,
          outcome: null,
          relatedConsultationId: null,
          relatedFollowUpTaskId: null,
          clarificationId: c.id,
        };
        tx.state.tasks[task.id] = task;
      }
      return structuredClone(c);
    });
  }

  private requirePsychologist(actor: Actor): void {
    if (!actor.roles.includes("PSYCHOLOGIST") || actor.mfaCompleted !== true) {
      throw new IntakeError("forbidden");
    }
  }

  /** Queue ordered by due time then submission time only (no content, no flags). */
  listPendingReviews(actor: Actor): IntakeReviewTask[] {
    this.requirePsychologist(actor);
    return Object.values(this.deps.store.read().tasks)
      .filter((t) => t.status === "pending" || t.status === "incomplete")
      .sort(
        (a, b) =>
          a.reviewDueAt.localeCompare(b.reviewDueAt) || a.submittedAt.localeCompare(b.submittedAt),
      );
  }

  /** Explicit review by the psychologist. Nothing else ever sets "reviewed". */
  async markReviewed(
    actor: Actor,
    taskId: string,
    outcome: ReviewOutcome,
    options: { followUpTaskId?: string | null } = {},
  ): Promise<IntakeReviewTask> {
    this.requirePsychologist(actor);
    if (!REVIEW_OUTCOMES.includes(outcome)) throw new IntakeError("invalid_outcome");
    return this.deps.store.transaction(async (tx) => {
      const task = tx.state.tasks[taskId];
      if (!task) throw new IntakeError("task_not_found");
      if (task.status === "reviewed") throw new IntakeError("already_reviewed");
      if (outcome === "reviewed_followup_action_created" && !options.followUpTaskId) {
        throw new IntakeError("follow_up_task_required");
      }
      task.status = outcome === "review_incomplete" ? "incomplete" : "reviewed";
      task.outcome = outcome;
      task.reviewedAt = this.iso();
      task.reviewedBy = actor.userId;
      task.relatedFollowUpTaskId = options.followUpTaskId ?? null;
      return structuredClone(task);
    });
  }

  /** Clinician note, stored apart from the submission and labelled as such. */
  async addAnnotation(actor: Actor, submissionId: string, text: string): Promise<Annotation> {
    this.requirePsychologist(actor);
    return this.deps.store.transaction(async (tx) => {
      if (!tx.state.submissions[submissionId]) throw new IntakeError("submission_not_found");
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 8000) throw new IntakeError("invalid_text");
      const a: Annotation = {
        id: this.deps.newId(),
        submissionId,
        authorUserId: actor.userId,
        text: trimmed,
        provenance: "clinician_entered",
        createdAt: this.iso(),
      };
      tx.state.annotations[a.id] = a;
      return structuredClone(a);
    });
  }

  /** Doctor-side read of a submission with clearly separated provenance. */
  readSubmissionForReview(actor: Actor, submissionId: string) {
    this.requirePsychologist(actor);
    const state = this.deps.store.read();
    const submission = state.submissions[submissionId];
    if (!submission) throw new IntakeError("submission_not_found");
    return {
      submission,
      clarifications: Object.values(state.clarifications).filter((c) => c.submissionId === submissionId),
      annotations: Object.values(state.annotations).filter((a) => a.submissionId === submissionId),
    };
  }
}

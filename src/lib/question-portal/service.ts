import { questionPortalConfig } from "@/config/question-portal";
import { questionPortalCopy } from "@/data/question-portal";
import { createAiAssistedDraft } from "@/lib/question-portal/ai-draft";
import {
  sendNewQuestionNotification,
  sendQuestionResponseEmail,
} from "@/lib/question-portal/email";
import { createAuditId, createPublicReferenceId, createQuestionId, fingerprintSubmission } from "@/lib/question-portal/ids";
import type { QuestionRepository } from "@/lib/question-portal/repository";
import {
  flattenQuestionFieldErrors,
  normalizePublicQuestionInput,
  publicQuestionSchema,
  type PublicQuestionFormErrors,
  type PublicQuestionFormValues,
  type PsychologistUpdateInput,
} from "@/lib/question-portal/schema";
import { getQuestionRepository } from "@/lib/question-portal/store";
import { logStructured } from "@/lib/observability/logger";
import { reportException } from "@/lib/observability/error-handler";
import type {
  PreferredResponseMethod,
  PsychologistSession,
  QuestionAuditEvent,
  QuestionCategory,
  QuestionDashboardStats,
  QuestionListFilters,
  QuestionListResult,
  QuestionStatus,
  QuestionSubmissionRecord,
} from "@/types/question-portal";

export type SubmitQuestionResult =
  | { ok: true; publicReferenceId: string }
  | {
      ok: false;
      code:
        | "validation"
        | "consent"
        | "rate_limited"
        | "duplicate"
        | "store_unavailable"
        | "too_large";
      message: string;
      fieldErrors?: PublicQuestionFormErrors;
    };

function assertPsychologist(session: PsychologistSession | null): PsychologistSession {
  if (!session || session.role !== "PSYCHOLOGIST") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

async function audit(
  repository: QuestionRepository,
  questionId: string,
  action: string,
  actor: string,
  metadata: QuestionAuditEvent["metadata"] = {},
): Promise<void> {
  await repository.addAudit({
    id: createAuditId(),
    questionId,
    action,
    actor,
    createdAt: new Date().toISOString(),
    metadata,
  });
}

export async function submitPsychologyQuestion(
  input: PublicQuestionFormValues & { website?: string },
  options: { skipNotification?: boolean } = {},
): Promise<SubmitQuestionResult> {
  const normalized = normalizePublicQuestionInput(input);
  if (normalized.question.length > questionPortalConfig.maxQuestionLength) {
    return {
      ok: false,
      code: "too_large",
      message: questionPortalCopy.deliveryFailedMessage,
    };
  }

  const parsed = publicQuestionSchema.safeParse({
    name: normalized.name || undefined,
    email: normalized.email || undefined,
    question: normalized.question,
    category: normalized.category || undefined,
    preferredResponseMethod: normalized.preferredResponseMethod || undefined,
    consentGiven: normalized.consentGiven,
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Please review the highlighted fields.",
      fieldErrors: flattenQuestionFieldErrors(parsed.error),
    };
  }

  let repository: QuestionRepository;
  try {
    repository = getQuestionRepository();
  } catch {
    await reportException({
      source: "CONFIGURATION",
      code: "CONFIG_MISSING",
      severity: "CRITICAL",
      message: "Question store is misconfigured.",
      operation: "submitPsychologyQuestion",
      route: "/ask-a-question",
    });
    return {
      ok: false,
      code: "store_unavailable",
      message: questionPortalCopy.deliveryFailedMessage,
    };
  }

  const fingerprint = fingerprintSubmission(
    parsed.data.question,
    parsed.data.email ?? null,
  );
  const since = new Date(
    Date.now() - questionPortalConfig.duplicateWindowMs,
  ).toISOString();
  if (await repository.hasRecentDuplicate(fingerprint, since)) {
    return {
      ok: false,
      code: "duplicate",
      message: questionPortalCopy.abuseRejectedMessage,
    };
  }

  const now = new Date().toISOString();
  const record: QuestionSubmissionRecord = {
    id: createQuestionId(),
    publicReferenceId: createPublicReferenceId(),
    name: parsed.data.name || null,
    email: parsed.data.email || null,
    question: parsed.data.question,
    category: (parsed.data.category as QuestionCategory | undefined) ?? null,
    preferredResponseMethod:
      (parsed.data.preferredResponseMethod as PreferredResponseMethod | undefined) ??
      null,
    consentGiven: true,
    status: "NEW",
    priority: "NORMAL",
    psychologistResponse: null,
    internalNotes: null,
    aiAssistedDraft: null,
    publicationStatus: "PRIVATE",
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    respondedAt: null,
    reviewedBy: null,
    responseSentAt: null,
    archivedAt: null,
  };

  await repository.create(record);
  await repository.rememberFingerprint(fingerprint, now);
  await audit(repository, record.id, "question_created", "public", {
    reference: record.publicReferenceId,
    category: record.category,
  });

  if (!options.skipNotification) {
    const notified = await sendNewQuestionNotification(record);
    if (!notified.ok) {
      logStructured("WARNING", {
        operation: "submitPsychologyQuestion",
        errorType: "notification_failed",
        referencePresent: true,
      });
    }
  }

  logStructured("INFO", {
    operation: "submitPsychologyQuestion",
    safetyCategory: "question_submission",
    status: record.status,
  });

  return { ok: true, publicReferenceId: record.publicReferenceId };
}

export async function listPsychologistQuestions(
  session: PsychologistSession | null,
  filters: QuestionListFilters,
): Promise<QuestionListResult> {
  assertPsychologist(session);
  return getQuestionRepository().list(filters);
}

export async function getPsychologistQuestion(
  session: PsychologistSession | null,
  publicReferenceId: string,
): Promise<{
  record: QuestionSubmissionRecord;
  audit: QuestionAuditEvent[];
} | null> {
  const actor = assertPsychologist(session);
  const repository = getQuestionRepository();
  const record = await repository.getByPublicReferenceId(publicReferenceId);
  if (!record) {
    return null;
  }
  await audit(repository, record.id, "question_viewed", actor.email, {
    reference: record.publicReferenceId,
  });
  return { record, audit: await repository.listAudit(record.id) };
}

export async function getQuestionStats(
  session: PsychologistSession | null,
): Promise<QuestionDashboardStats> {
  assertPsychologist(session);
  return getQuestionRepository().stats();
}

export async function updatePsychologistQuestion(
  session: PsychologistSession | null,
  input: PsychologistUpdateInput,
): Promise<QuestionSubmissionRecord> {
  const actor = assertPsychologist(session);
  const repository = getQuestionRepository();
  const record = await repository.getByPublicReferenceId(input.publicReferenceId);
  if (!record) {
    throw new Error("NOT_FOUND");
  }

  const now = new Date().toISOString();
  const next: QuestionSubmissionRecord = {
    ...record,
    updatedAt: now,
    reviewedAt: record.reviewedAt ?? now,
    reviewedBy: actor.email,
  };

  if (input.status) {
    next.status = input.status;
    if (input.status === "ARCHIVED") {
      next.archivedAt = now;
    }
  }
  if (input.priority) {
    next.priority = input.priority;
  }
  if (input.internalNotes !== undefined) {
    next.internalNotes = input.internalNotes;
  }
  if (input.psychologistResponse !== undefined) {
    next.psychologistResponse = input.psychologistResponse;
    if (input.psychologistResponse.trim() && next.status === "NEW") {
      next.status = "DRAFT_RESPONSE";
    }
  }
  if (input.publicationStatus) {
    next.publicationStatus = input.publicationStatus;
  }

  await repository.update(next);
  await audit(repository, next.id, "question_updated", actor.email, {
    status: next.status,
    priority: next.priority,
    publicationStatus: next.publicationStatus,
  });
  return next;
}

export async function sendPsychologistResponse(
  session: PsychologistSession | null,
  publicReferenceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const actor = assertPsychologist(session);
  const repository = getQuestionRepository();
  const record = await repository.getByPublicReferenceId(publicReferenceId);
  if (!record) {
    return { ok: false, message: "That submission could not be found." };
  }
  if (!record.email) {
    return {
      ok: false,
      message: "This submission does not include an email address.",
    };
  }
  if (!record.psychologistResponse?.trim()) {
    return { ok: false, message: "Please write a response before sending." };
  }

  const delivery = await sendQuestionResponseEmail(record);
  if (!delivery.ok) {
    return {
      ok: false,
      message: "The response could not be emailed just now. It has not been marked as sent.",
    };
  }

  const now = new Date().toISOString();
  const next: QuestionSubmissionRecord = {
    ...record,
    status: "RESPONDED",
    respondedAt: now,
    responseSentAt: now,
    reviewedBy: actor.email,
    updatedAt: now,
  };
  await repository.update(next);
  await audit(repository, next.id, "response_sent", actor.email, {
    reference: next.publicReferenceId,
  });
  return { ok: true };
}

export async function archivePsychologistQuestion(
  session: PsychologistSession | null,
  publicReferenceId: string,
): Promise<QuestionSubmissionRecord> {
  return updatePsychologistQuestion(session, {
    publicReferenceId,
    status: "ARCHIVED",
  });
}

export async function prepareAiAssistedDraft(
  session: PsychologistSession | null,
  publicReferenceId: string,
): Promise<{ ok: true; draft: string } | { ok: false; message: string }> {
  const actor = assertPsychologist(session);
  const repository = getQuestionRepository();
  const record = await repository.getByPublicReferenceId(publicReferenceId);
  if (!record) {
    return { ok: false, message: "That submission could not be found." };
  }
  const drafted = await createAiAssistedDraft(record);
  if (!drafted.ok) {
    return {
      ok: false,
      message: "An educational draft could not be prepared just now.",
    };
  }
  const next = {
    ...record,
    aiAssistedDraft: drafted.draft,
    updatedAt: new Date().toISOString(),
    reviewedBy: actor.email,
  };
  await repository.update(next);
  await audit(repository, next.id, "ai_draft_created", actor.email, {
    requiresReview: true,
  });
  return { ok: true, draft: drafted.draft };
}

export function previewQuestion(question: string, length = 140): string {
  const collapsed = question.trim().replace(/\s+/g, " ");
  if (collapsed.length <= length) {
    return collapsed;
  }
  return `${collapsed.slice(0, length - 1)}…`;
}

export function isAllowedStatusTransition(
  from: QuestionStatus,
  to: QuestionStatus,
): boolean {
  if (from === to) {
    return true;
  }
  const allowed: Record<QuestionStatus, QuestionStatus[]> = {
    NEW: ["UNDER_REVIEW", "DRAFT_RESPONSE", "ARCHIVED"],
    UNDER_REVIEW: ["DRAFT_RESPONSE", "RESPONDED", "ARCHIVED", "NEW"],
    DRAFT_RESPONSE: ["UNDER_REVIEW", "RESPONDED", "ARCHIVED"],
    RESPONDED: ["ARCHIVED", "UNDER_REVIEW"],
    ARCHIVED: ["UNDER_REVIEW"],
  };
  return allowed[from].includes(to);
}

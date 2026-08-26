import type {
  QuestionAuditEvent,
  QuestionDashboardStats,
  QuestionListFilters,
  QuestionListResult,
  QuestionSubmissionRecord,
} from "@/types/question-portal";

export type CreateQuestionInput = Omit<
  QuestionSubmissionRecord,
  | "reviewedAt"
  | "respondedAt"
  | "reviewedBy"
  | "responseSentAt"
  | "archivedAt"
  | "psychologistResponse"
  | "internalNotes"
  | "aiAssistedDraft"
> & {
  psychologistResponse?: string | null;
  internalNotes?: string | null;
  aiAssistedDraft?: string | null;
  reviewedAt?: string | null;
  respondedAt?: string | null;
  reviewedBy?: string | null;
  responseSentAt?: string | null;
  archivedAt?: string | null;
};

export interface QuestionRepository {
  create(record: QuestionSubmissionRecord): Promise<QuestionSubmissionRecord>;
  getById(id: string): Promise<QuestionSubmissionRecord | null>;
  getByPublicReferenceId(
    publicReferenceId: string,
  ): Promise<QuestionSubmissionRecord | null>;
  update(record: QuestionSubmissionRecord): Promise<QuestionSubmissionRecord>;
  list(filters: QuestionListFilters): Promise<QuestionListResult>;
  stats(): Promise<QuestionDashboardStats>;
  hasRecentDuplicate(fingerprint: string, sinceIso: string): Promise<boolean>;
  rememberFingerprint(fingerprint: string, createdAt: string): Promise<void>;
  addAudit(event: QuestionAuditEvent): Promise<void>;
  listAudit(questionId: string): Promise<QuestionAuditEvent[]>;
}

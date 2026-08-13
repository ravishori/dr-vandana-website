export const QUESTION_CATEGORIES = [
  "stress-management",
  "anxiety",
  "emotional-well-being",
  "relationships",
  "parenting",
  "child-psychology",
  "adolescent-mental-health",
  "self-esteem",
  "workplace-stress",
  "anger-management",
  "grief-loss",
  "personal-growth",
  "mindfulness",
  "other",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const QUESTION_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "DRAFT_RESPONSE",
  "RESPONDED",
  "ARCHIVED",
] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

export type QuestionPriority = (typeof QUESTION_PRIORITIES)[number];

export const PUBLICATION_STATUSES = [
  "PRIVATE",
  "PENDING_APPROVAL",
  "APPROVED_FOR_PUBLICATION",
  "PUBLISHED",
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const RESPONSE_METHODS = ["email", "portal-only", "no-preference"] as const;

export type PreferredResponseMethod = (typeof RESPONSE_METHODS)[number];

export const PSYCHOLOGIST_ROLE = "PSYCHOLOGIST" as const;

export type PsychologistRole = typeof PSYCHOLOGIST_ROLE;

export type QuestionSubmissionRecord = {
  id: string;
  publicReferenceId: string;
  name: string | null;
  email: string | null;
  question: string;
  category: QuestionCategory | null;
  preferredResponseMethod: PreferredResponseMethod | null;
  consentGiven: boolean;
  status: QuestionStatus;
  priority: QuestionPriority;
  psychologistResponse: string | null;
  internalNotes: string | null;
  aiAssistedDraft: string | null;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  respondedAt: string | null;
  reviewedBy: string | null;
  responseSentAt: string | null;
  archivedAt: string | null;
};

export type QuestionAuditEvent = {
  id: string;
  questionId: string;
  action: string;
  actor: string;
  createdAt: string;
  /** Non-sensitive metadata only (status names, not question bodies). */
  metadata: Record<string, string | number | boolean | null>;
};

export type QuestionListFilters = {
  status?: QuestionStatus;
  category?: QuestionCategory;
  priority?: QuestionPriority;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};

export type QuestionListResult = {
  items: QuestionSubmissionRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type QuestionDashboardStats = {
  newCount: number;
  underReviewCount: number;
  draftResponseCount: number;
  respondedCount: number;
  archivedCount: number;
};

export type PublicQuestionInput = {
  name?: string;
  email?: string;
  question: string;
  category?: string;
  preferredResponseMethod?: string;
  consentGiven: boolean;
  website?: string;
};

export type PsychologistSession = {
  email: string;
  role: PsychologistRole;
  expiresAt: number;
  sessionId: string;
};

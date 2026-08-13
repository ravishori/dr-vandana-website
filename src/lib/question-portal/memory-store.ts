import { questionPortalConfig } from "@/config/question-portal";
import type { QuestionRepository } from "@/lib/question-portal/repository";
import type {
  QuestionAuditEvent,
  QuestionDashboardStats,
  QuestionListFilters,
  QuestionListResult,
  QuestionSubmissionRecord,
} from "@/types/question-portal";

type MemoryState = {
  questions: Map<string, QuestionSubmissionRecord>;
  fingerprints: Map<string, string>;
  audit: QuestionAuditEvent[];
};

const globalState: MemoryState = {
  questions: new Map(),
  fingerprints: new Map(),
  audit: [],
};

function matchesFilters(
  record: QuestionSubmissionRecord,
  filters: QuestionListFilters,
): boolean {
  if (filters.status && record.status !== filters.status) {
    return false;
  }
  if (filters.category && record.category !== filters.category) {
    return false;
  }
  if (filters.priority && record.priority !== filters.priority) {
    return false;
  }
  if (filters.createdFrom && record.createdAt < filters.createdFrom) {
    return false;
  }
  if (filters.createdTo && record.createdAt > filters.createdTo) {
    return false;
  }
  if (filters.search) {
    const haystack = [
      record.publicReferenceId,
      record.category ?? "",
      record.name ?? "",
      record.email ?? "",
      record.question,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.search.trim().toLowerCase())) {
      return false;
    }
  }
  return true;
}

export class MemoryQuestionRepository implements QuestionRepository {
  constructor(private readonly state: MemoryState = globalState) {}

  async create(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    this.state.questions.set(record.id, record);
    return record;
  }

  async getById(id: string): Promise<QuestionSubmissionRecord | null> {
    return this.state.questions.get(id) ?? null;
  }

  async getByPublicReferenceId(
    publicReferenceId: string,
  ): Promise<QuestionSubmissionRecord | null> {
    for (const record of this.state.questions.values()) {
      if (record.publicReferenceId === publicReferenceId) {
        return record;
      }
    }
    return null;
  }

  async update(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    this.state.questions.set(record.id, record);
    return record;
  }

  async list(filters: QuestionListFilters): Promise<QuestionListResult> {
    const pageSize = Math.min(filters.pageSize ?? questionPortalConfig.pageSize, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const matched = [...this.state.questions.values()]
      .filter((record) => matchesFilters(record, filters))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const start = (page - 1) * pageSize;
    return {
      items: matched.slice(start, start + pageSize),
      total: matched.length,
      page,
      pageSize,
    };
  }

  async stats(): Promise<QuestionDashboardStats> {
    const records = [...this.state.questions.values()];
    return {
      newCount: records.filter((record) => record.status === "NEW").length,
      underReviewCount: records.filter((record) => record.status === "UNDER_REVIEW")
        .length,
      draftResponseCount: records.filter(
        (record) => record.status === "DRAFT_RESPONSE",
      ).length,
      respondedCount: records.filter((record) => record.status === "RESPONDED")
        .length,
      archivedCount: records.filter((record) => record.status === "ARCHIVED")
        .length,
    };
  }

  async hasRecentDuplicate(
    fingerprint: string,
    sinceIso: string,
  ): Promise<boolean> {
    const createdAt = this.state.fingerprints.get(fingerprint);
    return Boolean(createdAt && createdAt >= sinceIso);
  }

  async rememberFingerprint(
    fingerprint: string,
    createdAt: string,
  ): Promise<void> {
    this.state.fingerprints.set(fingerprint, createdAt);
  }

  async addAudit(event: QuestionAuditEvent): Promise<void> {
    this.state.audit.push(event);
  }

  async listAudit(questionId: string): Promise<QuestionAuditEvent[]> {
    return this.state.audit
      .filter((event) => event.questionId === questionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}

export function resetMemoryQuestionRepositoryForTests(): void {
  globalState.questions.clear();
  globalState.fingerprints.clear();
  globalState.audit.length = 0;
}

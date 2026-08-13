import { Redis } from "@upstash/redis";

import { questionPortalConfig } from "@/config/question-portal";
import type { QuestionRepository } from "@/lib/question-portal/repository";
import type {
  QuestionAuditEvent,
  QuestionDashboardStats,
  QuestionListFilters,
  QuestionListResult,
  QuestionSubmissionRecord,
} from "@/types/question-portal";

const PREFIX = "drvandana:qportal";

function recordKey(id: string): string {
  return `${PREFIX}:item:${id}`;
}
function refKey(reference: string): string {
  return `${PREFIX}:ref:${reference}`;
}
function indexKey(): string {
  return `${PREFIX}:index`;
}
function fingerprintKey(fingerprint: string): string {
  return `${PREFIX}:fp:${fingerprint}`;
}
function auditKey(questionId: string): string {
  return `${PREFIX}:audit:${questionId}`;
}

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

export class UpstashQuestionRepository implements QuestionRepository {
  constructor(private readonly redis: Redis = Redis.fromEnv()) {}

  async create(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    const score = Date.parse(record.createdAt) || Date.now();
    await this.redis.set(recordKey(record.id), record);
    await this.redis.set(refKey(record.publicReferenceId), record.id);
    await this.redis.zadd(indexKey(), { score, member: record.id });
    return record;
  }

  async getById(id: string): Promise<QuestionSubmissionRecord | null> {
    const record = await this.redis.get<QuestionSubmissionRecord>(recordKey(id));
    return record ?? null;
  }

  async getByPublicReferenceId(
    publicReferenceId: string,
  ): Promise<QuestionSubmissionRecord | null> {
    const id = await this.redis.get<string>(refKey(publicReferenceId));
    if (!id) {
      return null;
    }
    return this.getById(id);
  }

  async update(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    await this.redis.set(recordKey(record.id), record);
    return record;
  }

  async list(filters: QuestionListFilters): Promise<QuestionListResult> {
    const pageSize = Math.min(filters.pageSize ?? questionPortalConfig.pageSize, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const ids = (await this.redis.zrange(indexKey(), 0, -1, {
      rev: true,
    })) as string[];
    const records: QuestionSubmissionRecord[] = [];
    for (const id of ids.slice(0, 500)) {
      const record = await this.getById(id);
      if (record && matchesFilters(record, filters)) {
        records.push(record);
      }
    }
    const start = (page - 1) * pageSize;
    return {
      items: records.slice(start, start + pageSize),
      total: records.length,
      page,
      pageSize,
    };
  }

  async stats(): Promise<QuestionDashboardStats> {
    const listed = await this.list({ page: 1, pageSize: 500 });
    const records = listed.items;
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
    const createdAt = await this.redis.get<string>(fingerprintKey(fingerprint));
    return Boolean(createdAt && createdAt >= sinceIso);
  }

  async rememberFingerprint(
    fingerprint: string,
    createdAt: string,
  ): Promise<void> {
    await this.redis.set(fingerprintKey(fingerprint), createdAt, {
      ex: Math.ceil(questionPortalConfig.duplicateWindowMs / 1000) + 60,
    });
  }

  async addAudit(event: QuestionAuditEvent): Promise<void> {
    await this.redis.rpush(auditKey(event.questionId), event);
  }

  async listAudit(questionId: string): Promise<QuestionAuditEvent[]> {
    const events = await this.redis.lrange<QuestionAuditEvent>(
      auditKey(questionId),
      0,
      199,
    );
    return events ?? [];
  }
}

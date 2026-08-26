import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { questionPortalConfig } from "@/config/question-portal";
import type { QuestionRepository } from "@/lib/question-portal/repository";
import type {
  QuestionAuditEvent,
  QuestionDashboardStats,
  QuestionListFilters,
  QuestionListResult,
  QuestionSubmissionRecord,
} from "@/types/question-portal";

type SqliteStatement = {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
};

let cachedDb: SqliteDatabase | null = null;
let cachedPath: string | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS question_submissions (
  id TEXT PRIMARY KEY,
  public_reference_id TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  question TEXT NOT NULL,
  category TEXT,
  preferred_response_method TEXT,
  consent_given INTEGER NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  psychologist_response TEXT,
  internal_notes TEXT,
  ai_assisted_draft TEXT,
  publication_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reviewed_at TEXT,
  responded_at TEXT,
  reviewed_by TEXT,
  response_sent_at TEXT,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_status ON question_submissions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created ON question_submissions(created_at);
CREATE TABLE IF NOT EXISTS question_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS question_audit_events (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_question ON question_audit_events(question_id);
`;

function openSqlite(path: string): SqliteDatabase {
  if (cachedDb && cachedPath === path) {
    return cachedDb;
  }
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const database = new DatabaseSync(path) as unknown as SqliteDatabase;
  database.exec(SCHEMA);
  cachedDb = database;
  cachedPath = path;
  return database;
}

function rowToRecord(row: Record<string, unknown>): QuestionSubmissionRecord {
  return {
    id: String(row.id),
    publicReferenceId: String(row.public_reference_id),
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    question: String(row.question),
    category: (row.category as QuestionSubmissionRecord["category"]) ?? null,
    preferredResponseMethod:
      (row.preferred_response_method as QuestionSubmissionRecord["preferredResponseMethod"]) ??
      null,
    consentGiven: Boolean(row.consent_given),
    status: row.status as QuestionSubmissionRecord["status"],
    priority: row.priority as QuestionSubmissionRecord["priority"],
    psychologistResponse: (row.psychologist_response as string | null) ?? null,
    internalNotes: (row.internal_notes as string | null) ?? null,
    aiAssistedDraft: (row.ai_assisted_draft as string | null) ?? null,
    publicationStatus:
      row.publication_status as QuestionSubmissionRecord["publicationStatus"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    respondedAt: (row.responded_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    responseSentAt: (row.response_sent_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
  };
}

export class SqliteQuestionRepository implements QuestionRepository {
  constructor(
    private readonly path: string = questionPortalConfig.sqlitePath,
  ) {}

  private db(): SqliteDatabase {
    return openSqlite(this.path);
  }

  async create(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    this.db()
      .prepare(
        `INSERT INTO question_submissions (
          id, public_reference_id, name, email, question, category,
          preferred_response_method, consent_given, status, priority,
          psychologist_response, internal_notes, ai_assisted_draft,
          publication_status, created_at, updated_at, reviewed_at,
          responded_at, reviewed_by, response_sent_at, archived_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        record.id,
        record.publicReferenceId,
        record.name,
        record.email,
        record.question,
        record.category,
        record.preferredResponseMethod,
        record.consentGiven ? 1 : 0,
        record.status,
        record.priority,
        record.psychologistResponse,
        record.internalNotes,
        record.aiAssistedDraft,
        record.publicationStatus,
        record.createdAt,
        record.updatedAt,
        record.reviewedAt,
        record.respondedAt,
        record.reviewedBy,
        record.responseSentAt,
        record.archivedAt,
      );
    return record;
  }

  async getById(id: string): Promise<QuestionSubmissionRecord | null> {
    const row = this.db()
      .prepare("SELECT * FROM question_submissions WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
  }

  async getByPublicReferenceId(
    publicReferenceId: string,
  ): Promise<QuestionSubmissionRecord | null> {
    const row = this.db()
      .prepare(
        "SELECT * FROM question_submissions WHERE public_reference_id = ?",
      )
      .get(publicReferenceId) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
  }

  async update(
    record: QuestionSubmissionRecord,
  ): Promise<QuestionSubmissionRecord> {
    this.db()
      .prepare(
        `UPDATE question_submissions SET
          name=?, email=?, question=?, category=?, preferred_response_method=?,
          consent_given=?, status=?, priority=?, psychologist_response=?,
          internal_notes=?, ai_assisted_draft=?, publication_status=?,
          updated_at=?, reviewed_at=?, responded_at=?, reviewed_by=?,
          response_sent_at=?, archived_at=?
        WHERE id=?`,
      )
      .run(
        record.name,
        record.email,
        record.question,
        record.category,
        record.preferredResponseMethod,
        record.consentGiven ? 1 : 0,
        record.status,
        record.priority,
        record.psychologistResponse,
        record.internalNotes,
        record.aiAssistedDraft,
        record.publicationStatus,
        record.updatedAt,
        record.reviewedAt,
        record.respondedAt,
        record.reviewedBy,
        record.responseSentAt,
        record.archivedAt,
        record.id,
      );
    return record;
  }

  async list(filters: QuestionListFilters): Promise<QuestionListResult> {
    const pageSize = Math.min(filters.pageSize ?? questionPortalConfig.pageSize, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status);
    }
    if (filters.category) {
      where.push("category = ?");
      params.push(filters.category);
    }
    if (filters.priority) {
      where.push("priority = ?");
      params.push(filters.priority);
    }
    if (filters.createdFrom) {
      where.push("created_at >= ?");
      params.push(filters.createdFrom);
    }
    if (filters.createdTo) {
      where.push("created_at <= ?");
      params.push(filters.createdTo);
    }
    if (filters.search) {
      where.push(
        "(public_reference_id LIKE ? OR IFNULL(name,'') LIKE ? OR IFNULL(email,'') LIKE ? OR question LIKE ? OR IFNULL(category,'') LIKE ?)",
      );
      const like = `%${filters.search.trim()}%`;
      params.push(like, like, like, like, like);
    }
    const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const totalRow = this.db()
      .prepare(`SELECT COUNT(*) AS count FROM question_submissions ${clause}`)
      .get(...params) as { count: number };
    const rows = this.db()
      .prepare(
        `SELECT * FROM question_submissions ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Record<
      string,
      unknown
    >[];
    return {
      items: rows.map(rowToRecord),
      total: Number(totalRow.count),
      page,
      pageSize,
    };
  }

  async stats(): Promise<QuestionDashboardStats> {
    const rows = this.db()
      .prepare(
        "SELECT status, COUNT(*) AS count FROM question_submissions GROUP BY status",
      )
      .all() as Array<{ status: string; count: number }>;
    const counts = Object.fromEntries(
      rows.map((row) => [row.status, Number(row.count)]),
    );
    return {
      newCount: counts.NEW ?? 0,
      underReviewCount: counts.UNDER_REVIEW ?? 0,
      draftResponseCount: counts.DRAFT_RESPONSE ?? 0,
      respondedCount: counts.RESPONDED ?? 0,
      archivedCount: counts.ARCHIVED ?? 0,
    };
  }

  async hasRecentDuplicate(
    fingerprint: string,
    sinceIso: string,
  ): Promise<boolean> {
    const row = this.db()
      .prepare(
        "SELECT created_at FROM question_fingerprints WHERE fingerprint = ?",
      )
      .get(fingerprint) as { created_at: string } | undefined;
    return Boolean(row && row.created_at >= sinceIso);
  }

  async rememberFingerprint(
    fingerprint: string,
    createdAt: string,
  ): Promise<void> {
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO question_fingerprints (fingerprint, created_at) VALUES (?, ?)",
      )
      .run(fingerprint, createdAt);
  }

  async addAudit(event: QuestionAuditEvent): Promise<void> {
    this.db()
      .prepare(
        "INSERT INTO question_audit_events (id, question_id, action, actor, created_at, metadata) VALUES (?,?,?,?,?,?)",
      )
      .run(
        event.id,
        event.questionId,
        event.action,
        event.actor,
        event.createdAt,
        JSON.stringify(event.metadata),
      );
  }

  async listAudit(questionId: string): Promise<QuestionAuditEvent[]> {
    const rows = this.db()
      .prepare(
        "SELECT * FROM question_audit_events WHERE question_id = ? ORDER BY created_at ASC",
      )
      .all(questionId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      questionId: String(row.question_id),
      action: String(row.action),
      actor: String(row.actor),
      createdAt: String(row.created_at),
      metadata: JSON.parse(String(row.metadata)) as QuestionAuditEvent["metadata"],
    }));
  }
}

export function resetSqliteCacheForTests(): void {
  cachedDb = null;
  cachedPath = null;
}

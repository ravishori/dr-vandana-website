import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  computeCrisisStats,
  matchesCrisisFilters,
  sortCrisisResources,
  type CrisisRepository,
} from "@/lib/crisis/repository";
import type {
  CrisisDashboardStats,
  CrisisListFilters,
  CrisisResource,
  CrisisResourceVerification,
} from "@/types/crisis";

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
};

let cachedDb: SqliteDatabase | null = null;
let cachedPath: string | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crisis_resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crisis_resource_verifications (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crisis_verif_resource
  ON crisis_resource_verifications(resource_id);
CREATE TABLE IF NOT EXISTS crisis_resources_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function openDb(path: string): SqliteDatabase {
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

export class SqliteCrisisRepository implements CrisisRepository {
  constructor(private readonly path: string) {}

  private db(): SqliteDatabase {
    return openDb(this.path);
  }

  async ensureSeeded(
    seed: readonly CrisisResource[],
    verifications: readonly CrisisResourceVerification[],
  ): Promise<void> {
    const meta = this.db()
      .prepare("SELECT value FROM crisis_resources_meta WHERE key = ?")
      .get("seeded") as { value: string } | undefined;
    if (meta?.value === "1") {
      return;
    }
    const countRow = this.db()
      .prepare("SELECT COUNT(*) AS count FROM crisis_resources")
      .get() as { count: number };
    if (Number(countRow.count) === 0) {
      for (const resource of seed) {
        await this.create(resource);
      }
      for (const entry of verifications) {
        await this.addVerification(entry);
      }
    }
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO crisis_resources_meta (key, value) VALUES (?, ?)",
      )
      .run("seeded", "1");
  }

  async list(filters: CrisisListFilters = {}): Promise<CrisisResource[]> {
    const rows = this.db()
      .prepare("SELECT payload FROM crisis_resources")
      .all() as Array<{ payload: string }>;
    const resources = rows
      .map((row) => JSON.parse(row.payload) as CrisisResource)
      .filter((resource) => matchesCrisisFilters(resource, filters));
    return sortCrisisResources(resources);
  }

  async getBySlug(slug: string): Promise<CrisisResource | null> {
    const row = this.db()
      .prepare("SELECT payload FROM crisis_resources WHERE slug = ?")
      .get(slug) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as CrisisResource) : null;
  }

  async getById(id: string): Promise<CrisisResource | null> {
    const row = this.db()
      .prepare("SELECT payload FROM crisis_resources WHERE id = ?")
      .get(id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as CrisisResource) : null;
  }

  async create(resource: CrisisResource): Promise<CrisisResource> {
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO crisis_resources (id, slug, payload) VALUES (?, ?, ?)",
      )
      .run(resource.id, resource.slug, JSON.stringify(resource));
    return resource;
  }

  async update(resource: CrisisResource): Promise<CrisisResource> {
    return this.create(resource);
  }

  async listVerifications(
    resourceId: string,
  ): Promise<CrisisResourceVerification[]> {
    const rows = this.db()
      .prepare(
        "SELECT payload FROM crisis_resource_verifications WHERE resource_id = ? ORDER BY created_at DESC",
      )
      .all(resourceId) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as CrisisResourceVerification);
  }

  async addVerification(
    entry: CrisisResourceVerification,
  ): Promise<CrisisResourceVerification> {
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO crisis_resource_verifications (id, resource_id, payload, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(entry.id, entry.resourceId, JSON.stringify(entry), entry.createdAt);
    return entry;
  }

  async stats(): Promise<CrisisDashboardStats> {
    const all = await this.list({});
    return computeCrisisStats(all);
  }
}

export function resetSqliteCrisisCacheForTests(): void {
  cachedDb = null;
  cachedPath = null;
}

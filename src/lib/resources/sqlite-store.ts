import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  computeResourceStats,
  matchesResourceFilters,
  paginateResources,
  type ResourceRepository,
} from "@/lib/resources/repository";
import type {
  ResourceDashboardStats,
  ResourceListFilters,
  ResourceListResult,
  WellnessResource,
} from "@/types/resources";

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
CREATE TABLE IF NOT EXISTS wellness_resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wellness_resources_meta (
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

export class SqliteResourceRepository implements ResourceRepository {
  constructor(private readonly path: string) {}

  private db(): SqliteDatabase {
    return openDb(this.path);
  }

  async ensureSeeded(seed: readonly WellnessResource[]): Promise<void> {
    const meta = this.db()
      .prepare("SELECT value FROM wellness_resources_meta WHERE key = ?")
      .get("seeded") as { value: string } | undefined;
    if (meta?.value === "1") {
      return;
    }
    const countRow = this.db()
      .prepare("SELECT COUNT(*) AS count FROM wellness_resources")
      .get() as { count: number };
    if (Number(countRow.count) === 0) {
      for (const resource of seed) {
        await this.create(resource);
      }
    }
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO wellness_resources_meta (key, value) VALUES (?, ?)",
      )
      .run("seeded", "1");
  }

  async list(filters: ResourceListFilters): Promise<ResourceListResult> {
    const rows = this.db()
      .prepare("SELECT payload FROM wellness_resources")
      .all() as Array<{ payload: string }>;
    const resources = rows
      .map((row) => JSON.parse(row.payload) as WellnessResource)
      .filter((resource) => matchesResourceFilters(resource, filters))
      .sort((left, right) => {
        if (left.isFeatured !== right.isFeatured) {
          return left.isFeatured ? -1 : 1;
        }
        return left.title.localeCompare(right.title);
      });
    return paginateResources(
      resources,
      filters.page ?? 1,
      filters.pageSize ?? 12,
    );
  }

  async getBySlug(slug: string): Promise<WellnessResource | null> {
    const row = this.db()
      .prepare("SELECT payload FROM wellness_resources WHERE slug = ?")
      .get(slug) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as WellnessResource) : null;
  }

  async getById(id: string): Promise<WellnessResource | null> {
    const row = this.db()
      .prepare("SELECT payload FROM wellness_resources WHERE id = ?")
      .get(id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as WellnessResource) : null;
  }

  async create(resource: WellnessResource): Promise<WellnessResource> {
    this.db()
      .prepare(
        "INSERT OR REPLACE INTO wellness_resources (id, slug, payload) VALUES (?, ?, ?)",
      )
      .run(resource.id, resource.slug, JSON.stringify(resource));
    return resource;
  }

  async update(resource: WellnessResource): Promise<WellnessResource> {
    return this.create(resource);
  }

  async stats(): Promise<ResourceDashboardStats> {
    const listed = await this.list({ page: 1, pageSize: 500 });
    return computeResourceStats(listed.items);
  }
}

export function resetSqliteResourceCacheForTests(): void {
  cachedDb = null;
  cachedPath = null;
}

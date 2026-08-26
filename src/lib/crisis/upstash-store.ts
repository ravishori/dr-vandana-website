import { Redis } from "@upstash/redis";

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

const PREFIX = "drvandana:crisis";
const INDEX = `${PREFIX}:index`;
const SEEDED = `${PREFIX}:seeded`;
const VERIF_INDEX = `${PREFIX}:verifications`;

function itemKey(id: string): string {
  return `${PREFIX}:item:${id}`;
}
function slugKey(slug: string): string {
  return `${PREFIX}:slug:${slug}`;
}
function verifKey(id: string): string {
  return `${PREFIX}:verif:${id}`;
}

export class UpstashCrisisRepository implements CrisisRepository {
  constructor(private readonly redis: Redis = Redis.fromEnv()) {}

  async ensureSeeded(
    seed: readonly CrisisResource[],
    verifications: readonly CrisisResourceVerification[],
  ): Promise<void> {
    const already = await this.redis.get<string>(SEEDED);
    if (already === "1") {
      return;
    }
    const existing = (await this.redis.smembers(INDEX)) as string[];
    if (existing.length > 0) {
      await this.redis.set(SEEDED, "1");
      return;
    }
    for (const resource of seed) {
      await this.create(resource);
    }
    for (const entry of verifications) {
      await this.addVerification(entry);
    }
    await this.redis.set(SEEDED, "1");
  }

  async list(filters: CrisisListFilters = {}): Promise<CrisisResource[]> {
    const ids = (await this.redis.smembers(INDEX)) as string[];
    const resources: CrisisResource[] = [];
    for (const id of ids) {
      const resource = await this.getById(id);
      if (resource && matchesCrisisFilters(resource, filters)) {
        resources.push(resource);
      }
    }
    return sortCrisisResources(resources);
  }

  async getBySlug(slug: string): Promise<CrisisResource | null> {
    const id = await this.redis.get<string>(slugKey(slug));
    if (!id) {
      return null;
    }
    return this.getById(id);
  }

  async getById(id: string): Promise<CrisisResource | null> {
    return (await this.redis.get<CrisisResource>(itemKey(id))) ?? null;
  }

  async create(resource: CrisisResource): Promise<CrisisResource> {
    await this.redis.set(itemKey(resource.id), resource);
    await this.redis.set(slugKey(resource.slug), resource.id);
    await this.redis.sadd(INDEX, resource.id);
    return resource;
  }

  async update(resource: CrisisResource): Promise<CrisisResource> {
    await this.redis.set(itemKey(resource.id), resource);
    await this.redis.set(slugKey(resource.slug), resource.id);
    return resource;
  }

  async listVerifications(
    resourceId: string,
  ): Promise<CrisisResourceVerification[]> {
    const ids = (await this.redis.smembers(VERIF_INDEX)) as string[];
    const entries: CrisisResourceVerification[] = [];
    for (const id of ids) {
      const entry =
        await this.redis.get<CrisisResourceVerification>(verifKey(id));
      if (entry && entry.resourceId === resourceId) {
        entries.push(entry);
      }
    }
    return entries.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async addVerification(
    entry: CrisisResourceVerification,
  ): Promise<CrisisResourceVerification> {
    await this.redis.set(verifKey(entry.id), entry);
    await this.redis.sadd(VERIF_INDEX, entry.id);
    return entry;
  }

  async stats(): Promise<CrisisDashboardStats> {
    const all = await this.list({});
    return computeCrisisStats(all);
  }
}

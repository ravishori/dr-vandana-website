import { Redis } from "@upstash/redis";

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

const PREFIX = "drvandana:resources";
const INDEX = `${PREFIX}:index`;
const SEEDED = `${PREFIX}:seeded`;

function itemKey(id: string): string {
  return `${PREFIX}:item:${id}`;
}
function slugKey(slug: string): string {
  return `${PREFIX}:slug:${slug}`;
}

export class UpstashResourceRepository implements ResourceRepository {
  constructor(private readonly redis: Redis = Redis.fromEnv()) {}

  async ensureSeeded(seed: readonly WellnessResource[]): Promise<void> {
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
    await this.redis.set(SEEDED, "1");
  }

  async list(filters: ResourceListFilters): Promise<ResourceListResult> {
    const ids = (await this.redis.smembers(INDEX)) as string[];
    const resources: WellnessResource[] = [];
    for (const id of ids) {
      const resource = await this.getById(id);
      if (resource && matchesResourceFilters(resource, filters)) {
        resources.push(resource);
      }
    }
    resources.sort((left, right) => {
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
    const id = await this.redis.get<string>(slugKey(slug));
    if (!id) {
      return null;
    }
    return this.getById(id);
  }

  async getById(id: string): Promise<WellnessResource | null> {
    return (await this.redis.get<WellnessResource>(itemKey(id))) ?? null;
  }

  async create(resource: WellnessResource): Promise<WellnessResource> {
    await this.redis.set(itemKey(resource.id), resource);
    await this.redis.set(slugKey(resource.slug), resource.id);
    await this.redis.sadd(INDEX, resource.id);
    return resource;
  }

  async update(resource: WellnessResource): Promise<WellnessResource> {
    await this.redis.set(itemKey(resource.id), resource);
    await this.redis.set(slugKey(resource.slug), resource.id);
    return resource;
  }

  async stats(): Promise<ResourceDashboardStats> {
    const listed = await this.list({ page: 1, pageSize: 500 });
    return computeResourceStats(listed.items);
  }
}

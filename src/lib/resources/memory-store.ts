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

type MemoryState = {
  resources: Map<string, WellnessResource>;
  seeded: boolean;
};

const globalState: MemoryState = {
  resources: new Map(),
  seeded: false,
};

export class MemoryResourceRepository implements ResourceRepository {
  constructor(private readonly state: MemoryState = globalState) {}

  async ensureSeeded(seed: readonly WellnessResource[]): Promise<void> {
    if (this.state.seeded || this.state.resources.size > 0) {
      this.state.seeded = true;
      return;
    }
    for (const resource of seed) {
      this.state.resources.set(resource.id, structuredClone(resource));
    }
    this.state.seeded = true;
  }

  async list(filters: ResourceListFilters): Promise<ResourceListResult> {
    const matched = [...this.state.resources.values()]
      .filter((resource) => matchesResourceFilters(resource, filters))
      .sort((left, right) => {
        if (left.isFeatured !== right.isFeatured) {
          return left.isFeatured ? -1 : 1;
        }
        return left.title.localeCompare(right.title);
      });
    return paginateResources(
      matched,
      filters.page ?? 1,
      filters.pageSize ?? 12,
    );
  }

  async getBySlug(slug: string): Promise<WellnessResource | null> {
    for (const resource of this.state.resources.values()) {
      if (resource.slug === slug) {
        return resource;
      }
    }
    return null;
  }

  async getById(id: string): Promise<WellnessResource | null> {
    return this.state.resources.get(id) ?? null;
  }

  async create(resource: WellnessResource): Promise<WellnessResource> {
    this.state.resources.set(resource.id, resource);
    return resource;
  }

  async update(resource: WellnessResource): Promise<WellnessResource> {
    this.state.resources.set(resource.id, resource);
    return resource;
  }

  async stats(): Promise<ResourceDashboardStats> {
    return computeResourceStats([...this.state.resources.values()]);
  }
}

export function resetMemoryResourceRepositoryForTests(): void {
  globalState.resources.clear();
  globalState.seeded = false;
}

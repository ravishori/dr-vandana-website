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

type MemoryState = {
  resources: Map<string, CrisisResource>;
  verifications: CrisisResourceVerification[];
  seeded: boolean;
};

const globalState: MemoryState = {
  resources: new Map(),
  verifications: [],
  seeded: false,
};

export class MemoryCrisisRepository implements CrisisRepository {
  constructor(private readonly state: MemoryState = globalState) {}

  async ensureSeeded(
    seed: readonly CrisisResource[],
    verifications: readonly CrisisResourceVerification[],
  ): Promise<void> {
    if (this.state.seeded || this.state.resources.size > 0) {
      this.state.seeded = true;
      return;
    }
    for (const resource of seed) {
      this.state.resources.set(resource.id, structuredClone(resource));
    }
    this.state.verifications = structuredClone([...verifications]);
    this.state.seeded = true;
  }

  async list(filters: CrisisListFilters = {}): Promise<CrisisResource[]> {
    const matched = [...this.state.resources.values()].filter((resource) =>
      matchesCrisisFilters(resource, filters),
    );
    return sortCrisisResources(matched);
  }

  async getBySlug(slug: string): Promise<CrisisResource | null> {
    for (const resource of this.state.resources.values()) {
      if (resource.slug === slug) {
        return resource;
      }
    }
    return null;
  }

  async getById(id: string): Promise<CrisisResource | null> {
    return this.state.resources.get(id) ?? null;
  }

  async create(resource: CrisisResource): Promise<CrisisResource> {
    this.state.resources.set(resource.id, resource);
    return resource;
  }

  async update(resource: CrisisResource): Promise<CrisisResource> {
    this.state.resources.set(resource.id, resource);
    return resource;
  }

  async listVerifications(
    resourceId: string,
  ): Promise<CrisisResourceVerification[]> {
    return this.state.verifications
      .filter((entry) => entry.resourceId === resourceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async addVerification(
    entry: CrisisResourceVerification,
  ): Promise<CrisisResourceVerification> {
    this.state.verifications.push(entry);
    return entry;
  }

  async stats(): Promise<CrisisDashboardStats> {
    return computeCrisisStats([...this.state.resources.values()]);
  }
}

export function resetMemoryCrisisRepositoryForTests(): void {
  globalState.resources.clear();
  globalState.verifications = [];
  globalState.seeded = false;
}

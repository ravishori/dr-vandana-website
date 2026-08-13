import type {
  ResourceDashboardStats,
  ResourceListFilters,
  ResourceListResult,
  WellnessResource,
} from "@/types/resources";

export interface ResourceRepository {
  ensureSeeded(seed: readonly WellnessResource[]): Promise<void>;
  list(filters: ResourceListFilters): Promise<ResourceListResult>;
  getBySlug(slug: string): Promise<WellnessResource | null>;
  getById(id: string): Promise<WellnessResource | null>;
  create(resource: WellnessResource): Promise<WellnessResource>;
  update(resource: WellnessResource): Promise<WellnessResource>;
  stats(): Promise<ResourceDashboardStats>;
}

export function matchesResourceFilters(
  resource: WellnessResource,
  filters: ResourceListFilters,
): boolean {
  if (filters.status && resource.status !== filters.status) {
    return false;
  }
  if (filters.resourceType && resource.resourceType !== filters.resourceType) {
    return false;
  }
  if (filters.topic && !resource.topics.includes(filters.topic)) {
    return false;
  }
  if (filters.audience && !resource.audiences.includes(filters.audience)) {
    return false;
  }
  if (filters.format && !resource.formats.includes(filters.format)) {
    return false;
  }
  if (
    filters.difficultyLevel &&
    resource.difficultyLevel !== filters.difficultyLevel
  ) {
    return false;
  }
  if (
    filters.evidenceLevel &&
    resource.evidenceLevel !== filters.evidenceLevel
  ) {
    return false;
  }
  if (filters.featuredOnly && !resource.isFeatured) {
    return false;
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    const haystack = [
      resource.title,
      resource.author ?? "",
      resource.authors.join(" "),
      resource.description,
      resource.shortDescription,
      resource.category,
      resource.subcategory ?? "",
      resource.journalName ?? "",
      resource.topics.join(" "),
      resource.citation ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) {
      return false;
    }
  }
  return true;
}

export function paginateResources(
  matched: WellnessResource[],
  page: number,
  pageSize: number,
): ResourceListResult {
  const safePage = Math.max(page, 1);
  const safeSize = Math.min(Math.max(pageSize, 1), 50);
  const start = (safePage - 1) * safeSize;
  return {
    items: matched.slice(start, start + safeSize),
    total: matched.length,
    page: safePage,
    pageSize: safeSize,
  };
}

export function computeResourceStats(
  resources: readonly WellnessResource[],
): ResourceDashboardStats {
  return {
    published: resources.filter((item) => item.status === "PUBLISHED").length,
    drafts: resources.filter((item) => item.status === "DRAFT").length,
    featured: resources.filter(
      (item) => item.isFeatured && item.status === "PUBLISHED",
    ).length,
    books: resources.filter(
      (item) => item.resourceType === "BOOK" && item.status !== "ARCHIVED",
    ).length,
    research: resources.filter(
      (item) =>
        (item.resourceType === "RESEARCH_PAPER" ||
          item.resourceType === "JOURNAL") &&
        item.status !== "ARCHIVED",
    ).length,
    articles: resources.filter(
      (item) =>
        (item.resourceType === "ARTICLE" || item.resourceType === "GUIDE") &&
        item.status !== "ARCHIVED",
    ).length,
    needsVerification: resources.filter(
      (item) =>
        !item.isVerified ||
        item.urlCheckStatus === "BROKEN" ||
        item.urlCheckStatus === "UNVERIFIED",
    ).length,
  };
}

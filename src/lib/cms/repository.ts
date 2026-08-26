import type {
  ArticleListFilters,
  CmsArticle,
  CmsContentBundle,
  CmsResource,
  CmsVideo,
  ContentDashboardStats,
  PaginatedResult,
  ResourceListFilters,
  VideoListFilters,
} from "@/types/cms";

export interface CmsRepository {
  read(): Promise<CmsContentBundle>;
  write(bundle: CmsContentBundle): Promise<void>;
  ensureSeeded(seed: CmsContentBundle): Promise<void>;
}

export function emptyBundle(): CmsContentBundle {
  return { articles: [], resources: [], videos: [] };
}

export function cloneBundle(bundle: CmsContentBundle): CmsContentBundle {
  return structuredClone(bundle);
}

function matchesQuery(haystack: string, q?: string): boolean {
  if (!q?.trim()) {
    return true;
  }
  return haystack.toLowerCase().includes(q.trim().toLowerCase());
}

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages,
  };
}

export function filterArticles(
  articles: CmsArticle[],
  filters: ArticleListFilters = {},
  publishedOnly = false,
): PaginatedResult<CmsArticle> {
  let items = [...articles];
  if (publishedOnly) {
    items = items.filter((item) => item.status === "PUBLISHED");
  } else if (filters.status && filters.status !== "ALL") {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category);
  }
  if (typeof filters.featured === "boolean") {
    items = items.filter((item) => item.featured === filters.featured);
  }
  if (filters.q) {
    items = items.filter((item) =>
      matchesQuery(
        `${item.title} ${item.excerpt} ${item.tags.join(" ")} ${item.category}`,
        filters.q,
      ),
    );
  }
  items.sort((a, b) => {
    const aDate = a.publishedAt ?? a.updatedAt;
    const bDate = b.publishedAt ?? b.updatedAt;
    return bDate.localeCompare(aDate);
  });
  return paginate(items, filters.page, filters.pageSize);
}

export function filterResources(
  resources: CmsResource[],
  filters: ResourceListFilters = {},
  publishedOnly = false,
): PaginatedResult<CmsResource> {
  let items = [...resources];
  if (publishedOnly) {
    items = items.filter((item) => item.status === "PUBLISHED");
  } else if (filters.status && filters.status !== "ALL") {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category);
  }
  if (typeof filters.featured === "boolean") {
    items = items.filter((item) => item.featured === filters.featured);
  }
  if (filters.q) {
    items = items.filter((item) =>
      matchesQuery(
        `${item.title} ${item.description} ${item.organizationName ?? ""} ${item.resourceType}`,
        filters.q,
      ),
    );
  }
  items.sort(
    (a, b) =>
      a.displayOrder - b.displayOrder || a.title.localeCompare(b.title),
  );
  return paginate(items, filters.page, filters.pageSize);
}

export function filterVideos(
  videos: CmsVideo[],
  filters: VideoListFilters = {},
  publishedOnly = false,
): PaginatedResult<CmsVideo> {
  let items = [...videos];
  if (publishedOnly) {
    items = items.filter((item) => item.status === "PUBLISHED");
  } else if (filters.status && filters.status !== "ALL") {
    items = items.filter((item) => item.status === filters.status);
  }
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category);
  }
  if (typeof filters.featured === "boolean") {
    items = items.filter((item) => item.featured === filters.featured);
  }
  if (filters.q) {
    items = items.filter((item) =>
      matchesQuery(`${item.title} ${item.description} ${item.category}`, filters.q),
    );
  }
  items.sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );
  return paginate(items, filters.page, filters.pageSize);
}

export function computeStats(bundle: CmsContentBundle): ContentDashboardStats {
  const count = <T extends { status: string }>(items: T[]) => ({
    published: items.filter((i) => i.status === "PUBLISHED").length,
    draft: items.filter((i) => i.status === "DRAFT").length,
    archived: items.filter((i) => i.status === "ARCHIVED").length,
    total: items.length,
  });
  return {
    articles: count(bundle.articles),
    resources: count(bundle.resources),
    videos: count(bundle.videos),
  };
}

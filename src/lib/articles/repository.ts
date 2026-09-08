import type {
  Article,
  ArticleDashboardStats,
  ArticleListFilters,
  ArticlesBundle,
  PaginatedArticles,
} from "@/types/articles";
import { emptyArticlesBundle } from "@/data/articles/seed";
import { runOptimisticUpdate } from "@/lib/persistence/optimistic-update";

export type ArticlesRepository = {
  read(): Promise<ArticlesBundle>;
  /** Unconditional write — prefer `update` for mutations. */
  write(bundle: ArticlesBundle): Promise<void>;
  compareAndSet(
    expectedRevision: number,
    next: ArticlesBundle,
  ): Promise<boolean>;
  update(
    mutator: (current: ArticlesBundle) => ArticlesBundle | Promise<ArticlesBundle>,
  ): Promise<ArticlesBundle>;
  ensureSeeded(seed: ArticlesBundle): Promise<void>;
};

export function normalizeArticlesBundle(value: ArticlesBundle): ArticlesBundle {
  return {
    version: 1,
    revision:
      typeof value.revision === "number" && Number.isFinite(value.revision)
        ? value.revision
        : 0,
    articles: Array.isArray(value.articles) ? value.articles : [],
  };
}

export function isArticlesBundle(value: unknown): value is ArticlesBundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as ArticlesBundle;
  return candidate.version === 1 && Array.isArray(candidate.articles);
}

export async function updateArticlesBundle(
  repository: Pick<ArticlesRepository, "read" | "compareAndSet">,
  mutator: (current: ArticlesBundle) => ArticlesBundle | Promise<ArticlesBundle>,
  clone: (value: ArticlesBundle) => ArticlesBundle,
): Promise<ArticlesBundle> {
  return runOptimisticUpdate({
    read: async () => normalizeArticlesBundle(await repository.read()),
    compareAndSet: (expected, next) => repository.compareAndSet(expected, next),
    mutator,
    clone,
  });
}

export function filterArticles(
  articles: Article[],
  filters: ArticleListFilters = {},
  publishedOnly: boolean,
): PaginatedArticles {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 9, 1), 50);
  const page = Math.max(filters.page ?? 1, 1);
  const search = filters.search?.trim().toLowerCase();

  let items = articles.filter((article) => {
    if (publishedOnly && article.status !== "PUBLISHED") {
      return false;
    }
    if (filters.status && article.status !== filters.status) {
      return false;
    }
    if (filters.category && article.category !== filters.category) {
      return false;
    }
    if (search) {
      const haystack = [
        article.title,
        article.excerpt,
        article.slug,
        article.category,
        ...article.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  items = [...items].sort((a, b) => {
    const aTime = Date.parse(a.publishedAt ?? a.updatedAt);
    const bTime = Date.parse(b.publishedAt ?? b.updatedAt);
    return bTime - aTime;
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function computeArticleStats(articles: Article[]): ArticleDashboardStats {
  return {
    total: articles.length,
    draft: articles.filter((a) => a.status === "DRAFT").length,
    published: articles.filter((a) => a.status === "PUBLISHED").length,
    archived: articles.filter((a) => a.status === "ARCHIVED").length,
  };
}

export { emptyArticlesBundle };

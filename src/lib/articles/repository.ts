import type {
  Article,
  ArticleDashboardStats,
  ArticleListFilters,
  ArticlesBundle,
  PaginatedArticles,
} from "@/types/articles";
import { emptyArticlesBundle } from "@/data/articles/seed";

export type ArticlesRepository = {
  read(): Promise<ArticlesBundle>;
  write(bundle: ArticlesBundle): Promise<void>;
  ensureSeeded(seed: ArticlesBundle): Promise<void>;
};

export function isArticlesBundle(value: unknown): value is ArticlesBundle {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as ArticlesBundle;
  return candidate.version === 1 && Array.isArray(candidate.articles);
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

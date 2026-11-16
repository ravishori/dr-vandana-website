import { articlesConfig } from "@/config/articles";
import { articleRecords } from "@/data/articles/records";
import { estimateReadingTimeMinutes } from "@/lib/articles/slug";
import { assertValidArticleRecords } from "@/lib/articles/validate";
import type {
  Article,
  ArticleListFilters,
  PaginatedArticles,
} from "@/types/articles";

/**
 * Read-only article service over reviewed, in-repository records.
 * Pure functions over in-repository data: no I/O of any kind.
 */
export function createArticleService(
  records: readonly Article[],
  now: () => Date = () => new Date(),
) {
  assertValidArticleRecords(records);

  function visible(): Article[] {
    const current = now().getTime();
    return records.filter(
      (a) =>
        a.status === "PUBLISHED" &&
        a.contentApprovedAt !== null &&
        a.publishedAt !== null &&
        Date.parse(a.publishedAt) <= current,
    );
  }

  function listPublishedArticles(
    filters: ArticleListFilters = {},
  ): PaginatedArticles {
    const pageSize = Math.min(Math.max(filters.pageSize ?? articlesConfig.listPageSize, 1), 50);
    const page = Math.max(filters.page ?? 1, 1);
    const search = filters.search?.trim().toLowerCase();

    const items = visible()
      .filter((a) => !filters.category || a.category === filters.category)
      .filter((a) => {
        if (!search) return true;
        return [a.title, a.excerpt, a.slug, a.category, ...a.tags]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((x, y) => Date.parse(y.publishedAt as string) - Date.parse(x.publishedAt as string));

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  function getPublishedArticleBySlug(slug: string): Article | null {
    return visible().find((a) => a.slug === slug) ?? null;
  }

  function getPublishedArticleSlugs(): string[] {
    return visible().map((a) => a.slug);
  }

  function hasPublishedArticles(): boolean {
    return visible().length > 0;
  }

  function listRelatedPublishedArticles(slug: string, limit = 3): Article[] {
    const current = getPublishedArticleBySlug(slug);
    if (!current) return [];
    return listPublishedArticles({ pageSize: 50 }).items
      .filter((a) => a.slug !== slug)
      .filter(
        (a) =>
          a.category === current.category ||
          a.tags.some((tag) => current.tags.includes(tag)),
      )
      .slice(0, limit);
  }

  function readingTimeMinutes(article: Article): number {
    return estimateReadingTimeMinutes(article.content);
  }

  return {
    listPublishedArticles,
    getPublishedArticleBySlug,
    getPublishedArticleSlugs,
    hasPublishedArticles,
    listRelatedPublishedArticles,
    readingTimeMinutes,
  };
}

const defaultService = createArticleService(articleRecords);

export const {
  listPublishedArticles,
  getPublishedArticleBySlug,
  getPublishedArticleSlugs,
  hasPublishedArticles,
  listRelatedPublishedArticles,
  readingTimeMinutes,
} = defaultService;

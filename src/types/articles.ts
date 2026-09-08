/**
 * Educational articles domain types for the public library and doctor CMS.
 */

export const ARTICLE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_CATEGORIES = [
  "Mental Wellness",
  "Anxiety",
  "Stress",
  "Counselling",
  "Relationships",
  "Parenting",
  "Mindfulness",
  "General",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown subset — rendered through a sanitizing renderer. */
  content: string;
  featuredImageUrl: string | null;
  authorId: string;
  authorName: string;
  category: ArticleCategory;
  tags: string[];
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  readingTimeMinutes: number;
  showEducationalDisclaimer: boolean;
};

export type ArticlesBundle = {
  /** Schema version for the document shape. */
  version: 1;
  /**
   * Optimistic concurrency token. Incremented on every successful write.
   * Missing/legacy documents are treated as revision 0.
   */
  revision: number;
  articles: Article[];
};

export type ArticleListFilters = {
  status?: ArticleStatus;
  category?: ArticleCategory;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedArticles = {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ArticleDashboardStats = {
  total: number;
  draft: number;
  published: number;
  archived: number;
};

/**
 * Educational articles — public, read-only content model.
 * No personal data and no persistence layer.
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

export type ArticleImage = {
  /** Site-relative path under /public, for example "/images/articles/example.jpg". */
  src: string;
  /** Required descriptive text for accessibility. */
  alt: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown subset, rendered only through `renderSafeMarkdown`. */
  content: string;
  category: ArticleCategory;
  tags: string[];
  status: ArticleStatus;
  /** ISO date-time. Required when PUBLISHED. A future value means "scheduled", not visible. */
  publishedAt: string | null;
  updatedAt: string;
  /** ISO date-time recorded when Dr. Vandana approved the wording. Required when PUBLISHED. */
  contentApprovedAt: string | null;
  authorName: string;
  featuredImage: ArticleImage | null;
  seoTitle: string | null;
  seoDescription: string | null;
  showEducationalDisclaimer: boolean;
};

export type ArticleListFilters = {
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

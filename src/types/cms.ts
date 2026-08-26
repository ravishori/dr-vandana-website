/**
 * CMS domain types for articles, psychology resources, and YouTube videos.
 * Status model: DRAFT | PUBLISHED | ARCHIVED
 */

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const ARTICLE_CATEGORIES = [
  "Anxiety & Stress",
  "Emotional Well-being",
  "Parenting",
  "Child Psychology",
  "Adolescent Mental Health",
  "Relationships",
  "Anger Management",
  "Self-esteem & Confidence",
  "Workplace Mental Health",
  "Mindfulness & Meditation",
  "Women's Mental Health",
  "Personal Growth",
  "Healthy Habits",
  "Grief & Emotional Support",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const RESOURCE_TYPES = [
  "Mental Health Information",
  "Educational Resource",
  "Crisis / Support Resource",
  "Government Resource",
  "Child & Adolescent Resource",
  "Parenting Resource",
  "Workplace Wellness",
  "Mindfulness Resource",
  "Professional Organization",
  "Other",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const VIDEO_CATEGORIES = [
  "Mental Wellness",
  "Stress & Anxiety",
  "Parenting & Family",
  "Mindfulness",
  "Personal Growth",
  "Practice Updates",
  "Other",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export type CmsArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown subset — rendered through a sanitizing renderer. */
  contentMarkdown: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  category: ArticleCategory;
  tags: string[];
  author: string;
  status: ContentStatus;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  showEducationalDisclaimer: boolean;
};

export type CmsResource = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  organizationName: string | null;
  resourceType: ResourceType;
  featured: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CmsVideo = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string | null;
  category: VideoCategory;
  featured: boolean;
  displayOrder: number;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CmsContentBundle = {
  articles: CmsArticle[];
  resources: CmsResource[];
  videos: CmsVideo[];
};

export type ContentDashboardStats = {
  articles: { published: number; draft: number; archived: number; total: number };
  resources: { published: number; draft: number; archived: number; total: number };
  videos: { published: number; draft: number; archived: number; total: number };
};

export type ArticleListFilters = {
  q?: string;
  status?: ContentStatus | "ALL";
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export type ResourceListFilters = {
  q?: string;
  status?: ContentStatus | "ALL";
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export type VideoListFilters = {
  q?: string;
  status?: ContentStatus | "ALL";
  category?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ContentAdminSession = {
  email: string;
  role: "CONTENT_EDITOR";
  issuedAt: number;
  expiresAt: number;
};

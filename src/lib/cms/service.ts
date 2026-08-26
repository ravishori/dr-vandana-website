import { cmsConfig } from "@/config/cms";
import {
  articleUpsertSchema,
  resourceUpsertSchema,
  videoUpsertSchema,
  type ArticleUpsertInput,
  type ResourceUpsertInput,
  type VideoUpsertInput,
} from "@/lib/cms/schema";
import {
  computeStats,
  filterArticles,
  filterResources,
  filterVideos,
} from "@/lib/cms/repository";
import { getCmsRepository } from "@/lib/cms/store";
import { extractYoutubeVideoId, youtubeThumbnailUrl } from "@/lib/cms/urls";
import type {
  ArticleListFilters,
  CmsArticle,
  CmsResource,
  CmsVideo,
  ContentAdminSession,
  ContentDashboardStats,
  PaginatedResult,
  ResourceListFilters,
  VideoListFilters,
} from "@/types/cms";

function assertAdmin(session: ContentAdminSession | null): ContentAdminSession {
  if (!session || session.role !== "CONTENT_EDITOR") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listPublishedArticles(
  filters: ArticleListFilters = {},
): Promise<PaginatedResult<CmsArticle>> {
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterArticles(bundle.articles, filters, true);
}

export async function getPublishedArticleBySlug(
  slug: string,
): Promise<CmsArticle | null> {
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const article = bundle.articles.find((item) => item.slug === slug) ?? null;
  if (!article || article.status !== "PUBLISHED") {
    return null;
  }
  return article;
}

export async function listAdminArticles(
  session: ContentAdminSession | null,
  filters: ArticleListFilters = {},
): Promise<PaginatedResult<CmsArticle>> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterArticles(bundle.articles, filters, false);
}

export async function getAdminArticleById(
  session: ContentAdminSession | null,
  id: string,
): Promise<CmsArticle | null> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return bundle.articles.find((item) => item.id === id) ?? null;
}

export async function upsertArticle(
  session: ContentAdminSession | null,
  input: ArticleUpsertInput,
): Promise<CmsArticle> {
  assertAdmin(session);
  const parsed = articleUpsertSchema.parse(input);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = parsed.id
    ? bundle.articles.find((item) => item.id === parsed.id)
    : bundle.articles.find((item) => item.slug === parsed.slug);

  const slugOwner = bundle.articles.find((item) => item.slug === parsed.slug);
  if (slugOwner && slugOwner.id !== existing?.id) {
    throw new Error("DUPLICATE_SLUG");
  }

  const timestamp = nowIso();
  const article: CmsArticle = {
    id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
    title: parsed.title,
    slug: parsed.slug,
    excerpt: parsed.excerpt,
    contentMarkdown: parsed.contentMarkdown,
    featuredImageUrl: parsed.featuredImageUrl ?? null,
    featuredImageAlt: parsed.featuredImageAlt ?? null,
    category: parsed.category,
    tags: parsed.tags,
    author: parsed.author || cmsConfig.defaultAuthor,
    status: parsed.status,
    featured: parsed.featured,
    seoTitle: parsed.seoTitle ?? null,
    seoDescription: parsed.seoDescription ?? null,
    canonicalPath:
      parsed.canonicalPath ??
      (parsed.status === "PUBLISHED" ? `/blog/${parsed.slug}` : null),
    publishedAt:
      parsed.status === "PUBLISHED"
        ? (parsed.publishedAt ?? existing?.publishedAt ?? timestamp)
        : parsed.publishedAt ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    showEducationalDisclaimer: parsed.showEducationalDisclaimer,
  };

  bundle.articles = existing
    ? bundle.articles.map((item) => (item.id === article.id ? article : item))
    : [...bundle.articles, article];
  await repo.write(bundle);
  return article;
}

export async function setArticleStatus(
  session: ContentAdminSession | null,
  id: string,
  status: CmsArticle["status"],
): Promise<CmsArticle> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = bundle.articles.find((item) => item.id === id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  const timestamp = nowIso();
  const updated: CmsArticle = {
    ...existing,
    status,
    publishedAt:
      status === "PUBLISHED"
        ? (existing.publishedAt ?? timestamp)
        : existing.publishedAt,
    canonicalPath:
      status === "PUBLISHED"
        ? (existing.canonicalPath ?? `/blog/${existing.slug}`)
        : existing.canonicalPath,
    updatedAt: timestamp,
  };
  bundle.articles = bundle.articles.map((item) =>
    item.id === id ? updated : item,
  );
  await repo.write(bundle);
  return updated;
}

export async function deleteArticle(
  session: ContentAdminSession | null,
  id: string,
): Promise<void> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  bundle.articles = bundle.articles.filter((item) => item.id !== id);
  await repo.write(bundle);
}

export async function listPublishedResources(
  filters: ResourceListFilters = {},
): Promise<PaginatedResult<CmsResource>> {
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterResources(bundle.resources, filters, true);
}

export async function listAdminResources(
  session: ContentAdminSession | null,
  filters: ResourceListFilters = {},
): Promise<PaginatedResult<CmsResource>> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterResources(bundle.resources, filters, false);
}

export async function getAdminResourceById(
  session: ContentAdminSession | null,
  id: string,
): Promise<CmsResource | null> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return bundle.resources.find((item) => item.id === id) ?? null;
}

export async function upsertResource(
  session: ContentAdminSession | null,
  input: ResourceUpsertInput,
): Promise<CmsResource> {
  assertAdmin(session);
  const parsed = resourceUpsertSchema.parse(input);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = parsed.id
    ? bundle.resources.find((item) => item.id === parsed.id)
    : undefined;
  const timestamp = nowIso();
  const resource: CmsResource = {
    id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
    title: parsed.title,
    description: parsed.description,
    url: parsed.url,
    category: parsed.category,
    organizationName: parsed.organizationName ?? null,
    resourceType: parsed.resourceType,
    featured: parsed.featured,
    displayOrder: parsed.displayOrder,
    status: parsed.status,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  bundle.resources = existing
    ? bundle.resources.map((item) =>
        item.id === resource.id ? resource : item,
      )
    : [...bundle.resources, resource];
  await repo.write(bundle);
  return resource;
}

export async function setResourceStatus(
  session: ContentAdminSession | null,
  id: string,
  status: CmsResource["status"],
): Promise<CmsResource> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = bundle.resources.find((item) => item.id === id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  const updated = { ...existing, status, updatedAt: nowIso() };
  bundle.resources = bundle.resources.map((item) =>
    item.id === id ? updated : item,
  );
  await repo.write(bundle);
  return updated;
}

export async function deleteResource(
  session: ContentAdminSession | null,
  id: string,
): Promise<void> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  bundle.resources = bundle.resources.filter((item) => item.id !== id);
  await repo.write(bundle);
}

export async function listPublishedVideos(
  filters: VideoListFilters = {},
): Promise<PaginatedResult<CmsVideo>> {
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterVideos(bundle.videos, filters, true);
}

export async function listAdminVideos(
  session: ContentAdminSession | null,
  filters: VideoListFilters = {},
): Promise<PaginatedResult<CmsVideo>> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return filterVideos(bundle.videos, filters, false);
}

export async function getAdminVideoById(
  session: ContentAdminSession | null,
  id: string,
): Promise<CmsVideo | null> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return bundle.videos.find((item) => item.id === id) ?? null;
}

export async function upsertVideo(
  session: ContentAdminSession | null,
  input: VideoUpsertInput,
): Promise<CmsVideo> {
  assertAdmin(session);
  const parsed = videoUpsertSchema.parse(input);
  const videoId = extractYoutubeVideoId(parsed.youtubeUrl);
  if (!videoId) {
    throw new Error("INVALID_YOUTUBE_URL");
  }
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = parsed.id
    ? bundle.videos.find((item) => item.id === parsed.id)
    : undefined;
  const timestamp = nowIso();
  const video: CmsVideo = {
    id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
    title: parsed.title,
    description: parsed.description,
    youtubeUrl: parsed.youtubeUrl,
    youtubeVideoId: videoId,
    thumbnailUrl: parsed.thumbnailUrl ?? youtubeThumbnailUrl(videoId),
    category: parsed.category,
    featured: parsed.featured,
    displayOrder: parsed.displayOrder,
    status: parsed.status,
    publishedAt:
      parsed.status === "PUBLISHED"
        ? (parsed.publishedAt ?? existing?.publishedAt ?? timestamp)
        : parsed.publishedAt ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  bundle.videos = existing
    ? bundle.videos.map((item) => (item.id === video.id ? video : item))
    : [...bundle.videos, video];
  await repo.write(bundle);
  return video;
}

export async function setVideoStatus(
  session: ContentAdminSession | null,
  id: string,
  status: CmsVideo["status"],
): Promise<CmsVideo> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  const existing = bundle.videos.find((item) => item.id === id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }
  const timestamp = nowIso();
  const updated: CmsVideo = {
    ...existing,
    status,
    publishedAt:
      status === "PUBLISHED"
        ? (existing.publishedAt ?? timestamp)
        : existing.publishedAt,
    updatedAt: timestamp,
  };
  bundle.videos = bundle.videos.map((item) =>
    item.id === id ? updated : item,
  );
  await repo.write(bundle);
  return updated;
}

export async function deleteVideo(
  session: ContentAdminSession | null,
  id: string,
): Promise<void> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  bundle.videos = bundle.videos.filter((item) => item.id !== id);
  await repo.write(bundle);
}

export async function getContentDashboardStats(
  session: ContentAdminSession | null,
): Promise<ContentDashboardStats> {
  assertAdmin(session);
  const repo = await getCmsRepository();
  const bundle = await repo.read();
  return computeStats(bundle);
}

export async function listRelatedArticles(
  article: CmsArticle,
  limit = 3,
): Promise<CmsArticle[]> {
  const result = await listPublishedArticles({
    category: article.category,
    pageSize: limit + 1,
  });
  return result.items.filter((item) => item.id !== article.id).slice(0, limit);
}

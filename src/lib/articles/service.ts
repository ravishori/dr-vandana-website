import { doctorPortalConfig } from "@/config/doctor-portal";
import {
  computeArticleStats,
  filterArticles,
} from "@/lib/articles/repository";
import { articleUpsertSchema, type ArticleUpsertInput } from "@/lib/articles/schema";
import { estimateReadingTimeMinutes, slugify } from "@/lib/articles/slug";
import { getArticlesRepository } from "@/lib/articles/store";
import type { DoctorSession } from "@/types/doctor-portal";
import type {
  Article,
  ArticleDashboardStats,
  ArticleListFilters,
  ArticleStatus,
  PaginatedArticles,
} from "@/types/articles";

function assertDoctor(session: DoctorSession | null): DoctorSession {
  if (!session || session.role !== "DOCTOR") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function listPublishedArticles(
  filters: ArticleListFilters = {},
): Promise<PaginatedArticles> {
  const repo = await getArticlesRepository();
  const bundle = await repo.read();
  return filterArticles(bundle.articles, filters, true);
}

export async function getPublishedArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const repo = await getArticlesRepository();
  const bundle = await repo.read();
  const article = bundle.articles.find((item) => item.slug === slug) ?? null;
  if (!article || article.status !== "PUBLISHED") {
    return null;
  }
  return article;
}

export async function listDoctorArticles(
  session: DoctorSession | null,
  filters: ArticleListFilters = {},
): Promise<PaginatedArticles> {
  assertDoctor(session);
  const repo = await getArticlesRepository();
  const bundle = await repo.read();
  return filterArticles(bundle.articles, filters, false);
}

export async function getDoctorArticleById(
  session: DoctorSession | null,
  id: string,
): Promise<Article | null> {
  assertDoctor(session);
  const repo = await getArticlesRepository();
  const bundle = await repo.read();
  return bundle.articles.find((item) => item.id === id) ?? null;
}

export async function getArticleStats(
  session: DoctorSession | null,
): Promise<ArticleDashboardStats> {
  assertDoctor(session);
  const repo = await getArticlesRepository();
  const bundle = await repo.read();
  return computeArticleStats(bundle.articles);
}

export async function upsertArticle(
  session: DoctorSession | null,
  input: ArticleUpsertInput,
): Promise<Article> {
  const doctor = assertDoctor(session);
  const parsed = articleUpsertSchema.parse(input);
  const repo = await getArticlesRepository();
  let saved: Article | null = null;

  await repo.update((bundle) => {
    const existing = parsed.id
      ? bundle.articles.find((item) => item.id === parsed.id)
      : bundle.articles.find((item) => item.slug === parsed.slug);

    const slugOwner = bundle.articles.find((item) => item.slug === parsed.slug);
    if (slugOwner && slugOwner.id !== existing?.id) {
      throw new Error("DUPLICATE_SLUG");
    }

    const timestamp = nowIso();
    const article: Article = {
      id: existing?.id ?? parsed.id ?? crypto.randomUUID(),
      title: parsed.title,
      slug: parsed.slug || slugify(parsed.title),
      excerpt: parsed.excerpt,
      content: parsed.content,
      featuredImageUrl: parsed.featuredImageUrl ?? null,
      authorId: existing?.authorId ?? doctor.email,
      authorName: existing?.authorName ?? doctorPortalConfig.defaultAuthorName,
      category: parsed.category,
      tags: parsed.tags,
      status: parsed.status,
      publishedAt:
        parsed.status === "PUBLISHED"
          ? (existing?.publishedAt ?? timestamp)
          : null,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      seoTitle: parsed.seoTitle ?? null,
      seoDescription: parsed.seoDescription ?? null,
      readingTimeMinutes: estimateReadingTimeMinutes(parsed.content),
      showEducationalDisclaimer: parsed.showEducationalDisclaimer,
    };

    saved = article;
    return {
      ...bundle,
      articles: existing
        ? bundle.articles.map((item) => (item.id === article.id ? article : item))
        : [...bundle.articles, article],
    };
  });

  if (!saved) {
    throw new Error("ARTICLE_SAVE_FAILED");
  }
  return saved;
}

export async function setArticleStatus(
  session: DoctorSession | null,
  id: string,
  status: ArticleStatus,
): Promise<Article> {
  assertDoctor(session);
  const repo = await getArticlesRepository();
  let saved: Article | null = null;

  await repo.update((bundle) => {
    const existing = bundle.articles.find((item) => item.id === id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }
    const timestamp = nowIso();
    const updated: Article = {
      ...existing,
      status,
      publishedAt:
        status === "PUBLISHED"
          ? (existing.publishedAt ?? timestamp)
          : status === "DRAFT"
            ? null
            : existing.publishedAt,
      updatedAt: timestamp,
    };
    saved = updated;
    return {
      ...bundle,
      articles: bundle.articles.map((item) => (item.id === id ? updated : item)),
    };
  });

  if (!saved) {
    throw new Error("NOT_FOUND");
  }
  return saved;
}

export async function deleteArticle(
  session: DoctorSession | null,
  id: string,
): Promise<void> {
  assertDoctor(session);
  const repo = await getArticlesRepository();
  await repo.update((bundle) => {
    const before = bundle.articles.length;
    const articles = bundle.articles.filter((item) => item.id !== id);
    if (articles.length === before) {
      throw new Error("NOT_FOUND");
    }
    return { ...bundle, articles };
  });
}

export async function listRelatedPublishedArticles(
  slug: string,
  limit = 3,
): Promise<Article[]> {
  const current = await getPublishedArticleBySlug(slug);
  if (!current) {
    return [];
  }
  const listed = await listPublishedArticles({ pageSize: 50 });
  return listed.items
    .filter((item) => item.slug !== slug)
    .filter(
      (item) =>
        item.category === current.category ||
        item.tags.some((tag) => current.tags.includes(tag)),
    )
    .slice(0, limit);
}

export { slugify, estimateReadingTimeMinutes };

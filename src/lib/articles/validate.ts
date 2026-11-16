import { isSafeRelativeMarkdownPath } from "@/lib/articles/markdown";
import { isValidSlug } from "@/lib/articles/slug";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  type Article,
} from "@/types/articles";

const RAW_HTML = /<\/?[a-zA-Z][^>]*>?/;
const SCRIPT_SCHEME = /(javascript|vbscript|data):/i;

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Returns human-readable problems; an empty array means the records are valid. */
export function validateArticleRecords(records: readonly Article[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();

  records.forEach((a, index) => {
    const at = `article[${index}]${a?.slug ? ` (${a.slug})` : ""}`;
    const fail = (message: string) => problems.push(`${at}: ${message}`);

    if (!a.id?.trim()) fail("id is required");
    else if (ids.has(a.id)) fail("duplicate id");
    else ids.add(a.id);

    if (!isValidSlug(a.slug)) fail("slug must be lowercase letters, digits and hyphens (3-120)");
    else if (slugs.has(a.slug)) fail("duplicate slug");
    else slugs.add(a.slug);

    if (a.title.trim().length < 3 || a.title.length > 200) fail("title must be 3-200 characters");
    if (a.excerpt.trim().length < 10 || a.excerpt.length > 500) fail("excerpt must be 10-500 characters");
    if (a.content.trim().length < 20 || a.content.length > 50_000) fail("content must be 20-50000 characters");
    if (!ARTICLE_CATEGORIES.includes(a.category)) fail("unknown category");
    if (!ARTICLE_STATUSES.includes(a.status)) fail("unknown status");
    if (a.tags.length > 12 || a.tags.some((t) => !t.trim() || t.length > 40)) fail("tags: max 12, each 1-40 characters");
    if (!a.authorName.trim()) fail("authorName is required");
    if (!isIso(a.updatedAt)) fail("updatedAt must be an ISO date");
    if (a.seoTitle !== null && a.seoTitle.length > 120) fail("seoTitle max 120 characters");
    if (a.seoDescription !== null && a.seoDescription.length > 300) fail("seoDescription max 300 characters");

    if (RAW_HTML.test(a.content)) fail("content must not contain raw HTML");
    if (SCRIPT_SCHEME.test(a.content)) fail("content must not contain javascript:/data: links");

    if (a.featuredImage) {
      if (!isSafeRelativeMarkdownPath(a.featuredImage.src) && !/^\/[A-Za-z0-9/_.-]+$/.test(a.featuredImage.src)) {
        fail("featuredImage.src must be a safe site-relative path");
      }
      if (a.featuredImage.src.startsWith("//") || a.featuredImage.src.includes("..")) {
        fail("featuredImage.src must be a safe site-relative path");
      }
      if (!a.featuredImage.alt.trim()) fail("featuredImage.alt is required");
    }

    if (a.status === "PUBLISHED") {
      if (!isIso(a.publishedAt)) fail("PUBLISHED requires publishedAt");
      if (!isIso(a.contentApprovedAt)) fail("PUBLISHED requires contentApprovedAt (owner approval)");
    } else if (a.publishedAt !== null) {
      fail("only PUBLISHED articles may have publishedAt");
    }
  });

  return problems;
}

export function assertValidArticleRecords(records: readonly Article[]): void {
  const problems = validateArticleRecords(records);
  if (problems.length > 0) {
    throw new Error(`INVALID_ARTICLE_RECORDS:\n${problems.join("\n")}`);
  }
}

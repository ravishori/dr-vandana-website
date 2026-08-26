"use server";

import { redirect } from "next/navigation";

import {
  authenticateContentAdmin,
  clearContentAdminSessionCookie,
  getContentAdminSession,
  setContentAdminSessionCookie,
} from "@/lib/cms/auth";
import {
  deleteArticle,
  deleteResource,
  deleteVideo,
  setArticleStatus,
  setResourceStatus,
  setVideoStatus,
  upsertArticle,
  upsertResource,
  upsertVideo,
} from "@/lib/cms/service";
import { slugify } from "@/lib/cms/slug";
import { safeParseContentStatus } from "@/lib/cms/status";
import {
  ARTICLE_CATEGORIES,
  RESOURCE_TYPES,
  VIDEO_CATEGORIES,
} from "@/types/cms";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function formBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function requireValidStatus(raw: string) {
  const parsed = safeParseContentStatus(raw);
  if (!parsed.success) {
    throw new Error("INVALID_STATUS");
  }
  return parsed.data;
}

export async function loginContentAdminAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const result = await authenticateContentAdmin(email, password);
  if (!result.ok) {
    if (result.reason === "RATE_LIMITED") {
      return {
        error: "Too many login attempts. Please wait and try again.",
      };
    }
    return {
      error:
        result.reason === "CONTENT_ADMIN_NOT_CONFIGURED"
          ? "Content admin is not configured. Set CONTENT_ADMIN_EMAIL and password env vars."
          : "Invalid email or password.",
    };
  }
  await setContentAdminSessionCookie(result.token);
  redirect("/admin/content");
}

export async function logoutContentAdminAction(): Promise<void> {
  await clearContentAdminSessionCookie();
  redirect("/admin/content/login");
}

export async function saveArticleAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const title = formString(formData, "title");
  const slugInput = formString(formData, "slug");
  const status = requireValidStatus(formString(formData, "status"));
  const category = formString(formData, "category");
  if (!ARTICLE_CATEGORIES.includes(category as (typeof ARTICLE_CATEGORIES)[number])) {
    throw new Error("INVALID_CATEGORY");
  }
  await upsertArticle(session, {
    id: formString(formData, "id") || undefined,
    title,
    slug: slugInput || slugify(title),
    excerpt: formString(formData, "excerpt"),
    contentMarkdown: formString(formData, "contentMarkdown"),
    featuredImageUrl: formString(formData, "featuredImageUrl") || null,
    featuredImageAlt: formString(formData, "featuredImageAlt") || null,
    category: category as (typeof ARTICLE_CATEGORIES)[number],
    tags: formString(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    author: formString(formData, "author"),
    status,
    featured: formBool(formData, "featured"),
    seoTitle: formString(formData, "seoTitle") || null,
    seoDescription: formString(formData, "seoDescription") || null,
    showEducationalDisclaimer: formBool(formData, "showEducationalDisclaimer"),
  });
  redirect("/admin/content/articles");
}

export async function articleStatusAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const id = formString(formData, "id");
  const status = requireValidStatus(formString(formData, "status"));
  await setArticleStatus(session, id, status);
  redirect("/admin/content/articles");
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  await deleteArticle(session, formString(formData, "id"));
  redirect("/admin/content/articles");
}

export async function saveResourceAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const resourceType = formString(formData, "resourceType");
  const status = requireValidStatus(formString(formData, "status"));
  await upsertResource(session, {
    id: formString(formData, "id") || undefined,
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    url: formString(formData, "url"),
    category: formString(formData, "category"),
    organizationName: formString(formData, "organizationName") || null,
    resourceType: resourceType as (typeof RESOURCE_TYPES)[number],
    featured: formBool(formData, "featured"),
    displayOrder: Number(formString(formData, "displayOrder") || "100"),
    status,
  });
  redirect("/admin/content/resources");
}

export async function resourceStatusAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const status = requireValidStatus(formString(formData, "status"));
  await setResourceStatus(session, formString(formData, "id"), status);
  redirect("/admin/content/resources");
}

export async function deleteResourceAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  await deleteResource(session, formString(formData, "id"));
  redirect("/admin/content/resources");
}

export async function saveVideoAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const category = formString(formData, "category");
  const status = requireValidStatus(formString(formData, "status"));
  await upsertVideo(session, {
    id: formString(formData, "id") || undefined,
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    youtubeUrl: formString(formData, "youtubeUrl"),
    category: category as (typeof VIDEO_CATEGORIES)[number],
    featured: formBool(formData, "featured"),
    displayOrder: Number(formString(formData, "displayOrder") || "100"),
    status,
  });
  redirect("/admin/content/videos");
}

export async function videoStatusAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  const status = requireValidStatus(formString(formData, "status"));
  await setVideoStatus(session, formString(formData, "id"), status);
  redirect("/admin/content/videos");
}

export async function deleteVideoAction(formData: FormData): Promise<void> {
  const session = await getContentAdminSession();
  await deleteVideo(session, formString(formData, "id"));
  redirect("/admin/content/videos");
}

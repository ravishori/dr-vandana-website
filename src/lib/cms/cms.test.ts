import { describe, expect, it, beforeEach } from "vitest";

import { cmsSeedBundle } from "@/data/cms/seed";
import { MemoryCmsRepository } from "@/lib/cms/memory-store";
import { renderSafeMarkdown, stripTags } from "@/lib/cms/markdown";
import {
  getPublishedArticleBySlug,
  listPublishedArticles,
  listPublishedResources,
  listPublishedVideos,
  upsertArticle,
  upsertResource,
  upsertVideo,
} from "@/lib/cms/service";
import { setCmsRepositoryForTests } from "@/lib/cms/store";
import { extractYoutubeVideoId, isSafeHttpsUrl } from "@/lib/cms/urls";
import { articleUpsertSchema, resourceUpsertSchema } from "@/lib/cms/schema";
import type { ContentAdminSession } from "@/types/cms";

const admin: ContentAdminSession = {
  email: "editor@example.com",
  role: "CONTENT_EDITOR",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(async () => {
  const repo = new MemoryCmsRepository();
  await repo.ensureSeeded(structuredClone(cmsSeedBundle));
  setCmsRepositoryForTests(repo);
});

describe("CMS URL safety", () => {
  it("accepts https and rejects dangerous schemes", () => {
    expect(isSafeHttpsUrl("https://example.com/path")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("data:text/html;base64,xxx")).toBe(false);
  });

  it("extracts YouTube ids from common formats", () => {
    expect(
      extractYoutubeVideoId("https://www.youtube.com/watch?v=aqz-KE-bpKQ"),
    ).toBe("aqz-KE-bpKQ");
    expect(extractYoutubeVideoId("https://youtu.be/aqz-KE-bpKQ")).toBe(
      "aqz-KE-bpKQ",
    );
    expect(
      extractYoutubeVideoId("https://www.youtube.com/shorts/aqz-KE-bpKQ"),
    ).toBe("aqz-KE-bpKQ");
    expect(extractYoutubeVideoId("https://example.com/watch?v=aqz-KE-bpKQ")).toBe(
      null,
    );
  });
});

describe("Markdown sanitization", () => {
  it("escapes raw HTML and keeps safe formatting", () => {
    const html = renderSafeMarkdown(
      'Hello <script>alert(1)</script> and **bold**',
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("<strong>bold</strong>");
    expect(stripTags("<img onerror=alert(1)>")).toBe("");
  });
});

describe("CMS public visibility", () => {
  it("lists only published articles publicly", async () => {
    const result = await listPublishedArticles({ pageSize: 50 });
    expect(result.items.every((item) => item.status === "PUBLISHED")).toBe(true);
    expect(
      result.items.some((item) => item.slug.includes("draft")),
    ).toBe(false);
  });

  it("does not return draft articles by slug", async () => {
    const draft = await getPublishedArticleBySlug(
      "workplace-boundaries-sample-draft",
    );
    expect(draft).toBeNull();
  });

  it("hides unpublished resources and videos", async () => {
    const resources = await listPublishedResources({ pageSize: 50 });
    const videos = await listPublishedVideos({ pageSize: 50 });
    expect(resources.items.every((item) => item.status === "PUBLISHED")).toBe(
      true,
    );
    expect(videos.items.every((item) => item.status === "PUBLISHED")).toBe(true);
  });
});

describe("CMS admin mutations", () => {
  it("rejects unauthorized article create", async () => {
    await expect(
      upsertArticle(null, {
        title: "Unauthorized",
        slug: "unauthorized-article",
        excerpt: "This should fail because there is no admin session present.",
        contentMarkdown: "## Body\n\nEnough content for validation to pass length.",
        category: "Personal Growth",
        tags: [],
        author: "Test",
        status: "DRAFT",
        featured: false,
        showEducationalDisclaimer: true,
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("creates draft then publishes with unique slug", async () => {
    const created = await upsertArticle(admin, {
      title: "Calm routines sample",
      slug: "calm-routines-sample",
      excerpt:
        "A draft educational note about calm routines for testing the CMS workflow.",
      contentMarkdown:
        "## Calm routines\n\nThis is educational sample content for tests.",
      category: "Healthy Habits",
      tags: ["sample"],
      author: "Dr. Vandana Rajiv Chaudhary",
      status: "DRAFT",
      featured: false,
      showEducationalDisclaimer: true,
    });
    expect(created.status).toBe("DRAFT");
    expect(await getPublishedArticleBySlug(created.slug)).toBeNull();

    const published = await upsertArticle(admin, {
      id: created.id,
      title: created.title,
      slug: created.slug,
      excerpt: created.excerpt,
      contentMarkdown: created.contentMarkdown,
      category: created.category,
      tags: created.tags,
      author: created.author,
      status: "PUBLISHED",
      featured: false,
      showEducationalDisclaimer: true,
    });
    expect(published.status).toBe("PUBLISHED");
    expect(await getPublishedArticleBySlug(created.slug)).not.toBeNull();
  });

  it("rejects resource javascript URLs", () => {
    const parsed = resourceUpsertSchema.safeParse({
      title: "Bad link",
      description: "This resource uses a dangerous URL scheme and must fail.",
      url: "javascript:alert(1)",
      category: "Other",
      resourceType: "Other",
      featured: false,
      displayOrder: 1,
      status: "DRAFT",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-YouTube video URLs", async () => {
    await expect(
      upsertVideo(admin, {
        title: "Not youtube",
        description: "Should reject non-youtube hosts for embeds.",
        youtubeUrl: "https://example.com/watch?v=aqz-KE-bpKQ",
        category: "Other",
        featured: false,
        displayOrder: 1,
        status: "DRAFT",
      }),
    ).rejects.toThrow();
  });

  it("accepts valid https resource URLs for admin", async () => {
    const resource = await upsertResource(admin, {
      title: "Valid resource",
      description:
        "A valid https resource used to confirm admin create permissions.",
      url: "https://www.who.int/health-topics/mental-health",
      category: "Mental Health Information",
      resourceType: "Mental Health Information",
      featured: false,
      displayOrder: 5,
      status: "PUBLISHED",
    });
    expect(resource.url.startsWith("https://")).toBe(true);
  });

  it("rejects invalid article slugs", () => {
    const parsed = articleUpsertSchema.safeParse({
      title: "Bad slug",
      slug: "Bad Slug!",
      excerpt: "Excerpt long enough to satisfy the minimum validation length.",
      contentMarkdown: "## Content\n\nBody long enough for schema validation.",
      category: "Personal Growth",
      tags: [],
      author: "Test",
      status: "DRAFT",
      featured: false,
      showEducationalDisclaimer: true,
    });
    expect(parsed.success).toBe(false);
  });
});

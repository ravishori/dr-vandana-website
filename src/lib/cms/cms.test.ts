import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { cmsSeedBundle } from "@/data/cms/seed";
import { authenticateContentAdmin } from "@/lib/cms/auth";
import { hashPassword } from "@/lib/cms/crypto";
import {
  checkContentAdminLoginRateLimit,
  clearContentAdminLoginFailures,
  CMS_LOGIN_RATE_LIMIT,
  createMemoryLoginAttemptStore,
  recordContentAdminLoginFailure,
  setLoginAttemptStoreForTests,
} from "@/lib/cms/login-rate-limit";
import {
  isSafeRelativeMarkdownPath,
  markdownHeadingTag,
  renderSafeMarkdown,
  stripTags,
} from "@/lib/cms/markdown";
import { MemoryCmsRepository } from "@/lib/cms/memory-store";
import {
  getPublishedArticleBySlug,
  listPublishedArticles,
  listPublishedResources,
  listPublishedVideos,
  setArticleStatus,
  upsertArticle,
  upsertResource,
  upsertVideo,
} from "@/lib/cms/service";
import { safeParseContentStatus } from "@/lib/cms/status";
import {
  CMS_PRODUCTION_STORE_ERROR,
  resolveCmsStoreMode,
  setCmsRepositoryForTests,
} from "@/lib/cms/store";
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
  setLoginAttemptStoreForTests(createMemoryLoginAttemptStore());
});

afterEach(() => {
  setCmsRepositoryForTests(null);
  setLoginAttemptStoreForTests(null);
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

describe("Markdown sanitization and relative links", () => {
  it("escapes raw HTML and keeps safe formatting", () => {
    const html = renderSafeMarkdown(
      "Hello <script>alert(1)</script> and **bold**",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("<strong>bold</strong>");
    expect(stripTags("<img onerror=alert(1)>")).toBe("");
  });

  it("renders safe same-origin relative paths", () => {
    expect(isSafeRelativeMarkdownPath("/book-appointment")).toBe(true);
    expect(isSafeRelativeMarkdownPath("/contact")).toBe(true);
    expect(isSafeRelativeMarkdownPath("/blog/sample-post")).toBe(true);

    const html = renderSafeMarkdown(
      "[Book a consultation](/book-appointment)\n\n[Contact](/contact)\n\n[Nested](/blog/sample-post)",
    );
    expect(html).toContain('<a href="/book-appointment">Book a consultation</a>');
    expect(html).toContain('<a href="/contact">Contact</a>');
    expect(html).toContain('<a href="/blog/sample-post">Nested</a>');
  });

  it("rejects unsafe markdown URLs", () => {
    expect(isSafeRelativeMarkdownPath("javascript:alert(1)")).toBe(false);
    expect(isSafeRelativeMarkdownPath("data:text/html;base64,xxx")).toBe(false);
    expect(isSafeRelativeMarkdownPath("//evil.example")).toBe(false);
    expect(isSafeRelativeMarkdownPath("/ok?x=1<script>")).toBe(false);
    expect(isSafeRelativeMarkdownPath("/../etc/passwd")).toBe(false);

    const html = renderSafeMarkdown(
      [
        "[js](javascript:alert(1))",
        "[data](data:text/html;base64,xxx)",
        "[proto](//evil.example/path)",
        "[bad](http://example.com)",
      ].join("\n\n"),
    );
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="data:');
    expect(html).not.toContain('href="//evil.example');
    expect(html).not.toContain('href="http://example.com');
  });

  it("maps markdown headings below page h1", () => {
    expect(markdownHeadingTag(1)).toBe("h2");
    expect(markdownHeadingTag(2)).toBe("h3");
    expect(markdownHeadingTag(3)).toBe("h4");
    const html = renderSafeMarkdown("# Title\n\n## Section\n\n### Detail");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<h3>Section</h3>");
    expect(html).toContain("<h4>Detail</h4>");
    expect(html).not.toContain("<h1>");
  });
});

describe("CMS store mode (production fail-closed)", () => {
  it("fails production when durable store is missing", () => {
    expect(resolveCmsStoreMode("production", undefined, undefined, undefined)).toBe(
      "misconfigured",
    );
    expect(resolveCmsStoreMode("production", "upstash", undefined, undefined)).toBe(
      "misconfigured",
    );
  });

  it("fails production for memory and file", () => {
    expect(
      resolveCmsStoreMode(
        "production",
        "memory",
        "https://example.upstash.io",
        "token",
      ),
    ).toBe("misconfigured");
    expect(
      resolveCmsStoreMode(
        "production",
        "file",
        "https://example.upstash.io",
        "token",
      ),
    ).toBe("misconfigured");
  });

  it("accepts production with valid Upstash", () => {
    expect(
      resolveCmsStoreMode(
        "production",
        "upstash",
        "https://example.upstash.io",
        "token",
      ),
    ).toBe("upstash");
    expect(
      resolveCmsStoreMode(
        "production",
        undefined,
        "https://example.upstash.io",
        "token",
      ),
    ).toBe("upstash");
  });

  it("keeps development memory and file working", () => {
    expect(resolveCmsStoreMode("development", "memory")).toBe("memory");
    expect(resolveCmsStoreMode("development", "file")).toBe("file");
    expect(resolveCmsStoreMode("test", undefined)).toBe("memory");
  });

  it("exposes a clear production misconfiguration message", () => {
    expect(CMS_PRODUCTION_STORE_ERROR).toContain("durable CMS store");
    expect(CMS_PRODUCTION_STORE_ERROR).toContain("upstash");
  });
});

describe("Content admin login rate limiting", () => {
  const ip = "203.0.113.10";
  const email = "editor@example.com";

  it("allows first attempts and records failures", async () => {
    expect(await checkContentAdminLoginRateLimit(ip, email)).toEqual({
      allowed: true,
    });
    await recordContentAdminLoginFailure(ip, email, 1_000);
    expect(await checkContentAdminLoginRateLimit(ip, email, 1_100)).toEqual({
      allowed: true,
    });
  });

  it("activates after repeated failed attempts", async () => {
    const start = 10_000;
    for (let i = 0; i < CMS_LOGIN_RATE_LIMIT.maxFailedAttempts; i += 1) {
      await recordContentAdminLoginFailure(ip, email, start + i);
    }
    const blocked = await checkContentAdminLoginRateLimit(
      ip,
      email,
      start + CMS_LOGIN_RATE_LIMIT.maxFailedAttempts,
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("resets after the window expires", async () => {
    const start = 20_000;
    for (let i = 0; i < CMS_LOGIN_RATE_LIMIT.maxFailedAttempts; i += 1) {
      await recordContentAdminLoginFailure(ip, email, start + i);
    }
    const afterExpiry = start + CMS_LOGIN_RATE_LIMIT.windowMs + 1;
    expect(await checkContentAdminLoginRateLimit(ip, email, afterExpiry)).toEqual(
      { allowed: true },
    );
  });

  it("clears failures so login can succeed again", async () => {
    for (let i = 0; i < CMS_LOGIN_RATE_LIMIT.maxFailedAttempts; i += 1) {
      await recordContentAdminLoginFailure(ip, email, 30_000 + i);
    }
    await clearContentAdminLoginFailures(ip, email);
    expect(await checkContentAdminLoginRateLimit(ip, email, 30_100)).toEqual({
      allowed: true,
    });
  });

  it("integrates with authenticateContentAdmin success and failure", async () => {
    const previous = {
      email: process.env.CONTENT_ADMIN_EMAIL,
      hash: process.env.CONTENT_ADMIN_PASSWORD_HASH,
      password: process.env.CONTENT_ADMIN_PASSWORD,
      secret: process.env.CONTENT_ADMIN_SESSION_SECRET,
    };

    process.env.CONTENT_ADMIN_EMAIL = email;
    process.env.CONTENT_ADMIN_PASSWORD_HASH = hashPassword("correct-horse");
    process.env.CONTENT_ADMIN_SESSION_SECRET =
      "test-session-secret-at-least-32-chars-long";
    delete process.env.CONTENT_ADMIN_PASSWORD;

    try {
      const ok = await authenticateContentAdmin(email, "correct-horse", {
        ip: "198.51.100.1",
      });
      expect(ok.ok).toBe(true);

      const bad = await authenticateContentAdmin(email, "wrong-password", {
        ip: "198.51.100.2",
      });
      expect(bad).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });

      for (let i = 0; i < CMS_LOGIN_RATE_LIMIT.maxFailedAttempts; i += 1) {
        await authenticateContentAdmin(email, "wrong-password", {
          ip: "198.51.100.3",
        });
      }
      const limited = await authenticateContentAdmin(email, "correct-horse", {
        ip: "198.51.100.3",
      });
      expect(limited).toEqual({ ok: false, reason: "RATE_LIMITED" });
    } finally {
      if (previous.email === undefined) {
        delete process.env.CONTENT_ADMIN_EMAIL;
      } else {
        process.env.CONTENT_ADMIN_EMAIL = previous.email;
      }
      if (previous.hash === undefined) {
        delete process.env.CONTENT_ADMIN_PASSWORD_HASH;
      } else {
        process.env.CONTENT_ADMIN_PASSWORD_HASH = previous.hash;
      }
      if (previous.password === undefined) {
        delete process.env.CONTENT_ADMIN_PASSWORD;
      } else {
        process.env.CONTENT_ADMIN_PASSWORD = previous.password;
      }
      if (previous.secret === undefined) {
        delete process.env.CONTENT_ADMIN_SESSION_SECRET;
      } else {
        process.env.CONTENT_ADMIN_SESSION_SECRET = previous.secret;
      }
    }
  });
});

describe("Content status validation", () => {
  it("accepts canonical statuses", () => {
    expect(safeParseContentStatus("DRAFT")).toEqual({
      success: true,
      data: "DRAFT",
    });
    expect(safeParseContentStatus("PUBLISHED").success).toBe(true);
    expect(safeParseContentStatus("ARCHIVED").success).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(safeParseContentStatus("live").success).toBe(false);
    expect(safeParseContentStatus("").success).toBe(false);
    expect(safeParseContentStatus("PUBLISH").success).toBe(false);
  });

  it("rejects unauthorized status mutation", async () => {
    const published = cmsSeedBundle.articles.find(
      (item) => item.status === "PUBLISHED",
    );
    expect(published).toBeTruthy();
    await expect(
      setArticleStatus(null, published!.id, "ARCHIVED"),
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("leaves article unchanged after invalid status", async () => {
    const published = (await listPublishedArticles({ pageSize: 1 })).items[0];
    expect(published).toBeTruthy();
    const before = { ...published };

    await expect(
      setArticleStatus(admin, published.id, "NOT_A_STATUS"),
    ).rejects.toThrow("INVALID_STATUS");

    const after = await getPublishedArticleBySlug(published.slug);
    expect(after?.status).toBe(before.status);
    expect(after?.updatedAt).toBe(before.updatedAt);
  });

  it("applies a valid status mutation", async () => {
    const published = (await listPublishedArticles({ pageSize: 1 })).items[0];
    const archived = await setArticleStatus(admin, published.id, "ARCHIVED");
    expect(archived.status).toBe("ARCHIVED");
    expect(await getPublishedArticleBySlug(published.slug)).toBeNull();
  });
});

describe("robots admin disallow", () => {
  it("disallows /admin/ while allowing public routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(["/admin/"]);
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

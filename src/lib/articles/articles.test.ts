import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sitemap from "@/app/sitemap";
import { navigationConfig } from "@/config/navigation";
import { wellnessNavigationConfig } from "@/config/wellness-navigation";
import { articleRecords } from "@/data/articles/records";
import { renderSafeMarkdown } from "@/lib/articles/markdown";
import {
  createArticleService,
  hasPublishedArticles,
} from "@/lib/articles/service";
import {
  articleUrl,
  buildArticleJsonLd,
  serializeJsonLd,
} from "@/lib/articles/structured-data";
import { validateArticleRecords } from "@/lib/articles/validate";
import type { Article } from "@/types/articles";

const NOW = new Date("2026-11-16T00:00:00.000Z");

function make(overrides: Partial<Article> = {}): Article {
  return {
    id: overrides.id ?? overrides.slug ?? "a-1",
    slug: "calm-breathing-basics",
    title: "Calm Breathing Basics",
    excerpt: "A short educational introduction to slow breathing.",
    content: "## Why breathing matters\n\nSlow breathing can help many people feel calmer.",
    category: "Stress",
    tags: ["breathing"],
    status: "PUBLISHED",
    publishedAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    contentApprovedAt: "2026-09-30T00:00:00.000Z",
    authorName: "Dr. Vandana Rajiv Chaudhary",
    featuredImage: null,
    seoTitle: null,
    seoDescription: null,
    showEducationalDisclaimer: true,
    ...overrides,
  };
}

const svc = (records: Article[]) => createArticleService(records, () => NOW);

describe("articles: visibility", () => {
  const records = [
    make({ id: "1", slug: "published-one" }),
    make({ id: "2", slug: "draft-one", status: "DRAFT", publishedAt: null, contentApprovedAt: null }),
    make({ id: "3", slug: "archived-one", status: "ARCHIVED", publishedAt: null }),
    make({ id: "4", slug: "scheduled-one", publishedAt: "2027-01-01T00:00:00.000Z" }),
  ];
  const s = svc(records);

  it("lists only published, non-scheduled articles", () => {
    assert.deepEqual(s.listPublishedArticles().items.map((a) => a.slug), ["published-one"]);
  });
  it("returns null for draft, archived, scheduled and unknown slugs", () => {
    for (const slug of ["draft-one", "archived-one", "scheduled-one", "does-not-exist"]) {
      assert.equal(s.getPublishedArticleBySlug(slug), null, slug);
    }
    assert.equal(s.getPublishedArticleBySlug("published-one")?.title, "Calm Breathing Basics");
  });
  it("exposes only published slugs for static generation", () => {
    assert.deepEqual(s.getPublishedArticleSlugs(), ["published-one"]);
  });
  it("hasPublishedArticles reflects visibility", () => {
    assert.equal(s.hasPublishedArticles(), true);
    assert.equal(svc([records[1]]).hasPublishedArticles(), false);
  });
});

describe("articles: listing", () => {
  const records = [
    make({ id: "1", slug: "older-stress", publishedAt: "2026-08-01T00:00:00.000Z" }),
    make({ id: "2", slug: "newer-anxiety", category: "Anxiety", tags: ["worry"], publishedAt: "2026-10-01T00:00:00.000Z" }),
    make({ id: "3", slug: "mid-stress", publishedAt: "2026-09-01T00:00:00.000Z" }),
  ];
  const s = svc(records);

  it("sorts newest first", () => {
    assert.deepEqual(s.listPublishedArticles().items.map((a) => a.slug), ["newer-anxiety", "mid-stress", "older-stress"]);
  });
  it("filters by category and search", () => {
    assert.deepEqual(s.listPublishedArticles({ category: "Anxiety" }).items.map((a) => a.slug), ["newer-anxiety"]);
    assert.equal(s.listPublishedArticles({ search: "worry" }).total, 1);
  });
  it("paginates", () => {
    const page2 = s.listPublishedArticles({ pageSize: 2, page: 2 });
    assert.equal(page2.totalPages, 2);
    assert.equal(page2.items.length, 1);
  });
  it("related articles exclude self and unpublished", () => {
    const related = svc([...records, make({ id: "9", slug: "draft-stress", status: "DRAFT", publishedAt: null, contentApprovedAt: null })])
      .listRelatedPublishedArticles("older-stress");
    assert.deepEqual(related.map((a) => a.slug), ["mid-stress", "newer-anxiety"].filter((x) => related.some((r) => r.slug === x)));
    assert.ok(!related.some((a) => a.slug === "older-stress" || a.slug === "draft-stress"));
  });
});

describe("articles: record validation", () => {
  it("accepts a valid record", () => {
    assert.deepEqual(validateArticleRecords([make()]), []);
  });
  it("rejects duplicates, bad slugs, missing approval and raw HTML", () => {
    assert.ok(validateArticleRecords([make({ id: "1" }), make({ id: "2" })]).some((p) => p.includes("duplicate slug")));
    assert.ok(validateArticleRecords([make({ slug: "Bad Slug" })]).length > 0);
    assert.ok(validateArticleRecords([make({ contentApprovedAt: null })]).some((p) => p.includes("contentApprovedAt")));
    assert.ok(validateArticleRecords([make({ publishedAt: null })]).some((p) => p.includes("publishedAt")));
    assert.ok(validateArticleRecords([make({ content: "Hello <script>alert(1)</script> world, long enough" })]).some((p) => p.includes("raw HTML")));
    assert.ok(validateArticleRecords([make({ content: "[x](javascript:alert(1)) long enough text here" })]).length > 0);
  });
  it("accepts only safe site-relative images with alt text", () => {
    assert.deepEqual(validateArticleRecords([make({ featuredImage: { src: "/images/articles/a.jpg", alt: "A calm lake" } })]), []);
    for (const src of ["https://example.com/a.jpg", "//evil.example/a.jpg", "/../secret.jpg", "javascript:alert(1)"]) {
      assert.ok(validateArticleRecords([make({ featuredImage: { src, alt: "x" } })]).length > 0, src);
    }
    assert.ok(validateArticleRecords([make({ featuredImage: { src: "/images/a.jpg", alt: " " } })]).some((p) => p.includes("alt")));
  });
  it("the shipped records are valid", () => {
    assert.deepEqual(validateArticleRecords(articleRecords), []);
  });
  it("refuses to build a service from invalid records", () => {
    assert.throws(() => svc([make({ slug: "x" })]), /INVALID_ARTICLE_RECORDS/);
  });
});

describe("articles: markdown safety", () => {
  it("never emits executable HTML", () => {
    const html = renderSafeMarkdown('<img src=x onerror=alert(1)> <script>alert(1)</script> [a](javascript:alert(1)) [b](data:text/html,x) **ok**');
    assert.ok(!/<script|onerror=|href="javascript|href="data/i.test(html), html);
    assert.ok(html.includes("<strong>ok</strong>"));
  });
  it("opens external https links safely and rejects non-https", () => {
    assert.match(renderSafeMarkdown("[x](https://example.org/a)"), /rel="noopener noreferrer"/);
    assert.ok(!renderSafeMarkdown("[x](http://example.org/a)").includes("<a "));
  });
  it("renders only the allowed block subset", () => {
    const html = renderSafeMarkdown("# H\n\n- one\n- two\n\ntext");
    assert.match(html, /<h2>H<\/h2>/);
    assert.match(html, /<ul>[\s\S]*<li>one<\/li>/);
  });
});

describe("articles: SEO", () => {
  const article = make({ seoDescription: "Short </script><b>test</b> & more", featuredImage: { src: "/images/a.jpg", alt: "alt" } });
  it("builds canonical URLs on the production domain", () => {
    assert.equal(articleUrl("x-y"), "https://drvandana.trinetralab.net/articles/x-y");
  });
  it("builds Article JSON-LD with required fields", () => {
    const ld = buildArticleJsonLd(article);
    assert.equal(ld["@type"], "Article");
    assert.equal(ld.headline, article.title);
    assert.equal(ld.mainEntityOfPage, articleUrl(article.slug));
    assert.equal(ld.author.name, article.authorName);
    assert.equal(ld.image, "https://drvandana.trinetralab.net/images/a.jpg");
  });
  it("serialises JSON-LD without breaking out of the script element", () => {
    const text = serializeJsonLd(buildArticleJsonLd(article));
    assert.ok(!text.includes("<") && !text.includes(">"));
    assert.equal(JSON.parse(text).description, article.seoDescription);
  });
});

describe("articles: site integration", () => {
  const published = hasPublishedArticles();
  it("sitemap lists /articles only when something is published", () => {
    const urls = sitemap().map((e) => e.url);
    assert.equal(urls.includes("https://drvandana.trinetralab.net/articles"), published);
    assert.equal(urls.filter((u) => u.includes("/articles/")).length, published ? articleRecords.filter((a) => a.status === "PUBLISHED").length : 0);
  });
  it("sitemap never exposes draft slugs", () => {
    const urls = sitemap().map((e) => e.url).join("\n");
    for (const a of articleRecords.filter((x) => x.status !== "PUBLISHED")) {
      assert.ok(!urls.includes(a.slug));
    }
  });
  it("navigation shows Articles only when published content exists", () => {
    const hrefs = JSON.stringify(navigationConfig) + JSON.stringify(wellnessNavigationConfig);
    assert.equal(hrefs.includes('"/articles"'), published);
  });
});

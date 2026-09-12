import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { articlesSeedBundle } from "@/data/articles/seed";
import { MemoryArticlesRepository } from "@/lib/articles/memory-store";
import {
  getPublishedArticleBySlug,
  listPublishedArticles,
  setArticleStatus,
  upsertArticle,
} from "@/lib/articles/service";
import { setArticlesRepositoryForTests } from "@/lib/articles/store";
import { renderSafeMarkdown } from "@/lib/articles/markdown";
import type { DoctorSession } from "@/types/doctor-portal";

const doctor: DoctorSession = {
  email: "doctor@example.com",
  role: "DOCTOR",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

beforeEach(async () => {
  const repo = new MemoryArticlesRepository({ bundle: null });
  await repo.ensureSeeded(structuredClone(articlesSeedBundle));
  setArticlesRepositoryForTests(repo);
});

afterEach(() => {
  setArticlesRepositoryForTests(null);
});

describe("articles public visibility", () => {
  it("does not expose seed draft on public listing", async () => {
    const listed = await listPublishedArticles();
    assert.equal(listed.total, 0);
    const draft = await getPublishedArticleBySlug(
      "understanding-everyday-stress-draft",
    );
    assert.equal(draft, null);
  });

  it("publishes an article so it appears publicly", async () => {
    const created = await upsertArticle(doctor, {
      title: "Calm routines for busy days",
      slug: "calm-routines-for-busy-days",
      excerpt:
        "An educational note about pacing and rest during demanding weeks.",
      content:
        "## Everyday pacing\n\nSmall routines can support emotional balance. This is educational, not treatment advice.",
      category: "Mental Wellness",
      tags: ["routines", "wellness"],
      status: "DRAFT",
      showEducationalDisclaimer: true,
    });

    assert.equal(
      (await getPublishedArticleBySlug(created.slug)) === null,
      true,
    );

    await setArticleStatus(doctor, created.id, "PUBLISHED");
    const published = await getPublishedArticleBySlug(created.slug);
    assert.ok(published);
    assert.equal(published.status, "PUBLISHED");

    const listed = await listPublishedArticles();
    assert.equal(listed.total, 1);
    assert.equal(listed.items[0]?.slug, created.slug);
  });
});

describe("articles authorization", () => {
  it("rejects unauthorized mutations", async () => {
    await assert.rejects(
      () =>
        upsertArticle(null, {
          title: "Should fail",
          slug: "should-fail-article",
          excerpt: "This mutation must require a doctor session.",
          content:
            "## Unauthorized\n\nThis content should never be saved without auth.",
          category: "General",
          tags: [],
          status: "DRAFT",
          showEducationalDisclaimer: true,
        }),
      /UNAUTHORIZED/,
    );
  });
});

describe("markdown safety", () => {
  it("escapes raw HTML and keeps basic formatting", () => {
    const html = renderSafeMarkdown(
      "Hello <script>alert(1)</script> and **bold**",
    );
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<strong>bold<\/strong>/);
  });
});

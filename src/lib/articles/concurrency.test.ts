import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MemoryArticlesRepository } from "@/lib/articles/memory-store";
import { ConcurrencyConflictError } from "@/lib/persistence/optimistic-update";
import type { Article } from "@/types/articles";

function sampleArticle(id: string, slug: string): Article {
  return {
    id,
    title: `Title ${slug}`,
    slug,
    excerpt: "An educational excerpt used for concurrency testing only.",
    content:
      "## Concurrent write test\n\nEducational content for concurrency protection tests.",
    featuredImageUrl: null,
    authorId: "doctor@example.com",
    authorName: "Dr. Vandana Rajiv Chaudhary",
    category: "General",
    tags: ["test"],
    status: "DRAFT",
    publishedAt: null,
    createdAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    seoTitle: null,
    seoDescription: null,
    readingTimeMinutes: 1,
    showEducationalDisclaimer: true,
  };
}

describe("articles optimistic concurrency", () => {
  it("compareAndSet rejects stale revisions", async () => {
    const repo = new MemoryArticlesRepository({ bundle: null });
    await repo.ensureSeeded({
      version: 1,
      revision: 0,
      articles: [],
    });

    const first = await repo.read();
    assert.equal(first.revision, 1); // ensureSeeded bumps empty → seed/empty write

    const ok = await repo.compareAndSet(0, {
      version: 1,
      revision: 1,
      articles: [sampleArticle("a", "a")],
    });
    assert.equal(ok, false);

    const current = await repo.read();
    const saved = await repo.compareAndSet(current.revision, {
      version: 1,
      revision: current.revision + 1,
      articles: [sampleArticle("b", "b")],
    });
    assert.equal(saved, true);
    assert.equal((await repo.read()).articles[0]?.slug, "b");
  });

  it("concurrent updates retain both mutations via retry", async () => {
    const repo = new MemoryArticlesRepository({
      bundle: { version: 1, revision: 0, articles: [] },
    });

    await Promise.all([
      repo.update((current) => ({
        ...current,
        articles: [
          ...current.articles,
          sampleArticle("11111111-1111-4111-8111-111111111111", "one"),
        ],
      })),
      repo.update((current) => ({
        ...current,
        articles: [
          ...current.articles,
          sampleArticle("22222222-2222-4222-8222-222222222222", "two"),
        ],
      })),
    ]);

    const final = await repo.read();
    const slugs = final.articles.map((item) => item.slug).sort();
    assert.deepEqual(slugs, ["one", "two"]);
    assert.ok(final.revision >= 2);
  });

  it("exhausted compareAndSet failures surface CONCURRENCY_CONFLICT", async () => {
    const repo = new MemoryArticlesRepository({
      bundle: { version: 1, revision: 0, articles: [] },
    });

    // Force conflict by always failing compareAndSet.
    repo.compareAndSet = async () => false;

    await assert.rejects(
      () =>
        repo.update((current) => ({
          ...current,
          articles: [sampleArticle("x", "x")],
        })),
      (error: unknown) =>
        error instanceof ConcurrencyConflictError ||
        (error instanceof Error && error.message === "CONCURRENCY_CONFLICT"),
    );
  });
});

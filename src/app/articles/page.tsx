import Link from "next/link";
import type { Metadata } from "next";

import { educationalArticleDisclaimer } from "@/config/doctor-portal";
import { siteConfig } from "@/config/site";
import { listPublishedArticles } from "@/lib/articles/service";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/types/articles";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Educational articles on mental wellness, counselling, and emotional well-being from Dr. Vandana Rajiv Chaudhary.",
};

type PageProps = {
  searchParams: Promise<{ category?: string; page?: string }>;
};

export default async function ArticlesIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = ARTICLE_CATEGORIES.includes(
    params.category as ArticleCategory,
  )
    ? (params.category as ArticleCategory)
    : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const result = await listPublishedArticles({
    category,
    page,
    pageSize: 9,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[var(--color-text)]">
          Articles
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Educational reading on mental wellness and counselling. These articles
          are not a substitute for professional care and are not emergency
          advice.
        </p>
      </header>

      <form className="mt-8 flex flex-wrap gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {ARTICLE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Filter
        </button>
      </form>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((article) => (
          <article
            key={article.id}
            className="flex flex-col border-b border-[var(--color-border)] pb-6"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              {article.category}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-xl">
              <Link
                href={`/articles/${article.slug}`}
                className="text-[var(--color-text)] hover:text-[var(--color-brand)]"
              >
                {article.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-sm text-[var(--color-text-muted)]">
              {article.excerpt}
            </p>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              {article.readingTimeMinutes} min read
              {article.publishedAt
                ? ` · ${new Date(article.publishedAt).toLocaleDateString("en-IN")}`
                : ""}
            </p>
          </article>
        ))}
      </div>

      {result.items.length === 0 ? (
        <p className="mt-10 text-[var(--color-text-muted)]">
          No published articles yet. Please check back soon.
        </p>
      ) : null}

      {result.totalPages > 1 ? (
        <nav className="mt-10 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/articles?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="text-[var(--color-brand)] hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-[var(--color-text-muted)]">
            Page {result.page} of {result.totalPages}
          </span>
          {page < result.totalPages ? (
            <Link
              href={`/articles?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="text-[var(--color-brand)] hover:underline"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}

      <p className="mt-12 text-sm text-[var(--color-text-muted)]">
        {educationalArticleDisclaimer} Practice: {siteConfig.professionalName}.
      </p>
    </div>
  );
}

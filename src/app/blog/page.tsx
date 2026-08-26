import type { Metadata } from "next";
import { Suspense } from "react";

import { ArticleCard } from "@/components/cms/ArticleCard";
import { BlogFilters } from "@/components/cms/BlogFilters";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/config/site";
import { ARTICLE_CATEGORIES } from "@/types/cms";
import { listPublishedArticles } from "@/lib/cms/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Psychology Articles",
  description:
    "Educational psychology and mental-wellness articles from Dr. Vandana Rajiv Chaudhary. For information — not a substitute for professional assessment.",
  alternates: { canonical: `${siteConfig.url}/blog` },
  openGraph: {
    title: "Blog & Psychology Articles",
    description:
      "Educational articles on mental wellness, stress, parenting, and emotional well-being.",
    url: `${siteConfig.url}/blog`,
  },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const result = await listPublishedArticles({
    q,
    category: category || undefined,
    page,
    pageSize: 9,
  });
  const featured = result.items.find((item) => item.featured) ?? result.items[0];
  const rest = result.items.filter((item) => item.id !== featured?.id);

  return (
    <Section aria-labelledby="blog-heading">
      <Container>
        <header className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Education
          </p>
          <h1 id="blog-heading" className="text-text mt-2 text-4xl font-semibold">
            Blog &amp; Psychology Articles
          </h1>
          <p className="text-text-muted mt-4 text-lg leading-relaxed">
            Calm, educational writing on mental wellness. Articles share general
            information and do not replace professional psychological assessment
            or care.
          </p>
        </header>

        <div className="mt-10">
          <Suspense fallback={null}>
            <BlogFilters
              categories={ARTICLE_CATEGORIES}
              currentCategory={category}
              currentQuery={q}
            />
          </Suspense>
        </div>

        {featured ? (
          <div className="mt-12">
            <ArticleCard article={featured} featured />
          </div>
        ) : (
          <p className="text-text-muted mt-12">No published articles yet.</p>
        )}

        {rest.length > 0 ? (
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : null}

        {result.totalPages > 1 ? (
          <nav className="mt-12 flex gap-4" aria-label="Blog pagination">
            {page > 1 ? (
              <a
                className="underline underline-offset-2"
                href={`/blog?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              >
                Previous
              </a>
            ) : null}
            <span className="text-text-muted text-sm">
              Page {result.page} of {result.totalPages}
            </span>
            {page < result.totalPages ? (
              <a
                className="underline underline-offset-2"
                href={`/blog?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              >
                Next
              </a>
            ) : null}
          </nav>
        ) : null}
      </Container>
    </Section>
  );
}

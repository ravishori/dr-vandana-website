import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { educationalArticleDisclaimer } from "@/config/articles";
import { renderSafeMarkdown } from "@/lib/articles/markdown";
import {
  getPublishedArticleBySlug,
  getPublishedArticleSlugs,
  listRelatedPublishedArticles,
  readingTimeMinutes,
} from "@/lib/articles/service";
import {
  articleUrl,
  buildArticleJsonLd,
  serializeJsonLd,
} from "@/lib/articles/structured-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getPublishedArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getPublishedArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found", robots: { index: false } };
  }
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt;
  return {
    title,
    description,
    alternates: { canonical: articleUrl(article.slug) },
    openGraph: {
      title,
      description,
      type: "article",
      url: articleUrl(article.slug),
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: [article.authorName],
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const related = listRelatedPublishedArticles(slug, 3);
  const html = renderSafeMarkdown(article.content);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildArticleJsonLd(article)) }}
      />
      <Link href="/articles" className="text-sm text-[var(--color-brand)] hover:underline">
        ← All articles
      </Link>

      <article className="mt-6 space-y-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            {article.category} · {readingTimeMinutes(article)} min read
          </p>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[var(--color-text)]">
            {article.title}
          </h1>
          <p className="text-[var(--color-text-muted)]">{article.excerpt}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            By {article.authorName}
            {article.publishedAt
              ? ` · ${new Date(article.publishedAt).toLocaleDateString("en-IN")}`
              : ""}
          </p>
        </header>

        {article.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.featuredImage.src}
            alt={article.featuredImage.alt}
            className="w-full rounded-[var(--radius-md)]"
          />
        ) : null}

        <div
          className="space-y-4 text-[var(--color-text)] leading-relaxed [&_a]:text-[var(--color-brand)] [&_h2]:mt-8 [&_h2]:font-[family-name:var(--font-playfair)] [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:font-[family-name:var(--font-playfair)] [&_h3]:text-xl [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {article.showEducationalDisclaimer ? (
          <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-muted)]">
            {educationalArticleDisclaimer}
          </aside>
        ) : null}
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="related-articles" className="mt-12 border-t border-[var(--color-border)] pt-8">
          <h2 id="related-articles" className="font-[family-name:var(--font-playfair)] text-2xl">
            Related articles
          </h2>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={item.id}>
                <Link href={`/articles/${item.slug}`} className="text-[var(--color-brand)] hover:underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

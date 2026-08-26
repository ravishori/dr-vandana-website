import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ArticleCard } from "@/components/cms/ArticleCard";
import { ArticleDisclaimer } from "@/components/cms/ArticleDisclaimer";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/config/site";
import { renderSafeMarkdown } from "@/lib/cms/markdown";
import {
  getPublishedArticleBySlug,
  listRelatedArticles,
} from "@/lib/cms/service";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found" };
  }
  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt;
  const canonical = `${siteConfig.url}${article.canonicalPath ?? `/blog/${article.slug}`}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: article.featuredImageUrl
        ? [{ url: article.featuredImageUrl }]
        : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    notFound();
  }
  const related = await listRelatedArticles(article);
  const html = renderSafeMarkdown(article.contentMarkdown);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Person",
      name: siteConfig.professionalName,
    },
    mainEntityOfPage: `${siteConfig.url}/blog/${article.slug}`,
  };

  return (
    <Section aria-labelledby="article-title">
      <Container className="max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <p className="text-sm font-medium tracking-wide text-brand uppercase">
          <Link href="/blog" className="no-underline hover:underline">
            Blog
          </Link>{" "}
          / {article.category}
        </p>
        <h1 id="article-title" className="text-text mt-3 text-4xl font-semibold">
          {article.title}
        </h1>
        <div className="text-text-muted mt-4 flex flex-wrap gap-3 text-sm">
          <span>{article.author}</span>
          {article.publishedAt ? (
            <time dateTime={article.publishedAt}>
              {new Date(article.publishedAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          ) : null}
        </div>
        <p className="text-text-muted mt-6 text-lg leading-relaxed">
          {article.excerpt}
        </p>
        <div
          className="prose-cms text-text mt-10 space-y-4 text-base leading-relaxed [&_a]:text-brand [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <ArticleDisclaimer show={article.showEducationalDisclaimer} />
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/book-appointment" variant="primary">
            Book a Consultation
          </ButtonLink>
          <ButtonLink href="/resources" variant="secondary">
            Browse resources
          </ButtonLink>
          <ButtonLink href="/videos" variant="ghost">
            Watch videos
          </ButtonLink>
        </div>
        {related.length > 0 ? (
          <div className="mt-16">
            <h2 className="text-text text-2xl font-semibold">Related articles</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}

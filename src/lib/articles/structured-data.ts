import { siteConfig } from "@/config/site";
import type { Article } from "@/types/articles";

export function articleUrl(slug: string): string {
  return `${siteConfig.url}/articles/${slug}`;
}

export function buildArticleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "en-IN",
    mainEntityOfPage: articleUrl(article.slug),
    author: { "@type": "Person", name: article.authorName },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    ...(article.featuredImage
      ? { image: `${siteConfig.url}${article.featuredImage.src}` }
      : {}),
  };
}

/** Serialises JSON-LD so it cannot close its own <script> element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");
}

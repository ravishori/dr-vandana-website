import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { caseStudyRecords } from "@/data/ai/knowledge/case-studies";
import { psychologyTopicPages } from "@/data/ai/seo-topics";
import { listPublishedArticles } from "@/lib/articles/service";

const routes = [
  "/",
  "/about",
  "/areas-of-support",
  "/child-adolescent-psychology",
  "/stress-anxiety-wellness",
  "/book-appointment",
  "/contact",
  "/privacy-policy",
  "/disclaimer",
  "/terms",
  "/articles",
  "/psychology/ask-dr-vandana-ai",
  "/psychology/case-studies",
  ...psychologyTopicPages.map((page) => `/psychology/${page.slug}`),
  ...caseStudyRecords.map((study) => `/psychology/case-studies/${study.slug}`),
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = routes.map((route) => ({
    url: `${siteConfig.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: (route === "/" ? "weekly" : "monthly") as
      | "weekly"
      | "monthly",
    priority: route === "/" ? 1 : route === "/book-appointment" ? 0.9 : 0.7,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const published = await listPublishedArticles({ pageSize: 100 });
    articleEntries = published.items.map((article) => ({
      url: `${siteConfig.url}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  } catch {
    articleEntries = [];
  }

  return [...staticEntries, ...articleEntries];
}

import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { listPublishedArticles } from "@/lib/cms/service";

const staticRoutes = [
  "/",
  "/about",
  "/areas-of-support",
  "/child-adolescent-psychology",
  "/stress-anxiety-wellness",
  "/blog",
  "/resources",
  "/videos",
  "/book-appointment",
  "/contact",
  "/privacy-policy",
  "/disclaimer",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteConfig.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: (route === "/" || route === "/blog"
      ? "weekly"
      : "monthly") as "weekly" | "monthly",
    priority:
      route === "/"
        ? 1
        : route === "/book-appointment"
          ? 0.9
          : route === "/blog" || route === "/resources" || route === "/videos"
            ? 0.8
            : 0.7,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await listPublishedArticles({ pageSize: 200 });
    articleEntries = articles.items.map((article) => ({
      url: `${siteConfig.url}/blog/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));
  } catch {
    articleEntries = [];
  }

  return [...staticEntries, ...articleEntries];
}

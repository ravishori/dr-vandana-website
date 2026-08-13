import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { caseStudyRecords } from "@/data/ai/knowledge/case-studies";
import { psychologyTopicPages } from "@/data/ai/seo-topics";

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
  "/psychology/ask-dr-vandana-ai",
  "/ask-a-question",
  "/psychology/case-studies",
  ...psychologyTopicPages.map((page) => `/psychology/${page.slug}`),
  ...caseStudyRecords.map((study) => `/psychology/case-studies/${study.slug}`),
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteConfig.url}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/book-appointment" ? 0.9 : 0.7,
  }));
}

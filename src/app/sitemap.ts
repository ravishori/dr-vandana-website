import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

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

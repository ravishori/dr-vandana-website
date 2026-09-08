import { doctorPortalConfig } from "@/config/doctor-portal";
import type { Article, ArticlesBundle } from "@/types/articles";

/**
 * Seed includes one educational DRAFT only — must not appear on public listing.
 */
export const articlesSeedBundle: ArticlesBundle = {
  version: 1,
  revision: 0,
  articles: [
    {
      id: "22222222-2222-4222-8222-222222222201",
      title: "Understanding Everyday Stress (Draft Sample)",
      slug: "understanding-everyday-stress-draft",
      excerpt:
        "A short educational overview of everyday stress responses — kept as a draft until reviewed for publication.",
      content: `## What this draft covers

This **draft** sample explains common stress responses in plain language.

### Everyday stress

Stress can appear as tension, racing thoughts, irritability, or disrupted sleep. Patterns vary between people.

### When to seek support

If stress feels overwhelming, persistent, or interferes with daily life, consider speaking with a qualified mental-health professional.

- Educational information is not a diagnosis
- Support looks different for each person
- This website is not an emergency service

[Book a consultation](/book-appointment) if you would like to enquire about appointments.`,
      featuredImageUrl: null,
      authorId: "doctor",
      authorName: doctorPortalConfig.defaultAuthorName,
      category: "Stress",
      tags: ["stress", "education", "draft-sample"],
      status: "DRAFT",
      publishedAt: null,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      seoTitle: null,
      seoDescription: null,
      readingTimeMinutes: 2,
      showEducationalDisclaimer: true,
    } satisfies Article,
  ],
};

export function emptyArticlesBundle(): ArticlesBundle {
  return { version: 1, revision: 0, articles: [] };
}

export function cloneArticlesBundle(bundle: ArticlesBundle): ArticlesBundle {
  return structuredClone(bundle);
}

import { z } from "zod";

import { ARTICLE_CATEGORIES, ARTICLE_STATUSES } from "@/types/articles";

export const articleUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(20).max(50_000),
  featuredImageUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "Featured image must be an https URL",
    })
    .nullable()
    .optional(),
  category: z.enum(ARTICLE_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  status: z.enum(ARTICLE_STATUSES).default("DRAFT"),
  seoTitle: z.string().trim().max(120).nullable().optional(),
  seoDescription: z.string().trim().max(300).nullable().optional(),
  showEducationalDisclaimer: z.boolean().default(true),
});

export type ArticleUpsertInput = z.infer<typeof articleUpsertSchema>;

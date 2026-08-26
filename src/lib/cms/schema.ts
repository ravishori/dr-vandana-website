import { z } from "zod";

import {
  ARTICLE_CATEGORIES,
  CONTENT_STATUSES,
  RESOURCE_TYPES,
  VIDEO_CATEGORIES,
} from "@/types/cms";
import { isValidSlug } from "@/lib/cms/slug";
import { extractYoutubeVideoId, isSafeHttpsUrl } from "@/lib/cms/urls";

const httpsUrl = z
  .string()
  .min(8)
  .max(2_000)
  .refine((value) => isSafeHttpsUrl(value), {
    message: "URL must be a valid https:// address",
  });

const optionalHttpsUrl = z
  .union([httpsUrl, z.literal(""), z.null()])
  .transform((value) => (value ? value : null));

export const articleUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(120)
    .refine(isValidSlug, "Use a lowercase slug with hyphens"),
  excerpt: z.string().min(20).max(500),
  contentMarkdown: z.string().min(20).max(100_000),
  featuredImageUrl: optionalHttpsUrl.optional(),
  featuredImageAlt: z.string().max(200).nullable().optional(),
  category: z.enum(ARTICLE_CATEGORIES),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  author: z.string().min(2).max(120),
  status: z.enum(CONTENT_STATUSES),
  featured: z.boolean().default(false),
  seoTitle: z.string().max(70).nullable().optional(),
  seoDescription: z.string().max(160).nullable().optional(),
  canonicalPath: z
    .string()
    .max(200)
    .regex(/^\/blog\/[a-z0-9-]+$/, "Canonical path must look like /blog/slug")
    .nullable()
    .optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  showEducationalDisclaimer: z.boolean().default(true),
});

export const resourceUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(2_000),
  url: httpsUrl,
  category: z.string().min(2).max(80),
  organizationName: z.string().max(160).nullable().optional(),
  resourceType: z.enum(RESOURCE_TYPES),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10_000).default(100),
  status: z.enum(CONTENT_STATUSES),
});

export const videoUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(3).max(200),
    description: z.string().min(12).max(2_000),
    youtubeUrl: z.string().min(10).max(500),
    category: z.enum(VIDEO_CATEGORIES),
    featured: z.boolean().default(false),
    displayOrder: z.number().int().min(0).max(10_000).default(100),
    status: z.enum(CONTENT_STATUSES),
    publishedAt: z.string().datetime().nullable().optional(),
    thumbnailUrl: optionalHttpsUrl.optional(),
  })
  .superRefine((value, ctx) => {
    const id = extractYoutubeVideoId(value.youtubeUrl);
    if (!id) {
      ctx.addIssue({
        code: "custom",
        path: ["youtubeUrl"],
        message:
          "Provide a valid YouTube https URL (watch, youtu.be, or shorts)",
      });
    }
  });

export type ArticleUpsertInput = z.infer<typeof articleUpsertSchema>;
export type ResourceUpsertInput = z.infer<typeof resourceUpsertSchema>;
export type VideoUpsertInput = z.infer<typeof videoUpsertSchema>;

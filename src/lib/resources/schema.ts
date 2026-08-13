import { z } from "zod";

import {
  DIFFICULTY_LEVELS,
  EVIDENCE_LEVELS,
  RESOURCE_AUDIENCES,
  RESOURCE_FORMATS,
  RESOURCE_STATUSES,
  RESOURCE_TOPICS,
  RESOURCE_TYPES,
  URL_CHECK_STATUSES,
} from "@/types/resources";

const httpUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "External links must use https://",
  });

export const purchaseLinkSchema = z.object({
  retailerName: z.string().min(2).max(80),
  url: httpUrl,
  format: z.enum(RESOURCE_FORMATS).nullable(),
  lastChecked: z.string().nullable(),
});

export const researchSummarySchema = z.object({
  researchQuestion: z.string().max(500),
  whatResearchersDid: z.string().max(2_000),
  mainFindings: z.string().max(2_000),
  limitations: z.string().max(2_000),
  everydayLanguage: z.string().max(2_000),
  practicalTakeaway: z.string().max(2_000),
  originalSource: z.string().max(500),
});

export const resourceUpsertSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug with hyphens."),
  resourceType: z.enum(RESOURCE_TYPES),
  category: z.string().min(2).max(80),
  subcategory: z.string().max(80).nullable().optional(),
  description: z.string().min(20).max(4_000),
  shortDescription: z.string().min(12).max(280),
  author: z.string().max(160).nullable().optional(),
  authors: z.array(z.string().max(120)).max(12).optional(),
  publisher: z.string().max(160).nullable().optional(),
  publicationDate: z.string().max(40).nullable().optional(),
  edition: z.string().max(40).nullable().optional(),
  isbn: z.string().max(32).nullable().optional(),
  language: z.string().min(2).max(12).default("en"),
  formats: z.array(z.enum(RESOURCE_FORMATS)).default([]),
  audiences: z.array(z.enum(RESOURCE_AUDIENCES)).default([]),
  difficultyLevel: z.enum(DIFFICULTY_LEVELS),
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
  topics: z.array(z.enum(RESOURCE_TOPICS)).default([]),
  coverImage: z.string().max(300).nullable().optional(),
  externalUrl: httpUrl.nullable().optional(),
  purchaseUrls: z.array(purchaseLinkSchema).max(8).default([]),
  readOnlineUrl: httpUrl.nullable().optional(),
  doi: z.string().max(120).nullable().optional(),
  journalName: z.string().max(160).nullable().optional(),
  citation: z.string().max(500).nullable().optional(),
  isPeerReviewed: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  verificationDate: z.string().max(40).nullable().optional(),
  verifiedBy: z.string().max(120).nullable().optional(),
  urlCheckStatus: z.enum(URL_CHECK_STATUSES).default("UNVERIFIED"),
  researchSummary: researchSummarySchema.nullable().optional(),
  whyUseful: z.string().max(1_000).nullable().optional(),
  status: z.enum(RESOURCE_STATUSES),
  relatedArticleHrefs: z.array(z.string().max(200)).max(8).default([]),
});

export type ResourceUpsertInput = z.infer<typeof resourceUpsertSchema>;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

import { z } from "zod";

import {
  CRISIS_CATEGORIES,
  CRISIS_EMERGENCY_LEVELS,
  CRISIS_ORGANIZATION_TYPES,
  CRISIS_VERIFICATION_STATUSES,
} from "@/types/crisis";

const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "Official source URLs must use https://",
  });

const phoneSchema = z.object({
  display: z.string().min(2).max(32),
  tel: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[0-9+]+$/, "tel: value must contain digits only (optional leading +)"),
  label: z.string().max(80).nullable(),
  isPrimary: z.boolean(),
});

export const crisisUpsertSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug with hyphens."),
  name: z.string().min(2).max(160),
  shortName: z.string().min(1).max(80),
  category: z.enum(CRISIS_CATEGORIES),
  description: z.string().min(20).max(2_000),
  purposeNote: z.string().min(8).max(280),
  phoneNumbers: z.array(phoneSchema).min(1).max(6),
  emergencyLevel: z.enum(CRISIS_EMERGENCY_LEVELS),
  availability: z.string().min(2).max(120),
  languages: z.array(z.string().max(80)).max(20).default([]),
  coverage: z.string().min(2).max(120),
  country: z.string().min(2).max(80).default("India"),
  state: z.string().max(80).nullable(),
  district: z.string().max(80).nullable(),
  organization: z.string().min(2).max(200),
  organizationType: z.enum(CRISIS_ORGANIZATION_TYPES),
  officialWebsite: httpsUrl.nullable(),
  officialSourceUrl: httpsUrl,
  sourceTitle: z.string().min(2).max(200),
  sourceAuthority: z.string().min(2).max(200),
  sourceVerifiedAt: z.string().min(8).max(40),
  nextVerificationDueAt: z.string().min(8).max(40),
  verificationStatus: z.enum(CRISIS_VERIFICATION_STATUSES),
  verificationNotes: z.string().max(2_000).default(""),
  displayOrder: z.number().int().min(0).max(10_000),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

export type CrisisUpsertParsed = z.infer<typeof crisisUpsertSchema>;

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
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

export function toTelHref(tel: string): string {
  return `tel:${tel.replace(/[^\d+]/g, "")}`;
}

export function formatVerifiedDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function verificationDueState(
  nextDueAt: string,
  today = new Date(),
): "ok" | "due_soon" | "due_today" | "overdue" {
  const due = new Date(`${nextDueAt.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(due.getTime())) {
    return "ok";
  }
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const dueStart = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
  );
  const diffDays = Math.round((dueStart - start) / 86_400_000);
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays === 0) {
    return "due_today";
  }
  if (diffDays <= 7) {
    return "due_soon";
  }
  return "ok";
}

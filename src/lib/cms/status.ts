import { z } from "zod";

import { CONTENT_STATUSES, type ContentStatus } from "@/types/cms";

export const contentStatusSchema = z.enum(CONTENT_STATUSES);

export function parseContentStatus(value: unknown): ContentStatus {
  return contentStatusSchema.parse(value);
}

export function safeParseContentStatus(
  value: unknown,
):
  | { success: true; data: ContentStatus }
  | { success: false; error: string } {
  const parsed = contentStatusSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid content status. Allowed values: DRAFT, PUBLISHED, ARCHIVED.",
    };
  }
  return { success: true, data: parsed.data };
}

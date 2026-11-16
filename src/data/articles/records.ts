import type { Article } from "@/types/articles";

/**
 * Reviewed article records.
 *
 * An article is publicly visible only when status is PUBLISHED, publishedAt is
 * not in the future, and contentApprovedAt records Dr. Vandana's approval.
 * No article content has been approved yet, so this list is intentionally empty.
 */
export const articleRecords: readonly Article[] = [];

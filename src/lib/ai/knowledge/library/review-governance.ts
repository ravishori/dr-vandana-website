import type { KnowledgeDocument, KnowledgeSourceMetadata } from "@/types/ai";

/** Default maintainer review interval for published external sources. */
export const DEFAULT_SOURCE_REVIEW_INTERVAL_MONTHS = 12;

export type SourceReviewStatus =
  | "CURRENT"
  | "DUE_SOON"
  | "OVERDUE"
  | "MISSING_METADATA";

export type SourceReviewEvaluation = {
  source_id: string;
  last_reviewed?: string;
  next_review_due?: string;
  publication_date?: string;
  status: SourceReviewStatus;
  days_until_due?: number;
};

function parseIsoDate(value: string): Date | undefined {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    return isoDate;
  }
  const copy = new Date(parsed);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy.toISOString().slice(0, 10);
}

export function computeNextReviewDue(
  lastReviewed: string,
  intervalMonths: number = DEFAULT_SOURCE_REVIEW_INTERVAL_MONTHS,
): string {
  return addMonthsToIsoDate(lastReviewed, intervalMonths);
}

export function evaluateSourceReview(
  metadata: KnowledgeSourceMetadata | undefined,
  referenceDate: string = new Date().toISOString().slice(0, 10),
): SourceReviewEvaluation {
  const sourceId = metadata?.source_id ?? "unknown";
  const lastReviewed = metadata?.last_reviewed;
  const nextReviewDue = metadata?.next_review_due;
  const publicationDate = metadata?.publication_date;

  if (!lastReviewed && !nextReviewDue) {
    return {
      source_id: sourceId,
      last_reviewed: lastReviewed,
      next_review_due: nextReviewDue,
      publication_date: publicationDate,
      status: "MISSING_METADATA",
    };
  }

  const dueDate = nextReviewDue ?? (lastReviewed ? computeNextReviewDue(lastReviewed) : undefined);
  if (!dueDate) {
    return {
      source_id: sourceId,
      last_reviewed: lastReviewed,
      next_review_due: nextReviewDue,
      publication_date: publicationDate,
      status: "MISSING_METADATA",
    };
  }

  const due = parseIsoDate(dueDate);
  const reference = parseIsoDate(referenceDate);
  if (!due || !reference) {
    return {
      source_id: sourceId,
      last_reviewed: lastReviewed,
      next_review_due: dueDate,
      publication_date: publicationDate,
      status: "MISSING_METADATA",
    };
  }

  const msPerDay = 86_400_000;
  const daysUntilDue = Math.ceil((due.getTime() - reference.getTime()) / msPerDay);

  let status: SourceReviewStatus = "CURRENT";
  if (daysUntilDue < 0) {
    status = "OVERDUE";
  } else if (daysUntilDue <= 30) {
    status = "DUE_SOON";
  }

  return {
    source_id: sourceId,
    last_reviewed: lastReviewed,
    next_review_due: dueDate,
    publication_date: publicationDate,
    status,
    days_until_due: daysUntilDue,
  };
}

export function requiresPublishedReviewMetadata(document: KnowledgeDocument): boolean {
  return (
    document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES" &&
    document.approved &&
    (document.approval_state === "APPROVED" || document.approval_state === "PUBLISHED")
  );
}

export function listOverduePublishedSources(
  documents: readonly KnowledgeDocument[],
  referenceDate?: string,
): SourceReviewEvaluation[] {
  return documents
    .filter(requiresPublishedReviewMetadata)
    .map((document) => evaluateSourceReview(document.source_metadata, referenceDate))
    .filter((evaluation) => evaluation.status === "OVERDUE");
}

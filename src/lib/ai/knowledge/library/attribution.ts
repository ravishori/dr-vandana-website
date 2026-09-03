import {
  resolveKnowledgeScope,
  resolveSourceTier,
} from "@/lib/ai/knowledge/library/semantics";
import type { KnowledgeDocument, PublicKnowledgeSource } from "@/types/ai";

function formatYear(document: KnowledgeDocument): string | undefined {
  const metadata = document.source_metadata;
  return (
    metadata?.publication_date?.slice(0, 4) ??
    (document.date ? document.date.slice(0, 4) : undefined)
  );
}

/**
 * Prepares public-facing source attribution from a knowledge document.
 * Does not expose internal curriculum metadata unless explicitly requested.
 */
export function formatPublicSourceAttribution(
  document: KnowledgeDocument,
  options: { includeCurriculumMetadata?: boolean } = {},
): PublicKnowledgeSource {
  const metadata = document.source_metadata;
  const year = formatYear(document);

  if (
    document.corpus === "ACADEMIC_CURRICULUM_REFERENCE" &&
    !options.includeCurriculumMetadata
  ) {
    return {
      title: "Internal coverage reference (not for public citation)",
      attribution: "Internal psychology knowledge coverage reference",
    };
  }

  const organization =
    metadata?.organization ??
    (document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES"
      ? document.author
      : undefined);

  if (
    document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES" ||
    (organization && resolveKnowledgeScope(document) !== "DR_VANDANA_PRACTICE")
  ) {
    const sourceTitle = metadata?.source_name ?? document.title;
    const attributionParts = [organization ?? document.author, sourceTitle];
    const attribution = year
      ? `${attributionParts.filter(Boolean).join(" — ")} (${year})`
      : attributionParts.filter(Boolean).join(" — ");

    return {
      title: document.title,
      attribution,
      url: metadata?.url,
    };
  }

  const parts = [
    document.author || metadata?.organization,
    document.publication || metadata?.source_name || document.source,
    year,
    resolveSourceTier(document).replace(/^TIER_\d_/, "").replace(/_/g, " ").toLowerCase(),
  ].filter(Boolean);

  return {
    title: document.title,
    attribution: parts.join(" · "),
    url: metadata?.url,
  };
}

export function documentsToPublicSources(
  documents: readonly KnowledgeDocument[],
): PublicKnowledgeSource[] {
  return documents.map((document) => formatPublicSourceAttribution(document));
}

export function isAttributableToDrVandanaViews(
  document: KnowledgeDocument,
): boolean {
  return resolveKnowledgeScope(document) === "DR_VANDANA_PRACTICE";
}

export function isExternalEvidenceSource(document: KnowledgeDocument): boolean {
  return document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES";
}

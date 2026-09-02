import {
  resolveKnowledgeScope,
  resolveSourceTier,
} from "@/lib/ai/knowledge/library/semantics";
import type { KnowledgeDocument, PublicKnowledgeSource } from "@/types/ai";

/**
 * Prepares public-facing source attribution from a knowledge document.
 * Does not expose internal curriculum metadata unless explicitly requested.
 */
export function formatPublicSourceAttribution(
  document: KnowledgeDocument,
  options: { includeCurriculumMetadata?: boolean } = {},
): PublicKnowledgeSource {
  const metadata = document.source_metadata;
  const year =
    metadata?.publication_date?.slice(0, 4) ??
    (document.date ? document.date.slice(0, 4) : undefined);

  const parts = [
    document.author || metadata?.organization,
    document.publication || metadata?.source_name || document.source,
    year,
    resolveSourceTier(document).replace(/^TIER_\d_/, "").replace(/_/g, " ").toLowerCase(),
  ].filter(Boolean);

  const attribution = parts.join(" · ");

  if (
    document.corpus === "ACADEMIC_CURRICULUM_REFERENCE" &&
    !options.includeCurriculumMetadata
  ) {
    return {
      title: "Internal coverage reference (not for public citation)",
      attribution: "Internal psychology knowledge coverage reference",
    };
  }

  return {
    title: document.title,
    attribution,
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

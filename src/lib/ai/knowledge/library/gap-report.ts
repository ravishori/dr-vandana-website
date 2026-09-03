import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import { buildKnowledgeCoverageMap } from "@/lib/ai/knowledge/library/coverage-map";
import {
  isProductionIndexable,
  resolveKnowledgeScope,
  resolveSourceTier,
} from "@/lib/ai/knowledge/library/semantics";
import {
  DEFAULT_SOURCE_REVIEW_INTERVAL_MONTHS,
  evaluateSourceReview,
} from "@/lib/ai/knowledge/library/review-governance";
import type {
  CoverageStatus,
  EvidenceLevel,
  KnowledgeDocument,
  SourceTier,
} from "@/types/ai";

export const PHASE4_PRIORITY_TOPICS = [
  "self-esteem",
  "anxiety",
  "resilience",
  "coping",
  "emotional-regulation",
  "mindfulness",
] as const;

export type PriorityTopicId = (typeof PHASE4_PRIORITY_TOPICS)[number];

export type TopicGapReportEntry = {
  topic: PriorityTopicId | string;
  source_count: number;
  published_source_count: number;
  source_tier_distribution: Record<string, number>;
  evidence_level_distribution: Record<string, number>;
  coverage_status: CoverageStatus;
  last_reviewed?: string;
  gaps: readonly string[];
  recommendation: string;
};

export type KnowledgeCoverageReport = {
  generated_at: string;
  corpus_version_note: string;
  priority_topics: TopicGapReportEntry[];
  source_diversity: {
    organizations: Record<string, number>;
    source_types: Record<string, number>;
    source_tiers: Record<string, number>;
  };
  legacy_inferred_metadata: {
    document_count: number;
    documents: readonly LegacyInferredMetadataEntry[];
  };
};

export type LegacyInferredMetadataEntry = {
  id: string;
  corpus: string;
  topic: string;
  inferred_source_tier: SourceTier;
  inferred_knowledge_scope: string;
  evidence_level: EvidenceLevel;
  explicit_source_tier: boolean;
  explicit_knowledge_scope: boolean;
  ambiguous_classifications: readonly string[];
};

const TOPIC_TOPIC_ALIASES: Record<string, readonly string[]> = {
  coping: ["resilience", "stress-management", "life-skills", "mental-wellbeing"],
  resilience: ["mental-wellbeing", "life-skills"],
  "emotional-regulation": ["emotional-intelligence"],
};

function countBy<T>(
  items: readonly T[],
  resolver: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = resolver(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function documentsForPriorityTopic(
  topic: PriorityTopicId,
  documents: readonly KnowledgeDocument[],
): KnowledgeDocument[] {
  const aliases = TOPIC_TOPIC_ALIASES[topic] ?? [];
  const topicIds = new Set<string>([topic, ...aliases]);
  return documents.filter((document) => topicIds.has(document.topic));
}

function latestReviewDate(documents: readonly KnowledgeDocument[]): string | undefined {
  const dates = documents
    .map((document) => document.source_metadata?.last_reviewed)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates.at(-1);
}

function deriveGaps(
  topic: PriorityTopicId,
  publishedCount: number,
  organizations: Record<string, number>,
): string[] {
  const gaps: string[] = [];
  if (publishedCount === 0) {
    gaps.push(`No published external evidence sources mapped to ${topic}.`);
  } else if (publishedCount === 1) {
    gaps.push(`Only one published source — coverage remains partial for ${topic}.`);
  }
  const orgCount = Object.keys(organizations).length;
  if (publishedCount >= 2 && orgCount === 1) {
    gaps.push("Sources come from a single organization — consider additional authoritative diversity.");
  }
  if (topic === "self-esteem" && publishedCount < 2) {
    gaps.push("Limited dedicated self-esteem authoritative sources; educational site content supplements coverage.");
  }
  return gaps;
}

function deriveRecommendation(topic: PriorityTopicId, status: CoverageStatus): string {
  if (status === "ADEQUATE") {
    return `Maintain ${topic} sources with ${DEFAULT_SOURCE_REVIEW_INTERVAL_MONTHS}-month review cycles.`;
  }
  if (status === "PARTIAL") {
    return `Add one additional verified TIER_1 or TIER_2 source for ${topic} if a high-quality candidate is identified.`;
  }
  if (status === "NOT_STARTED") {
    return `Identify and manually verify authoritative sources for ${topic} before ingestion.`;
  }
  return `Review unpublished ${topic} drafts and complete provenance verification before publishing.`;
}

export function auditLegacyInferredMetadata(
  documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
): LegacyInferredMetadataEntry[] {
  const legacyCorpora = new Set([
    "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
    "DR_VANDANA_KNOWLEDGE",
    "CASE_STUDY_KNOWLEDGE",
  ]);

  return documents
    .filter((document) => legacyCorpora.has(document.corpus))
    .filter((document) => isProductionIndexable(document))
    .map((document) => {
      const ambiguous: string[] = [];
      if (!document.source_metadata) {
        ambiguous.push("source_metadata not recorded; tier/scope inferred from corpus");
      }
      if (!document.source_metadata?.source_type) {
        ambiguous.push("source_type not explicitly recorded");
      }
      return {
        id: document.id,
        corpus: document.corpus,
        topic: document.topic,
        inferred_source_tier: resolveSourceTier(document),
        inferred_knowledge_scope: resolveKnowledgeScope(document),
        evidence_level: document.evidence_level,
        explicit_source_tier: Boolean(document.source_metadata?.source_id),
        explicit_knowledge_scope: Boolean(document.knowledge_scope && document.source_metadata),
        ambiguous_classifications: ambiguous,
      };
    });
}

export function buildKnowledgeGapReport(
  documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
): KnowledgeCoverageReport {
  const coverageMap = buildKnowledgeCoverageMap(documents);
  const evidenceSources = documents.filter(
    (document) => document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES",
  );
  const publishedEvidence = evidenceSources.filter(isProductionIndexable);

  const priorityTopics: TopicGapReportEntry[] = PHASE4_PRIORITY_TOPICS.map((topic) => {
    const mapped =
      topic === "coping"
        ? documentsForPriorityTopic("coping", documents)
        : documentsForPriorityTopic(topic, documents);
    const published = mapped.filter(isProductionIndexable);
    const coverageEntry = coverageMap.find((entry) => entry.topic === topic);

    return {
      topic,
      source_count: mapped.length,
      published_source_count: published.length,
      source_tier_distribution: countBy(mapped, (document) => resolveSourceTier(document)),
      evidence_level_distribution: countBy(mapped, (document) => document.evidence_level),
      coverage_status:
        topic === "coping"
          ? coverageMap.find((entry) => entry.topic === "resilience")?.coverage_status ??
            "NOT_STARTED"
          : coverageEntry?.coverage_status ?? "NOT_STARTED",
      last_reviewed: latestReviewDate(published),
      gaps: deriveGaps(
        topic,
        published.length,
        countBy(published, (document) => document.source_metadata?.organization ?? "unknown"),
      ),
      recommendation: deriveRecommendation(
        topic,
        coverageEntry?.coverage_status ?? "NOT_STARTED",
      ),
    };
  });

  return {
    generated_at: new Date().toISOString(),
    corpus_version_note: "Generated from repository data — not manually edited.",
    priority_topics: priorityTopics,
    source_diversity: {
      organizations: countBy(
        publishedEvidence,
        (document) => document.source_metadata?.organization ?? "unknown",
      ),
      source_types: countBy(
        publishedEvidence,
        (document) => document.source_metadata?.source_type ?? "unknown",
      ),
      source_tiers: countBy(publishedEvidence, (document) => resolveSourceTier(document)),
    },
    legacy_inferred_metadata: {
      document_count: auditLegacyInferredMetadata(documents).length,
      documents: auditLegacyInferredMetadata(documents),
    },
  };
}

export function summarizeReviewStatuses(documents: readonly KnowledgeDocument[]) {
  return documents
    .filter((document) => document.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES")
    .map((document) => evaluateSourceReview(document.source_metadata));
}

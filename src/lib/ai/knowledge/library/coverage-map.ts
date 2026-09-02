import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import {
  findDomainForTopic,
  listAllTaxonomyTopics,
  type PsychologyDomainId,
} from "@/lib/ai/knowledge/library/taxonomy";
import {
  isProductionIndexable,
  resolveKnowledgeScope,
  resolveSourceTier,
} from "@/lib/ai/knowledge/library/semantics";
import type { CoverageStatus, KnowledgeDocument } from "@/types/ai";

export type CoverageMapEntry = {
  domain: PsychologyDomainId;
  domain_label: string;
  topic: string;
  topic_label: string;
  subtopic?: string;
  curriculum_reference?: string;
  source_count: number;
  published_source_count: number;
  coverage_status: CoverageStatus;
};

const TOPIC_ALIASES: Record<string, { topicId: string; subtopic?: string }> = {
  "stress-management": { topicId: "stress", subtopic: "stress-management" },
  "stress-vs-anxiety": { topicId: "stress", subtopic: "stress-vs-anxiety" },
  "workplace-burnout": { topicId: "burnout", subtopic: "workplace-burnout" },
  "anxiety-awareness": { topicId: "anxiety", subtopic: "anxiety-awareness" },
  "depression-awareness": { topicId: "depression-awareness" },
  "relationship-counselling": { topicId: "relationships", subtopic: "relationship-counselling" },
  "how-counselling-works": { topicId: "how-counselling-works" },
  "when-to-seek-help": { topicId: "counselling-concepts", subtopic: "when-to-seek-help" },
  "visualization": { topicId: "mindfulness", subtopic: "visualization" },
  "emotional-intelligence": { topicId: "emotional-regulation", subtopic: "emotional-intelligence" },
  "mental-wellbeing": { topicId: "mental-wellbeing" },
};

function mapTopicToTaxonomy(document: KnowledgeDocument): {
  domainId: PsychologyDomainId;
  domainLabel: string;
  topicId: string;
  topicLabel: string;
  subtopic?: string;
  curriculumReference?: string;
} | null {
  const alias = TOPIC_ALIASES[document.topic];
  const resolvedTopicId = alias?.topicId ?? document.topic;
  const domain = findDomainForTopic(resolvedTopicId);
  if (domain) {
    const topic = domain.topics.find((entry) => entry.id === resolvedTopicId)!;
    return {
      domainId: domain.id,
      domainLabel: domain.label,
      topicId: topic.id,
      topicLabel: topic.label,
      subtopic: alias?.subtopic,
      curriculumReference: topic.curriculum_reference,
    };
  }

  if (document.corpus === "ACADEMIC_CURRICULUM_REFERENCE" && document.course_title) {
    return {
      domainId: "FOUNDATIONAL_PSYCHOLOGY",
      domainLabel: "Foundational Psychology",
      topicId: `curriculum-${document.course_title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      topicLabel: document.course_title,
      curriculumReference: document.course_title,
    };
  }

  return null;
}

function deriveCoverageStatus(
  sourceCount: number,
  publishedCount: number,
): CoverageStatus {
  if (sourceCount === 0) {
    return "NOT_STARTED";
  }
  if (publishedCount === 0) {
    return "REVIEW_REQUIRED";
  }
  if (publishedCount === 1) {
    return "PARTIAL";
  }
  return "ADEQUATE";
}

export function buildKnowledgeCoverageMap(
  documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
): CoverageMapEntry[] {
  const buckets = new Map<
    string,
    {
      domain: PsychologyDomainId;
      domain_label: string;
      topic: string;
      topic_label: string;
      curriculum_reference?: string;
      source_count: number;
      published_source_count: number;
    }
  >();

  for (const topic of listAllTaxonomyTopics()) {
    const domain = findDomainForTopic(topic.id)!;
    const key = `${domain.id}::${topic.id}`;
    buckets.set(key, {
      domain: domain.id,
      domain_label: domain.label,
      topic: topic.id,
      topic_label: topic.label,
      curriculum_reference: topic.curriculum_reference,
      source_count: 0,
      published_source_count: 0,
    });
  }

  for (const document of documents) {
    const mapped = mapTopicToTaxonomy(document);
    if (!mapped) {
      continue;
    }
    const key = `${mapped.domainId}::${mapped.topicId}`;
    const bucket = buckets.get(key) ?? {
      domain: mapped.domainId,
      domain_label: mapped.domainLabel,
      topic: mapped.topicId,
      topic_label: mapped.topicLabel,
      subtopic: mapped.subtopic,
      curriculum_reference: mapped.curriculumReference,
      source_count: 0,
      published_source_count: 0,
    };
    bucket.source_count += 1;
    if (isProductionIndexable(document)) {
      bucket.published_source_count += 1;
    }
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((entry) => ({
      ...entry,
      coverage_status: deriveCoverageStatus(
        entry.source_count,
        entry.published_source_count,
      ),
    }))
    .sort((a, b) =>
      a.domain_label === b.domain_label
        ? a.topic_label.localeCompare(b.topic_label)
        : a.domain_label.localeCompare(b.domain_label),
    );
}

export function summarizeCoverageByDomain(entries: readonly CoverageMapEntry[]) {
  const summary = new Map<
    PsychologyDomainId,
    { total_topics: number; adequate: number; partial: number; not_started: number }
  >();

  for (const entry of entries) {
    const current = summary.get(entry.domain) ?? {
      total_topics: 0,
      adequate: 0,
      partial: 0,
      not_started: 0,
    };
    current.total_topics += 1;
    if (entry.coverage_status === "ADEQUATE") {
      current.adequate += 1;
    } else if (entry.coverage_status === "PARTIAL") {
      current.partial += 1;
    } else if (entry.coverage_status === "NOT_STARTED") {
      current.not_started += 1;
    }
    summary.set(entry.domain, current);
  }

  return summary;
}

export function countDocumentsBySourceTier(
  documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
) {
  const counts: Record<string, number> = {};
  for (const document of documents) {
    const tier = resolveSourceTier(document);
    counts[tier] = (counts[tier] ?? 0) + 1;
  }
  return counts;
}

export function countDocumentsByKnowledgeScope(
  documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
) {
  const counts: Record<string, number> = {};
  for (const document of documents) {
    const scope = resolveKnowledgeScope(document);
    counts[scope] = (counts[scope] ?? 0) + 1;
  }
  return counts;
}

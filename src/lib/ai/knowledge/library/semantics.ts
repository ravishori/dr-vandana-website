import type {
  EvidenceLevel,
  KnowledgeCorpus,
  KnowledgeDocument,
  KnowledgeScope,
  SourceTier,
} from "@/types/ai";

/** Corpora that must never enter production ASK AI retrieval. */
export const NON_INDEXABLE_CORPORA: readonly KnowledgeCorpus[] = [
  "ACADEMIC_CURRICULUM_REFERENCE",
];

const CORPUS_SOURCE_TIER: Record<KnowledgeCorpus, SourceTier> = {
  DR_VANDANA_KNOWLEDGE: "TIER_5_DR_VANDANA",
  PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE: "TIER_4_EDUCATIONAL",
  PSYCHOLOGY_EVIDENCE_SOURCES: "TIER_1_AUTHORITATIVE",
  CASE_STUDY_KNOWLEDGE: "TIER_4_EDUCATIONAL",
  SAFETY_AND_ETHICS_RULES: "TIER_1_AUTHORITATIVE",
  ACADEMIC_CURRICULUM_REFERENCE: "TIER_3_ACADEMIC",
};

const CORPUS_KNOWLEDGE_SCOPE: Record<KnowledgeCorpus, KnowledgeScope> = {
  DR_VANDANA_KNOWLEDGE: "DR_VANDANA_PRACTICE",
  PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE: "GENERAL_PSYCHOLOGY",
  PSYCHOLOGY_EVIDENCE_SOURCES: "MENTAL_WELLBEING",
  CASE_STUDY_KNOWLEDGE: "CLINICAL_EDUCATION",
  SAFETY_AND_ETHICS_RULES: "PROFESSIONAL_GUIDANCE",
  ACADEMIC_CURRICULUM_REFERENCE: "GENERAL_PSYCHOLOGY",
};

const EVIDENCE_LEVEL_SOURCE_TIER: Partial<Record<EvidenceLevel, SourceTier>> = {
  "public-health-education": "TIER_1_AUTHORITATIVE",
  "academic-curriculum": "TIER_3_ACADEMIC",
  guideline: "TIER_1_AUTHORITATIVE",
  "systematic-review": "TIER_2_RESEARCH",
  "meta-analysis": "TIER_2_RESEARCH",
  "peer-reviewed": "TIER_2_RESEARCH",
  "academic-reference": "TIER_3_ACADEMIC",
};

const EVIDENCE_LEVEL_KNOWLEDGE_SCOPE: Partial<Record<EvidenceLevel, KnowledgeScope>> = {
  "verified-practice": "DR_VANDANA_PRACTICE",
  ethics: "PROFESSIONAL_GUIDANCE",
  "academic-curriculum": "GENERAL_PSYCHOLOGY",
  guideline: "PROFESSIONAL_GUIDANCE",
  "systematic-review": "RESEARCH_EVIDENCE",
  "meta-analysis": "RESEARCH_EVIDENCE",
  "peer-reviewed": "RESEARCH_EVIDENCE",
  "academic-reference": "CLINICAL_EDUCATION",
};

const MENTAL_WELLBEING_TOPICS = new Set([
  "anxiety-awareness",
  "anxiety",
  "resilience",
  "emotional-regulation",
  "stress-management",
  "stress-vs-anxiety",
  "depression-awareness",
  "workplace-burnout",
  "mindfulness",
  "visualization",
  "self-esteem",
  "grief",
  "anger",
  "life-skills",
  "womens-mental-health",
  "emotional-intelligence",
]);

export function resolveSourceTier(document: KnowledgeDocument): SourceTier {
  if (document.source_tier) {
    return document.source_tier;
  }
  return (
    EVIDENCE_LEVEL_SOURCE_TIER[document.evidence_level] ??
    CORPUS_SOURCE_TIER[document.corpus]
  );
}

export function resolveKnowledgeScope(document: KnowledgeDocument): KnowledgeScope {
  if (document.knowledge_scope) {
    return document.knowledge_scope;
  }
  if (MENTAL_WELLBEING_TOPICS.has(document.topic)) {
    return "MENTAL_WELLBEING";
  }
  return (
    EVIDENCE_LEVEL_KNOWLEDGE_SCOPE[document.evidence_level] ??
    CORPUS_KNOWLEDGE_SCOPE[document.corpus]
  );
}

export function isDrVandanaPracticeKnowledge(document: KnowledgeDocument): boolean {
  return resolveKnowledgeScope(document) === "DR_VANDANA_PRACTICE";
}

export function isGeneralPsychologyKnowledge(document: KnowledgeDocument): boolean {
  const scope = resolveKnowledgeScope(document);
  return (
    scope === "GENERAL_PSYCHOLOGY" ||
    scope === "MENTAL_WELLBEING" ||
    scope === "CLINICAL_EDUCATION" ||
    scope === "RESEARCH_EVIDENCE"
  );
}

/**
 * Educational psychotherapy knowledge must not be treated as evidence of
 * Dr. Vandana's personal practice methods.
 */
export function impliesDrVandanaPractice(document: KnowledgeDocument): boolean {
  if (document.corpus === "ACADEMIC_CURRICULUM_REFERENCE") {
    return false;
  }
  return isDrVandanaPracticeKnowledge(document);
}

export function isCorpusProductionBlocked(corpus: KnowledgeCorpus): boolean {
  return NON_INDEXABLE_CORPORA.includes(corpus);
}

export function isProductionIndexable(document: KnowledgeDocument): boolean {
  if (isCorpusProductionBlocked(document.corpus)) {
    return false;
  }
  return (
    document.approved &&
    (document.approval_state === "APPROVED" ||
      document.approval_state === "PUBLISHED")
  );
}

/**
 * Source tier represents authority/type — it must not override topical relevance.
 * This helper exists for tests and future filtering; retrieval scoring is unchanged.
 */
export function sourceTierRank(tier: SourceTier): number {
  const order: Record<SourceTier, number> = {
    TIER_1_AUTHORITATIVE: 1,
    TIER_2_RESEARCH: 2,
    TIER_3_ACADEMIC: 3,
    TIER_4_EDUCATIONAL: 4,
    TIER_5_DR_VANDANA: 5,
  };
  return order[tier];
}

export function evidenceLevelDistinctFromSourceTier(
  evidenceLevel: EvidenceLevel,
  sourceTier: SourceTier,
): boolean {
  const impliedTier = EVIDENCE_LEVEL_SOURCE_TIER[evidenceLevel];
  if (!impliedTier) {
    return true;
  }
  return impliedTier !== sourceTier;
}

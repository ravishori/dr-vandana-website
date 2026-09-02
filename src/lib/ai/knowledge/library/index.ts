export {
  documentsToPublicSources,
  formatPublicSourceAttribution,
  isAttributableToDrVandanaViews,
} from "@/lib/ai/knowledge/library/attribution";
export {
  evaluatePracticeBoundary,
  therapyEducationDoesNotImplyPractice,
  type PracticeBoundaryDecision,
} from "@/lib/ai/knowledge/library/boundaries";
export {
  buildKnowledgeCoverageMap,
  countDocumentsByKnowledgeScope,
  countDocumentsBySourceTier,
  summarizeCoverageByDomain,
  type CoverageMapEntry,
} from "@/lib/ai/knowledge/library/coverage-map";
export {
  evidenceLevelDistinctFromSourceTier,
  impliesDrVandanaPractice,
  isCorpusProductionBlocked,
  isDrVandanaPracticeKnowledge,
  isGeneralPsychologyKnowledge,
  isProductionIndexable,
  NON_INDEXABLE_CORPORA,
  resolveKnowledgeScope,
  resolveSourceTier,
  sourceTierRank,
} from "@/lib/ai/knowledge/library/semantics";
export {
  findDomainForTopic,
  listAllTaxonomyTopics,
  PSYCHOLOGY_DOMAIN_TAXONOMY,
  type PsychologyDomain,
  type PsychologyDomainId,
  type PsychologyTopic,
} from "@/lib/ai/knowledge/library/taxonomy";

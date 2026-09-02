export {
  isClearlyNonPsychologyQuery,
  isPublicUniversityCurriculumQuery,
  shouldBypassPsychologyRetrieval,
} from "@/lib/ai/knowledge/library/query-boundaries";
export {
  documentsToPublicSources,
  formatPublicSourceAttribution,
  isAttributableToDrVandanaViews,
  isExternalEvidenceSource,
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
  auditLegacyInferredMetadata,
  buildKnowledgeGapReport,
  PHASE4_PRIORITY_TOPICS,
  summarizeReviewStatuses,
  type KnowledgeCoverageReport,
  type LegacyInferredMetadataEntry,
  type PriorityTopicId,
  type TopicGapReportEntry,
} from "@/lib/ai/knowledge/library/gap-report";
export {
  computeNextReviewDue,
  DEFAULT_SOURCE_REVIEW_INTERVAL_MONTHS,
  evaluateSourceReview,
  listOverduePublishedSources,
  requiresPublishedReviewMetadata,
  type SourceReviewEvaluation,
  type SourceReviewStatus,
} from "@/lib/ai/knowledge/library/review-governance";
export {
  findDomainForTopic,
  listAllTaxonomyTopics,
  PSYCHOLOGY_DOMAIN_TAXONOMY,
  type PsychologyDomain,
  type PsychologyDomainId,
  type PsychologyTopic,
} from "@/lib/ai/knowledge/library/taxonomy";

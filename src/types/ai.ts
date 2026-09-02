/**
 * Ask Dr. Vandana AI — shared types.
 * Server and data modules may import these. Do not expose internal
 * prompt text or raw retrieved documents through the public API.
 */

export type SupportedLanguage = "en" | "hi" | "mr";

export type KnowledgeCorpus =
  | "DR_VANDANA_KNOWLEDGE"
  | "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE"
  | "PSYCHOLOGY_EVIDENCE_SOURCES"
  | "CASE_STUDY_KNOWLEDGE"
  | "SAFETY_AND_ETHICS_RULES"
  | "ACADEMIC_CURRICULUM_REFERENCE";

export type AcademicReferenceType =
  | "STUDY_BOOK"
  | "REFERENCE_BOOK"
  | "JOURNAL_ARTICLE"
  | "OTHER_ACADEMIC_REFERENCE";

export type AcademicBibliographicReference = {
  title: string;
  reference_type: AcademicReferenceType;
  author?: string;
  edition?: string;
  publisher?: string;
  year?: string;
  isbn?: string;
};

export type AcademicContentType =
  | "syllabus"
  | "elective"
  | "practical"
  | "ojt-field-placement"
  | "research-project";

export type SourcePageStatus = "UNVERIFIED" | "VERIFIED";

export type CurriculumReviewStatus =
  | "REVIEW_REQUIRED"
  | "VERIFIED"
  | "UNKNOWN";

export type KnowledgeApprovalState =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type KnowledgeCategory =
  | "Dr Vandana Methodology"
  | "Psychology Fundamentals"
  | "Counselling"
  | "Anxiety"
  | "Stress"
  | "Depression Awareness"
  | "Relationships"
  | "Parenting"
  | "Child Psychology"
  | "Adolescents"
  | "Workplace Mental Health"
  | "Burnout"
  | "Mindfulness"
  | "Emotional Intelligence"
  | "Self Esteem"
  | "Grief"
  | "Case Studies"
  | "Frequently Asked Questions"
  | "Safety & Ethics"
  | "Women's Mental Health"
  | "Anger Management"
  | "Life Skills"
  | "Academic Curriculum";

export type SourceTier =
  | "TIER_1_AUTHORITATIVE"
  | "TIER_2_RESEARCH"
  | "TIER_3_ACADEMIC"
  | "TIER_4_EDUCATIONAL"
  | "TIER_5_DR_VANDANA";

export type KnowledgeScope =
  | "GENERAL_PSYCHOLOGY"
  | "MENTAL_WELLBEING"
  | "CLINICAL_EDUCATION"
  | "RESEARCH_EVIDENCE"
  | "PROFESSIONAL_GUIDANCE"
  | "DR_VANDANA_PRACTICE";

export type CopyrightStatus =
  | "PUBLIC_DOMAIN"
  | "LICENSED"
  | "METADATA_ONLY"
  | "RESTRICTED"
  | "UNKNOWN";

export type SourceVerificationStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "DISPUTED";

/**
 * Publication/material type — distinct from source tier (authority) and evidence level (strength).
 */
export type SourceType =
  | "PUBLIC_HEALTH_FACT_SHEET"
  | "PUBLIC_HEALTH_Q_AND_A"
  | "GOVERNMENT_HEALTH_EDUCATION"
  | "CLINICAL_GUIDELINE"
  | "SYSTEMATIC_REVIEW"
  | "META_ANALYSIS"
  | "PEER_REVIEWED_RESEARCH"
  | "TEXTBOOK"
  | "HANDBOOK"
  | "UNIVERSITY_EDUCATIONAL_RESOURCE"
  | "PRACTICE_EDUCATION"
  | "INTERNAL_COVERAGE_REFERENCE"
  | "UNKNOWN";

/**
 * Extended provenance for psychology knowledge sources.
 * Bibliographic fields must remain null/omitted when unknown — never fabricated.
 */
export type KnowledgeSourceMetadata = {
  source_id?: string;
  source_name?: string;
  source_type?: SourceType;
  organization?: string;
  publication_date?: string;
  last_reviewed?: string;
  /** Maintainer review due date — distinct from publication_date. */
  next_review_due?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  license?: string;
  copyright_status?: CopyrightStatus;
  language?: SupportedLanguage;
  country_or_region?: string;
  verification_status?: SourceVerificationStatus;
  notes?: string;
};

export type EvidenceLevel =
  | "verified-practice"
  | "educational"
  | "public-health-education"
  | "ethics"
  | "academic-curriculum"
  | "guideline"
  | "systematic-review"
  | "meta-analysis"
  | "peer-reviewed"
  | "academic-reference";

export type CoverageStatus =
  | "NOT_STARTED"
  | "PARTIAL"
  | "ADEQUATE"
  | "REVIEW_REQUIRED";

export type AskIntent =
  | "DEFINITION"
  | "HOW_TO"
  | "TECHNIQUE"
  | "BENEFITS"
  | "CAUSES"
  | "SYMPTOMS"
  | "COMPARISON"
  | "EXAMPLE"
  | "SELF_HELP"
  | "WHEN_TO_SEEK_HELP"
  | "GENERAL_EDUCATION"
  | "DR_VANDANA_SPECIFIC"
  | "SAFETY"
  | "OUT_OF_SCOPE";

/** Domain classification used to lock retrieval and answers to the user's question. */
export type DomainIntent =
  | "relationship"
  | "emotional_wellbeing"
  | "stress"
  | "anxiety"
  | "depression_awareness"
  | "anger_management"
  | "parenting"
  | "child_psychology"
  | "adolescent_psychology"
  | "women_wellbeing"
  | "workplace_mental_health"
  | "burnout"
  | "grief"
  | "self_esteem"
  | "confidence"
  | "mindfulness"
  | "positive_psychology"
  | "general_psychology"
  | "psychological_assessment"
  | "professional_support"
  | "crisis_safety"
  | "outside_scope"
  | "ambiguous";

export type IntentClassification = {
  domain: DomainIntent;
  secondary?: DomainIntent;
  question_type: AskIntent;
  topic: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  allow_case_studies: boolean;
};

export type RelevanceConfidence =
  | "HIGH_CONFIDENCE"
  | "MEDIUM_CONFIDENCE"
  | "LOW_CONFIDENCE"
  | "NO_MATCH";

export type ValidationStatus =
  | "PASS"
  | "REGENERATE"
  | "KNOWLEDGE_GAP"
  | "SAFETY_REDIRECT";

export type AnswerQuality = {
  status: ValidationStatus;
  confidence: RelevanceConfidence;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  topic: string;
  content: string;
  source: string;
  author: string;
  publication: string;
  date: string;
  evidence_level: EvidenceLevel;
  language: SupportedLanguage;
  approved: boolean;
  approval_state: KnowledgeApprovalState;
  created_at: string;
  updated_at: string;
  version: number;
  corpus: KnowledgeCorpus;
  related_questions?: readonly string[];
  related_routes?: readonly string[];
  /** V2 metadata — optional on legacy documents. */
  keywords?: readonly string[];
  synonyms?: readonly string[];
  intents?: readonly AskIntent[];
  practical_steps?: readonly string[];
  examples?: readonly string[];
  cautions?: readonly string[];
  /** Psychology knowledge library semantics — optional on legacy documents; inferred when absent. */
  source_tier?: SourceTier;
  knowledge_scope?: KnowledgeScope;
  source_metadata?: KnowledgeSourceMetadata;
  /** Academic curriculum metadata — optional; only on ACADEMIC_CURRICULUM_REFERENCE documents. */
  institution?: string;
  program?: string;
  curriculum_version?: string;
  academic_year?: string;
  semester?: string;
  course_code?: string;
  course_title?: string;
  course_type?: string;
  credits?: number;
  unit_number?: string;
  unit_title?: string;
  course_objectives?: readonly string[];
  course_outcomes?: readonly string[];
  content_type?: AcademicContentType;
  source_page?: string;
  source_page_status?: SourcePageStatus;
  source_document?: string;
  source_url?: string;
  /** Stable id so future syllabus revisions can coexist (e.g. NEP 2020 / 2023-24). */
  curriculum_version_id?: string;
  study_books?: readonly AcademicBibliographicReference[];
  reference_books?: readonly AcademicBibliographicReference[];
};

export type PublicKnowledgeSource = {
  title: string;
  attribution: string;
  /** Legitimate public source URL when verified and available. */
  url?: string;
};

export type SafetyCategory =
  | "SAFE_EDUCATIONAL"
  | "PERSONAL_MENTAL_HEALTH"
  | "DIAGNOSTIC_REQUEST"
  | "MEDICATION_REQUEST"
  | "CRISIS_OR_EMERGENCY"
  | "SELF_HARM_OR_SUICIDE"
  | "VIOLENCE_OR_HARM"
  | "CONFIDENTIALITY_REQUEST"
  | "DR_VANDANA_SPECIFIC"
  | "OUT_OF_SCOPE"
  | "PROMPT_INJECTION";

export type AskAiRequest = {
  question: string;
  conversation_id?: string;
  language?: SupportedLanguage;
};

export type AskAiResponse = {
  answer: string;
  category: SafetyCategory;
  sources: PublicKnowledgeSource[];
  related_questions: string[];
  safety_notice: string;
  conversation_id: string;
  show_support_cta: boolean;
  case_study_slug?: string;
  /** V2 fields — optional for backward compatibility. */
  intent?: AskIntent;
  topic?: string;
  quality?: AnswerQuality;
  /** Structured internal classification metadata. */
  domain_intent?: DomainIntent;
  secondary_intent?: DomainIntent;
  relevance_score?: number;
};

export type RelevanceSignals = {
  topicMatch: number;
  intentMatch: number;
  keywordOverlap: number;
  titleMatch: number;
  finalScore: number;
  confidence: RelevanceConfidence;
};

export type RetrievedChunk = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  topic: string;
  corpus: KnowledgeCorpus;
  content: string;
  source: string;
  publication: string;
  score: number;
  related_questions: readonly string[];
  related_routes: readonly string[];
  keywords?: readonly string[];
  synonyms?: readonly string[];
  intents?: readonly AskIntent[];
  practical_steps?: readonly string[];
  examples?: readonly string[];
  cautions?: readonly string[];
  relevance?: RelevanceSignals;
};

export type CaseStudyRecord = {
  slug: string;
  title: string;
  ageRange: string;
  generalContext: string;
  presentingConcerns: readonly string[];
  backgroundFactors: readonly string[];
  assessmentConsiderations: readonly string[];
  formulation: readonly string[];
  possibleApproaches: readonly string[];
  monitoring: readonly string[];
  referralConsiderations: readonly string[];
  educationalLessons: readonly string[];
  disclaimer: string;
  relatedTopics: readonly string[];
  knowledgeDocumentId: string;
};

export type QuickQuestionCard = {
  id: string;
  title: string;
  question: string;
  description: string;
  icon:
    | "anxiety"
    | "stress"
    | "relationships"
    | "parenting"
    | "adolescents"
    | "burnout"
    | "mindfulness"
    | "esteem"
    | "cases"
    | "counselling";
};

export type ConversationTurn = {
  role: "user" | "assistant";
  /** Sanitized, truncated text — never a clinical record. */
  text: string;
};

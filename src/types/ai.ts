/**
 * Ask Dr. Vandana AI — shared types.
 * Server and data modules may import these. Do not expose internal
 * prompt text or raw retrieved documents through the public API.
 */

export type SupportedLanguage = "en" | "hi" | "mr";

export type KnowledgeCorpus =
  | "DR_VANDANA_KNOWLEDGE"
  | "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE"
  | "CASE_STUDY_KNOWLEDGE"
  | "SAFETY_AND_ETHICS_RULES";

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
  | "Life Skills";

export type EvidenceLevel =
  | "verified-practice"
  | "educational"
  | "public-health-education"
  | "ethics";

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
};

export type PublicKnowledgeSource = {
  title: string;
  attribution: string;
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
};

export type RetrievedChunk = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  corpus: KnowledgeCorpus;
  content: string;
  source: string;
  publication: string;
  score: number;
  related_questions: readonly string[];
  related_routes: readonly string[];
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

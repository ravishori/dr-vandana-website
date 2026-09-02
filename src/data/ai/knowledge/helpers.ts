import type {
  AcademicBibliographicReference,
  AcademicContentType,
  AskIntent,
  EvidenceLevel,
  KnowledgeApprovalState,
  KnowledgeCategory,
  KnowledgeCorpus,
  KnowledgeDocument,
  SourcePageStatus,
  SupportedLanguage,
} from "@/types/ai";

type KnowledgeDraft = {
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
  corpus: KnowledgeCorpus;
  related_questions?: readonly string[];
  related_routes?: readonly string[];
  language?: SupportedLanguage;
  approved?: boolean;
  approval_state?: KnowledgeApprovalState;
  version?: number;
  keywords?: readonly string[];
  synonyms?: readonly string[];
  intents?: readonly AskIntent[];
  practical_steps?: readonly string[];
  examples?: readonly string[];
  cautions?: readonly string[];
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
  curriculum_version_id?: string;
  study_books?: readonly AcademicBibliographicReference[];
  reference_books?: readonly AcademicBibliographicReference[];
};

export function createKnowledgeDocument(
  draft: KnowledgeDraft,
): KnowledgeDocument {
  return {
    ...draft,
    language: draft.language ?? "en",
    approved: draft.approved ?? true,
    approval_state: draft.approval_state ?? "PUBLISHED",
    created_at: `${draft.date}T00:00:00.000Z`,
    updated_at: `${draft.date}T00:00:00.000Z`,
    version: draft.version ?? 1,
    related_questions: draft.related_questions ?? [],
    related_routes: draft.related_routes ?? [],
  };
}

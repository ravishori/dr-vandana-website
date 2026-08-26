import type {
  EvidenceLevel,
  KnowledgeApprovalState,
  KnowledgeCategory,
  KnowledgeCorpus,
  KnowledgeDocument,
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

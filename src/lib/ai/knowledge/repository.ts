import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import type {
  KnowledgeApprovalState,
  KnowledgeCorpus,
  KnowledgeDocument,
} from "@/types/ai";

const INDEXABLE_STATES: readonly KnowledgeApprovalState[] = [
  "APPROVED",
  "PUBLISHED",
];

export type KnowledgeFilter = {
  corpus?: KnowledgeCorpus;
  language?: KnowledgeDocument["language"];
  includeUnpublished?: boolean;
};

export interface KnowledgeRepository {
  list(filter?: KnowledgeFilter): readonly KnowledgeDocument[];
  getById(id: string): KnowledgeDocument | undefined;
}

function isIndexable(document: KnowledgeDocument): boolean {
  return (
    document.approved && INDEXABLE_STATES.includes(document.approval_state)
  );
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  constructor(
    private readonly documents: readonly KnowledgeDocument[] = allKnowledgeDocuments,
  ) {}

  list(filter: KnowledgeFilter = {}): readonly KnowledgeDocument[] {
    return this.documents.filter((document) => {
      if (!filter.includeUnpublished && !isIndexable(document)) {
        return false;
      }
      if (filter.corpus && document.corpus !== filter.corpus) {
        return false;
      }
      if (filter.language && document.language !== filter.language) {
        return false;
      }
      return true;
    });
  }

  getById(id: string): KnowledgeDocument | undefined {
    return this.documents.find((document) => document.id === id);
  }
}

export const knowledgeRepository = new InMemoryKnowledgeRepository();

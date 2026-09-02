import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import { isProductionIndexable } from "@/lib/ai/knowledge/library/semantics";
import type {
  KnowledgeCorpus,
  KnowledgeDocument,
} from "@/types/ai";

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
  return isProductionIndexable(document);
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

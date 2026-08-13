import { aiConfig } from "@/config/ai";
import { tokenize } from "@/lib/ai/embeddings/service";
import {
  knowledgeRepository,
  type KnowledgeRepository,
} from "@/lib/ai/knowledge/repository";
import type {
  KnowledgeCorpus,
  KnowledgeDocument,
  RetrievedChunk,
  SupportedLanguage,
} from "@/types/ai";

export type RetrievalQuery = {
  text: string;
  language?: SupportedLanguage;
  preferredCorpora?: readonly KnowledgeCorpus[];
  limit?: number;
};

export interface RetrievalService {
  retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]>;
}

type IndexedDocument = {
  document: KnowledgeDocument;
  tokens: string[];
  termFrequency: Map<string, number>;
};

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function bm25Score(
  queryTokens: string[],
  indexed: IndexedDocument,
  documentCount: number,
  averageLength: number,
  documentFrequency: Map<string, number>,
): number {
  const k1 = 1.4;
  const b = 0.75;
  const lengthNorm =
    k1 * (1 - b + b * (indexed.tokens.length / Math.max(averageLength, 1)));

  let score = 0;
  const uniqueQuery = new Set(queryTokens);
  for (const term of uniqueQuery) {
    const tf = indexed.termFrequency.get(term) ?? 0;
    if (tf === 0) {
      continue;
    }
    const df = documentFrequency.get(term) ?? 0;
    const idf = Math.log(
      1 + (documentCount - df + 0.5) / (df + 0.5),
    );
    score += idf * ((tf * (k1 + 1)) / (tf + lengthNorm));
  }
  return score;
}

export class LexicalRetrievalService implements RetrievalService {
  private readonly index: IndexedDocument[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;

  constructor(repository: KnowledgeRepository = knowledgeRepository) {
    const published = repository.list();
    this.index = published.map((document) => {
      const tokens = tokenize(
        `${document.title} ${document.topic} ${document.category} ${document.content}`,
      );
      return {
        document,
        tokens,
        termFrequency: termFrequency(tokens),
      };
    });

    for (const entry of this.index) {
      const unique = new Set(entry.tokens);
      for (const term of unique) {
        this.documentFrequency.set(
          term,
          (this.documentFrequency.get(term) ?? 0) + 1,
        );
      }
    }

    this.averageLength =
      this.index.reduce((sum, entry) => sum + entry.tokens.length, 0) /
      Math.max(this.index.length, 1);
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]> {
    const queryTokens = tokenize(query.text);
    if (queryTokens.length === 0 || this.index.length === 0) {
      return [];
    }

    const limit = query.limit ?? aiConfig.retrievalLimit;
    const preferred = new Set(query.preferredCorpora ?? []);

    const ranked = this.index
      .filter((entry) => {
        if (query.language && entry.document.language !== query.language) {
          return false;
        }
        return true;
      })
      .map((entry) => {
        let score = bm25Score(
          queryTokens,
          entry,
          this.index.length,
          this.averageLength,
          this.documentFrequency,
        );
        if (preferred.has(entry.document.corpus)) {
          score *= 1.35;
        }
        return { entry, score };
      })
      .filter((row) => row.score >= aiConfig.minRetrievalScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    return ranked.map(({ entry, score }) => ({
      id: entry.document.id,
      title: entry.document.title,
      category: entry.document.category,
      corpus: entry.document.corpus,
      content: entry.document.content,
      source: entry.document.source,
      publication: entry.document.publication,
      score,
      related_questions: entry.document.related_questions ?? [],
      related_routes: entry.document.related_routes ?? [],
    }));
  }
}

export const retrievalService: RetrievalService = new LexicalRetrievalService();

export function filterRelevantChunks(
  chunks: readonly RetrievedChunk[],
  minScore = aiConfig.minRetrievalScore,
): RetrievedChunk[] {
  if (chunks.length === 0) {
    return [];
  }
  const top = chunks[0]?.score ?? 0;
  return chunks.filter((chunk) => chunk.score >= minScore && chunk.score >= top * 0.35);
}

import { aiConfig } from "@/config/ai";
import { tokenize } from "@/lib/ai/embeddings/service";
import { expandTopicTerms } from "@/lib/ai/intent/synonyms";
import {
  KnowledgeRepository,
  knowledgeRepository,
} from "@/lib/ai/knowledge/repository";
import {
  contentTokens,
  normalizeQueryForRetrieval,
} from "@/lib/ai/retrieval/normalize-query";
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
  excludeCorpora?: readonly KnowledgeCorpus[];
  allowedTopics?: readonly string[];
  excludedTopics?: readonly string[];
  limit?: number;
  topic?: string;
  topicTerms?: readonly string[];
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
    const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
    score += idf * ((tf * (k1 + 1)) / (tf + lengthNorm));
  }
  return score;
}

function documentToChunk(
  document: KnowledgeDocument,
  score: number,
): RetrievedChunk {
  return {
    id: document.id,
    title: document.title,
    category: document.category,
    topic: document.topic,
    corpus: document.corpus,
    content: document.content,
    source: document.source,
    publication: document.publication,
    score,
    related_questions: document.related_questions ?? [],
    related_routes: document.related_routes ?? [],
    keywords: document.keywords,
    synonyms: document.synonyms,
    intents: document.intents,
    practical_steps: document.practical_steps,
    examples: document.examples,
    cautions: document.cautions,
  };
}

function exactTopicScore(
  document: KnowledgeDocument,
  topicTerms: readonly string[],
): number {
  if (topicTerms.length === 0) {
    return 0;
  }
  const haystack = [
    document.topic,
    document.title,
    ...(document.keywords ?? []),
    ...(document.synonyms ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const term of topicTerms) {
    if (haystack.includes(term.toLowerCase())) {
      hits += 1;
    }
  }
  return Math.min(1, hits / topicTerms.length);
}

export class HybridRetrievalService implements RetrievalService {
  private readonly index: IndexedDocument[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;

  constructor(repository: KnowledgeRepository = knowledgeRepository) {
    const published = repository.list();
    this.index = published.map((document) => {
      const searchable = [
        document.title,
        document.topic,
        document.category,
        ...(document.keywords ?? []),
        ...(document.synonyms ?? []),
        document.content,
      ].join(" ");
      const tokens = contentTokens(searchable);
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
    const normalizedText = normalizeQueryForRetrieval(query.text);
    const queryTokens = tokenize(normalizedText);
    if (queryTokens.length === 0 || this.index.length === 0) {
      return [];
    }

    const limit = query.limit ?? aiConfig.retrievalLimit;
    const topicTerms =
      query.topicTerms ??
      (query.topic ? expandTopicTerms(query.topic) : []);

    const ranked = this.index
      .filter((entry) => {
        if (query.language && entry.document.language !== query.language) {
          return false;
        }
        if (
          query.preferredCorpora &&
          query.preferredCorpora.length > 0 &&
          !query.preferredCorpora.includes(entry.document.corpus)
        ) {
          return false;
        }
        if (query.excludeCorpora?.includes(entry.document.corpus)) {
          return false;
        }
        if (query.excludedTopics?.includes(entry.document.topic)) {
          return false;
        }
        if (query.allowedTopics && query.allowedTopics.length > 0) {
          const topic = entry.document.topic;
          return query.allowedTopics.some(
            (allowed) =>
              topic === allowed ||
              topic.includes(allowed) ||
              allowed.includes(topic),
          );
        }
        return true;
      })
      .map((entry) => {
        const lexical = bm25Score(
          queryTokens,
          entry,
          this.index.length,
          this.averageLength,
          this.documentFrequency,
        );
        const topic = exactTopicScore(entry.document, topicTerms);
        const titleTokens = contentTokens(entry.document.title);
        const titleOverlap =
          queryTokens.filter((token) => titleTokens.includes(token)).length /
          Math.max(queryTokens.length, 1);
        const allowedBoost =
          query.allowedTopics && query.allowedTopics.includes(entry.document.topic)
            ? 3
            : 0;

        const score = topic * 5 + lexical + titleOverlap * 2 + allowedBoost;
        return { entry, score };
      })
      .filter((row) => row.score >= aiConfig.minRetrievalScore * 0.5)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit * 2);

    return ranked
      .slice(0, limit)
      .map(({ entry, score }) => documentToChunk(entry.document, score));
  }
}

/** @deprecated Use relevance gate instead. Kept for transitional imports. */
export function filterRelevantChunks(
  chunks: readonly RetrievedChunk[],
  minScore = aiConfig.minRetrievalScore,
): RetrievedChunk[] {
  if (chunks.length === 0) {
    return [];
  }
  const top = chunks[0]?.score ?? 0;
  return chunks.filter(
    (chunk) => chunk.score >= minScore && chunk.score >= top * 0.55,
  );
}

export const retrievalService: RetrievalService = new HybridRetrievalService();

/** Backward-compatible alias. */
export const LexicalRetrievalService = HybridRetrievalService;

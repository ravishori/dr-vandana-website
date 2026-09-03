import { tokenize } from "@/lib/ai/embeddings/service";

const STOPWORDS = new Set([
  "is",
  "the",
  "what",
  "how",
  "can",
  "do",
  "a",
  "an",
  "to",
  "of",
  "i",
  "my",
  "me",
  "you",
  "your",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "with",
  "for",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "by",
  "from",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "tell",
  "explain",
  "describe",
  "give",
  "show",
  "please",
  "powerful",
  "really",
  "very",
]);

export function normalizeQueryForRetrieval(text: string): string {
  const tokens = tokenize(text).filter((token) => !STOPWORDS.has(token));
  return tokens.join(" ");
}

export function contentTokens(text: string): string[] {
  return tokenize(text).filter((token) => !STOPWORDS.has(token));
}

export function keywordOverlapScore(
  queryTokens: readonly string[],
  documentText: string,
): number {
  if (queryTokens.length === 0) {
    return 0;
  }
  const docTokens = new Set(contentTokens(documentText));
  let hits = 0;
  for (const token of queryTokens) {
    if (docTokens.has(token)) {
      hits += 1;
    }
  }
  return hits / queryTokens.length;
}

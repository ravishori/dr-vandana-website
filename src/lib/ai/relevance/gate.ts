import type { AskIntent, RelevanceConfidence, RetrievedChunk } from "@/types/ai";
import { topicsAlign } from "@/lib/ai/intent/topic";
import {
  contentTokens,
  keywordOverlapScore,
} from "@/lib/ai/retrieval/normalize-query";

export type RelevanceInput = {
  question: string;
  queryTokens: readonly string[];
  topic: string;
  intent: AskIntent;
  requireTopicMatch?: boolean;
};

function intentMatches(
  chunkIntents: readonly AskIntent[] | undefined,
  intent: AskIntent,
  secondary?: AskIntent,
): number {
  if (!chunkIntents || chunkIntents.length === 0) {
    return 0.35;
  }
  if (chunkIntents.includes(intent)) {
    return 1;
  }
  if (secondary && chunkIntents.includes(secondary)) {
    return 0.75;
  }
  if (
    intent === "HOW_TO" &&
    chunkIntents.some((item) => item === "SELF_HELP" || item === "TECHNIQUE")
  ) {
    return 0.8;
  }
  if (
    intent === "DEFINITION" &&
    chunkIntents.some((item) => item === "GENERAL_EDUCATION" || item === "TECHNIQUE")
  ) {
    return 0.7;
  }
  return 0.15;
}

function titleMatchScore(title: string, queryTokens: readonly string[]): number {
  const titleTokens = new Set(contentTokens(title));
  if (queryTokens.length === 0 || titleTokens.size === 0) {
    return 0;
  }
  let hits = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      hits += 1;
    }
  }
  return hits / queryTokens.length;
}

export function classifyConfidence(signals: {
  topicMatch: number;
  intentMatch: number;
  keywordOverlap: number;
  titleMatch: number;
}, options?: { requireTopicMatch?: boolean }): RelevanceConfidence {
  const composite =
    signals.topicMatch * 0.45 +
    signals.keywordOverlap * 0.3 +
    signals.intentMatch * 0.15 +
    signals.titleMatch * 0.1;

  if (options?.requireTopicMatch && signals.topicMatch < 0.25) {
    return "NO_MATCH";
  }

  if (signals.topicMatch < 0.2 && signals.keywordOverlap < 0.15) {
    return "NO_MATCH";
  }
  if (composite >= 0.55 && signals.topicMatch >= 0.35) {
    return "HIGH_CONFIDENCE";
  }
  if (composite >= 0.35 && signals.topicMatch >= 0.2) {
    return "MEDIUM_CONFIDENCE";
  }
  if (composite >= 0.2) {
    return "LOW_CONFIDENCE";
  }
  return "NO_MATCH";
}

export function scoreChunkRelevance(
  chunk: RetrievedChunk,
  input: RelevanceInput,
): RetrievedChunk {
  const documentText = `${chunk.title} ${chunk.topic} ${chunk.category} ${(chunk.keywords ?? []).join(" ")} ${(chunk.synonyms ?? []).join(" ")} ${chunk.content}`;
  const topicMatch = topicsAlign(
    chunk.topic,
    chunk.keywords,
    chunk.synonyms,
    input.topic,
  );
  const keywordOverlap = keywordOverlapScore(input.queryTokens, documentText);
  const titleMatch = titleMatchScore(chunk.title, input.queryTokens);
  const intentMatch = intentMatches(chunk.intents, input.intent);

  const confidence = classifyConfidence(
    {
      topicMatch,
      intentMatch,
      keywordOverlap,
      titleMatch,
    },
    { requireTopicMatch: input.requireTopicMatch },
  );

  const finalScore =
    topicMatch * 5 +
    keywordOverlap * 4 +
    titleMatch * 2 +
    intentMatch * 1.5 +
    chunk.score * 0.5;

  return {
    ...chunk,
    score: finalScore,
    relevance: {
      topicMatch,
      intentMatch,
      keywordOverlap,
      titleMatch,
      finalScore,
      confidence,
    },
  };
}

export function applyRelevanceGate(
  chunks: readonly RetrievedChunk[],
  input: RelevanceInput & { requireTopicMatch?: boolean },
): {
  primary: RetrievedChunk | null;
  secondary: RetrievedChunk[];
  usable: RetrievedChunk[];
  confidence: RelevanceConfidence;
} {
  const scored = chunks
    .map((chunk) => scoreChunkRelevance(chunk, input))
    .sort((left, right) => (right.relevance?.finalScore ?? 0) - (left.relevance?.finalScore ?? 0));

  const usable = scored.filter(
    (chunk) =>
      chunk.relevance?.confidence === "HIGH_CONFIDENCE" ||
      chunk.relevance?.confidence === "MEDIUM_CONFIDENCE",
  );

  const primary = usable[0] ?? null;
  const secondary =
    primary && usable.length > 1
      ? usable.slice(1).filter((chunk) => {
          const primaryScore = primary.relevance?.finalScore ?? 0;
          const chunkScore = chunk.relevance?.finalScore ?? 0;
          const topicAligned = (chunk.relevance?.topicMatch ?? 0) >= 0.35;
          return topicAligned && chunkScore >= primaryScore * 0.55;
        })
      : [];

  const confidence = primary?.relevance?.confidence ?? "NO_MATCH";
  if (!primary || confidence === "NO_MATCH") {
    return {
      primary: null,
      secondary: [],
      usable: [],
      confidence: "NO_MATCH",
    };
  }

  return {
    primary,
    secondary,
    usable: [primary, ...secondary],
    confidence,
  };
}

export function isCounsellingTopic(topic: string): boolean {
  return topic === "counselling" || topic === "first-session";
}

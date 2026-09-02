import { answerLooksLikeKnowledgeGap } from "@/lib/ai/answers/controlled-composer";
import { KNOWLEDGE_GAP_OPENING } from "@/lib/ai/answers/knowledge-gap";
import { contentTokens } from "@/lib/ai/retrieval/normalize-query";
import type {
  AskIntent,
  RelevanceConfidence,
  RetrievedChunk,
  ValidationStatus,
} from "@/types/ai";

export type ValidationInput = {
  question: string;
  answer: string;
  intent: AskIntent;
  topic: string;
  chunks: readonly RetrievedChunk[];
  confidence: RelevanceConfidence;
};

export type ValidationResult = {
  status: ValidationStatus;
  reasons: string[];
};

const FORBIDDEN_PATTERNS = [
  /you definitely have\b/i,
  /you have (depression|anxiety|adhd|bipolar)\b/i,
  /i am dr\.?\s*vandana/i,
  /this treatment will cure you/i,
  /i diagnosed you/i,
];

const UNRELATED_COUNSELLING_MARKERS = [
  /a first session is usually an opportunity/i,
  /what happens in the first counselling session/i,
];

export function validateAnswer(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const answerLower = input.answer.toLowerCase();
  const topicTokens = contentTokens(input.topic.replace(/-/g, " "));
  const questionTokens = contentTokens(input.question);

  if (input.confidence === "NO_MATCH" && !answerLooksLikeKnowledgeGap(input.answer)) {
    reasons.push("knowledge-gap-required");
  }

  if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(input.answer))) {
    reasons.push("forbidden-claim");
    return { status: "SAFETY_REDIRECT", reasons };
  }

  const topicMentioned =
    topicTokens.length > 0 &&
    topicTokens.some((token) => answerLower.includes(token));
  const questionOverlap =
    questionTokens.filter((token) => answerLower.includes(token)).length /
    Math.max(questionTokens.length, 1);

  if (
    input.topic !== "general-education" &&
    input.topic !== "counselling" &&
    input.topic !== "first-session" &&
    !topicMentioned &&
    questionOverlap < 0.15 &&
    !answerLooksLikeKnowledgeGap(input.answer)
  ) {
    reasons.push("topic-not-addressed");
  }

  if (
    input.topic === "visualization" &&
    UNRELATED_COUNSELLING_MARKERS.some((pattern) => pattern.test(input.answer))
  ) {
    reasons.push("counselling-contamination");
  }

  if (
    input.intent === "HOW_TO" &&
    input.topic === "self-esteem" &&
    /women'?s mental health is shaped by many factors/i.test(input.answer)
  ) {
    reasons.push("secondary-topic-contamination");
  }

  const startsWithGap = input.answer.includes(KNOWLEDGE_GAP_OPENING);
  if (startsWithGap) {
    return { status: "KNOWLEDGE_GAP", reasons: ["explicit-gap"] };
  }

  if (reasons.length > 0) {
    return { status: "REGENERATE", reasons };
  }

  return { status: "PASS", reasons: [] };
}

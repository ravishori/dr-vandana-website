import { contentTokens } from "@/lib/ai/retrieval/normalize-query";
import type { DomainIntent, RetrievedChunk } from "@/types/ai";

export type RelevanceFlags = {
  addressesQuestion: boolean;
  inScope: boolean;
  unrelatedScenario: boolean;
  inventedPatient: boolean;
  diagnosedUser: boolean;
  inappropriateCertainty: boolean;
  professionalBoundaries: boolean;
};

export type RelevanceValidation = {
  score: number;
  pass: boolean;
  reasons: string[];
  flags: RelevanceFlags;
};

const DIAGNOSIS_PATTERNS = [
  /you (definitely |clearly )?(have|are) (depression|anxiety|adhd|bipolar|ocd|ptsd)\b/i,
  /i diagnosed you/i,
  /your diagnosis is\b/i,
];

const CERTAINTY_PATTERNS = [
  /this treatment will cure you/i,
  /you will definitely recover/i,
  /i guarantee\b/i,
];

const BOUNDARY_PATTERNS = [
  /i am dr\.?\s*vandana/i,
  /i have treated you/i,
  /dr\.?\s*vandana treated (you|this patient)/i,
];

const INVENTED_PATIENT_PATTERNS = [
  /a (real )?patient of dr\.?\s*vandana/i,
  /this (person|patient) was treated/i,
  /age range:\s/i,
  /presenting concerns:/i,
];

const GRIEF_SCENARIO_PATTERNS = [
  /\bbereavement\b/i,
  /\bafter (a |the )?(family )?loss\b/i,
  /\b(who|someone) died\b/i,
  /\bdeath of\b/i,
  /\bpassed away\b/i,
  /\bcaregiving relationship before the loss\b/i,
  /\bguilt about ['']?moving on['']?\b/i,
  /\bwaves of sadness\b/i,
  /\bgrief after\b/i,
];

const CASE_STUDY_PATTERNS = [
  /\beducational scenario\b/i,
  /\bfictional educational case\b/i,
  /\bcase study of\b/i,
];

const SCOPE_MARKERS = [
  /psychology/i,
  /emotion/i,
  /feeling/i,
  /counsel+ing/i,
  /well-?being/i,
  /mental health/i,
  /relationship/i,
  /stress/i,
  /anxiety/i,
  /love/i,
  /support/i,
];

function containsAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function questionOverlap(question: string, answer: string): number {
  const questionTokens = contentTokens(question);
  if (questionTokens.length === 0) {
    return 0;
  }
  const answerLower = answer.toLowerCase();
  const hits = questionTokens.filter((token) => answerLower.includes(token)).length;
  return hits / questionTokens.length;
}

export function scoreAnswerRelevance(input: {
  question: string;
  answer: string;
  domain: DomainIntent;
  topic: string;
  chunks?: readonly RetrievedChunk[];
}): RelevanceValidation {
  const reasons: string[] = [];
  const answer = input.answer;

  const diagnosedUser = containsAny(answer, DIAGNOSIS_PATTERNS);
  const inappropriateCertainty = containsAny(answer, CERTAINTY_PATTERNS);
  const professionalBoundaries = !containsAny(answer, BOUNDARY_PATTERNS);
  const inventedPatient = containsAny(answer, INVENTED_PATIENT_PATTERNS);

  const griefInjected =
    input.domain !== "grief" && containsAny(answer, GRIEF_SCENARIO_PATTERNS);
  const caseStudyInjected =
    input.domain !== "grief" &&
    !/\bcase study\b/i.test(input.question) &&
    containsAny(answer, CASE_STUDY_PATTERNS) &&
    griefInjected;

  const unrelatedScenario = griefInjected || caseStudyInjected;

  const overlap = questionOverlap(input.question, answer);
  const topicToken = input.topic.replace(/-/g, " ");
  const topicMentioned =
    topicToken.length > 2 && answer.toLowerCase().includes(topicToken.split(" ")[0] ?? "");
  const addressesQuestion = overlap >= 0.2 || topicMentioned || input.domain === "crisis_safety";

  const inScope =
    input.domain === "outside_scope" ||
    input.domain === "ambiguous" ||
    containsAny(answer, SCOPE_MARKERS);

  let score = 100;
  if (!addressesQuestion) {
    score -= 30;
    reasons.push("does-not-address-question");
  }
  if (!inScope) {
    score -= 20;
    reasons.push("outside-psychology-scope");
  }
  if (unrelatedScenario) {
    score -= 40;
    reasons.push("unrelated-scenario");
  }
  if (inventedPatient) {
    score -= 25;
    reasons.push("invented-patient");
  }
  if (diagnosedUser) {
    score -= 30;
    reasons.push("diagnosed-user");
  }
  if (inappropriateCertainty) {
    score -= 15;
    reasons.push("inappropriate-certainty");
  }
  if (!professionalBoundaries) {
    score -= 20;
    reasons.push("boundary-violation");
  }

  if (
    input.chunks?.some(
      (chunk) =>
        chunk.corpus === "CASE_STUDY_KNOWLEDGE" &&
        input.domain !== "grief" &&
        !/\bcase study\b/i.test(input.question),
    )
  ) {
    score -= 20;
    reasons.push("unrelated-case-study-source");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    pass: score >= 75,
    reasons,
    flags: {
      addressesQuestion,
      inScope,
      unrelatedScenario,
      inventedPatient,
      diagnosedUser,
      inappropriateCertainty,
      professionalBoundaries,
    },
  };
}

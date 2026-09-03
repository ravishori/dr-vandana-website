import { expandTopicTerms, normalizeTopicKey, TOPIC_SYNONYMS } from "@/lib/ai/intent/synonyms";
import { tokenize } from "@/lib/ai/embeddings/service";

const TOPIC_PATTERNS: ReadonlyArray<{ topic: string; patterns: readonly RegExp[] }> = [
  { topic: "cbt-concepts", patterns: [/\bwhat is cbt\b/i, /\bcbt\b/i, /\bcognitive behavioural therapy\b/i, /\bcognitive behavioral therapy\b/i] },
  { topic: "stress-vs-anxiety", patterns: [/\bdifference between stress and anxiety\b/i, /\bstress vs anxiety\b/i, /\bstress and anxiety\b/i] },
  { topic: "first-session", patterns: [/\bfirst (counselling|counceling)? session\b/i, /\bwhat happens in the first\b/i, /\bwhat should i expect in the first session\b/i] },
  { topic: "visualization", patterns: [/\bvisuali[sz]ation\b/i, /\bmental imagery\b/i, /\bguided imagery\b/i] },
  { topic: "emotional-regulation", patterns: [/\bemotional regulation\b/i, /\bmanage (my |your )?emotions\b/i, /\bdifficult emotions\b/i] },
  { topic: "resilience", patterns: [/\bresilien(ce|t)\b/i, /\bbuild resilience\b/i, /\badaptive coping\b/i] },
  { topic: "self-esteem", patterns: [/\bself[- ]?esteem\b/i, /\bself[- ]?worth\b/i] },
  { topic: "confidence", patterns: [/\bself[- ]?confidence\b/i, /\bbuild confidence\b/i] },
  { topic: "mindfulness", patterns: [/\bmindfulness\b/i] },
  { topic: "meditation", patterns: [/\bmeditation\b/i] },
  { topic: "anxiety", patterns: [/\banxiety\b/i, /\banxious\b/i, /\bworry\b/i, /\boverthinking\b/i] },
  { topic: "stress-management", patterns: [/\bstress management\b/i, /\bmanage stress\b/i, /\bcope with stress\b/i] },
  { topic: "stress", patterns: [/\bstress\b/i, /\bstressed\b/i] },
  { topic: "depression-awareness", patterns: [/\bdepression\b/i, /\blow mood\b/i] },
  { topic: "anger", patterns: [/\bang(er|ry)\b/i, /\bang(er|ry) management\b/i] },
  { topic: "romantic-love", patterns: [/\bin love\b/i, /\blove with (a |the )?(person|someone|somebody)\b/i, /\bromantic (love|relationship|feelings)\b/i, /\bwhether they love me\b/i, /\bi love someone\b/i] },
  { topic: "relationships", patterns: [/\brelationship(s)?\b/i, /\b(boyfriend|girlfriend|partner|spouse)\b/i] },
  { topic: "grief", patterns: [/\bgrief\b/i, /\bbereavement\b/i, /\b(passed away|died|death of)\b/i, /\bloss of (a |my )?(parent|mother|father|child|spouse|loved one)\b/i] },
  { topic: "workplace-burnout", patterns: [/\bburnout\b/i, /\bworkplace stress\b/i] },
  { topic: "relationship-counselling", patterns: [/\brelationship counselling\b/i, /\brelationship counseling\b/i] },
  { topic: "how-counselling-works", patterns: [/\bhow does counselling work\b/i, /\bhow counselling works\b/i] },
  { topic: "counselling", patterns: [/\bcounsel(l)?ing\b/i] },
  { topic: "parenting-and-children", patterns: [/\bparent(ing|s)\b/i, /\bchild psychology\b/i] },
  { topic: "adolescent-mental-health", patterns: [/\badolescent\b/i, /\bteen(ager)?\b/i] },
  { topic: "womens-mental-health", patterns: [/\bwomen'?s mental health\b/i] },
  { topic: "emotional-intelligence", patterns: [/\bemotional intelligence\b/i] },
  { topic: "life-skills", patterns: [/\bhealthy habits\b/i, /\bpersonal growth\b/i, /\bpositive mindset\b/i] },
  { topic: "counselling-approach", patterns: [/\bdr\.?\s*vandana\b/i, /\bher (methodology|approach|technique|method)\b/i] },
];

export type TopicResolution = {
  topic: string;
  terms: string[];
  fromFollowUp?: string;
};

function resolvePronounFollowUp(
  question: string,
  priorTopic?: string,
): string | undefined {
  if (!priorTopic) {
    return undefined;
  }
  const lower = question.toLowerCase();
  const refersBack =
    /\b(it|that|this|them|those|these)\b/i.test(lower) ||
    /^(how can i improve|how do i improve|tell me more|what about|what should i do|what can i do)\b/i.test(
      lower.trim(),
    );
  if (!refersBack) {
    return undefined;
  }
  const explicitNewTopic = detectExplicitTopic(question);
  if (explicitNewTopic && explicitNewTopic !== priorTopic) {
    return undefined;
  }
  return priorTopic;
}

function detectExplicitTopic(question: string): string | undefined {
  for (const entry of TOPIC_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(question))) {
      return entry.topic;
    }
  }

  const tokens = tokenize(question).filter(
    (token) => token.length > 2 && !/^(it|its|this|that|these|those)$/i.test(token),
  );
  for (const [canonical, aliases] of Object.entries(TOPIC_SYNONYMS)) {
    if (
      canonical === "cbt-concepts" &&
      !/\b(cbt|cognitive)\b/i.test(question)
    ) {
      continue;
    }
    const haystack = [canonical, ...aliases].map((item) => item.toLowerCase());
    if (
      tokens.some((token) =>
        haystack.some((term) => {
          const parts = term.split(/[\s-]+/).filter((part) => part.length > 2);
          return parts.includes(token) || term === token;
        }),
      )
    ) {
      return canonical;
    }
  }

  return undefined;
}

export function extractTopic(
  question: string,
  priorTopic?: string,
  options?: { forceTopic?: string },
): TopicResolution {
  if (options?.forceTopic) {
    return {
      topic: options.forceTopic,
      terms: expandTopicTerms(options.forceTopic),
    };
  }

  const explicit = detectExplicitTopic(question);
  const followUp = resolvePronounFollowUp(question, priorTopic);
  const topic = explicit ?? followUp ?? "general-education";
  return {
    topic,
    terms: expandTopicTerms(topic),
    fromFollowUp: followUp && !explicit ? priorTopic : undefined,
  };
}

export function topicsAlign(
  chunkTopic: string,
  chunkKeywords: readonly string[] | undefined,
  chunkSynonyms: readonly string[] | undefined,
  targetTopic: string,
): number {
  const targetKey = normalizeTopicKey(targetTopic);
  const chunkKey = normalizeTopicKey(chunkTopic);
  if (chunkKey === targetKey || chunkKey.includes(targetKey) || targetKey.includes(chunkKey)) {
    return 1;
  }

  const targetTerms = new Set(expandTopicTerms(targetTopic));
  const chunkTerms = [
    chunkTopic,
    ...(chunkKeywords ?? []),
    ...(chunkSynonyms ?? []),
  ].map((item) => item.toLowerCase());

  let hits = 0;
  for (const term of chunkTerms) {
    if ([...targetTerms].some((target) => term.includes(target) || target.includes(term))) {
      hits += 1;
    }
  }
  return Math.min(1, hits / Math.max(targetTerms.size, 1));
}

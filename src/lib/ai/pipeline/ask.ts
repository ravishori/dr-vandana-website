import {
  composeControlledAnswer,
  extractRelatedQuestionsV2,
  extractUsedSources,
} from "@/lib/ai/answers/controlled-composer";
import { composeKnowledgeGapAnswer } from "@/lib/ai/answers/knowledge-gap";
import { shouldBypassPsychologyRetrieval } from "@/lib/ai/knowledge/library/query-boundaries";
import { classifyQuestion } from "@/lib/ai/intent/classify";
import {
  documentMatchesDomain,
  topicsForDomain,
} from "@/lib/ai/intent/domain";
import {
  createConversationId,
  getConversation,
  getConversationDomain,
  getConversationTopic,
  rememberTurn,
  rewriteQuery,
} from "@/lib/ai/conversation/memory";
import { expandTopicTerms } from "@/lib/ai/intent/synonyms";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import {
  getCachedEducationalAnswer,
  educationalCacheKey,
  setCachedEducationalAnswer,
} from "@/lib/ai/pipeline/cache";
import { logAskAiDebug } from "@/lib/ai/pipeline/debug";
import { validateAskRequest, resolveLanguage } from "@/lib/ai/pipeline/validate";
import { createAiProvider, type AIProvider } from "@/lib/ai/providers";
import { extractCaseStudySlug, shouldShowSupportCta } from "@/lib/ai/providers/educational-fallback";
import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import { applyRelevanceGate } from "@/lib/ai/relevance/gate";
import { retrievalService, type RetrievalService } from "@/lib/ai/retrieval/service";
import { contentTokens } from "@/lib/ai/retrieval/normalize-query";
import {
  AMBIGUOUS_ANSWER,
  CONFIDENTIALITY_ANSWER,
  CRISIS_ANSWER,
  DIAGNOSTIC_ANSWER,
  EDUCATIONAL_DISCLAIMER,
  GENERIC_FALLBACK_ANSWER,
  INJECTION_ANSWER,
  LANGUAGE_NOT_READY_NOTICE,
  MEDICATION_ANSWER,
  OUT_OF_SCOPE_ANSWER,
  SELF_HARM_ANSWER,
  VIOLENCE_ANSWER,
} from "@/lib/ai/safety/canned";
import { safetyService, type SafetyService } from "@/lib/ai/safety/classifier";
import { postProcessAnswer, stripObviousPii } from "@/lib/ai/safety/post-process";
import { validateAnswer } from "@/lib/ai/validation/answer-validator";
import { scoreAnswerRelevance } from "@/lib/ai/validation/relevance-validator";
import { logStructured } from "@/lib/observability/logger";
import type {
  AskAiRequest,
  AskAiResponse,
  AskIntent,
  DomainIntent,
  KnowledgeCorpus,
  PublicKnowledgeSource,
  RelevanceConfidence,
  RetrievedChunk,
  SafetyCategory,
} from "@/types/ai";

export type AskPipelineDependencies = {
  provider?: AIProvider;
  retrieval?: RetrievalService;
  safety?: SafetyService;
  now?: () => number;
};

export type AskPipelineResult =
  | { ok: true; response: AskAiResponse; status: 200 }
  | {
      ok: false;
      status: 400 | 413;
      error: { code: string; message: string };
    };

const CANNED: Partial<Record<SafetyCategory, string>> = {
  CRISIS_OR_EMERGENCY: CRISIS_ANSWER,
  SELF_HARM_OR_SUICIDE: SELF_HARM_ANSWER,
  VIOLENCE_OR_HARM: VIOLENCE_ANSWER,
  MEDICATION_REQUEST: MEDICATION_ANSWER,
  DIAGNOSTIC_REQUEST: DIAGNOSTIC_ANSWER,
  CONFIDENTIALITY_REQUEST: CONFIDENTIALITY_ANSWER,
  PROMPT_INJECTION: INJECTION_ANSWER,
  OUT_OF_SCOPE: OUT_OF_SCOPE_ANSWER,
};

function preferredCorpora(
  category: SafetyCategory,
  allowCaseStudies: boolean,
): KnowledgeCorpus[] {
  if (category === "DR_VANDANA_SPECIFIC") {
    return ["DR_VANDANA_KNOWLEDGE", "SAFETY_AND_ETHICS_RULES"];
  }
  if (category === "CONFIDENTIALITY_REQUEST") {
    return ["SAFETY_AND_ETHICS_RULES", "DR_VANDANA_KNOWLEDGE"];
  }
  const corpora: KnowledgeCorpus[] = [
    "PSYCHOLOGY_EVIDENCE_SOURCES",
    "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
    "SAFETY_AND_ETHICS_RULES",
  ];
  if (allowCaseStudies) {
    corpora.splice(2, 0, "CASE_STUDY_KNOWLEDGE");
  }
  return corpora;
}

function shouldHardFilterTopics(domain: DomainIntent): boolean {
  return (
    domain !== "general_psychology" &&
    domain !== "professional_support" &&
    domain !== "psychological_assessment" &&
    domain !== "outside_scope" &&
    domain !== "ambiguous" &&
    domain !== "crisis_safety"
  );
}

function excludedTopicsFor(domain: DomainIntent): string[] {
  if (domain === "grief") {
    return [];
  }
  return ["grief", "grief-after-loss"];
}

function documentToRetrievedChunk(
  document: {
    id: string;
    title: string;
    category: RetrievedChunk["category"];
    topic: string;
    corpus: RetrievedChunk["corpus"];
    content: string;
    source: string;
    publication: string;
    related_questions?: readonly string[];
    related_routes?: readonly string[];
    keywords?: readonly string[];
    synonyms?: readonly string[];
    intents?: RetrievedChunk["intents"];
    practical_steps?: readonly string[];
    examples?: readonly string[];
    cautions?: readonly string[];
  },
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

function canonicalChunksForDomain(domain: DomainIntent): RetrievedChunk[] {
  const allowed = topicsForDomain(domain);
  if (allowed.length === 0) {
    return [];
  }
  return knowledgeRepository
    .list()
    .filter(
      (document) =>
        document.corpus !== "CASE_STUDY_KNOWLEDGE" &&
        documentMatchesDomain(document.topic, domain),
    )
    .slice(0, 4)
    .map((document, index) => documentToRetrievedChunk(document, 4 - index));
}

function lockChunksToDomain(
  chunks: readonly RetrievedChunk[],
  domain: DomainIntent,
  allowCaseStudies: boolean,
): RetrievedChunk[] {
  const filtered = chunks.filter((chunk) => {
    if (chunk.corpus === "CASE_STUDY_KNOWLEDGE" && !allowCaseStudies) {
      return false;
    }
    if (
      domain !== "grief" &&
      (chunk.topic === "grief" || chunk.topic === "grief-after-loss")
    ) {
      return false;
    }
    if (shouldHardFilterTopics(domain)) {
      return documentMatchesDomain(chunk.topic, domain, { allowCaseStudies });
    }
    return true;
  });
  if (filtered.length > 0) {
    return filtered;
  }
  if (shouldHardFilterTopics(domain)) {
    return canonicalChunksForDomain(domain);
  }
  return [];
}

function toPublicSources(sources: PublicKnowledgeSource[]): PublicKnowledgeSource[] {
  return sources;
}

function safetyNoticeFor(
  category: SafetyCategory,
  language: string,
): string {
  const parts = [EDUCATIONAL_DISCLAIMER];
  if (language !== "en") {
    parts.push(LANGUAGE_NOT_READY_NOTICE);
  }
  if (
    category === "CRISIS_OR_EMERGENCY" ||
    category === "SELF_HARM_OR_SUICIDE"
  ) {
    parts.unshift(
      "If you are in immediate danger, please seek urgent local emergency help.",
    );
  }
  return parts.join(" ");
}

function buildGapResponse(input: {
  topic: string;
  category: SafetyCategory;
  conversationId: string;
  question: string;
  intent: AskIntent;
  confidence: RelevanceConfidence;
  domain?: DomainIntent;
  secondary?: DomainIntent;
  relevanceScore?: number;
  generic?: boolean;
}): AskAiResponse {
  return {
    answer: input.generic
      ? GENERIC_FALLBACK_ANSWER
      : composeKnowledgeGapAnswer({
          topic: input.topic,
          suggestCounselling: input.category === "PERSONAL_MENTAL_HEALTH",
        }),
    category: input.category,
    sources: [],
    related_questions: [],
    safety_notice: safetyNoticeFor(input.category, "en"),
    conversation_id: input.conversationId,
    show_support_cta: shouldShowSupportCta(input.category),
    intent: input.intent,
    topic: input.topic,
    quality: { status: "KNOWLEDGE_GAP", confidence: input.confidence },
    domain_intent: input.domain,
    secondary_intent: input.secondary,
    relevance_score: input.relevanceScore ?? 0,
  };
}

export async function runAskPipeline(
  input: unknown,
  requestId: string,
  dependencies: AskPipelineDependencies = {},
): Promise<AskPipelineResult> {
  const started = Date.now();
  const validation = validateAskRequest(input);
  if (!validation.ok) {
    const status = validation.error.code === "QUESTION_TOO_LONG" ? 413 : 400;
    logStructured("INFO", {
      requestId,
      operation: "ai_ask",
      errorType: validation.error.code,
      safetyCategory: null,
      retrievalCount: 0,
    });
    return {
      ok: false,
      status,
      error: validation.error,
    };
  }

  const request = validation.value as AskAiRequest;
  const language = resolveLanguage(request.language);
  const question = stripObviousPii(request.question);
  const conversationId = request.conversation_id ?? createConversationId();
  const history = request.conversation_id
    ? getConversation(request.conversation_id)
    : [];
  const priorTopic = request.conversation_id
    ? getConversationTopic(request.conversation_id)
    : undefined;
  const priorDomain = request.conversation_id
    ? getConversationDomain(request.conversation_id)
    : undefined;
  const rewrittenQuery = rewriteQuery(question, history);

  const safety = (dependencies.safety ?? safetyService).classify(question);
  const category = safety.category;
  const classification = classifyQuestion({
    question,
    safetyCategory: category,
    priorTopic,
    priorDomain,
  });
  const intent = classification.question_type;
  const topic = classification.topic;
  const domain = classification.domain;
  const queryTokens = contentTokens(rewrittenQuery);

  const canned = CANNED[category];
  if (canned) {
    const response: AskAiResponse = {
      answer: canned,
      category,
      sources: [],
      related_questions:
        category === "OUT_OF_SCOPE" || category === "PROMPT_INJECTION"
          ? [
              "How does counselling work?",
              "How are anxiety concerns explored?",
              "What happens in the first counselling session?",
            ]
          : [],
      safety_notice: safetyNoticeFor(category, language),
      conversation_id: conversationId,
      show_support_cta: shouldShowSupportCta(category),
      intent,
      topic,
      quality: { status: "SAFETY_REDIRECT", confidence: "HIGH_CONFIDENCE" },
      domain_intent: domain,
      secondary_intent: classification.secondary,
      relevance_score: 100,
    };
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, 0, dependencies.provider?.name);
    return { ok: true, response, status: 200 };
  }

  if (domain === "ambiguous") {
    const response: AskAiResponse = {
      answer: AMBIGUOUS_ANSWER,
      category,
      sources: [],
      related_questions: [
        "How does counselling work?",
        "How are anxiety concerns explored?",
        "What happens in the first counselling session?",
      ],
      safety_notice: safetyNoticeFor(category, language),
      conversation_id: conversationId,
      show_support_cta: shouldShowSupportCta(category),
      intent,
      topic,
      quality: { status: "KNOWLEDGE_GAP", confidence: "LOW_CONFIDENCE" },
      domain_intent: domain,
      secondary_intent: classification.secondary,
      relevance_score: 80,
    };
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, 0, "ambiguous");
    return { ok: true, response, status: 200 };
  }

  const cacheable = category === "SAFE_EDUCATIONAL" && history.length === 0;
  const cacheKey = educationalCacheKey(question, language);
  if (cacheable) {
    const cached = getCachedEducationalAnswer(cacheKey);
    if (cached) {
      const response = { ...cached, conversation_id: conversationId };
      rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
      rememberTurn(conversationId, { role: "assistant", text: response.answer });
      logAsk(requestId, started, category, 0, "cache");
      return { ok: true, response, status: 200 };
    }
  }

  if (shouldBypassPsychologyRetrieval(question)) {
    const response = buildGapResponse({
      topic,
      category,
      conversationId,
      question,
      intent,
      confidence: "NO_MATCH",
      domain: "outside_scope",
      secondary: classification.secondary,
    });
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, "outside_scope");
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, 0, "query-boundary");
    return { ok: true, response, status: 200 };
  }

  const retrieval = dependencies.retrieval ?? retrievalService;
  let candidates: RetrievedChunk[] = [];
  const allowCaseStudies = classification.allow_case_studies;
  const allowedTopics = shouldHardFilterTopics(domain)
    ? topicsForDomain(domain)
    : undefined;
  try {
    const retrieveInput = {
      text: rewrittenQuery,
      language: "en" as const,
      preferredCorpora: preferredCorpora(category, allowCaseStudies),
      excludeCorpora: allowCaseStudies ? undefined : (["CASE_STUDY_KNOWLEDGE"] as const),
      allowedTopics,
      excludedTopics: excludedTopicsFor(domain),
      topic,
      topicTerms: expandTopicTerms(topic),
      limit: category === "DR_VANDANA_SPECIFIC" ? 12 : 8,
    };
    if (category === "DR_VANDANA_SPECIFIC") {
      retrieveInput.topic = "counselling-approach";
      retrieveInput.topicTerms = expandTopicTerms("counselling-approach");
    }
    candidates = await retrieval.retrieve(retrieveInput);
  } catch {
    logStructured("ERROR", {
      requestId,
      operation: "ai_ask",
      errorType: "retrieval_failure",
      safetyCategory: category,
    });
  }

  if (category === "DR_VANDANA_SPECIFIC") {
    candidates = candidates.filter(
      (chunk) =>
        chunk.corpus === "DR_VANDANA_KNOWLEDGE" ||
        chunk.corpus === "SAFETY_AND_ETHICS_RULES",
    );
  } else {
    candidates = lockChunksToDomain(candidates, domain, allowCaseStudies);
  }

  let gated;
  if (category === "DR_VANDANA_SPECIFIC") {
    const vandana = candidates
      .filter((chunk) => chunk.corpus === "DR_VANDANA_KNOWLEDGE")
      .sort((left, right) => right.score - left.score);
    const approach =
      vandana.find((chunk) => chunk.topic === "counselling-approach") ??
      vandana[0];
    gated =
      approach
        ? {
            primary: approach,
            secondary: vandana.filter((chunk) => chunk.id !== approach.id).slice(0, 1),
            usable: vandana.slice(0, 2),
            confidence: "HIGH_CONFIDENCE" as const,
          }
        : {
            primary: null,
            secondary: [],
            usable: [],
            confidence: "NO_MATCH" as const,
          };
  } else {
    gated = applyRelevanceGate(candidates, {
      question,
      queryTokens,
      topic,
      intent,
      requireTopicMatch: topic === "general-education" && domain === "general_psychology",
    });
    if (topic === "general-education") {
      const primary = gated.primary;
      if (
        !primary ||
        (primary.relevance?.confidence !== "HIGH_CONFIDENCE" &&
          (primary.relevance?.topicMatch ?? 0) < 0.35)
      ) {
        gated = {
          primary: null,
          secondary: [],
          usable: [],
          confidence: "NO_MATCH",
        };
      }
    }
  }

  logAskAiDebug({
    question,
    intent,
    topic,
    domain,
    normalizedQuery: rewrittenQuery,
    candidateDocuments: candidates.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      score: chunk.score,
      confidence: chunk.relevance?.confidence,
    })),
    relevanceDecision: gated.confidence,
    selectedDocuments: gated.usable.map((chunk) => chunk.id),
  });

  if (
    (gated.confidence === "NO_MATCH" || !gated.primary) &&
    candidates.length > 0 &&
    shouldHardFilterTopics(domain)
  ) {
    gated = {
      primary: candidates[0] ?? null,
      secondary: candidates.slice(1, 2),
      usable: candidates.slice(0, 2),
      confidence: "MEDIUM_CONFIDENCE",
    };
  }

  if (gated.confidence === "NO_MATCH" || !gated.primary) {
    const response = buildGapResponse({
      topic,
      category,
      conversationId,
      question,
      intent,
      confidence: "NO_MATCH",
      domain,
      secondary: classification.secondary,
    });
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, 0, "knowledge-gap");
    return { ok: true, response, status: 200 };
  }

  const selectedChunks = [gated.primary, ...gated.secondary];
  const provider = dependencies.provider ?? createAiProvider();
  let answer: string;

  try {
    answer = await provider.generateResponse({
      question,
      rewrittenQuery,
      category,
      retrieved: selectedChunks,
      language,
      intent,
      topic,
      domainIntent: domain,
    });
  } catch {
    logStructured("ERROR", {
      requestId,
      operation: "ai_ask",
      errorType: "ai_provider_failure",
      safetyCategory: category,
      model: provider.name,
    });
    answer = composeControlledAnswer({
      question,
      intent,
      topic,
      category,
      primary: gated.primary,
      secondary: gated.secondary,
      domainIntent: domain,
    });
  }

  let validationResult = validateAnswer({
    question,
    answer,
    intent,
    topic,
    chunks: selectedChunks,
    confidence: gated.confidence,
  });
  let relevance = scoreAnswerRelevance({
    question,
    answer,
    domain,
    topic,
    chunks: selectedChunks,
  });

  if (validationResult.status === "REGENERATE" || !relevance.pass) {
    answer = composeControlledAnswer({
      question,
      intent,
      topic,
      category,
      primary: gated.primary,
      secondary: gated.secondary,
      domainIntent: domain,
    });
    validationResult = validateAnswer({
      question,
      answer,
      intent,
      topic,
      chunks: selectedChunks,
      confidence: gated.confidence,
    });
    relevance = scoreAnswerRelevance({
      question,
      answer,
      domain,
      topic,
      chunks: selectedChunks,
    });
  }

  if (
    validationResult.status === "REGENERATE" ||
    validationResult.status === "KNOWLEDGE_GAP" ||
    !relevance.pass
  ) {
    const response = buildGapResponse({
      topic,
      category,
      conversationId,
      question,
      intent,
      confidence: gated.confidence,
      domain,
      secondary: classification.secondary,
      relevanceScore: relevance.score,
      generic: true,
    });
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, selectedChunks.length, "validation-gap");
    return { ok: true, response, status: 200 };
  }

  if (
    category === "DR_VANDANA_SPECIFIC" &&
    !selectedChunks.some((chunk) => chunk.corpus === "DR_VANDANA_KNOWLEDGE") &&
    !answer.includes(INSUFFICIENT_VANDANA_METHODOLOGY)
  ) {
    answer = [
      "### Short Answer",
      INSUFFICIENT_VANDANA_METHODOLOGY,
      "### When Professional Support May Help",
      "You are welcome to contact the practice if you would like to ask Dr. Vandana directly.",
    ].join("\n\n");
  }

  const usedSources = toPublicSources(extractUsedSources(selectedChunks));
  answer = postProcessAnswer(
    answer,
    usedSources.map((source) => source.title),
  );

  const response: AskAiResponse = {
    answer,
    category,
    sources: usedSources,
    related_questions: extractRelatedQuestionsV2(answer, selectedChunks, topic),
    safety_notice: safetyNoticeFor(category, language),
    conversation_id: conversationId,
    show_support_cta: shouldShowSupportCta(category),
    case_study_slug: allowCaseStudies
      ? extractCaseStudySlug(selectedChunks)
      : undefined,
    intent,
    topic,
    quality: {
      status: validationResult.status,
      confidence: gated.confidence,
    },
    domain_intent: domain,
    secondary_intent: classification.secondary,
    relevance_score: relevance.score,
  };

  rememberTurn(conversationId, { role: "user", text: question }, undefined, topic, domain);
  rememberTurn(conversationId, { role: "assistant", text: response.answer });

  if (cacheable) {
    setCachedEducationalAnswer(cacheKey, response);
  }

  logAskAiDebug({
    provider: provider.name,
    validation: validationResult.status,
    confidence: gated.confidence,
  });

  logAsk(
    requestId,
    started,
    category,
    selectedChunks.length,
    provider.name,
  );

  return { ok: true, response, status: 200 };
}

function logAsk(
  requestId: string,
  started: number,
  safetyCategory: SafetyCategory,
  retrievalCount: number,
  model = "unknown",
): void {
  logStructured("INFO", {
    requestId,
    timestamp: new Date().toISOString(),
    operation: "ai_ask",
    responseTimeMs: Date.now() - started,
    model,
    retrievalCount,
    safetyCategory,
  });
}

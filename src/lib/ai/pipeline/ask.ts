import {
  composeControlledAnswer,
  extractRelatedQuestionsV2,
  extractUsedSources,
} from "@/lib/ai/answers/controlled-composer";
import { composeKnowledgeGapAnswer } from "@/lib/ai/answers/knowledge-gap";
import {
  createConversationId,
  getConversation,
  getConversationTopic,
  rememberTurn,
  rewriteQuery,
} from "@/lib/ai/conversation/memory";
import { expandTopicTerms } from "@/lib/ai/intent/synonyms";
import { detectIntent } from "@/lib/ai/intent/detector";
import { extractTopic } from "@/lib/ai/intent/topic";
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
  CONFIDENTIALITY_ANSWER,
  CRISIS_ANSWER,
  DIAGNOSTIC_ANSWER,
  EDUCATIONAL_DISCLAIMER,
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
import { logStructured } from "@/lib/observability/logger";
import type {
  AskAiRequest,
  AskAiResponse,
  AskIntent,
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

function preferredCorpora(category: SafetyCategory): KnowledgeCorpus[] {
  if (category === "DR_VANDANA_SPECIFIC") {
    return ["DR_VANDANA_KNOWLEDGE", "SAFETY_AND_ETHICS_RULES"];
  }
  if (category === "CONFIDENTIALITY_REQUEST") {
    return ["SAFETY_AND_ETHICS_RULES", "DR_VANDANA_KNOWLEDGE"];
  }
  return [
    "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
    "CASE_STUDY_KNOWLEDGE",
    "SAFETY_AND_ETHICS_RULES",
  ];
}

function toPublicSources(
  sources: Array<{ title: string; attribution: string }>,
): PublicKnowledgeSource[] {
  return sources.map((source) => ({
    title: source.title,
    attribution: source.attribution,
  }));
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
}): AskAiResponse {
  return {
    answer: composeKnowledgeGapAnswer({
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
  const rewrittenQuery = rewriteQuery(question, history);

  const safety = (dependencies.safety ?? safetyService).classify(question);
  const category = safety.category;
  const intentResolution = detectIntent(question, category);
  const intent = intentResolution.intent;
  const topicResolution = extractTopic(
    question,
    priorTopic,
    category === "DR_VANDANA_SPECIFIC"
      ? { forceTopic: "counselling-approach" }
      : undefined,
  );
  const topic = topicResolution.topic;
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
    };
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic);
    rememberTurn(conversationId, { role: "assistant", text: response.answer });
    logAsk(requestId, started, category, 0, dependencies.provider?.name);
    return { ok: true, response, status: 200 };
  }

  const cacheable = category === "SAFE_EDUCATIONAL" && history.length === 0;
  const cacheKey = educationalCacheKey(question, language);
  if (cacheable) {
    const cached = getCachedEducationalAnswer(cacheKey);
    if (cached) {
      const response = { ...cached, conversation_id: conversationId };
      rememberTurn(conversationId, { role: "user", text: question }, undefined, topic);
      rememberTurn(conversationId, { role: "assistant", text: response.answer });
      logAsk(requestId, started, category, 0, "cache");
      return { ok: true, response, status: 200 };
    }
  }

  const retrieval = dependencies.retrieval ?? retrievalService;
  let candidates: RetrievedChunk[] = [];
  try {
    const retrieveInput = {
      text: rewrittenQuery,
      language: "en" as const,
      preferredCorpora: preferredCorpora(category),
      topic,
      topicTerms: topicResolution.terms,
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
      requireTopicMatch: topic === "general-education",
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

  if (gated.confidence === "NO_MATCH" || !gated.primary) {
    const response = buildGapResponse({
      topic,
      category,
      conversationId,
      question,
      intent,
      confidence: "NO_MATCH",
    });
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic);
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

  if (validationResult.status === "REGENERATE") {
    answer = composeControlledAnswer({
      question,
      intent,
      topic,
      category,
      primary: gated.primary,
      secondary: gated.secondary,
    });
    validationResult = validateAnswer({
      question,
      answer,
      intent,
      topic,
      chunks: selectedChunks,
      confidence: gated.confidence,
    });
  }

  if (
    validationResult.status === "REGENERATE" ||
    validationResult.status === "KNOWLEDGE_GAP"
  ) {
    const response = buildGapResponse({
      topic,
      category,
      conversationId,
      question,
      intent,
      confidence: gated.confidence,
    });
    rememberTurn(conversationId, { role: "user", text: question }, undefined, topic);
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
    case_study_slug: extractCaseStudySlug(selectedChunks),
    intent,
    topic,
    quality: {
      status: validationResult.status,
      confidence: gated.confidence,
    },
  };

  rememberTurn(conversationId, { role: "user", text: question }, undefined, topic);
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

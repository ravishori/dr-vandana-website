import {
  getCachedEducationalAnswer,
  educationalCacheKey,
  setCachedEducationalAnswer,
} from "@/lib/ai/pipeline/cache";
import { validateAskRequest, resolveLanguage } from "@/lib/ai/pipeline/validate";
import {
  createConversationId,
  getConversation,
  rememberTurn,
  rewriteQuery,
} from "@/lib/ai/conversation/memory";
import { createAiProvider, type AIProvider } from "@/lib/ai/providers";
import {
  composeEducationalAnswer,
  extractCaseStudySlug,
  extractRelatedQuestions,
  shouldShowSupportCta,
} from "@/lib/ai/providers/educational-fallback";
import {
  filterRelevantChunks,
  retrievalService,
  type RetrievalService,
} from "@/lib/ai/retrieval/service";
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
import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import { logStructured } from "@/lib/observability/logger";
import type {
  AskAiRequest,
  AskAiResponse,
  KnowledgeCorpus,
  PublicKnowledgeSource,
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
    "DR_VANDANA_KNOWLEDGE",
    "SAFETY_AND_ETHICS_RULES",
  ];
}

function toPublicSources(
  retrieved: readonly RetrievedChunk[],
): PublicKnowledgeSource[] {
  const sources: PublicKnowledgeSource[] = [];
  for (const chunk of retrieved) {
    const attribution = chunk.source;
    if (sources.some((item) => item.attribution === attribution)) {
      continue;
    }
    sources.push({
      title: chunk.title,
      attribution,
    });
  }
  return sources.slice(0, 4);
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
  const rewrittenQuery = rewriteQuery(question, history);

  const safety = (dependencies.safety ?? safetyService).classify(question);
  const category = safety.category;

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
    };
    rememberTurn(conversationId, { role: "user", text: question });
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
      rememberTurn(conversationId, { role: "user", text: question });
      rememberTurn(conversationId, { role: "assistant", text: response.answer });
      logAsk(requestId, started, category, 0, "cache");
      return { ok: true, response, status: 200 };
    }
  }

  const retrieval = dependencies.retrieval ?? retrievalService;
  let retrieved: RetrievedChunk[] = [];
  try {
    retrieved = filterRelevantChunks(
      await retrieval.retrieve({
        text: rewrittenQuery,
        language: "en",
        preferredCorpora: preferredCorpora(category),
      }),
    );
  } catch {
    logStructured("ERROR", {
      requestId,
      operation: "ai_ask",
      errorType: "retrieval_failure",
      safetyCategory: category,
    });
  }

  if (category === "DR_VANDANA_SPECIFIC") {
    retrieved = retrieved.filter(
      (chunk) =>
        chunk.corpus === "DR_VANDANA_KNOWLEDGE" ||
        chunk.corpus === "SAFETY_AND_ETHICS_RULES",
    );
  }

  const provider = dependencies.provider ?? createAiProvider();
  let answer: string;
  try {
    answer = await provider.generateResponse({
      question,
      rewrittenQuery,
      category,
      retrieved,
      language,
    });
  } catch {
    logStructured("ERROR", {
      requestId,
      operation: "ai_ask",
      errorType: "ai_provider_failure",
      safetyCategory: category,
      model: provider.name,
    });
    answer = composeEducationalAnswer({
      question,
      rewrittenQuery,
      category,
      retrieved,
      language,
    });
  }

  if (
    category === "DR_VANDANA_SPECIFIC" &&
    !retrieved.some((chunk) => chunk.corpus === "DR_VANDANA_KNOWLEDGE") &&
    !answer.includes(INSUFFICIENT_VANDANA_METHODOLOGY)
  ) {
    answer = [
      "### Short Answer",
      INSUFFICIENT_VANDANA_METHODOLOGY,
      "### When Professional Support May Help",
      "You are welcome to contact the practice if you would like to ask Dr. Vandana directly.",
    ].join("\n\n");
  }

  const sources = toPublicSources(
    retrieved.filter((chunk) => chunk.corpus !== "SAFETY_AND_ETHICS_RULES"),
  );
  answer = postProcessAnswer(
    answer,
    sources.map((source) => source.title),
  );

  const response: AskAiResponse = {
    answer,
    category,
    sources,
    related_questions: extractRelatedQuestions(answer, retrieved),
    safety_notice: safetyNoticeFor(category, language),
    conversation_id: conversationId,
    show_support_cta: shouldShowSupportCta(category),
    case_study_slug: extractCaseStudySlug(retrieved),
  };

  rememberTurn(conversationId, { role: "user", text: question });
  rememberTurn(conversationId, { role: "assistant", text: response.answer });

  if (cacheable) {
    setCachedEducationalAnswer(cacheKey, response);
  }

  logAsk(
    requestId,
    started,
    category,
    retrieved.length,
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

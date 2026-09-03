import { detectIntent } from "@/lib/ai/intent/detector";
import {
  classifyDomain,
  defaultTopicForDomain,
  type DomainContext,
  userAskedForCaseStudy,
} from "@/lib/ai/intent/domain";
import { extractTopic } from "@/lib/ai/intent/topic";
import type {
  DomainIntent,
  IntentClassification,
  SafetyCategory,
} from "@/types/ai";

export function classifyQuestion(input: {
  question: string;
  safetyCategory: SafetyCategory;
  priorTopic?: string;
  priorDomain?: DomainIntent;
}): IntentClassification {
  const context: DomainContext = {
    priorDomain: input.priorDomain,
    priorTopic: input.priorTopic,
  };
  const domainResolution = classifyDomain(
    input.question,
    input.safetyCategory,
    context,
  );
  const questionType = detectIntent(input.question, input.safetyCategory);
  const topicResolution = extractTopic(
    input.question,
    input.priorTopic,
    input.safetyCategory === "DR_VANDANA_SPECIFIC"
      ? { forceTopic: "counselling-approach" }
      : undefined,
  );

  let topic = topicResolution.topic;
  if (
    topic === "general-education" &&
    domainResolution.domain !== "general_psychology" &&
    domainResolution.domain !== "outside_scope" &&
    domainResolution.domain !== "ambiguous"
  ) {
    topic = defaultTopicForDomain(domainResolution.domain, topic);
  }

  return {
    domain: domainResolution.domain,
    secondary: domainResolution.secondary,
    question_type: questionType.intent,
    topic,
    confidence: domainResolution.confidence,
    reasons: [...domainResolution.reasons, ...questionType.intent ? [`question-type:${questionType.intent}`] : []],
    allow_case_studies: userAskedForCaseStudy(input.question),
  };
}

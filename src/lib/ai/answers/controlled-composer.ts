import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import { mentionsNamedTherapy } from "@/lib/ai/safety/classifier";
import { composeKnowledgeGapAnswer, KNOWLEDGE_GAP_OPENING } from "@/lib/ai/answers/knowledge-gap";
import {
  bullet,
  cautionLines,
  exampleLines,
  extractSentences,
  firstParagraph,
  planAnswerStructure,
  practicalLines,
} from "@/lib/ai/answers/planner";
import { formatPublicSourceAttribution } from "@/lib/ai/knowledge/library/attribution";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import { isCounsellingTopic } from "@/lib/ai/relevance/gate";
import type { AIProvider, GenerateResponseInput } from "@/lib/ai/providers/types";
import type {
  AskIntent,
  DomainIntent,
  PublicKnowledgeSource,
  RetrievedChunk,
  SafetyCategory,
} from "@/types/ai";

function composeVandanaAnswer(input: {
  question: string;
  primary: RetrievedChunk;
  secondary?: readonly RetrievedChunk[];
}): string {
  const asksNamedMethod =
    mentionsNamedTherapy(input.question) ||
    /what (therapy|technique|model) does/i.test(input.question);

  if (asksNamedMethod) {
    return [
      "### Short Answer",
      INSUFFICIENT_VANDANA_METHODOLOGY,
      "### Important Note",
      "Named therapy models are not listed in the approved knowledge base unless they appear in verified practice material.",
      "### When Professional Support May Help",
      "For questions about working with Dr. Vandana directly, you can use the contact or appointment pages on this website.",
    ].join("\n\n");
  }

  const approachChunk =
    [input.primary, ...(input.secondary ?? [])].find(
      (chunk) => chunk.topic === "counselling-approach",
    ) ?? input.primary;
  const chunks = [approachChunk, ...(input.secondary ?? [])];
  const points = practicalLines(chunks);
  return [
    "### Short Answer",
    extractSentences(approachChunk.content, 2),
    "### What It Means",
    bullet(
      points.length > 0
        ? points.slice(0, 4)
        : approachChunk.content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 40)
            .slice(0, 4),
    ),
    "### Important Note",
    "Only verified public information is used. Details that are not in the approved knowledge base are not inferred.",
    "### When Professional Support May Help",
    "If you would like to discuss your own situation, a consultation is more appropriate than this educational chat.",
  ].join("\n\n");
}

function counsellingGuard(
  topic: string,
  chunks: readonly RetrievedChunk[],
): boolean {
  if (isCounsellingTopic(topic)) {
    return true;
  }
  return chunks.some(
    (chunk) =>
      chunk.topic === "first-session" ||
      chunk.topic === "how-counselling-works",
  );
}

function buildSectionContent(
  section: ReturnType<typeof planAnswerStructure>["sections"][number],
  input: {
    intent: AskIntent;
    topic: string;
    primary: RetrievedChunk;
    secondary: readonly RetrievedChunk[];
    category: SafetyCategory;
  },
): string {
  const all = [input.primary, ...input.secondary];
  const personalPrefix =
    input.category === "PERSONAL_MENTAL_HEALTH"
      ? "I can share general educational information, but I cannot assess your personal situation or offer a diagnosis.\n\n"
      : "";

  switch (section) {
    case "shortAnswer":
      if (input.intent === "HOW_TO" || input.intent === "SELF_HELP") {
        const steps = practicalLines(all);
        if (steps.length > 0) {
          return `${personalPrefix}${steps[0]}`;
        }
      }
      return `${personalPrefix}${firstParagraph(input.primary.content)}`;
    case "whatItMeans":
      return extractSentences(input.primary.content, 3);
    case "practicalSteps":
      return bullet(practicalLines(all));
    case "howToPractise":
      return extractSentences(input.primary.content, 2);
    case "stepByStep":
      return bullet(practicalLines(all));
    case "keyDifferences":
      return input.primary.content
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 30)
        .slice(0, 4)
        .map((part) => `- ${part}`)
        .join("\n");
    case "potentialBenefits":
      return bullet(
        input.primary.content
          .split(/(?<=[.?!])\s+/)
          .map((part) => part.trim())
          .filter((part) => /may|can|help|support|benefit/i.test(part))
          .slice(0, 4),
      );
    case "example": {
      const examples = exampleLines(all);
      return examples[0] ?? extractSentences(input.primary.content, 1);
    }
    case "importantNote": {
      if (input.primary.corpus === "CASE_STUDY_KNOWLEDGE") {
        return "This explanation uses an educational scenario. It is not a real patient record and does not mean Dr. Vandana treated this person.";
      }
      const cautions = cautionLines(all);
      if (cautions.length > 0) {
        return bullet(cautions);
      }
      return "This is general psychological education, not a personal treatment plan or guarantee of outcomes.";
    }
    case "whenHelp":
      return "If the concern is persistent, confusing, or affecting daily life, a consultation with a qualified mental-health professional may help.";
    default:
      return "";
  }
}

export function composeControlledAnswer(input: {
  question: string;
  intent: AskIntent;
  topic: string;
  category: SafetyCategory;
  primary: RetrievedChunk | null;
  secondary?: readonly RetrievedChunk[];
  domainIntent?: DomainIntent;
}): string {
  const domain = input.domainIntent;
  const askedForCaseStudy = /\bcase study\b/i.test(input.question);
  if (
    input.primary &&
    input.primary.corpus === "CASE_STUDY_KNOWLEDGE" &&
    !askedForCaseStudy
  ) {
    return composeKnowledgeGapAnswer({
      topic: input.topic,
      suggestCounselling: input.category === "PERSONAL_MENTAL_HEALTH",
    });
  }
  if (
    input.primary &&
    domain &&
    domain !== "grief" &&
    (input.primary.topic === "grief" || input.primary.topic === "grief-after-loss")
  ) {
    return composeKnowledgeGapAnswer({
      topic: input.topic,
      suggestCounselling: input.category === "PERSONAL_MENTAL_HEALTH",
    });
  }
  if (!input.primary) {
    return composeKnowledgeGapAnswer({
      topic: input.topic,
      suggestCounselling: input.category === "PERSONAL_MENTAL_HEALTH",
    });
  }

  if (input.category === "DR_VANDANA_SPECIFIC") {
    return composeVandanaAnswer({
      question: input.question,
      primary: input.primary,
      secondary: input.secondary,
    });
  }

  const secondary = input.secondary ?? [];
  if (
    !counsellingGuard(input.topic, [input.primary, ...secondary]) &&
    (input.primary.topic === "first-session" ||
      input.primary.topic === "how-counselling-works")
  ) {
    return composeKnowledgeGapAnswer({ topic: input.topic });
  }

  const plan = planAnswerStructure(input.intent);
  const blocks: string[] = [];

  for (const section of plan.sections) {
    const heading = plan.headings[section];
    const body = buildSectionContent(section, {
      intent: input.intent,
      topic: input.topic,
      primary: input.primary,
      secondary,
      category: input.category,
    }).trim();
    if (!heading || !body) {
      continue;
    }
    blocks.push(`### ${heading}\n\n${body}`);
  }

  const related = topicRelatedQuestions(input.primary, secondary, input.topic);
  if (related.length > 0) {
    blocks.push(`### Related Topics\n${bullet(related)}`);
  }

  return blocks.join("\n\n");
}

function topicRelatedQuestions(
  primary: RetrievedChunk,
  secondary: readonly RetrievedChunk[],
  topic: string,
): string[] {
  const questions: string[] = [];
  for (const chunk of [primary, ...secondary]) {
    if (chunk.topic !== primary.topic && chunk.topic !== topic) {
      continue;
    }
    for (const question of chunk.related_questions) {
      if (!questions.includes(question)) {
        questions.push(question);
      }
    }
  }
  return questions.slice(0, 4);
}

export class ControlledAnswerProvider implements AIProvider {
  readonly name = "controlled-answer";

  async generateResponse(input: GenerateResponseInput): Promise<string> {
    const primary = input.retrieved[0] ?? null;
    const secondary = input.retrieved.slice(1);
    return composeControlledAnswer({
      question: input.question,
      intent: input.intent ?? "GENERAL_EDUCATION",
      topic: input.topic ?? "general-education",
      category: input.category,
      primary,
      secondary,
      domainIntent: input.domainIntent,
    });
  }
}

export function extractUsedSources(
  chunks: readonly RetrievedChunk[],
): PublicKnowledgeSource[] {
  const sources: PublicKnowledgeSource[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.corpus === "SAFETY_AND_ETHICS_RULES") {
      continue;
    }

    const document = knowledgeRepository.getById(chunk.id);
    const formatted = document
      ? formatPublicSourceAttribution(document)
      : {
          title: chunk.title,
          attribution: chunk.source,
        };

    const dedupeKey = document?.id ?? formatted.attribution;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    sources.push(formatted);
  }

  return sources.slice(0, 4);
}

export function extractRelatedQuestionsV2(
  answer: string,
  chunks: readonly RetrievedChunk[],
  topic: string,
): string[] {
  const fromDocs: string[] = [];
  for (const chunk of chunks) {
    if (chunk.topic !== topic && chunk.topic !== chunks[0]?.topic) {
      continue;
    }
    for (const question of chunk.related_questions) {
      if (!fromDocs.includes(question)) {
        fromDocs.push(question);
      }
    }
  }

  const fromAnswer: string[] = [];
  const relatedSection = answer.split(/### Related Topics/i)[1];
  if (relatedSection) {
    for (const line of relatedSection.split("\n")) {
      const cleaned = line.replace(/^[-*]\s*/, "").trim();
      if (cleaned.length > 8 && cleaned.endsWith("?")) {
        fromAnswer.push(cleaned);
      }
    }
  }

  return [...fromAnswer, ...fromDocs]
    .filter((question, index, all) => all.indexOf(question) === index)
    .slice(0, 4);
}

export function answerLooksLikeKnowledgeGap(answer: string): boolean {
  return answer.includes(KNOWLEDGE_GAP_OPENING);
}

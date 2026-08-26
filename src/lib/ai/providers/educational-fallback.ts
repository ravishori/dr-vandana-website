import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import { mentionsNamedTherapy } from "@/lib/ai/safety/classifier";
import type { AIProvider, GenerateResponseInput } from "@/lib/ai/providers/types";
import type { RetrievedChunk, SafetyCategory } from "@/types/ai";

function vandanaChunks(retrieved: readonly RetrievedChunk[]): RetrievedChunk[] {
  return retrieved.filter((chunk) => chunk.corpus === "DR_VANDANA_KNOWLEDGE");
}

function educationalChunks(retrieved: readonly RetrievedChunk[]): RetrievedChunk[] {
  return retrieved.filter(
    (chunk) =>
      chunk.corpus === "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE" ||
      chunk.corpus === "CASE_STUDY_KNOWLEDGE",
  );
}

function bullet(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

function firstSentences(content: string, count = 2): string {
  const sentences = content
    .split(/(?<=[.?!])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return sentences.slice(0, count).join(" ");
}

function relatedFrom(retrieved: readonly RetrievedChunk[]): string[] {
  const questions: string[] = [];
  for (const chunk of retrieved) {
    for (const question of chunk.related_questions) {
      if (!questions.includes(question)) {
        questions.push(question);
      }
      if (questions.length >= 4) {
        return questions;
      }
    }
  }
  return questions;
}

export function composeEducationalAnswer(input: GenerateResponseInput): string {
  const { question, category, retrieved } = input;

  if (category === "DR_VANDANA_SPECIFIC") {
    const vandana = vandanaChunks(retrieved);
    const asksNamedMethod =
      mentionsNamedTherapy(question) ||
      /what (therapy|technique|model) does/i.test(question);

    if (vandana.length === 0 || asksNamedMethod) {
      const namedMissing = asksNamedMethod
        ? `${INSUFFICIENT_VANDANA_METHODOLOGY}\n\nI can share only the verified public description of her professional approach: compassionate, confidential, evidence-informed counselling that emphasises listening, respect and individualized support. Named therapy models are not listed in the approved knowledge base.`
        : INSUFFICIENT_VANDANA_METHODOLOGY;

      if (vandana.length === 0) {
        return [
          "### Short Answer",
          namedMissing,
          "### When Professional Support May Help",
          "For questions about working with Dr. Vandana directly, you can use the contact or appointment pages on this website.",
        ].join("\n\n");
      }
    }

    const profile = vandana.map((chunk) => firstSentences(chunk.content, 3));
    return [
      "### Short Answer",
      asksNamedMethod
        ? INSUFFICIENT_VANDANA_METHODOLOGY
        : "Approved practice material describes Dr. Vandana's work as compassionate, confidential and evidence-informed psychological support — not a named therapy brand.",
      "### How It May Be Approached",
      bullet(
        vandana.flatMap((chunk) =>
          chunk.content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 40)
            .slice(0, 3),
        ).slice(0, 5),
      ),
      "### What This Means for You",
      profile[0] ??
        "Only verified public information is used. Details that are not in the approved knowledge base are not inferred.",
      "### When Professional Support May Help",
      "If you would like to discuss your own situation, a consultation is more appropriate than this educational chat.",
      relatedBlock(relatedFrom(vandana)),
    ].join("\n\n");
  }

  const useful = educationalChunks(retrieved);
  const primary = useful[0] ?? retrieved[0];

  if (!primary) {
    return [
      "### Short Answer",
      "I can help with educational questions about psychology, counselling and emotional well-being. I don't have an approved article that matches this question closely enough to go further.",
      "### When Professional Support May Help",
      "If this is a personal concern, speaking with a qualified professional is a better next step than relying on chat.",
    ].join("\n\n");
  }

  const approachPoints = useful
    .flatMap((chunk) =>
      chunk.content
        .split("\n")
        .map((line) => line.replace(/^[\d.]+ /, "").trim())
        .filter((line) => line.length > 50),
    )
    .slice(0, 4);

  const personalPrefix =
    category === "PERSONAL_MENTAL_HEALTH"
      ? "I can share general information, but I cannot assess your personal situation or offer a diagnosis.\n\n"
      : "";

  const caseNote = useful.some((chunk) => chunk.corpus === "CASE_STUDY_KNOWLEDGE")
    ? "This explanation uses an educational scenario. It is not a real patient record and does not mean Dr. Vandana treated this person."
    : "This is general psychological education, not a personal treatment plan.";

  return [
    "### Short Answer",
    `${personalPrefix}${firstSentences(primary.content, 2)}`,
    "### How It May Be Approached",
    approachPoints.length > 0
      ? bullet(approachPoints)
      : bullet([
          "A psychologist may start by understanding the presenting concern.",
          "An assessment may explore history, context, coping and safety.",
          "Depending on the individual situation, next steps may include counselling, practical coping ideas, or referral.",
        ]),
    "### What This Means for You",
    caseNote,
    "### When Professional Support May Help",
    "If the concern is persistent, confusing, or affecting daily life, a consultation with a qualified mental-health professional may help.",
    relatedBlock(relatedFrom(useful.length > 0 ? useful : retrieved)),
  ].join("\n\n");
}

function relatedBlock(questions: readonly string[]): string {
  if (questions.length === 0) {
    return [
      "### Related Topics",
      "- How does counselling work?",
      "- When should someone seek professional support?",
    ].join("\n");
  }
  return `### Related Topics\n${bullet(questions.slice(0, 4))}`;
}

export class EducationalFallbackProvider implements AIProvider {
  readonly name = "educational-fallback";

  async generateResponse(input: GenerateResponseInput): Promise<string> {
    return composeEducationalAnswer(input);
  }
}

export function extractRelatedQuestions(
  answer: string,
  retrieved: readonly RetrievedChunk[],
): string[] {
  const fromDocs: string[] = [];
  for (const chunk of retrieved) {
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

  return [...fromAnswer, ...fromDocs].filter(
    (question, index, all) => all.indexOf(question) === index,
  ).slice(0, 4);
}

export function extractCaseStudySlug(
  retrieved: readonly RetrievedChunk[],
): string | undefined {
  for (const chunk of retrieved) {
    if (chunk.corpus !== "CASE_STUDY_KNOWLEDGE") {
      continue;
    }
    const match = chunk.related_routes.find((route) =>
      route.includes("/psychology/case-studies/"),
    );
    if (match) {
      return match.split("/").filter(Boolean).at(-1);
    }
  }
  return undefined;
}

export function shouldShowSupportCta(category: SafetyCategory): boolean {
  return (
    category === "PERSONAL_MENTAL_HEALTH" ||
    category === "DIAGNOSTIC_REQUEST" ||
    category === "DR_VANDANA_SPECIFIC" ||
    category === "SAFE_EDUCATIONAL"
  );
}

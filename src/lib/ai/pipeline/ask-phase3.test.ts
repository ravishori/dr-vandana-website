import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  ControlledAnswerProvider,
  extractUsedSources,
} from "@/lib/ai/answers/controlled-composer";
import { KNOWLEDGE_GAP_OPENING } from "@/lib/ai/answers/knowledge-gap";
import { resetConversationsForTests } from "@/lib/ai/conversation/memory";
import { resetEducationalCacheForTests } from "@/lib/ai/pipeline/cache";
import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import type { RetrievedChunk } from "@/types/ai";

const provider = new ControlledAnswerProvider();

async function ask(question: string, conversationId?: string) {
  return runAskPipeline(
    { question, conversation_id: conversationId, language: "en" },
    "phase3-test",
    { provider },
  );
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("Phase 3 Ask AI regression", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  it("A: answers what is stress with relevant content and external attribution", async () => {
    const result = await ask("What is stress?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.response.topic, "stress");
    assert.match(result.response.answer, /stress/i);
    assert.ok(result.response.sources.length >= 1);
    const attribution = result.response.sources.map((source) => source.attribution).join(" ");
    assert.match(attribution, /World Health Organization/i);
    assert.doesNotMatch(attribution, /University of Mumbai/i);
  });

  it("B: answers how can I manage stress with practical guidance and relevant attribution", async () => {
    const result = await ask("How can I manage stress?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, /stress|cope|routine|sleep|support/i);
    assert.doesNotMatch(result.response.answer, /\byou (have|are) stressed\b/i);
    assert.ok(result.response.sources.length >= 1);
    assert.doesNotMatch(
      result.response.sources.map((source) => source.title).join(" "),
      /women'?s mental health/i,
    );
  });

  it("C: answers what is self-esteem directly with relevant psychology source", async () => {
    const result = await ask("What is self-esteem?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.response.topic, "self-esteem");
    assert.match(result.response.answer, /self-esteem|self-worth|confidence/i);
    assert.ok(result.response.sources.length >= 1);
    assert.match(result.response.sources[0]?.title ?? "", /self-esteem/i);
  });

  it("D: explains CBT without implying Dr. Vandana uses CBT", async () => {
    const result = await ask("What is CBT?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(
      result.response.answer,
      /\bCBT\b|cognitive behavioural therapy|cognitive behavioral therapy/i,
    );
    assert.doesNotMatch(result.response.answer, /Dr\. Vandana uses/i);
    const attribution = result.response.sources.map((source) => source.attribution).join(" ");
    assert.match(attribution, /National Institute of Mental Health|NIMH/i);
  });

  it("E: refuses to infer Dr. Vandana uses CBT from external sources", async () => {
    const result = await ask("Does Dr. Vandana use CBT?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.response.category, "DR_VANDANA_SPECIFIC");
    assert.match(
      result.response.answer,
      new RegExp(escapeRegex(INSUFFICIENT_VANDANA_METHODOLOGY)),
    );
    assert.doesNotMatch(result.response.answer, /Dr\. Vandana uses CBT/i);
  });

  it("F: does not expose internal Mumbai University curriculum through Ask AI", async () => {
    const result = await ask("What is the Mumbai University M.A. Psychology syllabus?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.doesNotMatch(result.response.answer, /Semester I|PERSONALITY PSYCHOLOGY|501 11/i);
    assert.doesNotMatch(
      result.response.sources.map((source) => source.attribution).join(" "),
      /University of Mumbai/i,
    );
    assert.match(
      result.response.answer,
      new RegExp(escapeRegex(KNOWLEDGE_GAP_OPENING)),
    );
  });

  it("G: returns knowledge-gap behavior for unrelated geography questions", async () => {
    const result = await ask("What is the capital of France?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(
      result.response.answer,
      new RegExp(escapeRegex(KNOWLEDGE_GAP_OPENING)),
    );
    assert.equal(result.response.sources.length, 0);
  });

  it("H: responds safely to personal depression concern without diagnosis", async () => {
    const result = await ask("I think I have depression. What should I do?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.doesNotMatch(result.response.answer, /\byou have depression\b/i);
    assert.doesNotMatch(result.response.answer, /\bdiagnos(e|is)\s+you\b/i);
    assert.match(result.response.answer, /not a diagnosis|does not diagnose|cannot assess your personal situation/i);
    assert.match(result.response.answer, /seek|support|professional|help|care/i);
    assert.ok(result.response.show_support_cta);
  });

  it("attributes only chunks passed to extractUsedSources", () => {
    const chunks: RetrievedChunk[] = [
      {
        id: "evidence-who-stress-qanda",
        title: "Understanding stress and healthy coping",
        category: "Stress",
        topic: "stress",
        corpus: "PSYCHOLOGY_EVIDENCE_SOURCES",
        content: "Stress content",
        source: "World Health Organization — Stress (Q&A)",
        publication: "WHO news-room Q&A: Stress",
        score: 1,
        related_questions: [],
        related_routes: [],
      },
      {
        id: "edu-womens-mental-health",
        title: "Women's mental health — educational overview",
        category: "Women's Mental Health",
        topic: "womens-mental-health",
        corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
        content: "Women's health",
        source: "Approved Dr. Vandana educational website material",
        publication: "Ask Dr. Vandana AI educational corpus",
        score: 0.5,
        related_questions: [],
        related_routes: [],
      },
    ];

    const used = extractUsedSources([chunks[0]!]);
    assert.equal(used.length, 1);
    assert.match(used[0]?.attribution ?? "", /World Health Organization/i);
    assert.ok(used[0]?.url?.includes("who.int"));
    assert.doesNotMatch(used.map((source) => source.title).join(" "), /Women's mental health/i);
  });
});

describe("Phase 3 attribution improvement", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  it("formats external evidence attribution with organization and optional URL", async () => {
    const result = await ask("What is stress?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const source = result.response.sources[0];
    assert.ok(source);
    assert.match(source.attribution, /World Health Organization/i);
    assert.ok(source.url?.startsWith("https://www.who.int/"));
  });
});

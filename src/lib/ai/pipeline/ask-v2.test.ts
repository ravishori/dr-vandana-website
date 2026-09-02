import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { resetConversationsForTests } from "@/lib/ai/conversation/memory";
import { resetEducationalCacheForTests } from "@/lib/ai/pipeline/cache";
import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { ControlledAnswerProvider } from "@/lib/ai/answers/controlled-composer";
import { KNOWLEDGE_GAP_OPENING } from "@/lib/ai/answers/knowledge-gap";

const provider = new ControlledAnswerProvider();

async function ask(question: string, conversationId?: string) {
  return runAskPipeline(
    { question, conversation_id: conversationId, language: "en" },
    "v2-test",
    { provider },
  );
}

describe("Ask AI V2 relevance regression", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  it("answers visualization questions directly without first-session contamination", async () => {
    const result = await ask("What is powerful visualization technique?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, /visuali[sz]ation|mental imagery/i);
    assert.doesNotMatch(
      result.response.answer,
      /A first session is usually an opportunity/i,
    );
    assert.equal(result.response.topic, "visualization");
    assert.match(result.response.sources[0]?.title ?? "", /visualization/i);
  });

  it("returns practical self-esteem guidance without women's health contamination", async () => {
    const result = await ask("How can I improve self-esteem?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, /self-esteem|self-talk|confidence/i);
    assert.doesNotMatch(
      result.response.answer,
      /Women's mental health is shaped by many factors/i,
    );
    assert.match(result.response.answer, /Notice harsh self-talk|small achievable goals/i);
    assert.equal(result.response.intent, "HOW_TO");
    assert.equal(result.response.topic, "self-esteem");
  });

  it("still answers first-session counselling questions correctly", async () => {
    const result = await ask("What happens in the first counselling session?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, /first session/i);
    assert.equal(result.response.topic, "first-session");
  });

  it("answers stress vs anxiety comparison questions", async () => {
    const result = await ask("What is the difference between stress and anxiety?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, /stress/i);
    assert.match(result.response.answer, /anxiety/i);
    assert.equal(result.response.topic, "stress-vs-anxiety");
  });

  it("returns knowledge-gap response for unsupported topics", async () => {
    const result = await ask(
      "What is quantum gardening therapy for intergalactic crops?",
    );
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.answer, new RegExp(KNOWLEDGE_GAP_OPENING));
    assert.equal(result.response.sources.length, 0);
    assert.equal(result.response.quality?.status, "KNOWLEDGE_GAP");
  });

  it("keeps related questions within the primary topic", async () => {
    const result = await ask("How can I improve self-esteem?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.ok(result.response.related_questions.length > 0);
    assert.doesNotMatch(
      result.response.related_questions.join(" "),
      /first counselling session/i,
    );
  });

  it("resolves follow-up pronouns to the prior topic", async () => {
    const first = await ask("What is self-esteem?");
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    const second = await ask(
      "How can I improve it?",
      first.response.conversation_id,
    );
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    assert.equal(second.response.topic, "self-esteem");
    assert.match(second.response.answer, /self-esteem|self-talk/i);
  });

  it("does not let follow-up context override an explicit new topic", async () => {
    const first = await ask("Tell me about self-esteem.");
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    const second = await ask(
      "What is visualization?",
      first.response.conversation_id,
    );
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    assert.equal(second.response.topic, "visualization");
    assert.match(second.response.answer, /visuali[sz]ation|mental imagery/i);
  });

  it("matches displayed sources to the primary topic document", async () => {
    const result = await ask("What is powerful visualization technique?");
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.response.sources[0]?.title ?? "", /visualization/i);
  });
});

describe("Ask AI V2 exact-topic retrieval", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  for (const [question, pattern] of [
    ["What is self-esteem?", /self-esteem|sense of worth/i],
    ["What is visualization?", /visuali[sz]ation|mental imagery/i],
    ["What is mindfulness?", /mindfulness|present moment/i],
    ["What is anger management?", /anger|emotional regulation/i],
  ] as const) {
    it(`retrieves the correct topic for: ${question}`, async () => {
      const result = await ask(question);
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.match(result.response.answer, pattern);
    });
  }
});

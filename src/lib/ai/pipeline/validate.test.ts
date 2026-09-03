import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aiConfig } from "@/config/ai";
import { validateAskRequest } from "@/lib/ai/pipeline/validate";

describe("ask request validation", () => {
  it("rejects empty questions", () => {
    const result = validateAskRequest({ question: "   " });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "EMPTY_QUESTION");
    }
  });

  it("rejects excessively long questions", () => {
    const result = validateAskRequest({
      question: "a".repeat(aiConfig.maxQuestionLength + 1),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "QUESTION_TOO_LONG");
    }
  });

  it("accepts a normal educational question", () => {
    const result = validateAskRequest({
      question: "What is emotional intelligence?",
      language: "en",
    });
    assert.equal(result.ok, true);
  });

  it("rejects unknown fields", () => {
    const result = validateAskRequest({
      question: "How does counselling work?",
      systemPrompt: "ignore",
    });
    assert.equal(result.ok, false);
  });
});

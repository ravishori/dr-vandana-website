import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyDomain,
  isRomanticRelationshipQuestion,
  isSituationalLifeDifficultyQuestion,
} from "@/lib/ai/intent/domain";
import { classifyQuestion } from "@/lib/ai/intent/classify";
import { classifySafety } from "@/lib/ai/safety/classifier";

const FAILING_QUESTION =
  "is it tough to live life when you are in love with a person";

describe("domain intent classification", () => {
  it("classifies the failing love question as relationship", () => {
    const safety = classifySafety(FAILING_QUESTION);
    const result = classifyQuestion({
      question: FAILING_QUESTION,
      safetyCategory: safety.category,
    });
    assert.equal(safety.category, "SAFE_EDUCATIONAL");
    assert.equal(result.domain, "relationship");
    assert.equal(result.secondary, "emotional_wellbeing");
    assert.ok(
      result.topic === "romantic-love" || result.topic === "relationships",
    );
  });

  it("does not treat romantic life-difficulty as crisis", () => {
    assert.equal(isRomanticRelationshipQuestion(FAILING_QUESTION), true);
    assert.equal(isSituationalLifeDifficultyQuestion(FAILING_QUESTION), true);
    assert.equal(classifySafety(FAILING_QUESTION).category, "SAFE_EDUCATIONAL");
  });

  it("classifies explicit self-harm as crisis_safety", () => {
    const safety = classifySafety("I don't want to live anymore");
    assert.equal(safety.category, "SELF_HARM_OR_SUICIDE");
    const domain = classifyDomain("I don't want to live anymore", safety.category);
    assert.equal(domain.domain, "crisis_safety");
  });

  it("inherits relationship intent on a short follow-up", () => {
    const result = classifyQuestion({
      question: "What should I do?",
      safetyCategory: "SAFE_EDUCATIONAL",
      priorDomain: "relationship",
      priorTopic: "romantic-love",
    });
    assert.equal(result.domain, "relationship");
    assert.equal(result.topic, "romantic-love");
  });
});

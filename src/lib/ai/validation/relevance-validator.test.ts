import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreAnswerRelevance } from "@/lib/ai/validation/relevance-validator";

describe("relevance validator", () => {
  it("scores a relationship answer highly and rejects grief contamination", () => {
    const pass = scoreAnswerRelevance({
      question: "is it tough to live life when you are in love with a person",
      answer:
        "Yes, being in love can feel intense. Strong romantic feelings may affect concentration and daily routines without being a disorder.",
      domain: "relationship",
      topic: "romantic-love",
    });
    assert.ok(pass.score >= 75);
    assert.equal(pass.pass, true);

    const fail = scoreAnswerRelevance({
      question: "is it tough to live life when you are in love with a person",
      answer:
        "A person describes missing a close family member several months after the death, with waves of sadness and guilt about moving on after bereavement.",
      domain: "relationship",
      topic: "romantic-love",
    });
    assert.ok(fail.score < 75);
    assert.equal(fail.pass, false);
    assert.equal(fail.flags.unrelatedScenario, true);
  });

  it("fails invented patients and diagnoses", () => {
    const result = scoreAnswerRelevance({
      question: "What is anxiety?",
      answer: "I diagnosed you. Age range: Adult, 40s. Presenting concerns: worry.",
      domain: "anxiety",
      topic: "anxiety",
    });
    assert.ok(result.score < 75);
    assert.equal(result.flags.inventedPatient, true);
    assert.equal(result.flags.diagnosedUser, true);
  });
});

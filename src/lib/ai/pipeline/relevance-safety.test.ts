import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ControlledAnswerProvider } from "@/lib/ai/answers/controlled-composer";
import { resetConversationsForTests } from "@/lib/ai/conversation/memory";
import { resetEducationalCacheForTests } from "@/lib/ai/pipeline/cache";
import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { GENERIC_GENERATION_FALLBACK } from "@/lib/ai/prompts/system";
import type { DomainIntent } from "@/types/ai";

const provider = new ControlledAnswerProvider();

async function ask(question: string, conversationId?: string) {
  return runAskPipeline(
    { question, conversation_id: conversationId, language: "en" },
    "relevance-safety-test",
    { provider },
  );
}

const GRIEF_LEAK =
  /bereavement|after the death|who died|passed away|caregiving relationship before the loss|guilt about ['']?moving on['']?|\bgrief after\b/i;

function assertOkAnswer(result: Awaited<ReturnType<typeof ask>>) {
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("expected a successful Ask AI response");
  }
  return result.response;
}

describe("Ask AI relevance, grounding and safety", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  it("answers the failing romantic question without grief or case-study substitution", async () => {
    const response = assertOkAnswer(
      await ask("is it tough to live life when you are in love with a person"),
    );
    assert.ok(
      response.domain_intent === "relationship" ||
        response.domain_intent === "emotional_wellbeing",
    );
    assert.match(response.answer, /love|romantic|relationship|feelings/i);
    assert.doesNotMatch(response.answer, GRIEF_LEAK);
    assert.doesNotMatch(response.answer, /educational scenario|presenting concerns/i);
    assert.notEqual(response.case_study_slug, "grief-after-loss");
    assert.ok((response.relevance_score ?? 0) >= 75);
  });

  const cases: ReadonlyArray<{
    name: string;
    question: string;
    domain: DomainIntent | DomainIntent[];
    expect: RegExp;
    forbid?: RegExp;
  }> = [
    {
      name: "Relationship",
      question: "I love someone but don't know whether they love me.",
      domain: "relationship",
      expect: /love|relationship|feelings|uncertainty/i,
      forbid: GRIEF_LEAK,
    },
    {
      name: "Anxiety",
      question: "What is anxiety?",
      domain: "anxiety",
      expect: /anxiety|worry|unease/i,
    },
    {
      name: "Stress",
      question: "How can I manage stress?",
      domain: "stress",
      expect: /stress|cope|routine|rest/i,
    },
    {
      name: "Depression awareness",
      question: "What is depression?",
      domain: "depression_awareness",
      expect: /low mood|depression|sadness/i,
      forbid: /you have depression/i,
    },
    {
      name: "Parenting",
      question: "How can parents support a child's emotions?",
      domain: ["parenting", "child_psychology"],
      expect: /child|parent|caregiver/i,
    },
    {
      name: "Child psychology",
      question: "What is child psychology in everyday parenting?",
      domain: ["child_psychology", "parenting"],
      expect: /child|parent|development/i,
    },
    {
      name: "Adolescent psychology",
      question: "How can I support a teenager's mental health?",
      domain: "adolescent_psychology",
      expect: /adolescent|teen/i,
    },
    {
      name: "Workplace stress",
      question: "How can I cope with workplace stress?",
      domain: ["workplace_mental_health", "stress", "burnout"],
      expect: /work|stress|demand|recovery/i,
    },
    {
      name: "Burnout",
      question: "What is burnout?",
      domain: "burnout",
      expect: /burnout|exhaustion|work/i,
    },
    {
      name: "Self-esteem",
      question: "How can I improve self-esteem?",
      domain: "self_esteem",
      expect: /self-esteem|self-talk|confidence/i,
    },
    {
      name: "Positive psychology",
      question: "What is positive psychology?",
      domain: "positive_psychology",
      expect: /growth|resilience|strength|habit|well-being|wellbeing/i,
    },
    {
      name: "General psychology",
      question: "What is emotional intelligence?",
      domain: ["emotional_wellbeing", "general_psychology"],
      expect: /emotional intelligence/i,
    },
    {
      name: "Grief",
      question: "How does counselling support grief?",
      domain: "grief",
      expect: /grief|loss/i,
    },
  ];

  for (const item of cases) {
    it(`covers ${item.name}`, async () => {
      const response = assertOkAnswer(await ask(item.question));
      const allowed = Array.isArray(item.domain) ? item.domain : [item.domain];
      assert.ok(
        allowed.includes(response.domain_intent as DomainIntent),
        `expected ${allowed.join("|")}, got ${response.domain_intent}`,
      );
      assert.match(response.answer, item.expect);
      if (item.forbid) {
        assert.doesNotMatch(response.answer, item.forbid);
      }
      if (item.name !== "Grief") {
        assert.doesNotMatch(response.answer, /grief-after-loss|family member several months after the death/i);
      }
    });
  }

  it("uses a dedicated crisis path for suicide language", async () => {
    const response = assertOkAnswer(
      await ask("I want to kill myself and not wanting to live"),
    );
    assert.equal(response.domain_intent, "crisis_safety");
    assert.equal(response.category, "SELF_HARM_OR_SUICIDE");
    assert.equal(response.quality?.status, "SAFETY_REDIRECT");
    assert.match(response.answer, /immediate help|emergency/i);
    assert.doesNotMatch(response.answer, /educational scenario/i);
  });

  it("keeps outside-scope questions out of psychology case studies", async () => {
    const response = assertOkAnswer(
      await ask("Write python code for a lottery bot."),
    );
    assert.equal(response.category, "OUT_OF_SCOPE");
    assert.equal(response.domain_intent, "outside_scope");
    assert.doesNotMatch(response.answer, GRIEF_LEAK);
  });

  it("asks for clarification on ambiguous questions", async () => {
    const response = assertOkAnswer(await ask("help"));
    assert.equal(response.domain_intent, "ambiguous");
    assert.match(response.answer, /a little more|say a little more|clarify/i);
  });

  it("uses session context for a relationship follow-up", async () => {
    const first = assertOkAnswer(
      await ask("I love someone but don't know whether they love me."),
    );
    const second = assertOkAnswer(
      await ask("What should I do?", first.conversation_id),
    );
    assert.equal(second.domain_intent, "relationship");
    assert.match(second.answer, /love|relationship|feelings|routine|uncertainty/i);
    assert.doesNotMatch(second.answer, GRIEF_LEAK);
  });

  it("does not use a grief case study as a generation fallback", () => {
    assert.match(GENERIC_GENERATION_FALLBACK, /couldn’t generate a relevant response|couldn't generate a relevant response/i);
    assert.doesNotMatch(GENERIC_GENERATION_FALLBACK, /bereavement|case study/i);
  });
});

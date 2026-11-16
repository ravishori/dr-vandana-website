import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateAnswer } from "@/lib/intake/answers";
import {
  DEFAULT_INTAKE_CONFIG,
  approve,
  assertServable,
  contentHash,
  validateDefinition,
  visibleQuestions,
} from "@/lib/intake/definition";
import { syntheticAdultIntake } from "@/lib/intake/fixtures/synthetic-adult-intake";
import type { AnswerEntry, QuestionnaireDefinition } from "@/lib/intake/types";

const allowSynthetic = { ...DEFAULT_INTAKE_CONFIG, allowSyntheticContent: true };
const entry = (value: AnswerEntry["value"], state: AnswerEntry["state"] = "answered"): AnswerEntry => ({
  state,
  value,
  provenance: "patient_reported",
  savedAt: "2026-11-16T10:00:00.000Z",
});

function withQuestion(
  def: QuestionnaireDefinition,
  q: Partial<QuestionnaireDefinition["sections"][0]["questions"][0]> & { id: string; prompt: string },
): QuestionnaireDefinition {
  const copy = structuredClone(def);
  copy.sections[0].questions.push({
    kind: "short_text",
    allowedNonAnswerStates: ["skipped"],
    ...q,
  } as QuestionnaireDefinition["sections"][0]["questions"][0]);
  return copy;
}

describe("servability gates", () => {
  it("never serves synthetic fixture content under the default configuration", () => {
    assert.throws(() => assertServable(syntheticAdultIntake(), DEFAULT_INTAKE_CONFIG), /synthetic/);
  });

  it("serves the synthetic fixture only when synthetic content is explicitly allowed", () => {
    assert.doesNotThrow(() => assertServable(syntheticAdultIntake(), allowSynthetic));
  });

  it("rejects unapproved and tampered definitions", () => {
    const draft = { ...syntheticAdultIntake(), status: "draft" as const, approval: null };
    assert.throws(() => assertServable(draft, allowSynthetic), /not approved/);
    const tampered = syntheticAdultIntake();
    tampered.sections[2].questions[0].prompt = "[SYNTHETIC] changed after approval";
    assert.throws(() => assertServable(tampered, allowSynthetic), /hash mismatch/);
  });

  it("rejects unsupported locales and audiences (hooks for later, closed in V1)", () => {
    const hindi = approve({ ...syntheticAdultIntake(), locale: "hi" }, "synthetic-fixture", "2026-11-16T00:00:00.000Z");
    assert.throws(() => assertServable(hindi, allowSynthetic), /locale/);
    const teen = approve({ ...syntheticAdultIntake(), audience: "adolescent" }, "synthetic-fixture", "2026-11-16T00:00:00.000Z");
    assert.throws(() => assertServable(teen, allowSynthetic), /audience/);
    const future = { ...allowSynthetic, supportedLocales: ["en", "hi"] };
    assert.doesNotThrow(() => assertServable(hindi, future));
  });

  it("content hash ignores status and approval but covers questions", () => {
    const a = syntheticAdultIntake();
    const b = { ...a, status: "retired" as const };
    assert.equal(contentHash(a), contentHash(b));
    const c = structuredClone(a);
    c.sections[1].questions[0].options![0].label = "different";
    assert.notEqual(contentHash(a), contentHash(c));
  });
});

describe("authoring guard (owner decision IN-3, OD-G2/G3)", () => {
  const prompts = [
    "Have you had thoughts of suicide?",
    "Do you ever self-harm?",
    "Thoughts that you would be better off dead",
    "Do you want to harm others?",
    "PHQ-9 item",
    "GAD 7 scale",
    "Patient Health Questionnaire",
  ];
  for (const text of prompts) {
    it(`rejects safety or instrument content in a prompt: ${text}`, () => {
      const errors = validateDefinition(withQuestion(syntheticAdultIntake(), { id: "q-x", prompt: text }));
      assert.ok(
        errors.some((e) => e.startsWith("safety_screening_not_allowed_in_async_intake") || e.startsWith("instrument_not_approved")),
        errors.join(","),
      );
    });
  }

  it("also checks option labels and section titles", () => {
    const d = syntheticAdultIntake();
    d.sections[1].questions[0].options![0].label = "thoughts of suicide";
    assert.ok(validateDefinition(d).some((e) => e.startsWith("safety_screening")));
    const e = syntheticAdultIntake();
    e.sections[0].title = "PHQ-9";
    assert.ok(validateDefinition(e).some((x) => x.startsWith("instrument_not_approved")));
  });

  it("accepts the synthetic fixture", () => {
    assert.deepEqual(validateDefinition(syntheticAdultIntake()), []);
  });
});

describe("conditional logic", () => {
  it("rejects rules that point forward, to unknown questions, or at free text", () => {
    const forward = syntheticAdultIntake();
    forward.sections[1].questions[0].showIf = { type: "answer_equals", questionId: "q-has-previous", value: "yes" };
    assert.ok(validateDefinition(forward).some((e) => e.startsWith("condition_not_earlier")));

    const unknown = syntheticAdultIntake();
    unknown.sections[3].questions[0].showIf = { type: "answer_equals", questionId: "nope", value: "yes" };
    assert.ok(validateDefinition(unknown).some((e) => e.startsWith("condition_unknown_question")));

    const freeText = syntheticAdultIntake();
    freeText.sections[3].questions[0].showIf = { type: "answer_equals", questionId: "q-main-text", value: "anything" };
    assert.ok(validateDefinition(freeText).some((e) => e.startsWith("condition_on_non_choice")));
  });

  it("shows a follow-up only after the matching answer", () => {
    const def = syntheticAdultIntake();
    const ids = (a: Record<string, AnswerEntry>) => visibleQuestions(def, a).map((q) => q.id);
    assert.ok(!ids({}).includes("q-previous-detail"));
    assert.ok(!ids({ "q-has-previous": entry("no") }).includes("q-previous-detail"));
    assert.ok(!ids({ "q-has-previous": entry(null, "skipped") }).includes("q-previous-detail"));
    assert.ok(ids({ "q-has-previous": entry("yes") }).includes("q-previous-detail"));
  });

  it("ignores stale answers of hidden questions when deciding later visibility", () => {
    const base = syntheticAdultIntake();
    const chained = structuredClone(base);
    chained.sections[3].questions.push({
      id: "q-chained",
      kind: "short_text",
      prompt: "[SYNTHETIC] depends on a hidden single choice",
      allowedNonAnswerStates: ["skipped"],
      showIf: { type: "answer_equals", questionId: "q-has-previous", value: "yes" },
    });
    const ok = visibleQuestions(chained, { "q-has-previous": entry("no") }).map((q) => q.id);
    assert.ok(!ok.includes("q-chained"));
  });
});

describe("answer validation", () => {
  const def = syntheticAdultIntake();
  const q = (id: string) => def.sections.flatMap((s) => s.questions).find((x) => x.id === id)!;

  it("accepts valid values and rejects invalid ones", () => {
    assert.equal(validateAnswer(q("q-contact-pref"), { state: "answered", value: "email" }), null);
    assert.equal(validateAnswer(q("q-contact-pref"), { state: "answered", value: "carrier-pigeon" }), "invalid_choice");
    assert.equal(validateAnswer(q("q-has-previous"), { state: "answered", value: "yes" }), null);
    assert.equal(validateAnswer(q("q-has-previous"), { state: "answered", value: "maybe" }), "invalid_choice");
    assert.equal(validateAnswer(q("q-multi"), { state: "answered", value: ["a", "c"] }), null);
    assert.equal(validateAnswer(q("q-multi"), { state: "answered", value: ["a", "a"] }), "invalid_choice");
    assert.equal(validateAnswer(q("q-multi"), { state: "answered", value: [] }), "invalid_choice");
    assert.equal(validateAnswer(q("q-count"), { state: "answered", value: 3 }), null);
    assert.equal(validateAnswer(q("q-count"), { state: "answered", value: 99 }), "number_out_of_range");
    assert.equal(validateAnswer(q("q-count"), { state: "answered", value: Number.NaN }), "invalid_number");
    assert.equal(validateAnswer(q("q-main-text"), { state: "answered", value: "   " }), "invalid_text");
    assert.equal(validateAnswer(q("q-previous-detail"), { state: "answered", value: "x".repeat(201) }), "invalid_text");
  });

  it("lets a patient decline optional questions but never a required one", () => {
    for (const state of ["prefer_not_to_answer", "skipped", "discuss_in_person"] as const) {
      assert.equal(validateAnswer(q("q-main-text"), { state }), null);
      assert.equal(validateAnswer(q("q-consent"), { state }), "required_question_cannot_be_declined");
    }
  });

  it("does not let a patient set system-only states", () => {
    assert.equal(validateAnswer(q("q-main-text"), { state: "not_reached" }), "state_not_selectable_by_patient");
    assert.equal(validateAnswer(q("q-main-text"), { state: "not_applicable" }), "state_not_selectable_by_patient");
  });
});

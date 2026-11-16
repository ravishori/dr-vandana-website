import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BRIEF_STATIC_LINES, buildPreConsultationBrief, renderBriefText } from "@/lib/intake/brief";
import { DEFAULT_INTAKE_CONFIG, type IntakeEngineConfig } from "@/lib/intake/definition";
import { SYNTHETIC_INTAKE_ID, syntheticAdultIntake } from "@/lib/intake/fixtures/synthetic-adult-intake";
import { DefinitionRegistry, IntakeService } from "@/lib/intake/service";
import { InMemoryIntakeStore } from "@/lib/intake/store";
import type { Actor } from "@/lib/intake/types";

const P1 = "11111111-1111-4111-8111-111111111111";
const doctor: Actor = { userId: "33333333-3333-4333-8333-333333333333", roles: ["PSYCHOLOGIST"], mfaCompleted: true };
const config: IntakeEngineConfig = { ...DEFAULT_INTAKE_CONFIG, allowSyntheticContent: true };

function world() {
  const store = new InMemoryIntakeStore();
  const registry = new DefinitionRegistry(config);
  registry.publish(syntheticAdultIntake(1));
  let n = 0;
  const now = new Date("2026-11-17T14:00:00+05:30");
  const service = new IntakeService(
    { store, now: () => now, newId: () => `id-${String(++n).padStart(8, "0")}`, config },
    registry,
  );
  return { store, registry, service };
}

async function submitScenario(w: ReturnType<typeof world>, mainText: string) {
  const v = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
  let dv = v.draft.draftVersion;
  const save = async (q: string, state: "answered" | "skipped" | "prefer_not_to_answer" | "discuss_in_person", value?: string | string[] | number) => {
    dv = (await w.service.saveAnswer(P1, v.draft.id, q, { state, value }, dv)).draft.draftVersion;
  };
  await save("q-consent", "answered", "yes");
  await save("q-contact-pref", "answered", "email");
  await save("q-main-text", "answered", mainText);
  await save("q-has-previous", "answered", "yes");
  await save("q-previous-detail", "skipped");
  await save("q-count", "answered", 3);
  await save("q-multi", "answered", ["a", "c"]);
  return w.service.submit(P1, v.draft.id);
}

describe("pre-consultation brief", () => {
  it("shows the patient's words verbatim and every item as Patient-reported", async () => {
    const w = world();
    const text = "  line one\nline two <b>& symbols</b> ✓ emoji \u{1F642}  ";
    const { submission } = await submitScenario(w, text);
    const brief = w.service.getPreConsultationBrief(doctor, submission.id);
    const main = brief.sections.flatMap((s) => s.items).find((i) => i.questionId === "q-main-text")!;
    assert.equal(main.display, text);
    assert.ok(brief.sections.flatMap((s) => s.items).every((i) => i.provenance === "Patient-reported"));
    const items = Object.fromEntries(brief.sections.flatMap((s) => s.items).map((i) => [i.questionId, i.display]));
    assert.equal(items["q-contact-pref"], "Option one");
    assert.equal(items["q-has-previous"], "Yes");
    assert.equal(items["q-count"], "3");
    assert.equal(items["q-multi"], "Option A; Option C");
    assert.equal(items["q-previous-detail"], "Skipped");
  });

  it("follows questionnaire order, never content order", async () => {
    const w = world();
    const { submission } = await submitScenario(w, "synthetic ordinary sentence");
    const brief = w.service.getPreConsultationBrief(doctor, submission.id);
    const def = syntheticAdultIntake(1);
    assert.deepEqual(
      brief.sections.map((s) => s.id),
      def.sections.map((s) => s.id),
    );
    assert.deepEqual(
      brief.sections.flatMap((s) => s.items.map((i) => i.questionId)),
      def.sections.flatMap((s) => s.questions.map((q) => q.id)),
    );
  });

  it("preserves unanswered, skipped, declined and discuss-in-person items, grouped distinctly", async () => {
    const w = world();
    const v = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    let dv = v.draft.draftVersion;
    const save = async (q: string, state: "answered" | "skipped" | "prefer_not_to_answer" | "discuss_in_person", value?: string) => {
      dv = (await w.service.saveAnswer(P1, v.draft.id, q, { state, value }, dv)).draft.draftVersion;
    };
    await save("q-consent", "answered", "yes");
    await save("q-contact-pref", "prefer_not_to_answer");
    await save("q-main-text", "discuss_in_person");
    await save("q-has-previous", "skipped");
    const { submission } = await w.service.submit(P1, v.draft.id);
    const brief = w.service.getPreConsultationBrief(doctor, submission.id);
    const groups = Object.fromEntries(brief.notProvided.map((g) => [g.state, g.items.map((i) => i.questionId)]));
    assert.deepEqual(groups["prefer_not_to_answer"], ["q-contact-pref"]);
    assert.deepEqual(groups["discuss_in_person"], ["q-main-text"]);
    assert.deepEqual(groups["skipped"], ["q-has-previous"]);
    assert.deepEqual(groups["not_reached"], ["q-multi"]);
    assert.deepEqual(brief.notProvided.map((g) => g.state), ["not_reached", "skipped", "prefer_not_to_answer", "discuss_in_person"]);
    const hidden = brief.sections.flatMap((s) => s.items).find((i) => i.questionId === "q-previous-detail")!;
    assert.equal(hidden.state, "not_applicable");
    const text = renderBriefText(brief);
    assert.ok(text.includes("Prefers to discuss in person"));
    assert.ok(text.includes("Preferred not to answer"));
  });

  it("keeps clarifications and clinician notes in their own labelled blocks", async () => {
    const w = world();
    const { submission } = await submitScenario(w, "synthetic ordinary sentence");
    await w.service.addClarification(P1, submission.id, "synthetic clarification text", "q-main-text");
    await w.service.addAnnotation(doctor, submission.id, "synthetic clinician observation");
    const brief = w.service.getPreConsultationBrief(doctor, submission.id);
    assert.deepEqual(brief.clarifications.map((c) => c.label), ["Patient clarification (added after submission)"]);
    assert.deepEqual(brief.clinicianNotes.map((c) => c.label), ["Clinician-entered (not patient-reported)"]);
    const patientText = brief.sections.flatMap((s) => s.items).map((i) => i.display).join("|");
    assert.ok(!patientText.includes("synthetic clinician observation"));
    assert.ok(!patientText.includes("synthetic clarification text"));
  });

  it("requires an explicit review: opening any number of times changes nothing", async () => {
    const w = world();
    const { submission, task } = await submitScenario(w, "synthetic ordinary sentence");
    const before = JSON.stringify(w.store.read());
    for (let i = 0; i < 3; i += 1) w.service.getPreConsultationBrief(doctor, submission.id);
    assert.equal(JSON.stringify(w.store.read()), before);
    assert.equal(w.service.getPreConsultationBrief(doctor, submission.id).review.status, "pending");
    await w.service.markReviewed(doctor, task.id, "review_incomplete");
    assert.equal(w.service.getPreConsultationBrief(doctor, submission.id).review.status, "incomplete");
    await w.service.markReviewed(doctor, task.id, "reviewed_discuss_in_consultation");
    const done = w.service.getPreConsultationBrief(doctor, submission.id).review;
    assert.equal(done.status, "reviewed");
    assert.equal(done.outcome, "reviewed_discuss_in_consultation");
  });

  it("is available only to an MFA-completed psychologist", async () => {
    const w = world();
    const { submission } = await submitScenario(w, "synthetic ordinary sentence");
    const others: Actor[] = [
      { userId: P1, roles: ["PATIENT"], mfaCompleted: true },
      { ...doctor, mfaCompleted: false },
      { userId: "44444444-4444-4444-8444-444444444444", roles: ["STAFF"], mfaCompleted: true },
      { userId: "55555555-5555-4555-8555-555555555555", roles: ["SUPER_ADMIN"], mfaCompleted: true },
    ];
    for (const a of others) assert.throws(() => w.service.getPreConsultationBrief(a, submission.id), /forbidden/);
    assert.throws(() => w.service.getPreConsultationBrief(doctor, "missing"), /submission_not_found/);
  });

  it("is identical in form whatever the patient wrote (no flags, no reordering, no extra fields)", async () => {
    const calm = world();
    const urgent = world();
    const a = await submitScenario(calm, "synthetic ordinary sentence");
    const b = await submitScenario(urgent, "synthetic URGENT emergency help immediately!!!");
    const ba = calm.service.getPreConsultationBrief(doctor, a.submission.id);
    const bb = urgent.service.getPreConsultationBrief(doctor, b.submission.id);
    const shape = (x: unknown): unknown =>
      Array.isArray(x) ? x.map(shape) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, shape(v)])) : typeof x;
    assert.deepEqual(shape(ba), shape(bb));
    const ta = renderBriefText(ba).split("\n");
    const tb = renderBriefText(bb).split("\n");
    assert.equal(ta.length, tb.length);
    const different = ta.filter((l, i) => l !== tb[i]);
    assert.equal(different.length, 1); // only the patient's own sentence differs
  });

  it("contains no interpretation vocabulary and the required static lines", async () => {
    const w = world();
    const { submission } = await submitScenario(w, "synthetic ordinary sentence");
    const brief = w.service.getPreConsultationBrief(doctor, submission.id);
    const text = renderBriefText(brief);
    assert.ok(!/(diagnos|risk|recommend|severity|priority|urgent|alert|flag|concern level|treatment plan)/i.test(text), text);
    assert.ok(text.includes(BRIEF_STATIC_LINES.compiled));
    assert.ok(text.includes(BRIEF_STATIC_LINES.safety));
    assert.ok(text.includes("not yet reviewed by the psychologist"));
    assert.deepEqual(brief.staticLines, [BRIEF_STATIC_LINES.compiled, BRIEF_STATIC_LINES.safety]);
  });

  it("labels synthetic content and is deterministic and non-mutating", async () => {
    const w = world();
    const { submission, task } = await submitScenario(w, "synthetic ordinary sentence");
    const state = w.store.read();
    const def = structuredClone(syntheticAdultIntake(1));
    const frozen = JSON.parse(JSON.stringify({ def, submission, task })) as { def: typeof def; submission: typeof submission; task: typeof task };
    const ctx = { clarifications: [], annotations: [], reviewTask: state.tasks[task.id] };
    const one = renderBriefText(buildPreConsultationBrief(frozen.def, frozen.submission, ctx));
    const two = renderBriefText(buildPreConsultationBrief(frozen.def, frozen.submission, ctx));
    assert.equal(one, two);
    assert.ok(one.startsWith(BRIEF_STATIC_LINES.syntheticBanner));
    assert.deepEqual(JSON.parse(JSON.stringify(frozen.def)), def);
    const approvedLike = { ...frozen.def, contentStatus: "CLINICALLY_APPROVED" as const };
    assert.equal(buildPreConsultationBrief(approvedLike, frozen.submission, ctx).banner, null);
  });
});

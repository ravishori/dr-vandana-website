import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { doctor, journeyWithCycle, patientA, world } from "@/lib/continuity/fixtures";

const ok = <T>(r: { ok: true; value: T } | { ok: false; code: string }): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};

describe("agenda: patient and psychologist topics stay distinguishable", () => {
  it("records source and author for each topic", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const p = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic patient topic", description: "synthetic detail" }));
    const d = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic clinician topic" }));
    assert.equal(p.source, "patient_preparation");
    assert.equal(p.status, "proposed");
    assert.equal(p.createdBy, patientA.userId);
    assert.equal(d.source, "psychologist");
    assert.equal(d.status, "accepted");
    assert.equal(d.createdBy, doctor.userId);
    const all = ok(await w.service.listAgenda(doctor, cycle.id));
    assert.deepEqual(all.map((t) => t.source), ["patient_preparation", "psychologist"]);
  });

  it("the patient sees only what they proposed", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const p = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic patient topic" }));
    ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic clinician topic" }));
    assert.deepEqual(ok(await w.service.listAgenda(patientA, cycle.id)).map((t) => t.id), [p.id]);
  });

  it("validates titles and descriptions and keeps the wording verbatim", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.proposeTopic(patientA, cycle.id, { title: "  " }), { ok: false, code: "invalid_input" });
    assert.deepEqual(await w.service.proposeTopic(patientA, cycle.id, { title: "x".repeat(201) }), { ok: false, code: "invalid_input" });
    const t = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "  spaced \u{1F642}  " }));
    assert.equal(t.title, "  spaced \u{1F642}  ");
  });
});

describe("agenda: psychologist workflow", () => {
  it("accepts a patient proposal, then marks it discussed only once the consultation stage has begun", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const p = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic" }));
    const accepted = ok(await w.service.setTopicStatus(doctor, p.id, "accepted", p.version));
    assert.deepEqual(await w.service.setTopicStatus(doctor, p.id, "discussed", accepted.version), { ok: false, code: "stage_not_open" });
    ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    const discussed = ok(await w.service.setTopicStatus(doctor, p.id, "discussed", accepted.version));
    assert.equal(discussed.status, "discussed");
    assert.deepEqual(await w.service.setTopicStatus(doctor, p.id, "accepted", discussed.version), { ok: false, code: "invalid_transition" });
  });

  it("supports partially discussed and deferred", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const a = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic a" }));
    const b = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic b" }));
    ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    const partial = ok(await w.service.setTopicStatus(doctor, a.id, "partially_discussed", a.version));
    assert.equal(partial.status, "partially_discussed");
    assert.equal(ok(await w.service.setTopicStatus(doctor, b.id, "deferred", b.version)).status, "deferred");
  });

  it("topic status is workflow only: discussing a topic changes nothing else", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const t = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic" }));
    const c1 = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    ok(await w.service.setTopicStatus(doctor, t.id, "discussed", t.version));
    const after = ok(await w.service.viewCycle(doctor, cycle.id));
    assert.equal(after.status, "consultation");
    assert.equal(after.reviewedAt, null);
    assert.equal(after.version, c1.version);
  });

  it("reorders only with an exact list of the live topics", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const a = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic a" }));
    const b = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic b" }));
    const c = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic c" }));
    const out = ok(await w.service.reorderTopics(doctor, cycle.id, [c.id, a.id, b.id]));
    assert.deepEqual(out.map((t) => t.id), [c.id, a.id, b.id]);
    assert.deepEqual(ok(await w.service.listAgenda(doctor, cycle.id)).map((t) => t.id), [c.id, a.id, b.id]);
    for (const bad of [[a.id, b.id], [a.id, a.id, b.id], [a.id, b.id, "nope-0000"], [a.id, b.id, c.id, c.id]]) {
      assert.deepEqual(await w.service.reorderTopics(doctor, cycle.id, bad), { ok: false, code: "invalid_input" });
    }
    assert.deepEqual(ok(await w.service.listAgenda(doctor, cycle.id)).map((t) => t.id), [c.id, a.id, b.id]);
  });

  it("opening the agenda does not change anything", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic" }));
    const before = w.repo.dump();
    for (let i = 0; i < 3; i += 1) ok(await w.service.listAgenda(doctor, cycle.id));
    assert.equal(w.repo.dump(), before);
  });

  it("the patient cannot change topic status or order", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const t = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic" }));
    assert.deepEqual(await w.service.setTopicStatus(patientA, t.id, "accepted", t.version), { ok: false, code: "forbidden" });
    assert.deepEqual(await w.service.reorderTopics(patientA, cycle.id, [t.id]), { ok: false, code: "forbidden" });
  });
});

describe("agenda from shared preparation", () => {
  it("builds a topic from a SHARED item without altering the patient's item", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "question", content: "patient's own wording" }));
    const shared = ok(await w.service.sharePreparationItem(patientA, item.id, item.version));
    const topic = ok(await w.service.topicFromSharedItem(doctor, item.id, { title: "clinician-chosen title" }));
    assert.equal(topic.sourcePreparationItemId, item.id);
    assert.equal(topic.source, "patient_preparation");
    assert.equal(topic.title, "clinician-chosen title");
    const after = ok(await w.service.getPreparationItem(doctor, item.id));
    assert.equal(after.content, "patient's own wording");
    assert.equal(after.version, shared.version);
  });

  it("cannot build a topic from a private or unknown item (looks like 'not found')", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "question", content: "private synthetic" }));
    assert.deepEqual(await w.service.topicFromSharedItem(doctor, item.id, { title: "x" }), { ok: false, code: "not_found" });
    assert.deepEqual(await w.service.topicFromSharedItem(doctor, "missing-item-0001", { title: "x" }), { ok: false, code: "not_found" });
    assert.equal(ok(await w.service.listAgenda(doctor, cycle.id)).length, 0);
  });
});

describe("carry-forward", () => {
  it("refuses to carry forward a discussed topic, and no next cycle can start while the previous one is open", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const keep = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic deferred", description: "synthetic description" }));
    const done = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic discussed" }));
    const c1 = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    const deferred = ok(await w.service.setTopicStatus(doctor, keep.id, "deferred", keep.version));
    ok(await w.service.setTopicStatus(doctor, done.id, "discussed", done.version));
    // no next cycle yet, and the previous cycle is not terminal
    ok(await w.service.advanceCycle(doctor, cycle.id, "practice", c1.version));
    assert.deepEqual(await w.service.startCycle(doctor, journey.id), { ok: false, code: "open_cycle_exists" });
    assert.equal(ok(await w.service.listJourneyCycles(doctor, journey.id)).length, 1);
    // a discussed topic cannot be carried forward
    assert.deepEqual(await w.service.carryForwardTopic(doctor, done.id, cycle.id), { ok: false, code: "invalid_transition" });
    assert.equal(deferred.status, "deferred");
  });

  it("carries a deferred topic into a later cycle (second cycle created after the first was cancelled in preparation)", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const t = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic deferred", description: "synthetic description" }));
    const deferred = ok(await w.service.setTopicStatus(doctor, t.id, "deferred", t.version));
    ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    const next = ok(await w.service.startCycle(doctor, journey.id));
    const carried = ok(await w.service.carryForwardTopic(doctor, t.id, next.id));
    assert.equal(carried.source, "carried_forward");
    assert.equal(carried.status, "proposed");
    assert.equal(carried.carriedFromTopicId, t.id);
    assert.equal(carried.title, "synthetic deferred");
    assert.equal(carried.journeyCycleId, next.id);
    const original = ok(await w.service.listAgenda(doctor, cycle.id)).find((x) => x.id === t.id)!;
    assert.equal(original.status, "deferred");
    assert.equal(original.version, deferred.version);
    // not into its own cycle, and not into a cycle that is no longer in preparation
    assert.deepEqual(await w.service.carryForwardTopic(doctor, t.id, cycle.id), { ok: false, code: "invalid_input" });
  });
});

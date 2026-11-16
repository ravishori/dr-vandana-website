import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PATIENT_A, journeyWithCycle, doctor, patientA, world } from "@/lib/continuity/fixtures";

const ok = <T>(r: { ok: true; value: T } | { ok: false; code: string }): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};

const draft = async (w: ReturnType<typeof world>, cycleId: string, content = "synthetic concern text") =>
  ok(await w.service.createPreparationDraft(patientA, cycleId, { itemType: "concern", content }));

describe("preparation: private by default, shared only by explicit action", () => {
  it("creates a private draft that the psychologist cannot see or fetch", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id);
    assert.equal(item.visibility, "private");
    assert.equal(item.status, "draft");
    assert.equal(item.provenance, "patient_reported");
    assert.deepEqual(ok(await w.service.listSharedPreparation(doctor, cycle.id)), []);
    assert.deepEqual(await w.service.getPreparationItem(doctor, item.id), { ok: false, code: "not_found" });
    assert.ok(w.sink.events.some((e) => e.outcome === "denied" && e.reason === "private_to_patient"));
  });

  it("the patient sees their own drafts", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id);
    assert.deepEqual(ok(await w.service.listMyPreparation(patientA, cycle.id)).map((i) => i.id), [item.id]);
    assert.equal(ok(await w.service.getPreparationItem(patientA, item.id)).content, "synthetic concern text");
  });

  it("explicit sharing exposes only the selected item", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const a = await draft(w, cycle.id, "synthetic shared one");
    const b = await draft(w, cycle.id, "synthetic stays private");
    const shared = ok(await w.service.sharePreparationItem(patientA, a.id, a.version));
    assert.equal(shared.visibility, "shared_with_psychologist");
    assert.equal(shared.status, "submitted");
    assert.ok(shared.sharedAt);
    const seen = ok(await w.service.listSharedPreparation(doctor, cycle.id));
    assert.deepEqual(seen.map((i) => i.id), [a.id]);
    assert.deepEqual(await w.service.getPreparationItem(doctor, b.id), { ok: false, code: "not_found" });
    assert.equal(ok(await w.service.getPreparationItem(doctor, a.id)).provenance, "patient_reported");
  });

  it("nothing makes a private item shared: reading, opening or listing never changes visibility", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id);
    const before = w.repo.dump();
    for (let i = 0; i < 3; i += 1) {
      await w.service.listSharedPreparation(doctor, cycle.id);
      await w.service.getPreparationItem(doctor, item.id);
      await w.service.listMyPreparation(patientA, cycle.id);
      await w.service.viewCycle(doctor, cycle.id);
    }
    const strip = (s: string) => s.replace(/"events":\[.*\]\}$/, "");
    assert.equal(strip(w.repo.dump()), strip(before));
    assert.equal(ok(await w.service.getPreparationItem(patientA, item.id)).visibility, "private");
  });

  it("opening the psychologist's preparation view does not record any review", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const a = await draft(w, cycle.id);
    ok(await w.service.sharePreparationItem(patientA, a.id, a.version));
    const before = w.repo.dump();
    ok(await w.service.listSharedPreparation(doctor, cycle.id));
    assert.equal(w.repo.dump(), before);
  });
});

describe("preparation: editing, withdrawing, wording", () => {
  it("the patient can edit a draft, keeping their exact words", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id);
    const words = "  exact words\nwith <markup> & emoji \u{1F642}  ";
    const edited = ok(await w.service.editPreparationDraft(patientA, item.id, words, item.version));
    assert.equal(edited.content, words);
    assert.equal(edited.version, item.version + 1);
  });

  it("a shared item is immutable: the patient cannot edit it, nobody can change its wording", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id, "original shared wording");
    const shared = ok(await w.service.sharePreparationItem(patientA, item.id, item.version));
    assert.deepEqual(await w.service.editPreparationDraft(patientA, item.id, "changed", shared.version), { ok: false, code: "item_not_editable" });
    assert.deepEqual(await w.service.editPreparationDraft(doctor, item.id, "changed", shared.version), { ok: false, code: "forbidden" });
    // even a buggy write that holds a valid grant cannot alter shared wording
    await assert.rejects(
      w.guard.run(
        patientA,
        { category: "A", action: "write", patientProfileId: PATIENT_A, resourceKind: "preparation_item", resourceId: item.id, patientAuthored: true },
        async (grant) => w.repo.transaction(async (ops) => ops.putItem(grant, { ...shared, content: "tampered" }, shared.version)),
      ),
      /immutable/,
    );
    assert.equal(ok(await w.service.getPreparationItem(doctor, item.id)).content, "original shared wording");
  });

  it("withdraws an unshared draft; withdrawal after sharing is refused until policy is decided", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const a = await draft(w, cycle.id);
    const b = await draft(w, cycle.id, "synthetic second");
    const withdrawn = ok(await w.service.withdrawPreparationDraft(patientA, a.id, a.version));
    assert.equal(withdrawn.status, "withdrawn");
    assert.ok(withdrawn.withdrawnAt);
    assert.deepEqual(await w.service.editPreparationDraft(patientA, a.id, "x synthetic", withdrawn.version), { ok: false, code: "item_not_editable" });
    const shared = ok(await w.service.sharePreparationItem(patientA, b.id, b.version));
    assert.deepEqual(await w.service.withdrawPreparationDraft(patientA, b.id, shared.version), { ok: false, code: "withdrawal_after_sharing_policy_undecided" });
    assert.equal(ok(await w.service.listSharedPreparation(doctor, cycle.id)).length, 1);
  });

  it("only works while the cycle is in preparation", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = await draft(w, cycle.id);
    ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    assert.deepEqual(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "late synthetic" }), { ok: false, code: "stage_not_open" });
    assert.deepEqual(await w.service.sharePreparationItem(patientA, item.id, item.version), { ok: false, code: "stage_not_open" });
  });

  it("validates input and detects stale versions; skipping prompts never blocks saving", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const bad = [
      { itemType: "mood_score" as never, content: "synthetic" },
      { itemType: "concern" as const, content: "   " },
      { itemType: "concern" as const, content: "x".repeat(4001) },
    ];
    for (const input of bad) {
      assert.deepEqual(await w.service.createPreparationDraft(patientA, cycle.id, input), { ok: false, code: "invalid_input" });
    }
    const item = await draft(w, cycle.id);
    assert.deepEqual(await w.service.editPreparationDraft(patientA, item.id, "synthetic", item.version + 3), { ok: false, code: "version_conflict" });
    // one item is enough: no other prompt is required
    assert.equal(ok(await w.service.listMyPreparation(patientA, cycle.id)).length, 1);
  });

  it("does not analyse the text: urgent-sounding and ordinary text are treated identically", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const calm = await draft(w, cycle.id, "synthetic ordinary sentence");
    const urgent = await draft(w, cycle.id, "synthetic URGENT emergency help immediately");
    const keys = (o: object) => Object.keys(o).sort().join(",");
    assert.equal(keys(calm), keys(urgent));
    assert.equal(calm.visibility, urgent.visibility);
    assert.equal(calm.status, urgent.status);
    const events = w.sink.events.filter((e) => e.action === "write");
    assert.ok(events.length >= 2);
    assert.ok(w.sink.events.every((e) => !JSON.stringify(e).toLowerCase().includes("urgent")));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AccessGrant, ClinicalAccessLogSink } from "@/lib/clinical-access";
import {
  CARE_REL_A,
  CARE_REL_B,
  PATIENT_A,
  PATIENT_B,
  doctor,
  journeyWithCycle,
  patientA,
  patientB,
  staff,
  superAdmin,
  world,
} from "@/lib/continuity/fixtures";

const ok = <T>(r: { ok: true; value: T } | { ok: false; code: string }): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};

describe("patient ownership (IDOR)", () => {
  it("patient B cannot reach patient A's journey, cycle, items or topics (always 'not found')", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic A private note" }));
    const topic = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic topic" }));

    const nf = { ok: false, code: "not_found" };
    assert.deepEqual(await w.service.viewCycle(patientB, cycle.id), nf);
    assert.deepEqual(await w.service.listJourneyCycles(patientB, journey.id), nf);
    assert.deepEqual(await w.service.getPreparationItem(patientB, item.id), nf);
    assert.deepEqual(await w.service.listMyPreparation(patientB, cycle.id), nf);
    assert.deepEqual(await w.service.editPreparationDraft(patientB, item.id, "hijack", item.version), nf);
    assert.deepEqual(await w.service.sharePreparationItem(patientB, item.id, item.version), nf);
    assert.deepEqual(await w.service.withdrawPreparationDraft(patientB, item.id, item.version), nf);
    assert.deepEqual(await w.service.createPreparationDraft(patientB, cycle.id, { itemType: "concern", content: "x synthetic" }), nf);
    assert.deepEqual(await w.service.proposeTopic(patientB, cycle.id, { title: "x" }), nf);
    assert.deepEqual(await w.service.listAgenda(patientB, cycle.id), nf);
    // a missing id looks identical to someone else's id
    assert.deepEqual(await w.service.viewCycle(patientB, "does-not-exist"), nf);
    assert.equal(topic.patientProfileId, PATIENT_A);
    // and the denied attempts are in the access log
    assert.ok(w.sink.events.some((e) => e.outcome === "denied" && e.reason === "not_owner"));
    // nothing changed for A
    assert.equal(ok(await w.service.getPreparationItem(patientA, item.id)).content, "synthetic A private note");
  });

  it("each patient sees only their own journeys", async () => {
    const w = world();
    await journeyWithCycle(w);
    const b = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_B, careRelationshipId: CARE_REL_B }));
    assert.deepEqual(ok(await w.service.listMyJourneys(patientA)).map((j) => j.patientProfileId), [PATIENT_A]);
    assert.deepEqual(ok(await w.service.listMyJourneys(patientB)).map((j) => j.id), [b.id]);
  });
});

describe("authentication, MFA and care relationship", () => {
  it("denies unauthenticated callers", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.viewCycle(null, cycle.id), { ok: false, code: "unauthenticated" });
    assert.deepEqual(await w.service.listJourneyCycles(null, journey.id), { ok: false, code: "unauthenticated" });
    assert.deepEqual(await w.service.createJourney(null, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }), { ok: false, code: "unauthenticated" });
    assert.deepEqual(await w.service.listSharedPreparation(null, cycle.id), { ok: false, code: "unauthenticated" });
  });

  it("denies a psychologist without completed MFA, whatever they ask for", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const noMfa = { ...doctor, mfaCompleted: false };
    for (const r of [
      await w.service.viewCycle(noMfa, cycle.id),
      await w.service.listSharedPreparation(noMfa, cycle.id),
      await w.service.advanceCycle(noMfa, cycle.id, "consultation", cycle.version),
      await w.service.setJourneyStatus(noMfa, journey.id, "paused", journey.version),
      await w.service.createJourney(noMfa, { patientProfileId: PATIENT_B, careRelationshipId: CARE_REL_B }),
    ]) {
      assert.equal(r.ok, false);
      assert.equal((r as { code: string }).code, "forbidden");
    }
    assert.ok(w.sink.events.some((e) => e.reason === "mfa_required"));
  });

  it("denies a psychologist with no active care relationship", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    w.relationships.delete(`${doctor.userId}:${PATIENT_A}`);
    assert.deepEqual(await w.service.viewCycle(doctor, cycle.id), { ok: false, code: "forbidden" });
    assert.deepEqual(await w.service.listSharedPreparation(doctor, cycle.id), { ok: false, code: "forbidden" });
  });

  it("re-checks the relationship on every call (access revoked mid-session)", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    ok(await w.service.viewCycle(doctor, cycle.id));
    w.relationships.delete(`${doctor.userId}:${PATIENT_A}`);
    assert.deepEqual(await w.service.viewCycle(doctor, cycle.id), { ok: false, code: "forbidden" });
    w.relationships.add(`${doctor.userId}:${PATIENT_A}`);
    ok(await w.service.viewCycle(doctor, cycle.id));
  });

  it("denies a psychologist the permissions they lack", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const readOnly = { ...doctor, permissions: ["VIEW_CLINICAL_RECORDS" as const] };
    ok(await w.service.listSharedPreparation(readOnly, cycle.id));
    assert.deepEqual(await w.service.addPsychologistTopic(readOnly, cycle.id, { title: "synthetic" }), { ok: false, code: "forbidden" });
  });
});

describe("staff and super-admin have no clinical content access", () => {
  it("are denied everywhere, including role-only operations", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "topic", content: "synthetic" }));
    ok(await w.service.sharePreparationItem(patientA, item.id, item.version));
    for (const who of [staff, superAdmin]) {
      for (const r of [
        await w.service.viewCycle(who, cycle.id),
        await w.service.listJourneyCycles(who, journey.id),
        await w.service.listSharedPreparation(who, cycle.id),
        await w.service.listAgenda(who, cycle.id),
        await w.service.getPreparationItem(who, item.id),
        await w.service.listEvents(who, journey.id),
        await w.service.createJourney(who, { patientProfileId: PATIENT_B, careRelationshipId: CARE_REL_B }),
        await w.service.advanceCycle(who, cycle.id, "consultation", cycle.version),
      ]) {
        assert.equal(r.ok, false);
        assert.ok(["forbidden", "not_found"].includes((r as { code: string }).code));
      }
    }
  });
});

describe("roles cannot cross over", () => {
  it("a patient cannot create journeys, start or advance cycles, or run the psychologist workflow", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    for (const r of [
      await w.service.createJourney(patientA, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }),
      await w.service.setJourneyStatus(patientA, journey.id, "closed", journey.version),
      await w.service.startCycle(patientA, journey.id),
      await w.service.advanceCycle(patientA, cycle.id, "cancelled", cycle.version),
      await w.service.addPsychologistTopic(patientA, cycle.id, { title: "synthetic" }),
      await w.service.listSharedPreparation(patientA, cycle.id),
    ]) {
      assert.deepEqual(r, { ok: false, code: "forbidden" });
    }
  });

  it("a psychologist cannot write preparation on the patient's behalf", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.createPreparationDraft(doctor, cycle.id, { itemType: "concern", content: "synthetic" }), { ok: false, code: "forbidden" });
    assert.deepEqual(await w.service.proposeTopic(doctor, cycle.id, { title: "synthetic" }), { ok: false, code: "forbidden" });
  });
});

describe("fail-closed logging and no bypass", () => {
  it("fails closed when the access log cannot be written: nothing is read or changed", async () => {
    const good = world();
    const { cycle } = await journeyWithCycle(good);
    let down = false;
    const sink: ClinicalAccessLogSink = {
      append: async (e) => {
        if (down) throw new Error("log down");
        good.sink.events.push(e);
      },
    };
    const w = world({ sink });
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const c = ok(await w.service.startCycle(doctor, j.id));
    const before = w.repo.dump();
    down = true;
    assert.deepEqual(await w.service.viewCycle(doctor, c.id), { ok: false, code: "audit_unavailable" });
    assert.deepEqual(await w.service.advanceCycle(doctor, c.id, "consultation", c.version), { ok: false, code: "audit_unavailable" });
    assert.deepEqual(await w.service.createPreparationDraft(patientA, c.id, { itemType: "concern", content: "synthetic" }), { ok: false, code: "audit_unavailable" });
    assert.equal(w.repo.dump(), before);
    assert.ok(cycle.id);
  });

  it("direct repository access without a valid grant is impossible", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic private" }));
    const forged = Object.create(Object.getPrototypeOf((await grantOnce(w)) as object)) as AccessGrant;
    await assert.rejects(w.repo.transaction(async (ops) => ops.getItem(forged, item.id)), /forged|missing/);
    await assert.rejects(w.repo.transaction(async (ops) => ops.getItem({} as AccessGrant, item.id)), /forged|missing/);
    await assert.rejects(w.repo.transaction(async (ops) => ops.listSharedItems(undefined as unknown as AccessGrant, cycle.id)), /forged|missing/);
  });

  it("a grant for one resource cannot read another, and cannot be reused after the operation", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic private" }));
    const stolen = await grantOnce(w);
    await assert.rejects(w.repo.transaction(async (ops) => ops.getItem(stolen, item.id)), /revoked|does not match/);
  });

  it("records every protected call in the access log with opaque identifiers only", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic text with name Asha Verma" }));
    assert.ok(w.sink.events.length >= 3);
    for (const e of w.sink.events) {
      assert.ok(!JSON.stringify(e).includes("Asha"));
      assert.ok(!JSON.stringify(e).includes("synthetic text"));
    }
  });
});

/** Obtain a real, already-revoked grant by running a guarded no-op through the guard directly. */
async function grantOnce(w: ReturnType<typeof world>): Promise<AccessGrant> {
  const { createClinicalAccessGuard } = await import("@/lib/clinical-access");
  const guard = createClinicalAccessGuard({
    sink: w.sink,
    facts: { careRelationshipActive: async () => true, stepUpVerifiedAt: async () => null },
    now: () => w.clock.now,
  });
  let kept: AccessGrant | null = null;
  await guard.run(
    doctor,
    { category: "A", action: "read", patientProfileId: PATIENT_A, resourceKind: "preparation_item", resourceId: "some-other-resource-id" },
    async (g) => {
      kept = g;
    },
  );
  return kept as unknown as AccessGrant;
}

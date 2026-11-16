/**
 * Review-driven tests for PR #38: concurrency, negative cases, grant
 * lifecycle, state-machine matrix, and tests that PIN behaviour which rests on
 * an implementation ASSUMPTION (not a PRD rule or owner decision). A pinned
 * test documents what the code does today; it does not make it policy.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { AccessGrant } from "@/lib/clinical-access";
import { buildEvent } from "@/lib/continuity/events";
import {
  CARE_REL_A,
  PATIENT_A,
  doctor,
  journeyWithCycle,
  patientA,
  patientB,
  world,
} from "@/lib/continuity/fixtures";
import { CYCLE_TRANSITIONS } from "@/lib/continuity/state-machines";
import { CYCLE_STATUSES } from "@/lib/continuity/types";

type R<T> = { ok: true; value: T } | { ok: false; code: string };
const ok = <T>(r: R<T>): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};
const codes = (rs: R<unknown>[]) => rs.map((r) => (r.ok ? "ok" : r.code));
const count = (xs: string[], v: string) => xs.filter((x) => x === v).length;

describe("concurrency (serialised transactions, optimistic versions)", () => {
  it("8 parallel createJourney calls for one patient create exactly one journey", async () => {
    const w = world();
    const rs = await Promise.all(Array.from({ length: 8 }, () => w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A })));
    assert.equal(count(codes(rs), "ok"), 1);
    assert.equal(count(codes(rs), "open_journey_exists"), 7);
    assert.equal(w.repo.counts().journeys, 1);
  });

  it("8 parallel startCycle calls create exactly one cycle", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const rs = await Promise.all(Array.from({ length: 8 }, () => w.service.startCycle(doctor, j.id)));
    assert.equal(count(codes(rs), "ok"), 1);
    assert.equal(count(codes(rs), "open_cycle_exists"), 7);
    assert.equal(w.repo.counts().cycles, 1);
  });

  it("8 parallel advances with the same version change the cycle once and log one event", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const rs = await Promise.all(Array.from({ length: 8 }, () => w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version)));
    assert.equal(count(codes(rs), "ok"), 1);
    assert.ok(codes(rs).every((c) => ["ok", "version_conflict", "invalid_transition"].includes(c)));
    const events = ok(await w.service.listEvents(doctor, journey.id));
    assert.equal(events.filter((e) => e.eventType === "cycle_status_changed").length, 1);
  });

  it("8 parallel shares of one draft share it once", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    const rs = await Promise.all(Array.from({ length: 8 }, () => w.service.sharePreparationItem(patientA, item.id, item.version)));
    assert.equal(count(codes(rs), "ok"), 1);
    assert.ok(codes(rs).every((c) => ["ok", "version_conflict", "item_not_editable"].includes(c)));
    const events = ok(await w.service.listEvents(doctor, journey.id));
    assert.equal(events.filter((e) => e.eventType === "preparation_item_shared").length, 1);
  });

  it("a share racing an edit can never change wording after the share", async () => {
    for (let round = 0; round < 10; round += 1) {
      const w = world();
      const { cycle } = await journeyWithCycle(w);
      const item = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "before" }));
      const [edit, share] = await Promise.all([
        w.service.editPreparationDraft(patientA, item.id, "after", item.version),
        w.service.sharePreparationItem(patientA, item.id, item.version),
      ]);
      const seen = ok(await w.service.listSharedPreparation(doctor, cycle.id));
      if (share.ok) {
        // whatever the psychologist can see equals what the patient last saved before sharing
        assert.equal(seen.length, 1);
        assert.equal(seen[0].content, edit.ok ? "after" : "before");
        const again = ok(await w.service.getPreparationItem(doctor, item.id));
        assert.equal(again.content, seen[0].content);
      }
    }
  });

  it("10 parallel patient proposals get unique, gapless display orders", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    await Promise.all(Array.from({ length: 10 }, (_, i) => w.service.proposeTopic(patientA, cycle.id, { title: `synthetic ${i}` })));
    const orders = ok(await w.service.listAgenda(doctor, cycle.id)).map((t) => t.displayOrder).sort((a, b) => a - b);
    assert.deepEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("parallel carry-forward of one topic creates exactly one copy", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const t = ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic" }));
    ok(await w.service.setTopicStatus(doctor, t.id, "deferred", t.version));
    ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    const next = ok(await w.service.startCycle(doctor, journey.id));
    const rs = await Promise.all(Array.from({ length: 5 }, () => w.service.carryForwardTopic(doctor, t.id, next.id)));
    assert.equal(count(codes(rs), "ok"), 1);
    assert.equal(count(codes(rs), "already_carried_forward"), 4);
    assert.equal(ok(await w.service.listAgenda(doctor, next.id)).length, 1);
  });

  it("revocation of the care relationship takes effect between two concurrent reads", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const first = await w.service.viewCycle(doctor, cycle.id);
    w.relationships.delete(`${doctor.userId}:${PATIENT_A}`);
    const rs = await Promise.all([w.service.viewCycle(doctor, cycle.id), w.service.listSharedPreparation(doctor, cycle.id)]);
    assert.equal(first.ok, true);
    assert.deepEqual(codes(rs), ["forbidden", "forbidden"]);
  });
});

describe("privacy of private drafts: negative cases", () => {
  it("nothing the psychologist (or the audit stream) can read mentions an unshared draft's content", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const secret = "synthetic-secret-phrase-7731";
    const draft = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "experience", content: secret }));
    ok(await w.service.editPreparationDraft(patientA, draft.id, `${secret} edited`, draft.version));
    const surfaces = JSON.stringify([
      ok(await w.service.listSharedPreparation(doctor, cycle.id)),
      ok(await w.service.listAgenda(doctor, cycle.id)),
      ok(await w.service.listEvents(doctor, journey.id)),
      ok(await w.service.viewCycle(doctor, cycle.id)),
      ok(await w.service.listJourneyCycles(doctor, journey.id)),
      w.sink.events,
    ]);
    assert.ok(!surfaces.includes("synthetic-secret"));
  });

  it("draft creation, editing and withdrawal leave no trace in the psychologist-readable event stream", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const before = ok(await w.service.listEvents(doctor, journey.id)).length;
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    const e = ok(await w.service.editPreparationDraft(patientA, d.id, "synthetic 2", d.version));
    ok(await w.service.withdrawPreparationDraft(patientA, d.id, e.version));
    const events = ok(await w.service.listEvents(doctor, journey.id));
    assert.equal(events.length, before);
    assert.ok(!JSON.stringify(events).includes(d.id));
  });

  it("only the shared item's event appears after sharing, with enumerated metadata", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const a = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "question", content: "synthetic a" }));
    ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic b" }));
    ok(await w.service.sharePreparationItem(patientA, a.id, a.version));
    const shared = ok(await w.service.listEvents(doctor, journey.id)).filter((e) => e.entityType === "preparation_item");
    assert.deepEqual(shared.map((e) => e.entityId), [a.id]);
    assert.deepEqual(shared[0].metadata, { itemType: "question", visibility: "shared_with_psychologist" });
  });

  it("a withdrawn draft is never listed to the psychologist and cannot be shared later", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    const withdrawn = ok(await w.service.withdrawPreparationDraft(patientA, d.id, d.version));
    assert.deepEqual(ok(await w.service.listSharedPreparation(doctor, cycle.id)), []);
    assert.deepEqual(await w.service.sharePreparationItem(patientA, d.id, withdrawn.version), { ok: false, code: "item_not_editable" });
  });

  it("shared items stop being readable when the care relationship ends", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    ok(await w.service.sharePreparationItem(patientA, d.id, d.version));
    assert.equal(ok(await w.service.listSharedPreparation(doctor, cycle.id)).length, 1);
    w.relationships.delete(`${doctor.userId}:${PATIENT_A}`);
    assert.deepEqual(await w.service.listSharedPreparation(doctor, cycle.id), { ok: false, code: "forbidden" });
    assert.deepEqual(await w.service.getPreparationItem(doctor, d.id), { ok: false, code: "forbidden" });
  });

  it("the patient's agenda never loads or returns the psychologist's topics", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const mine = ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic mine" }));
    ok(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic clinician-only wording" }));
    const view = ok(await w.service.listAgenda(patientA, cycle.id));
    assert.deepEqual(view.map((t) => t.id), [mine.id]);
    assert.ok(!JSON.stringify(view).includes("clinician-only"));
  });

  it("event metadata cannot carry free text, names or contact details", () => {
    const base = { id: "e-0001", journeyId: "j-0001", cycleId: null, actorUserId: "u-0001", eventType: "cycle_started" as const, entityType: "cycle" as const, entityId: "c-0001", occurredAt: "2026-11-17T00:00:00.000Z", correlationId: "x-0001" };
    assert.throws(() => buildEvent({ ...base, metadata: { toStatus: "asha.verma@example.com" } }));
    assert.throws(() => buildEvent({ ...base, metadata: { toStatus: "free text here" } }));
    assert.throws(() => buildEvent({ ...base, metadata: { note: "preparation" } as never }));
    assert.doesNotThrow(() => buildEvent({ ...base, metadata: { toStatus: "preparation", sequenceNumber: 1 } }));
  });

  it("a different patient's drafts are invisible even to a patient with the same role", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    assert.deepEqual(await w.service.getPreparationItem(patientB, d.id), { ok: false, code: "not_found" });
    assert.deepEqual(await w.service.listMyPreparation(patientB, cycle.id), { ok: false, code: "not_found" });
  });
});

describe("grant lifecycle", () => {
  const req = (resourceId: string, action: "read" | "write" = "write") => ({
    category: "A" as const,
    action,
    patientProfileId: PATIENT_A,
    resourceKind: "preparation_item",
    resourceId,
    patientAuthored: true,
  });

  it("a read grant cannot write", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    const item = ok(await w.service.getPreparationItem(patientA, d.id));
    await assert.rejects(
      w.guard.run(patientA, { ...req(d.id, "read"), privateToPatient: true }, async (grant) =>
        w.repo.transaction(async (ops) => ops.putItem(grant, { ...item, content: "x" }, item.version)),
      ),
      /write grant|does not match/,
    );
  });

  it("a grant is revoked when the operation throws, and cannot be reused", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    let kept: AccessGrant | null = null;
    await assert.rejects(
      w.guard.run(patientA, { ...req(d.id, "read"), privateToPatient: true }, async (g) => {
        kept = g;
        throw new Error("boom");
      }),
      /boom/,
    );
    await assert.rejects(w.repo.transaction(async (ops) => ops.getItem(kept as unknown as AccessGrant, d.id)), /revoked/);
  });

  it("parallel guarded operations get distinct grants and each is revoked afterwards", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    const grants: AccessGrant[] = [];
    await Promise.all(
      Array.from({ length: 6 }, () =>
        w.guard.run(patientA, { ...req(d.id, "read"), privateToPatient: true }, async (g) => {
          grants.push(g);
          await new Promise((r) => setTimeout(r, Math.random() * 3));
        }),
      ),
    );
    assert.equal(new Set(grants).size, 6);
    for (const g of grants) {
      await assert.rejects(w.repo.transaction(async (ops) => ops.getItem(g, d.id)), /revoked/);
    }
  });

  it("every service call is access-logged before it acts, including denials and reads", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const before = w.sink.events.length;
    await w.service.listSharedPreparation(doctor, cycle.id); // allowed read
    await w.service.listSharedPreparation(patientA, cycle.id); // role denial: service-level, logs nothing (see finding)
    await w.service.viewCycle(patientB, cycle.id); // guard denial, logged
    const added = w.sink.events.slice(before);
    assert.deepEqual(added.map((e) => e.outcome), ["allowed", "denied"]);
  });
});

describe("state machine review", () => {
  it("the cycle transition table is exactly the PRD flow (all 49 pairs)", () => {
    const allowed = new Set([
      "preparation>consultation", "preparation>cancelled", "consultation>practice", "consultation>review_incomplete",
      "practice>review_due", "practice>review_incomplete", "review_due>reviewed", "review_incomplete>reviewed",
    ]);
    for (const from of CYCLE_STATUSES) {
      for (const to of CYCLE_STATUSES) {
        assert.equal(CYCLE_TRANSITIONS[from].includes(to), allowed.has(`${from}>${to}`), `${from}>${to}`);
      }
    }
  });

  it("through the service, every transition outside the table is rejected and reviewed is never reachable", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    let c = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    for (const to of CYCLE_STATUSES) {
      if (to === "practice" || to === "review_incomplete") continue;
      const r = await w.service.advanceCycle(doctor, c.id, to, c.version);
      assert.equal(r.ok, false, to);
      assert.ok(["invalid_transition", "explicit_review_required"].includes((r as { code: string }).code), to);
    }
    c = ok(await w.service.advanceCycle(doctor, c.id, "review_incomplete", c.version));
    assert.deepEqual(await w.service.advanceCycle(doctor, c.id, "reviewed", c.version), { ok: false, code: "explicit_review_required" });
    assert.deepEqual(await w.service.advanceCycle(doctor, c.id, "practice", c.version), { ok: false, code: "invalid_transition" });
  });

  it("cancelled and reviewed-like end states are terminal", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const c = ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    for (const to of CYCLE_STATUSES) {
      const r = await w.service.advanceCycle(doctor, c.id, to, c.version);
      assert.equal(r.ok, false, to);
    }
  });

  it("appointments are only a link: no appointment input exists that could move a cycle", async () => {
    const dir = join(process.cwd(), "src", "lib", "continuity");
    const src = (readdirSync(dir) as string[])
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    assert.ok(!/from\s+["']@\/lib\/appointments/.test(src));
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const c = ok(await w.service.startCycle(doctor, j.id, { linkedAppointmentId: "appointment-cancelled-0001" }));
    // a cancelled or missed appointment changes nothing: there is no API for it, the cycle waits for the psychologist
    assert.equal(ok(await w.service.viewCycle(doctor, c.id)).status, "preparation");
  });

  it("closed journeys can be listed and read, never reopened, and a new journey may then start for the same patient", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    const closed = ok(await w.service.setJourneyStatus(doctor, journey.id, "closed", journey.version));
    assert.deepEqual(await w.service.setJourneyStatus(doctor, journey.id, "active", closed.version), { ok: false, code: "invalid_transition" });
    assert.equal(ok(await w.service.listMyJourneys(patientA)).length, 1);
    const second = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A })); // ASSUMPTION K4/K3
    assert.notEqual(second.id, journey.id);
    assert.equal(ok(await w.service.listMyJourneys(patientA)).length, 2);
  });
});

describe("PINNED ASSUMPTIONS (documented current behaviour, NOT approved policy)", () => {
  it("K9: a journey can be closed while a cycle is still open, and the open cycle stays workable", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const closed = ok(await w.service.setJourneyStatus(doctor, journey.id, "closed", journey.version));
    assert.equal(closed.status, "closed");
    assert.equal(ok(await w.service.viewCycle(doctor, cycle.id)).status, "preparation"); // still open
    // the patient can still prepare on the open cycle of a closed journey
    ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
  });

  it("K10: preparation and agenda work while a journey is paused", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    ok(await w.service.setJourneyStatus(doctor, journey.id, "paused", journey.version));
    ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic" }));
    ok(await w.service.proposeTopic(patientA, cycle.id, { title: "synthetic" }));
  });

  it("K11: the care relationship id is stored but not validated; access depends on the resolver for the patient", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: "any-string-at-all" }));
    assert.equal(j.careRelationshipId, "any-string-at-all");
  });

  it("K12: a cycle's linked appointment cannot be changed after creation (no reschedule support)", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const c = ok(await w.service.startCycle(doctor, j.id, { linkedAppointmentId: "appointment-0001" }));
    assert.equal(typeof (w.service as unknown as { relinkAppointment?: unknown }).relinkAppointment, "undefined");
    assert.equal(c.linkedAppointmentId, "appointment-0001");
  });

  it("K13: topics can only be added while the cycle is in preparation", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    assert.deepEqual(await w.service.addPsychologistTopic(doctor, cycle.id, { title: "synthetic late topic" }), { ok: false, code: "stage_not_open" });
  });

  it("K14: a withdrawn draft's text is retained in the store (no erasure rule exists)", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const d = ok(await w.service.createPreparationDraft(patientA, cycle.id, { itemType: "concern", content: "synthetic retained text" }));
    ok(await w.service.withdrawPreparationDraft(patientA, d.id, d.version));
    assert.ok(w.repo.dump().includes("synthetic retained text"));
  });

  it("K15: a role-only refusal (wrong role) is not written to the access log", async () => {
    const w = world();
    const { journey } = await journeyWithCycle(w);
    const before = w.sink.events.length;
    await w.service.listEvents(patientA, journey.id);
    assert.equal(w.sink.events.length, before);
  });
});

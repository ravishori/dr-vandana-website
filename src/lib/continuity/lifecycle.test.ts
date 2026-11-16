import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CYCLE_TRANSITIONS,
  JOURNEY_TRANSITIONS,
  TOPIC_TRANSITIONS,
  actionDrivenCycleTargets,
} from "@/lib/continuity/state-machines";
import { CYCLE_STATUSES, DEFAULT_CONTINUITY_FLAGS, continuityFlagsFromEnv } from "@/lib/continuity/types";
import {
  CARE_REL_A,
  PATIENT_A,
  doctor,
  journeyWithCycle,
  patientA,
  world,
} from "@/lib/continuity/fixtures";

const ok = <T>(r: { ok: true; value: T } | { ok: false; code: string }): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};

describe("feature flag", () => {
  it("is disabled by default and nothing works while disabled", async () => {
    assert.equal(DEFAULT_CONTINUITY_FLAGS.enabled, false);
    assert.equal(continuityFlagsFromEnv({}).enabled, false);
    assert.equal(continuityFlagsFromEnv({ CONTINUITY_LOOP_ENABLED: "yes" }).enabled, false);
    assert.equal(continuityFlagsFromEnv({ CONTINUITY_LOOP_ENABLED: "true" }).enabled, true);
    const w = world({ enabled: false });
    assert.deepEqual(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }), { ok: false, code: "feature_disabled" });
    assert.deepEqual(await w.service.listMyJourneys(patientA), { ok: false, code: "feature_disabled" });
    assert.equal(w.repo.counts().journeys, 0);
    assert.equal(w.sink.events.length, 0);
  });
});

describe("state machines (PRD 6)", () => {
  it("journey: active <-> paused, either can close, closed is terminal", () => {
    assert.deepEqual([...JOURNEY_TRANSITIONS.active], ["paused", "closed"]);
    assert.deepEqual([...JOURNEY_TRANSITIONS.paused], ["active", "closed"]);
    assert.deepEqual([...JOURNEY_TRANSITIONS.closed], []);
  });

  it("cycle: preparation -> consultation -> practice -> review_due -> reviewed, plus cancelled and review_incomplete", () => {
    assert.deepEqual([...CYCLE_TRANSITIONS.preparation], ["consultation", "cancelled"]);
    assert.deepEqual([...CYCLE_TRANSITIONS.consultation], ["practice", "review_incomplete"]);
    assert.deepEqual([...CYCLE_TRANSITIONS.practice], ["review_due", "review_incomplete"]);
    assert.deepEqual([...CYCLE_TRANSITIONS.review_due], ["reviewed"]);
    assert.deepEqual([...CYCLE_TRANSITIONS.review_incomplete], ["reviewed"]);
    assert.deepEqual([...CYCLE_TRANSITIONS.reviewed], []);
    assert.deepEqual([...CYCLE_TRANSITIONS.cancelled], []);
    assert.equal(CYCLE_STATUSES.length, 7);
  });

  it("no direct action ever targets 'reviewed' in this increment", () => {
    for (const s of CYCLE_STATUSES) assert.ok(!actionDrivenCycleTargets(s).includes("reviewed"), s);
  });

  it("topic: discussed and removed are terminal; deferred can return to accepted", () => {
    assert.deepEqual([...TOPIC_TRANSITIONS.discussed], []);
    assert.deepEqual([...TOPIC_TRANSITIONS.removed], []);
    assert.ok(TOPIC_TRANSITIONS.deferred.includes("accepted"));
  });
});

describe("journey lifecycle", () => {
  it("creates one active journey per patient and refuses a second open one", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    assert.equal(j.status, "active");
    assert.equal(j.version, 1);
    assert.deepEqual(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }), { ok: false, code: "open_journey_exists" });
  });

  it("pauses, resumes and closes; closed cannot be reopened (policy undecided)", async () => {
    const w = world();
    const { journey } = await journeyWithCycle(w);
    const paused = ok(await w.service.setJourneyStatus(doctor, journey.id, "paused", journey.version));
    assert.equal(paused.status, "paused");
    const active = ok(await w.service.setJourneyStatus(doctor, journey.id, "active", paused.version));
    const closed = ok(await w.service.setJourneyStatus(doctor, journey.id, "closed", active.version));
    assert.equal(closed.status, "closed");
    assert.ok(closed.closedAt);
    assert.deepEqual(await w.service.setJourneyStatus(doctor, journey.id, "active", closed.version), { ok: false, code: "invalid_transition" });
  });

  it("is not closed or paused automatically by time or missed appointments", async () => {
    const w = world();
    const { journey } = await journeyWithCycle(w);
    w.clock.now = new Date("2027-11-17T10:00:00+05:30"); // a year later
    const again = ok(await w.service.listJourneyCycles(doctor, journey.id));
    assert.equal(again.length, 1);
    const j = ok(await w.service.listMyJourneys({ ...patientA }));
    assert.equal(j[0].status, "active");
  });

  it("detects a stale version", async () => {
    const w = world();
    const { journey } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.setJourneyStatus(doctor, journey.id, "paused", journey.version + 5), { ok: false, code: "version_conflict" });
  });
});

describe("cycle lifecycle", () => {
  it("numbers cycles, allows one open cycle, and starts the next only after a terminal state", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    assert.equal(cycle.sequenceNumber, 1);
    assert.equal(cycle.status, "preparation");
    assert.deepEqual(await w.service.startCycle(doctor, journey.id), { ok: false, code: "open_cycle_exists" });
    const cancelled = ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    assert.equal(cancelled.status, "cancelled");
    const second = ok(await w.service.startCycle(doctor, journey.id));
    assert.equal(second.sequenceNumber, 2);
    assert.equal(ok(await w.service.listJourneyCycles(doctor, journey.id)).length, 2);
  });

  it("will not start a cycle on a paused or closed journey", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    ok(await w.service.advanceCycle(doctor, cycle.id, "cancelled", cycle.version));
    const paused = ok(await w.service.setJourneyStatus(doctor, journey.id, "paused", journey.version));
    assert.deepEqual(await w.service.startCycle(doctor, journey.id), { ok: false, code: "journey_not_active" });
    ok(await w.service.setJourneyStatus(doctor, journey.id, "closed", paused.version));
    assert.deepEqual(await w.service.startCycle(doctor, journey.id), { ok: false, code: "journey_not_active" });
  });

  it("walks the allowed path and rejects skipped or invalid steps", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.advanceCycle(doctor, cycle.id, "practice", cycle.version), { ok: false, code: "invalid_transition" });
    const c1 = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    assert.ok(c1.consultationAt);
    const c2 = ok(await w.service.advanceCycle(doctor, cycle.id, "practice", c1.version));
    const c3 = ok(await w.service.advanceCycle(doctor, cycle.id, "review_due", c2.version));
    assert.equal(c3.status, "review_due");
    assert.deepEqual(await w.service.advanceCycle(doctor, cycle.id, "cancelled", c3.version), { ok: false, code: "invalid_transition" });
  });

  it("supports review_incomplete from consultation or practice", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    const c1 = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    const inc = ok(await w.service.advanceCycle(doctor, cycle.id, "review_incomplete", c1.version));
    assert.equal(inc.status, "review_incomplete");
  });

  it("can never be marked reviewed by a plain transition, whatever the stage", async () => {
    const w = world();
    const { cycle } = await journeyWithCycle(w);
    let c = cycle;
    for (const to of ["consultation", "practice", "review_due"] as const) {
      assert.deepEqual(await w.service.advanceCycle(doctor, c.id, "reviewed", c.version), { ok: false, code: "explicit_review_required" });
      c = ok(await w.service.advanceCycle(doctor, c.id, to, c.version));
    }
    assert.deepEqual(await w.service.advanceCycle(doctor, c.id, "reviewed", c.version), { ok: false, code: "explicit_review_required" });
    assert.equal(ok(await w.service.viewCycle(doctor, c.id)).reviewedAt, null);
  });

  it("opening or viewing a cycle changes nothing; a linked appointment does not move it", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const c = ok(await w.service.startCycle(doctor, j.id, { linkedAppointmentId: "appointment-0001" }));
    assert.equal(c.linkedAppointmentId, "appointment-0001");
    const before = w.repo.dump();
    for (let i = 0; i < 3; i += 1) {
      ok(await w.service.viewCycle(doctor, c.id));
      ok(await w.service.viewCycle(patientA, c.id));
    }
    assert.equal(w.repo.dump(), before);
    assert.equal(ok(await w.service.viewCycle(doctor, c.id)).status, "preparation");
  });

  it("commits a cycle and its event together, or neither", async () => {
    const w = world();
    const j = ok(await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A }));
    const before = w.repo.counts();
    w.repo.failpoints.add("after_cycle_insert");
    assert.deepEqual(await w.service.startCycle(doctor, j.id), { ok: false, code: "internal_error" });
    assert.deepEqual(w.repo.counts(), before);
    w.repo.failpoints.delete("after_cycle_insert");
    ok(await w.service.startCycle(doctor, j.id));
    assert.equal(w.repo.counts().cycles, 1);
  });
});

describe("journey events", () => {
  it("records who did what with enumerated, non-sensitive metadata only", async () => {
    const w = world();
    const { journey, cycle } = await journeyWithCycle(w);
    const c1 = ok(await w.service.advanceCycle(doctor, cycle.id, "consultation", cycle.version));
    ok(await w.service.advanceCycle(doctor, cycle.id, "practice", c1.version));
    const events = ok(await w.service.listEvents(doctor, journey.id));
    assert.deepEqual(
      events.map((e) => e.eventType),
      ["journey_created", "cycle_started", "cycle_status_changed", "cycle_status_changed"],
    );
    for (const e of events) {
      assert.equal(e.actorUserId, doctor.userId);
      for (const [k, v] of Object.entries(e.metadata)) {
        assert.ok(["fromStatus", "toStatus", "itemType", "visibility", "source", "sequenceNumber", "count", "linkedAppointment"].includes(k));
        if (typeof v === "string") assert.match(v, /^[a-z0-9_]{1,40}$/);
      }
      assert.ok(!JSON.stringify(e).includes("@"));
    }
  });

  it("a patient cannot read the event history", async () => {
    const w = world();
    const { journey } = await journeyWithCycle(w);
    assert.deepEqual(await w.service.listEvents(patientA, journey.id), { ok: false, code: "forbidden" });
  });
});

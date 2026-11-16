import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InMemoryClinicalAccessLog,
  assertLogSafe,
  type ClinicalAccessEvent,
} from "@/lib/clinical-access/access-log";

const NOW = new Date("2026-11-16T10:00:00.000Z");

const base: ClinicalAccessEvent = {
  at: NOW,
  actorUserId: "33333333-3333-4333-8333-333333333333",
  patientProfileId: "11111111-1111-4111-8111-111111111111",
  category: "A",
  action: "read",
  resourceKind: "session_note",
  resourceId: "44444444-4444-4444-8444-444444444444",
  outcome: "allowed",
  reason: null,
  purpose: null,
};

describe("access log events carry opaque identifiers only", () => {
  it("accepts opaque identifiers", () => {
    assert.doesNotThrow(() => assertLogSafe(base));
  });

  it("rejects personal text in any identifier", () => {
    assert.throws(() => assertLogSafe({ ...base, patientProfileId: "asha.verma@example.com" }));
    assert.throws(() => assertLogSafe({ ...base, resourceId: "note about suicidal thoughts" }));
    assert.throws(() => assertLogSafe({ ...base, actorUserId: "Dr Vandana" }));
    assert.throws(() => assertLogSafe({ ...base, resourceKind: "Session Note" }));
  });

  it("in-memory sink stores copies", async () => {
    const sink = new InMemoryClinicalAccessLog();
    const event = { ...base };
    await sink.append(event);
    event.outcome = "denied";
    assert.equal(sink.events[0].outcome, "allowed");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InMemoryClinicalAccessLog,
  assertLogSafe,
  withClinicalAccess,
  type ClinicalAccessEvent,
  type ClinicalAccessLogSink,
} from "@/lib/clinical-access/access-log";
import type {
  ClinicalAccessRequest,
  ClinicalPrincipal,
} from "@/lib/clinical-access/types";

const PATIENT = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-16T10:00:00.000Z");

const doctor: ClinicalPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  roles: ["PSYCHOLOGIST"],
  permissions: ["VIEW_CLINICAL_RECORDS"],
  patientProfileId: null,
  mfaCompleted: true,
};

const request: ClinicalAccessRequest = {
  category: "A",
  action: "read",
  patientProfileId: PATIENT,
  resourceKind: "session_note",
  resourceId: "44444444-4444-4444-8444-444444444444",
  purpose: "consultation",
};

const facts = { stepUpSatisfied: false, careRelationshipActive: true };

describe("fail-closed clinical access log", () => {
  it("logs an allowed access before running the operation", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let loggedBeforeRun = false;
    const result = await withClinicalAccess(
      { sink, now: () => NOW },
      doctor,
      request,
      facts,
      async () => {
        loggedBeforeRun = sink.events.length === 1;
        return "ok";
      },
    );
    assert.deepEqual(result, { allowed: true, value: "ok" });
    assert.equal(loggedBeforeRun, true);
    assert.equal(sink.events[0].outcome, "allowed");
    assert.equal(sink.events[0].purpose, "consultation");
  });

  it("does not run the operation when the log write fails", async () => {
    const failing: ClinicalAccessLogSink = {
      append: async () => {
        throw new Error("log store down");
      },
    };
    let ran = false;
    const result = await withClinicalAccess(
      { sink: failing, now: () => NOW },
      doctor,
      request,
      facts,
      async () => {
        ran = true;
        return "secret";
      },
    );
    assert.deepEqual(result, { allowed: false, reason: "audit_unavailable" });
    assert.equal(ran, false);
  });

  it("logs denials and does not run the operation", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let ran = false;
    const result = await withClinicalAccess(
      { sink, now: () => NOW },
      { ...doctor, mfaCompleted: false },
      request,
      facts,
      async () => {
        ran = true;
        return 1;
      },
    );
    assert.deepEqual(result, { allowed: false, reason: "mfa_required" });
    assert.equal(ran, false);
    assert.equal(sink.events.length, 1);
    assert.equal(sink.events[0].outcome, "denied");
    assert.equal(sink.events[0].reason, "mfa_required");
  });

  it("keeps the denial even when the denial log cannot be written", async () => {
    const failing: ClinicalAccessLogSink = {
      append: async () => {
        throw new Error("log store down");
      },
    };
    const result = await withClinicalAccess(
      { sink: failing, now: () => NOW },
      null,
      request,
      facts,
      async () => "never",
    );
    assert.deepEqual(result, { allowed: false, reason: "unauthenticated" });
  });

  it("refuses to log events that could carry personal text", () => {
    const base: ClinicalAccessEvent = {
      at: NOW,
      actorUserId: doctor.userId,
      patientProfileId: PATIENT,
      category: "A",
      action: "read",
      resourceKind: "session_note",
      resourceId: request.resourceId,
      outcome: "allowed",
      reason: null,
      purpose: null,
    };
    assert.doesNotThrow(() => assertLogSafe(base));
    assert.throws(() =>
      assertLogSafe({ ...base, patientProfileId: "asha.verma@example.com" }),
    );
    assert.throws(() =>
      assertLogSafe({ ...base, resourceId: "note about suicidal thoughts" }),
    );
    assert.throws(() => assertLogSafe({ ...base, resourceKind: "Session Note" }));
  });

  it("does not run the operation when an identifier is not log-safe", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let ran = false;
    const result = await withClinicalAccess(
      { sink, now: () => NOW },
      doctor,
      { ...request, patientProfileId: "Asha Verma" },
      facts,
      async () => {
        ran = true;
        return 1;
      },
    );
    assert.equal(result.allowed, false);
    assert.equal(ran, false);
    assert.equal(sink.events.length, 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InMemoryClinicalAccessLog,
  type ClinicalAccessEvent,
  type ClinicalAccessLogSink,
} from "@/lib/clinical-access/access-log";
import {
  AccessGrant,
  createClinicalAccessGuard,
  requireGrant,
  type AccessFactsResolver,
} from "@/lib/clinical-access/guard";
import type {
  ClinicalAccessRequest,
  ClinicalPrincipal,
} from "@/lib/clinical-access/types";

const PATIENT = "11111111-1111-4111-8111-111111111111";
const OTHER_PATIENT = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-16T10:00:00.000Z");

const doctor: ClinicalPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  roles: ["PSYCHOLOGIST"],
  permissions: ["VIEW_CLINICAL_RECORDS", "MANAGE_CLINICAL_NOTES", "MANAGE_CLINICAL_DOCUMENTS"],
  patientProfileId: null,
  mfaCompleted: true,
};

const readNote: ClinicalAccessRequest = {
  category: "A",
  action: "read",
  patientProfileId: PATIENT,
  resourceKind: "session_note",
  resourceId: "44444444-4444-4444-8444-444444444444",
  purpose: "consultation",
};

const resolver = (over: Partial<AccessFactsResolver> = {}): AccessFactsResolver => ({
  careRelationshipActive: async () => true,
  stepUpVerifiedAt: async () => null,
  ...over,
});

const guardWith = (
  sink: ClinicalAccessLogSink,
  facts: AccessFactsResolver = resolver(),
) => createClinicalAccessGuard({ sink, facts, now: () => NOW });

describe("guard: fail closed", () => {
  it("logs an allowed access before the operation runs and issues a grant", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let loggedFirst = false;
    const r = await guardWith(sink).run(doctor, readNote, async (grant) => {
      loggedFirst = sink.events.length === 1;
      requireGrant(grant, readNote);
      return "ok";
    });
    assert.deepEqual(r, { allowed: true, value: "ok" });
    assert.equal(loggedFirst, true);
    assert.equal(sink.events[0].outcome, "allowed");
  });

  it("does not run the operation when the log write fails", async () => {
    const failing: ClinicalAccessLogSink = {
      append: async () => {
        throw new Error("log store down");
      },
    };
    let ran = false;
    const r = await guardWith(failing).run(doctor, readNote, async () => {
      ran = true;
      return 1;
    });
    assert.deepEqual(r, { allowed: false, reason: "audit_unavailable" });
    assert.equal(ran, false);
  });

  it("denies when the facts resolver throws", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let ran = false;
    const r = await guardWith(
      sink,
      resolver({
        careRelationshipActive: async () => {
          throw new Error("db down");
        },
      }),
    ).run(doctor, readNote, async () => {
      ran = true;
    });
    assert.deepEqual(r, { allowed: false, reason: "internal_error" });
    assert.equal(ran, false);
    assert.equal(sink.events[0].outcome, "denied");
  });

  it("denies on malformed principals instead of throwing", async () => {
    const sink = new InMemoryClinicalAccessLog();
    const malformed = { ...doctor, roles: undefined } as unknown as ClinicalPrincipal;
    const r = await guardWith(sink).run(malformed, readNote, async () => "never");
    assert.equal(r.allowed, false);
  });

  it("denies a principal whose id is not opaque", async () => {
    const sink = new InMemoryClinicalAccessLog();
    const r = await guardWith(sink).run(
      { ...doctor, userId: "dr.vandana@example.com" },
      readNote,
      async () => "never",
    );
    assert.deepEqual(r, { allowed: false, reason: "internal_error" });
  });

  it("keeps a denial even when the denial log fails", async () => {
    const failing: ClinicalAccessLogSink = {
      append: async () => {
        throw new Error("down");
      },
    };
    const r = await guardWith(failing).run(null, readNote, async () => "never");
    assert.deepEqual(r, { allowed: false, reason: "unauthenticated" });
  });

  it("logs a failed event, rethrows and revokes the grant when the operation throws", async () => {
    const sink = new InMemoryClinicalAccessLog();
    let kept: AccessGrant | null = null;
    await assert.rejects(
      guardWith(sink).run(doctor, readNote, async (grant) => {
        kept = grant;
        throw new Error("boom");
      }),
      /boom/,
    );
    assert.deepEqual(
      sink.events.map((e) => e.outcome),
      ["allowed", "failed"],
    );
    assert.throws(() => requireGrant(kept, readNote), /revoked/);
  });
});

describe("guard: facts are resolved server-side", () => {
  it("takes the care relationship from the resolver, not the caller", async () => {
    const sink = new InMemoryClinicalAccessLog();
    const r = await guardWith(
      sink,
      resolver({ careRelationshipActive: async () => false }),
    ).run(doctor, readNote, async () => "never");
    assert.deepEqual(r, { allowed: false, reason: "no_care_relationship" });
  });

  it("checks the relationship for the requested patient", async () => {
    const seen: string[] = [];
    await guardWith(
      new InMemoryClinicalAccessLog(),
      resolver({
        careRelationshipActive: async (_p, patientId) => {
          seen.push(patientId);
          return patientId === PATIENT;
        },
      }),
    ).run(doctor, { ...readNote, patientProfileId: OTHER_PATIENT }, async () => 1);
    assert.deepEqual(seen, [OTHER_PATIENT]);
  });

  it("requires a fresh step-up for sign, export and release", async () => {
    const signReq: ClinicalAccessRequest = { ...readNote, action: "sign" };
    const none = await guardWith(new InMemoryClinicalAccessLog()).run(doctor, signReq, async () => 1);
    assert.deepEqual(none, { allowed: false, reason: "step_up_required" });

    const stale = await guardWith(
      new InMemoryClinicalAccessLog(),
      resolver({ stepUpVerifiedAt: async () => new Date(NOW.getTime() - 11 * 60_000) }),
    ).run(doctor, signReq, async () => 1);
    assert.deepEqual(stale, { allowed: false, reason: "step_up_required" });

    const future = await guardWith(
      new InMemoryClinicalAccessLog(),
      resolver({ stepUpVerifiedAt: async () => new Date(NOW.getTime() + 60_000) }),
    ).run(doctor, signReq, async () => 1);
    assert.deepEqual(future, { allowed: false, reason: "step_up_required" });

    const invalid = await guardWith(
      new InMemoryClinicalAccessLog(),
      resolver({ stepUpVerifiedAt: async () => new Date("nope") }),
    ).run(doctor, signReq, async () => 1);
    assert.deepEqual(invalid, { allowed: false, reason: "step_up_required" });

    const fresh = await guardWith(
      new InMemoryClinicalAccessLog(),
      resolver({ stepUpVerifiedAt: async () => new Date(NOW.getTime() - 5 * 60_000) }),
    ).run(doctor, signReq, async () => "signed");
    assert.deepEqual(fresh, { allowed: true, value: "signed" });
  });

  it("denies MFA-incomplete psychologists and treats only literal true as completed", async () => {
    for (const mfaCompleted of [false, undefined, "yes", 1] as unknown[]) {
      const r = await guardWith(new InMemoryClinicalAccessLog()).run(
        { ...doctor, mfaCompleted: mfaCompleted as boolean },
        readNote,
        async () => "never",
      );
      assert.equal(r.allowed, false);
    }
  });
});

describe("guard: grants cannot be forged, reused or redirected", () => {
  it("rejects a hand-made grant", () => {
    const fake = Object.create(AccessGrant.prototype);
    assert.throws(() => requireGrant(fake, readNote), /forged|missing/);
    assert.throws(() => requireGrant({ category: "A" }, readNote), /forged|missing/);
    assert.throws(() => requireGrant(undefined, readNote), /forged|missing/);
    assert.throws(() => new AccessGrant(Symbol("x"), readNote, "someone-0001"));
  });

  it("rejects a grant used for another resource, action or patient", async () => {
    let grant: unknown;
    await guardWith(new InMemoryClinicalAccessLog()).run(doctor, readNote, async (g) => {
      grant = g;
      assert.throws(() => requireGrant(g, { ...readNote, resourceId: "55555555-5555-4555-8555-555555555555" }), /does not match/);
      assert.throws(() => requireGrant(g, { ...readNote, action: "write" }), /does not match/);
      assert.throws(() => requireGrant(g, { ...readNote, patientProfileId: OTHER_PATIENT }), /does not match/);
      assert.throws(() => requireGrant(g, { ...readNote, category: "B" }), /does not match/);
    });
    assert.ok(grant);
  });

  it("revokes the grant when the operation ends", async () => {
    let kept: unknown;
    await guardWith(new InMemoryClinicalAccessLog()).run(doctor, readNote, async (g) => {
      kept = g;
    });
    assert.throws(() => requireGrant(kept, readNote), /revoked/);
  });
});

describe("guard: concurrency", () => {
  it("keeps decisions and grants isolated across parallel calls", async () => {
    const sink = new InMemoryClinicalAccessLog();
    const guard = guardWith(
      sink,
      resolver({ careRelationshipActive: async (_p, id) => id === PATIENT }),
    );
    const calls = Array.from({ length: 50 }, (_, i) =>
      guard.run(
        doctor,
        { ...readNote, patientProfileId: i % 2 === 0 ? PATIENT : OTHER_PATIENT },
        async (grant) => {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          requireGrant(grant, { ...readNote, patientProfileId: i % 2 === 0 ? PATIENT : OTHER_PATIENT });
          return i;
        },
      ),
    );
    const results = await Promise.all(calls);
    results.forEach((r, i) => {
      assert.equal(r.allowed, i % 2 === 0, `call ${i}`);
    });
    assert.equal(sink.events.length, 50);
  });

  it("denies exactly the calls whose log write fails, in a mixed burst", async () => {
    const events: ClinicalAccessEvent[] = [];
    let n = 0;
    const flaky: ClinicalAccessLogSink = {
      append: async (e) => {
        const mine = n++;
        await new Promise((r) => setTimeout(r, Math.random() * 3));
        if (mine % 3 === 0) throw new Error("intermittent");
        events.push(e);
      },
    };
    const guard = guardWith(flaky);
    let ran = 0;
    const results = await Promise.all(
      Array.from({ length: 30 }, () =>
        guard.run(doctor, readNote, async () => {
          ran += 1;
        }),
      ),
    );
    const denied = results.filter((r) => !r.allowed);
    assert.equal(denied.length, 10);
    assert.ok(denied.every((r) => !r.allowed && r.reason === "audit_unavailable"));
    assert.equal(ran, 20);
    assert.equal(events.length, 20);
  });
});

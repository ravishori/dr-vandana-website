import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_INTAKE_CONFIG, approve, type IntakeEngineConfig } from "@/lib/intake/definition";
import {
  SYNTHETIC_INTAKE_ID,
  syntheticAdultIntake,
} from "@/lib/intake/fixtures/synthetic-adult-intake";
import { DefinitionRegistry, IntakeError, IntakeService } from "@/lib/intake/service";
import { InMemoryIntakeStore } from "@/lib/intake/store";
import { REVIEW_OUTCOMES, type Actor } from "@/lib/intake/types";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const doctor: Actor = { userId: "33333333-3333-4333-8333-333333333333", roles: ["PSYCHOLOGIST"], mfaCompleted: true };
const config: IntakeEngineConfig = { ...DEFAULT_INTAKE_CONFIG, allowSyntheticContent: true };

function world(opts: { clarificationRaisesReviewTask?: boolean } = {}) {
  const store = new InMemoryIntakeStore();
  const registry = new DefinitionRegistry(config);
  registry.publish(syntheticAdultIntake(1));
  let n = 0;
  const clock = { now: new Date("2026-11-17T14:00:00+05:30") };
  const service = new IntakeService(
    { store, now: () => clock.now, newId: () => `id-${String(++n).padStart(8, "0")}`, config, ...opts },
    registry,
  );
  return { store, registry, service, clock };
}

type W = ReturnType<typeof world>;

async function filled(w: W, patient = P1, text = "synthetic text") {
  const v = await w.service.startOrResumeDraft(patient, SYNTHETIC_INTAKE_ID);
  let dv = v.draft.draftVersion;
  const id = v.draft.id;
  const save = async (q: string, state: "answered" | "skipped" | "prefer_not_to_answer" | "discuss_in_person", value?: string | string[] | number) => {
    const r = await w.service.saveAnswer(patient, id, q, { state, value }, dv);
    dv = r.draft.draftVersion;
    return r;
  };
  await save("q-consent", "answered", "yes");
  await save("q-contact-pref", "answered", "email");
  await save("q-main-text", "answered", text);
  return { id, save };
}

describe("draft save and resume", () => {
  it("resumes the same open draft and reports progress", async () => {
    const w = world();
    const a = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    const b = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    assert.equal(a.draft.id, b.draft.id);
    assert.deepEqual(a.progress.missingRequiredIds, ["q-consent"]);
    await w.service.saveAnswer(P1, a.draft.id, "q-consent", { state: "answered", value: "yes" }, 1);
    const c = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    assert.equal(c.draft.answers["q-consent"].state, "answered");
    assert.deepEqual(c.progress.missingRequiredIds, []);
  });

  it("detects a stale draft version", async () => {
    const w = world();
    const a = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    await w.service.saveAnswer(P1, a.draft.id, "q-consent", { state: "answered", value: "yes" }, 1);
    await assert.rejects(
      w.service.saveAnswer(P1, a.draft.id, "q-contact-pref", { state: "answered", value: "email" }, 1),
      (e) => e instanceof IntakeError && e.code === "draft_version_conflict",
    );
  });

  it("refuses answers to hidden or unknown questions and invalid values", async () => {
    const w = world();
    const a = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    await assert.rejects(
      w.service.saveAnswer(P1, a.draft.id, "q-previous-detail", { state: "answered", value: "x" }, 1),
      /question_not_visible/,
    );
    await assert.rejects(w.service.saveAnswer(P1, a.draft.id, "nope", { state: "skipped" }, 1), /unknown_question/);
    await assert.rejects(
      w.service.saveAnswer(P1, a.draft.id, "q-contact-pref", { state: "answered", value: "fax" }, 1),
      /invalid_choice/,
    );
  });

  it("gives another patient the same 'not found' as a missing draft (no ownership oracle)", async () => {
    const w = world();
    const a = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    await assert.rejects(
      w.service.saveAnswer(P2, a.draft.id, "q-consent", { state: "answered", value: "yes" }, 1),
      (e) => e instanceof IntakeError && e.code === "draft_not_found",
    );
    await assert.rejects(w.service.submit(P2, a.draft.id), (e) => e instanceof IntakeError && e.code === "draft_not_found");
    await assert.rejects(w.service.submit(P2, "no-such-draft"), (e) => e instanceof IntakeError && e.code === "draft_not_found");
  });
});

describe("version changes", () => {
  it("keeps an open draft on the version it started with; new drafts use the latest", async () => {
    const w = world();
    const first = await filled(w);
    w.registry.publish(syntheticAdultIntake(2));
    const resumed = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    assert.equal(resumed.draft.id, first.id);
    assert.equal(resumed.draft.version, 1);
    const { submission, task } = await w.service.submit(P1, first.id);
    assert.equal(submission.version, 1);
    assert.equal(task.questionnaireVersion, 1);
    const second = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    assert.equal(second.draft.version, 2);
  });

  it("does not start new drafts on a retired version and rejects republishing a version", async () => {
    const w = world();
    w.registry.publish(syntheticAdultIntake(2));
    w.registry.retire(SYNTHETIC_INTAKE_ID, 2);
    const v = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    assert.equal(v.draft.version, 1);
    assert.throws(() => w.registry.publish(syntheticAdultIntake(1)), /version_already_published/);
  });

  it("refuses to publish a tampered or unapproved version", () => {
    const w = world();
    const tampered = syntheticAdultIntake(3);
    tampered.sections[0].questions[0].prompt = "[SYNTHETIC] edited";
    assert.throws(() => w.registry.publish(tampered), /hash mismatch/);
    assert.throws(() => w.registry.publish({ ...approve(syntheticAdultIntake(4), "x", "2026-11-16T00:00:00.000Z"), status: "draft" }), /not approved/);
  });

  it("serves nothing under the default (production-like) configuration", () => {
    assert.throws(() => new DefinitionRegistry().publish(syntheticAdultIntake(1)), /synthetic/);
  });
});

describe("incomplete forms and response states", () => {
  it("blocks submission while a required question is unanswered; nothing is stored", async () => {
    const w = world();
    const a = await w.service.startOrResumeDraft(P1, SYNTHETIC_INTAKE_ID);
    await assert.rejects(w.service.submit(P1, a.draft.id), /incomplete_required:q-consent/);
    const s = w.store.read();
    assert.deepEqual(Object.keys(s.submissions), []);
    assert.deepEqual(Object.keys(s.tasks), []);
    assert.equal(s.drafts[a.draft.id].status, "open");
  });

  it("stores all six states distinctly and never invents an answer", async () => {
    const w = world();
    const f = await filled(w);
    await f.save("q-has-previous", "answered", "no"); // hides the two follow-ups -> not_applicable
    await f.save("q-multi", "discuss_in_person");
    const { submission } = await w.service.submit(P1, f.id);
    const by = Object.fromEntries(submission.answers.map((a) => [a.questionId, a]));
    assert.equal(by["q-consent"].state, "answered");
    assert.equal(by["q-previous-detail"].state, "not_applicable");
    assert.equal(by["q-multi"].state, "discuss_in_person");

    const w2 = world();
    const g = await filled(w2);
    await g.save("q-has-previous", "prefer_not_to_answer");
    const r2 = await w2.service.submit(P1, g.id);
    const states2 = new Set(r2.submission.answers.map((a) => a.state));
    assert.ok(states2.has("prefer_not_to_answer"));
    assert.ok(states2.has("not_reached")); // q-multi never touched
    assert.ok(states2.has("not_applicable"));

    const w3 = world();
    const h = await filled(w3);
    await h.save("q-has-previous", "skipped");
    const r3 = await w3.service.submit(P1, h.id);
    assert.equal(r3.submission.answers.find((a) => a.questionId === "q-has-previous")!.state, "skipped");
    for (const a of r3.submission.answers) {
      if (a.state !== "answered") assert.equal(a.value, null);
    }
  });

  it("drops answers to questions hidden at submission time", async () => {
    const w = world();
    const f = await filled(w);
    await f.save("q-has-previous", "answered", "yes");
    await f.save("q-previous-detail", "answered", "synthetic detail");
    await f.save("q-has-previous", "answered", "no"); // patient changes their mind
    const { submission } = await w.service.submit(P1, f.id);
    const detail = submission.answers.find((a) => a.questionId === "q-previous-detail")!;
    assert.equal(detail.state, "not_applicable");
    assert.equal(detail.value, null);
  });
});

describe("immutable submission and provenance", () => {
  it("cannot be altered through the API, the store or returned copies", async () => {
    const w = world();
    const f = await filled(w, P1, "original synthetic text");
    const { submission } = await w.service.submit(P1, f.id);
    // returned copy and read copy are detached from the store
    (submission.answers as unknown as { value: unknown }[])[0].value = "tampered";
    const stored = w.store.read().submissions[submission.id];
    assert.notEqual(stored.answers[0].value, "tampered");
    // the store itself refuses to commit a changed submission
    await assert.rejects(
      w.store.transaction(async (tx) => {
        tx.state.submissions[submission.id].answers = [];
      }),
      /immutable_row_modified/,
    );
    await assert.rejects(
      w.store.transaction(async (tx) => {
        delete tx.state.submissions[submission.id];
      }),
      /immutable_row_modified/,
    );
    assert.equal(w.store.read().submissions[submission.id].snapshotHash, submission.snapshotHash);
    // the draft can no longer be edited
    await assert.rejects(
      w.service.saveAnswer(P1, f.id, "q-main-text", { state: "answered", value: "later edit" }, 99),
      /draft_already_submitted/,
    );
  });

  it("keeps patient-reported answers, patient clarifications and clinician annotations apart", async () => {
    const w = world();
    const f = await filled(w);
    const { submission } = await w.service.submit(P1, f.id);
    await w.service.addClarification(P1, submission.id, "synthetic clarification", "q-main-text");
    await w.service.addAnnotation(doctor, submission.id, "synthetic clinician note");
    const view = w.service.readSubmissionForReview(doctor, submission.id);
    assert.ok(view.submission.answers.every((a) => a.provenance === "patient_reported"));
    assert.deepEqual(view.clarifications.map((c) => c.provenance), ["patient_clarification"]);
    assert.deepEqual(view.annotations.map((a) => a.provenance), ["clinician_entered"]);
    assert.equal(view.submission.snapshotHash, submission.snapshotHash);
    assert.deepEqual(view.submission.answers, submission.answers);
  });

  it("rejects clarifications about unknown questions or from another patient", async () => {
    const w = world();
    const f = await filled(w);
    const { submission } = await w.service.submit(P1, f.id);
    await assert.rejects(w.service.addClarification(P1, submission.id, "x", "nope"), /unknown_question/);
    await assert.rejects(w.service.addClarification(P2, submission.id, "x"), /submission_not_found/);
    await assert.rejects(w.service.addClarification(P1, submission.id, "   "), /invalid_text/);
  });
});

describe("atomic review task", () => {
  it("is created with the submission and carries only references, dates and workflow state", async () => {
    const w = world();
    const f = await filled(w);
    const { submission, task } = await w.service.submit(P1, f.id);
    assert.equal(task.submissionId, submission.id);
    assert.equal(task.patientId, P1);
    assert.equal(task.questionnaireVersion, 1);
    assert.equal(task.status, "pending");
    assert.equal(task.reviewedAt, null);
    assert.equal(task.outcome, null);
    assert.equal(task.reviewDueAt, "2026-11-18T08:30:00.000Z"); // Wed 14:00 IST (PROPOSED target)
    assert.deepEqual(
      Object.keys(task).sort(),
      [
        "clarificationId", "dueRule", "id", "outcome", "patientId", "questionnaireVersion", "relatedConsultationId",
        "relatedFollowUpTaskId", "reviewDueAt", "reviewedAt", "reviewedBy", "status", "submissionId", "submittedAt",
      ].sort(),
    );
    assert.equal(Object.keys(w.store.read().tasks).length, 1);
  });

  it("uses the consultation start when one is booked", async () => {
    const w = world();
    const f = await filled(w);
    const { task } = await w.service.submit(P1, f.id, {
      consultationStart: new Date("2026-11-23T10:00:00+05:30"),
      consultationId: "consult-0001",
    });
    assert.equal(task.reviewDueAt, "2026-11-23T04:30:00.000Z");
    assert.equal(task.relatedConsultationId, "consult-0001");
  });

  it("treats urgent-sounding free text exactly like any other text (no keyword handling)", async () => {
    const calm = world();
    const urgent = world();
    const a = await filled(calm, P1, "synthetic ordinary sentence");
    const b = await filled(urgent, P1, "synthetic URGENT emergency words help immediately");
    const ra = await calm.service.submit(P1, a.id);
    const rb = await urgent.service.submit(P1, b.id);
    const strip = (t: typeof ra.task) => ({ ...t, id: "", submissionId: "" });
    assert.deepEqual(strip(ra.task), strip(rb.task));
    assert.equal(ra.task.reviewDueAt, rb.task.reviewDueAt);
    assert.deepEqual(
      calm.service.listPendingReviews(doctor).map((t) => Object.keys(t).length),
      urgent.service.listPendingReviews(doctor).map((t) => Object.keys(t).length),
    );
  });

  it("rolls back everything when task creation fails, and the draft can be submitted again", async () => {
    const w = world();
    const f = await filled(w);
    for (const failpoint of ["after_submission_insert", "after_task_insert"]) {
      w.store.failpoints.add(failpoint);
      await assert.rejects(w.service.submit(P1, f.id), new RegExp(failpoint));
      const s = w.store.read();
      assert.deepEqual(Object.keys(s.submissions), [], failpoint);
      assert.deepEqual(Object.keys(s.tasks), [], failpoint);
      assert.deepEqual(s.submissionByDraft, {}, failpoint);
      assert.equal(s.drafts[f.id].status, "open", failpoint);
      w.store.failpoints.delete(failpoint);
    }
    const ok = await w.service.submit(P1, f.id);
    assert.equal(ok.duplicate, false);
    assert.equal(Object.keys(w.store.read().tasks).length, 1);
  });
});

describe("duplicate submissions", () => {
  it("returns the original submission and creates no second task", async () => {
    const w = world();
    const f = await filled(w);
    const first = await w.service.submit(P1, f.id);
    const second = await w.service.submit(P1, f.id);
    assert.equal(second.duplicate, true);
    assert.equal(second.submission.id, first.submission.id);
    assert.equal(second.task.id, first.task.id);
    assert.equal(Object.keys(w.store.read().submissions).length, 1);
    assert.equal(Object.keys(w.store.read().tasks).length, 1);
  });

  it("is safe under concurrent submits (one submission, one task)", async () => {
    const w = world();
    const f = await filled(w);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => w.service.submit(P1, f.id, { idempotencyKey: i % 2 ? "k" : undefined })),
    );
    assert.equal(results.filter((r) => !r.duplicate).length, 1);
    assert.equal(new Set(results.map((r) => r.submission.id)).size, 1);
    assert.equal(Object.keys(w.store.read().tasks).length, 1);
  });

  it("rejects reuse of an idempotency key for a different draft", async () => {
    const w = world();
    const f = await filled(w);
    await w.service.submit(P1, f.id, { idempotencyKey: "key-1" });
    const g = await filled(w); // starts a new draft because the first was submitted
    await assert.rejects(w.service.submit(P1, g.id, { idempotencyKey: "key-1" }), /idempotency_key_reuse/);
  });
});

describe("doctor review (explicit, never automatic)", () => {
  it("only an MFA-completed psychologist can see the queue or review", async () => {
    const w = world();
    const f = await filled(w);
    const { task } = await w.service.submit(P1, f.id);
    const patient: Actor = { userId: P1, roles: ["PATIENT"], mfaCompleted: true };
    const noMfa: Actor = { ...doctor, mfaCompleted: false };
    const staff: Actor = { userId: "44444444-4444-4444-8444-444444444444", roles: ["STAFF"], mfaCompleted: true };
    for (const actor of [patient, noMfa, staff]) {
      assert.throws(() => w.service.listPendingReviews(actor), /forbidden/);
      await assert.rejects(w.service.markReviewed(actor, task.id, "reviewed_no_further_intake_action"), /forbidden/);
      await assert.rejects(w.service.addAnnotation(actor, "x", "note"), /forbidden/);
    }
  });

  it("stays pending until the psychologist acts; the patient only ever sees 'received'", async () => {
    const w = world();
    const f = await filled(w);
    const { submission, task } = await w.service.submit(P1, f.id);
    w.clock.now = new Date("2026-11-30T10:00:00+05:30"); // long past due
    assert.equal(w.service.listPendingReviews(doctor)[0].id, task.id);
    assert.equal(w.service.listPendingReviews(doctor)[0].status, "pending");
    assert.equal(w.service.patientStatus(P1, submission.id), "received");
    await w.service.markReviewed(doctor, task.id, "reviewed_discuss_in_consultation");
    assert.equal(w.service.patientStatus(P1, submission.id), "received");
    assert.throws(() => w.service.patientStatus(P2, submission.id), /submission_not_found/);
  });

  it("supports all five controlled outcomes; 'incomplete' stays in the queue", async () => {
    const w = world();
    const outcomes = [...REVIEW_OUTCOMES];
    for (let i = 0; i < outcomes.length; i += 1) {
      const patient = `55555555-5555-4555-8555-55555555555${i}`;
      const f = await filled(w, patient);
      const { task } = await w.service.submit(patient, f.id);
      const done = await w.service.markReviewed(doctor, task.id, outcomes[i], {
        followUpTaskId: outcomes[i] === "reviewed_followup_action_created" ? "followup-0001" : null,
      });
      assert.equal(done.outcome, outcomes[i]);
      assert.equal(done.status, outcomes[i] === "review_incomplete" ? "incomplete" : "reviewed");
      assert.equal(done.reviewedBy, doctor.userId);
    }
    const queue = w.service.listPendingReviews(doctor);
    assert.deepEqual(queue.map((t) => t.status), ["incomplete"]);
  });

  it("requires a follow-up reference for the follow-up outcome and refuses a second review", async () => {
    const w = world();
    const f = await filled(w);
    const { task } = await w.service.submit(P1, f.id);
    await assert.rejects(w.service.markReviewed(doctor, task.id, "reviewed_followup_action_created"), /follow_up_task_required/);
    await assert.rejects(w.service.markReviewed(doctor, task.id, "invented" as never), /invalid_outcome/);
    await w.service.markReviewed(doctor, task.id, "reviewed_no_further_intake_action");
    await assert.rejects(w.service.markReviewed(doctor, task.id, "reviewed_no_further_intake_action"), /already_reviewed/);
  });

  it("orders the queue by due time then submission time only", async () => {
    const w = world();
    const late = await filled(w, P1);
    w.clock.now = new Date("2026-11-17T09:30:00+05:30");
    const early = await filled(w, P2);
    const r1 = await w.service.submit(P1, late.id, { consultationStart: new Date("2026-11-20T10:00:00+05:30") });
    const r2 = await w.service.submit(P2, early.id);
    assert.deepEqual(
      w.service.listPendingReviews(doctor).map((t) => t.id),
      [r2.task.id, r1.task.id],
    );
  });

  it("clarifications raise a new review task by default (OD-I2 proposal) and can be switched off", async () => {
    const on = world();
    const a = await filled(on);
    const { submission } = await on.service.submit(P1, a.id);
    await on.service.addClarification(P1, submission.id, "synthetic clarification");
    assert.equal(Object.keys(on.store.read().tasks).length, 2);

    const off = world({ clarificationRaisesReviewTask: false });
    const b = await filled(off);
    const r = await off.service.submit(P1, b.id);
    await off.service.addClarification(P1, r.submission.id, "synthetic clarification");
    assert.equal(Object.keys(off.store.read().tasks).length, 1);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { MemoryQuestionRepository, resetMemoryQuestionRepositoryForTests } from "@/lib/question-portal/memory-store";
import { hashPassword, verifyPassword } from "@/lib/question-portal/password";
import { publicQuestionSchema } from "@/lib/question-portal/schema";
import {
  archivePsychologistQuestion,
  getPsychologistQuestion,
  listPsychologistQuestions,
  submitPsychologyQuestion,
  updatePsychologistQuestion,
} from "@/lib/question-portal/service";
import { createSessionToken, readSessionToken } from "@/lib/question-portal/session";
import { setQuestionRepositoryForTests } from "@/lib/question-portal/store";
import { PSYCHOLOGIST_ROLE, type PsychologistSession } from "@/types/question-portal";

const actor: PsychologistSession = {
  email: "vandana@example.test",
  role: PSYCHOLOGIST_ROLE,
  expiresAt: Date.now() + 60_000,
  sessionId: "test-session",
};

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Asha",
    email: "asha@example.test",
    question: "How can counselling help with workplace stress over several months?",
    category: "workplace-stress",
    preferredResponseMethod: "email",
    consentGiven: true,
    ...overrides,
  };
}

describe("psychology question portal", () => {
  beforeEach(() => {
    resetMemoryQuestionRepositoryForTests();
    setQuestionRepositoryForTests(new MemoryQuestionRepository());
  });

  it("accepts a valid public submission", async () => {
    const result = await submitPsychologyQuestion(validInput(), {
      skipNotification: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.match(result.publicReferenceId, /^QV-/);
  });

  it("rejects a missing question", async () => {
    const parsed = publicQuestionSchema.safeParse({
      ...validInput(),
      question: "",
      consentGiven: true,
    });
    assert.equal(parsed.success, false);
  });

  it("rejects an invalid email", async () => {
    const parsed = publicQuestionSchema.safeParse({
      ...validInput(),
      email: "not-an-email",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects an invalid category", async () => {
    const parsed = publicQuestionSchema.safeParse({
      ...validInput(),
      category: "not-a-category",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects missing consent", async () => {
    const result = await submitPsychologyQuestion(
      validInput({ consentGiven: false }),
      { skipNotification: true },
    );
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "validation");
  });

  it("rejects an oversized question", async () => {
    const result = await submitPsychologyQuestion(
      validInput({ question: "q".repeat(20_000) }),
      { skipNotification: true },
    );
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "too_large");
  });

  it("stores XSS payloads as text rather than executing them", async () => {
    const payload = "<script>alert('xss')</script> How does counselling work in general?";
    const created = await submitPsychologyQuestion(validInput({ question: payload }), {
      skipNotification: true,
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }
    const loaded = await getPsychologistQuestion(actor, created.publicReferenceId);
    assert.ok(loaded);
    assert.equal(loaded?.record.question.includes("<script>"), true);
  });

  it("parameterizes SQL-like input instead of executing it", async () => {
    const created = await submitPsychologyQuestion(
      validInput({
        question: "What if someone writes '; DROP TABLE question_submissions;-- about stress?",
      }),
      { skipNotification: true },
    );
    assert.equal(created.ok, true);
    const listed = await listPsychologistQuestions(actor, { page: 1, pageSize: 20 });
    assert.equal(listed.total, 1);
  });

  it("blocks unauthorized dashboard reads", async () => {
    await assert.rejects(
      () => listPsychologistQuestions(null, { page: 1 }),
      /UNAUTHORIZED/,
    );
  });

  it("prevents IDOR by requiring a psychologist session for a known reference", async () => {
    const created = await submitPsychologyQuestion(validInput(), {
      skipNotification: true,
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }
    await assert.rejects(
      () => getPsychologistQuestion(null, created.publicReferenceId),
      /UNAUTHORIZED/,
    );
    const loaded = await getPsychologistQuestion(actor, created.publicReferenceId);
    assert.equal(loaded?.record.publicReferenceId, created.publicReferenceId);
    assert.equal(loaded?.record.internalNotes, null);
  });

  it("updates status, keeps internal notes private, and archives", async () => {
    const created = await submitPsychologyQuestion(validInput(), {
      skipNotification: true,
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      return;
    }
    const updated = await updatePsychologistQuestion(actor, {
      publicReferenceId: created.publicReferenceId,
      status: "UNDER_REVIEW",
      internalNotes: "Follow up next week. Do not email this note.",
      psychologistResponse: "Thank you for writing. A psychologist may explore workplace strain without diagnosing from a message.",
    });
    assert.equal(updated.status, "UNDER_REVIEW");
    assert.match(updated.internalNotes ?? "", /Do not email/);
    const archived = await archivePsychologistQuestion(
      actor,
      created.publicReferenceId,
    );
    assert.equal(archived.status, "ARCHIVED");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("a-strong-test-passphrase");
    assert.equal(await verifyPassword("a-strong-test-passphrase", hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });

  it("issues and expires psychologist sessions", async () => {
    const secret = "x".repeat(32);
    const token = await createSessionToken("vandana@example.test", Date.now(), secret);
    assert.ok(token);
    const session = await readSessionToken(token ?? undefined, Date.now(), secret);
    assert.equal(session?.email, "vandana@example.test");
    const expired = await readSessionToken(token ?? undefined, Date.now() + 9 * 60 * 60 * 1000, secret);
    assert.equal(expired, null);
  });

  it("rejects a forged session token", async () => {
    const secret = "y".repeat(32);
    const token = await createSessionToken("vandana@example.test", Date.now(), secret);
    const forged = `${token?.split(".")[0]}.tampered-signature`;
    const session = await readSessionToken(forged, Date.now(), secret);
    assert.equal(session, null);
  });

  it("rate-limits repeated public submissions from the same identity", async () => {
    const { checkQuestionSubmitRateLimit, resetQuestionRateLimitMemoryForTests } =
      await import("@/lib/question-portal/rate-limit");
    resetQuestionRateLimitMemoryForTests();
    let blocked = false;
    for (let index = 0; index < 12; index += 1) {
      const result = await checkQuestionSubmitRateLimit("203.0.113.10");
      if (!result.allowed) {
        blocked = true;
        break;
      }
    }
    assert.equal(blocked, true);
  });
});

/**
 * F1-C-B — Authentication & session hardening regression suite.
 * Covers MFA-incomplete practice denial and Q&A ↔ practice cookie isolation.
 * Does not migrate legacy Q&A authentication.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eq } from "drizzle-orm";

import {
  createBookingTestWorld,
  insertTestAppointment,
} from "@/lib/appointments/test-support";
import { addMinutes } from "@/lib/appointments/timezone";
import { loginWithPassword } from "@/lib/identity/authentication";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  generateTotpCodeForTests,
  verifyMfaChallenge,
} from "@/lib/identity/mfa";
import { loadPrincipal } from "@/lib/identity/principal";
import { patientProfiles, sessions, users } from "@/lib/identity/schema";
import { readSession } from "@/lib/identity/sessions";
import {
  getPracticePatientDetail,
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import { getPracticeSettings } from "@/lib/practice/settings";
import {
  createSessionToken,
  readSessionToken,
} from "@/lib/question-portal/session";

const STRONG_PASSWORD = "correct-horse-battery";
const PSYCH_EMAIL = "vandana@example.test";
/** Dedicated secret for Q&A HMAC tests (not the practice session secret). */
const QA_SESSION_SECRET = "qa-portal-test-session-secret-32ch!!";

describe("F1-C-B authentication hardening", () => {
  it("denies MFA-incomplete psychologist from practice operations; allows after MFA", async () => {
    const w = await createBookingTestWorld();
    try {
      const startsAt = addMinutes(w.ctx.now(), 24 * 60);
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt,
        endsAt: addMinutes(startsAt, 50),
      });

      const login = await loginWithPassword(w.ctx, {
        email: PSYCH_EMAIL,
        password: STRONG_PASSWORD,
        ip: "203.0.113.90",
        expectedRole: "PSYCHOLOGIST",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        assert.fail("expected psychologist password login");
      }
      assert.equal(login.mfaRequired, true);
      const pending = await readSession(w.ctx, login.token);
      assert.ok(pending);
      assert.equal(pending.mfaCompleted, false);

      const pendingPrincipal = await loadPrincipal(w.ctx, pending);
      const deniedList = await listPracticePatients(
        w.ctx,
        pendingPrincipal,
        {},
      );
      assert.equal(deniedList.ok, false);

      const deniedSettings = await getPracticeSettings(
        w.ctx,
        pendingPrincipal,
      );
      assert.equal(deniedSettings.ok, false);

      const [patient] = await w.ctx.db
        .select({
          publicId: users.publicId,
          displayName: patientProfiles.displayName,
        })
        .from(users)
        .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
        .where(eq(users.id, w.patientA.userId))
        .limit(1);
      assert.ok(patient);

      const deniedUpdate = await updatePracticePatientProfile(
        w.ctx,
        pendingPrincipal,
        {
          patientPublicId: patient.publicId,
          displayName: "MFA Bypass Rename",
          status: "SUSPENDED",
        },
      );
      assert.equal(deniedUpdate.ok, false);

      const [unchanged] = await w.ctx.db
        .select({ displayName: patientProfiles.displayName, status: users.status })
        .from(patientProfiles)
        .innerJoin(users, eq(users.id, patientProfiles.userId))
        .where(eq(users.id, w.patientA.userId))
        .limit(1);
      assert.equal(unchanged?.displayName, patient.displayName);
      assert.notEqual(unchanged?.status, "SUSPENDED");

      const begin = await beginMfaEnrollment(w.ctx, {
        userId: w.psychologistUserId,
      });
      assert.equal(begin.ok, true);
      if (!begin.ok) {
        assert.fail("expected MFA enrollment begin");
      }
      const timestamp = w.ctx.now().getTime();
      const enrollCode = generateTotpCodeForTests(
        begin.secretBase32,
        timestamp,
        PSYCH_EMAIL,
      );
      const confirmed = await confirmMfaEnrollment(w.ctx, {
        userId: w.psychologistUserId,
        code: enrollCode,
        timestamp,
      });
      assert.equal(confirmed.ok, true);

      const challengeTs = timestamp + 30_000;
      const verified = await verifyMfaChallenge(w.ctx, {
        userId: w.psychologistUserId,
        sessionId: login.sessionId,
        code: generateTotpCodeForTests(
          begin.secretBase32,
          challengeTs,
          PSYCH_EMAIL,
        ),
        ip: "203.0.113.90",
        timestamp: challengeTs,
      });
      assert.equal(verified.ok, true);

      const completed = await readSession(w.ctx, login.token);
      assert.ok(completed);
      assert.equal(completed.mfaCompleted, true);
      const allowedPrincipal = await loadPrincipal(w.ctx, completed);

      const allowedList = await listPracticePatients(
        w.ctx,
        allowedPrincipal,
        {},
      );
      assert.equal(allowedList.ok, true);
      if (allowedList.ok) {
        assert.equal(
          allowedList.items.some((item) => item.publicId === patient.publicId),
          true,
        );
      }

      const allowedDetail = await getPracticePatientDetail(
        w.ctx,
        allowedPrincipal,
        patient.publicId,
      );
      assert.equal(allowedDetail.ok, true);
      if (allowedDetail.ok) {
        assert.equal("secretBase32" in allowedDetail, false);
      }
    } finally {
      await w.close();
    }
  });

  it("denies legacy Q&A session tokens from practice authorization", async () => {
    const w = await createBookingTestWorld();
    try {
      const now = w.ctx.now().getTime();
      const qaToken = await createSessionToken(
        "qa-psychologist@example.test",
        now,
        QA_SESSION_SECRET,
      );
      assert.ok(qaToken);

      const qaSession = await readSessionToken(
        qaToken,
        now,
        QA_SESSION_SECRET,
      );
      assert.ok(qaSession);
      assert.equal(qaSession.email, "qa-psychologist@example.test");

      // Practice identity store must not accept the Q&A HMAC cookie value.
      const practiceSession = await readSession(w.ctx, qaToken);
      assert.equal(practiceSession, null);

      const deniedList = await listPracticePatients(w.ctx, null, {});
      assert.equal(deniedList.ok, false);

      const deniedSettings = await getPracticeSettings(w.ctx, null);
      assert.equal(deniedSettings.ok, false);

      const deniedUpdate = await updatePracticePatientProfile(w.ctx, null, {
        patientPublicId: "PAT-23456789",
        displayName: "From QA Cookie",
        status: "SUSPENDED",
      });
      assert.equal(deniedUpdate.ok, false);

      // Q&A auth must not mint a practice session row for the HMAC token.
      assert.equal(await readSession(w.ctx, qaToken), null);
      const practiceRows = await w.ctx.db.select({ id: sessions.id }).from(sessions);
      for (const row of practiceRows) {
        assert.notEqual(row.id, qaSession.sessionId);
      }

      // Patient principal still cannot use practice ops (regression).
      const patientDenied = await listPracticePatients(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(patientDenied.ok, false);
    } finally {
      await w.close();
    }
  });

  it("returns generic external login failures for role mismatch", async () => {
    const w = await createBookingTestWorld();
    try {
      const mismatch = await loginWithPassword(w.ctx, {
        email: PSYCH_EMAIL,
        password: STRONG_PASSWORD,
        ip: "203.0.113.91",
        expectedRole: "PATIENT",
      });
      assert.equal(mismatch.ok, false);
      if (!mismatch.ok) {
        assert.equal(mismatch.code, "INVALID");
        assert.equal(mismatch.message, SAFE_MESSAGES.genericAuthFailure);
      }
    } finally {
      await w.close();
    }
  });
});

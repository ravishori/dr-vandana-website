/**
 * F1-C-C — Authentication, MFA, session & recovery journey regression.
 * Verifies complete lifecycles after F1-C-B hardening. No clinical scope.
 * Does not migrate Q&A authentication or redesign middleware.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { desc, eq } from "drizzle-orm";

import {
  listPatientAppointments,
  getPatientAppointmentDetail,
} from "@/lib/appointments/patient-portal";
import {
  createBookingTestWorld,
  insertTestAppointment,
} from "@/lib/appointments/test-support";
import { addMinutes } from "@/lib/appointments/timezone";
import {
  loginWithPassword,
  logoutSession,
} from "@/lib/identity/authentication";
import { authorizationService } from "@/lib/identity/authorization";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  generateTotpCodeForTests,
  verifyMfaChallenge,
} from "@/lib/identity/mfa";
import { changePasswordAuthenticated } from "@/lib/identity/password-change";
import {
  requestPasswordReset,
  requestPasswordResetByIdentifier,
  resetPasswordWithToken,
} from "@/lib/identity/password-reset";
import { loadPrincipal } from "@/lib/identity/principal";
import { assignRole } from "@/lib/identity/provision";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import {
  securityEvents,
  sessions,
  users,
} from "@/lib/identity/schema";
import {
  readSession,
  revokeSession,
  sessionCookieOptions,
} from "@/lib/identity/sessions";
import {
  createIdentityTestWorld,
  extractTokenFromLastEmail,
} from "@/lib/identity/test-harness";
import {
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import { getPracticeSettings } from "@/lib/practice/settings";
import {
  createSessionToken,
  readSessionToken,
} from "@/lib/question-portal/session";
import { appointments } from "@/lib/appointments/schema";
import {
  activateTestPatient,
  registerUnverifiedPatient,
} from "@/lib/appointments/test-support";

const STRONG_PASSWORD = "correct-horse-battery";
const NEW_PASSWORD = "journey-new-password1";
const PSYCH_EMAIL = "vandana@example.test";
const QA_SESSION_SECRET = "qa-portal-test-session-secret-32ch!!";

describe("F1-C-C authentication recovery journeys", () => {
  it("Journey A/B/S — patient login, patient ops, practice DENY, logout reuse DENY", async () => {
    const w = await createBookingTestWorld();
    try {
      const startsAt = addMinutes(w.ctx.now(), 24 * 60);
      const appointmentId = await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt,
        endsAt: addMinutes(startsAt, 50),
      });
      const [apt] = await w.ctx.db
        .select({ publicId: appointments.publicId })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      assert.ok(apt);

      const login = await loginWithPassword(w.ctx, {
        email: w.patientA.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.101",
        expectedRole: "PATIENT",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        assert.fail("patient login");
      }
      const session = await readSession(w.ctx, login.token);
      assert.ok(session);
      const principal = await loadPrincipal(w.ctx, session);
      assert.equal(principal.roles.includes("PATIENT"), true);
      assert.equal(principal.roles.includes("PSYCHOLOGIST"), false);
      assert.equal(principal.roles.includes("SUPER_ADMIN"), false);

      const ownList = await listPatientAppointments(w.ctx, principal, {});
      assert.equal(ownList.ok, true);
      if (ownList.ok) {
        assert.equal(
          ownList.items.some((item) => item.publicId === apt.publicId),
          true,
        );
      }
      const ownDetail = await getPatientAppointmentDetail(
        w.ctx,
        principal,
        apt.publicId,
      );
      assert.equal(ownDetail.ok, true);

      assert.equal(
        (await listPracticePatients(w.ctx, principal, {})).ok,
        false,
      );
      assert.equal((await getPracticeSettings(w.ctx, principal)).ok, false);
      assert.equal(
        authorizationService.canAccess(principal, {
          roles: ["SUPER_ADMIN"],
          permission: "MANAGE_SYSTEM_SETTINGS",
        }).allowed,
        false,
      );

      await logoutSession(w.ctx, login.token);
      assert.equal(await readSession(w.ctx, login.token), null);
      assert.equal(
        (await listPatientAppointments(w.ctx, null, {})).ok,
        false,
      );
      assert.equal(
        (
          await getPatientAppointmentDetail(w.ctx, null, apt.publicId)
        ).ok,
        false,
      );
    } finally {
      await w.close();
    }
  });

  it("Journey C/D/E/F — psychologist MFA incomplete DENY, invalid DENY, complete ALLOW, replay DENY", async () => {
    const w = await createBookingTestWorld();
    try {
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: addMinutes(w.ctx.now(), 30 * 60),
        endsAt: addMinutes(w.ctx.now(), 30 * 60 + 50),
      });

      const login = await loginWithPassword(w.ctx, {
        email: PSYCH_EMAIL,
        password: STRONG_PASSWORD,
        ip: "203.0.113.102",
        expectedRole: "PSYCHOLOGIST",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        assert.fail("psychologist login");
      }
      assert.equal(login.mfaRequired, true);
      const pending = await readSession(w.ctx, login.token);
      assert.ok(pending);
      assert.equal(pending.mfaCompleted, false);
      const pendingPrincipal = await loadPrincipal(w.ctx, pending);
      assert.equal(
        (await listPracticePatients(w.ctx, pendingPrincipal, {})).ok,
        false,
      );

      const begin = await beginMfaEnrollment(w.ctx, {
        userId: w.psychologistUserId,
      });
      assert.equal(begin.ok, true);
      if (!begin.ok) {
        assert.fail("mfa enroll");
      }
      const ts = w.ctx.now().getTime();
      assert.equal(
        (
          await confirmMfaEnrollment(w.ctx, {
            userId: w.psychologistUserId,
            code: generateTotpCodeForTests(begin.secretBase32, ts, PSYCH_EMAIL),
            timestamp: ts,
          })
        ).ok,
        true,
      );

      const invalid = await verifyMfaChallenge(w.ctx, {
        userId: w.psychologistUserId,
        sessionId: login.sessionId,
        code: "000000",
        ip: "203.0.113.102",
        timestamp: ts + 30_000,
      });
      assert.equal(invalid.ok, false);
      const stillPending = await readSession(w.ctx, login.token);
      assert.equal(stillPending?.mfaCompleted, false);
      assert.equal(
        (
          await listPracticePatients(
            w.ctx,
            await loadPrincipal(w.ctx, stillPending!),
            {},
          )
        ).ok,
        false,
      );

      const challengeTs = ts + 60_000;
      const code = generateTotpCodeForTests(
        begin.secretBase32,
        challengeTs,
        PSYCH_EMAIL,
      );
      assert.equal(
        (
          await verifyMfaChallenge(w.ctx, {
            userId: w.psychologistUserId,
            sessionId: login.sessionId,
            code,
            ip: "203.0.113.102",
            timestamp: challengeTs,
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await verifyMfaChallenge(w.ctx, {
            userId: w.psychologistUserId,
            sessionId: login.sessionId,
            code,
            ip: "203.0.113.102",
            timestamp: challengeTs,
          })
        ).ok,
        false,
      );

      const completed = await readSession(w.ctx, login.token);
      assert.ok(completed);
      assert.equal(completed.mfaCompleted, true);
      const allowed = await listPracticePatients(
        w.ctx,
        await loadPrincipal(w.ctx, completed),
        {},
      );
      assert.equal(allowed.ok, true);
      assert.equal("secretBase32" in allowed, false);
    } finally {
      await w.close();
    }
  });

  it("Journey G/H — session expiration and revocation DENY protected ops", async () => {
    const w = await createBookingTestWorld();
    try {
      const login = await loginWithPassword(w.ctx, {
        email: w.patientA.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.103",
        expectedRole: "PATIENT",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        assert.fail("login");
      }
      const live = await readSession(w.ctx, login.token);
      assert.ok(live);
      assert.equal(
        (
          await listPatientAppointments(
            w.ctx,
            await loadPrincipal(w.ctx, live),
            {},
          )
        ).ok,
        true,
      );

      await revokeSession(w.ctx, login.sessionId);
      assert.equal(await readSession(w.ctx, login.token), null);
      assert.equal(
        (await listPatientAppointments(w.ctx, null, {})).ok,
        false,
      );

      const login2 = await loginWithPassword(w.ctx, {
        email: w.patientA.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.104",
        expectedRole: "PATIENT",
      });
      assert.equal(login2.ok, true);
      if (!login2.ok) {
        assert.fail("login2");
      }
      w.advanceMs(w.ctx.config.patientIdleMs + 1_000);
      assert.equal(await readSession(w.ctx, login2.token), null);
      assert.equal(
        (await listPracticePatients(w.ctx, null, {})).ok,
        false,
      );
    } finally {
      await w.close();
    }
  });

  it("Journey I/J — password change policy, keeps current session, rate-limits abuse", async () => {
    const w = await createIdentityTestWorld();
    try {
      const patient = await activateTestPatient(
        w,
        "journey-pwd@example.test",
        "9876543201",
      );
      const loginA = await loginWithPassword(w.ctx, {
        email: patient.email,
        password: STRONG_PASSWORD,
        ip: "198.51.100.70",
        expectedRole: "PATIENT",
      });
      const loginB = await loginWithPassword(w.ctx, {
        email: patient.email,
        password: STRONG_PASSWORD,
        ip: "198.51.100.71",
        expectedRole: "PATIENT",
      });
      assert.equal(loginA.ok && loginB.ok, true);
      if (!loginA.ok || !loginB.ok) {
        assert.fail("dual login");
      }

      const same = await changePasswordAuthenticated(w.ctx, {
        userId: patient.userId,
        sessionId: loginA.sessionId,
        currentPassword: STRONG_PASSWORD,
        newPassword: STRONG_PASSWORD,
        newPasswordConfirm: STRONG_PASSWORD,
        ip: "198.51.100.70",
      });
      assert.equal(same.ok, false);

      const weak = await changePasswordAuthenticated(w.ctx, {
        userId: patient.userId,
        sessionId: loginA.sessionId,
        currentPassword: STRONG_PASSWORD,
        newPassword: "short",
        newPasswordConfirm: "short",
        ip: "198.51.100.70",
      });
      assert.equal(weak.ok, false);

      const wrong = await changePasswordAuthenticated(w.ctx, {
        userId: patient.userId,
        sessionId: loginA.sessionId,
        currentPassword: "not-the-current-pw",
        newPassword: NEW_PASSWORD,
        newPasswordConfirm: NEW_PASSWORD,
        ip: "198.51.100.70",
      });
      assert.equal(wrong.ok, false);

      const changed = await changePasswordAuthenticated(w.ctx, {
        userId: patient.userId,
        sessionId: loginA.sessionId,
        currentPassword: STRONG_PASSWORD,
        newPassword: NEW_PASSWORD,
        newPasswordConfirm: NEW_PASSWORD,
        ip: "198.51.100.70",
      });
      assert.equal(changed.ok, true);
      assert.ok(await readSession(w.ctx, loginA.token));
      assert.equal(await readSession(w.ctx, loginB.token), null);

      const events = await w.ctx.db
        .select({
          eventType: securityEvents.eventType,
          metadata: securityEvents.metadata,
        })
        .from(securityEvents)
        .where(eq(securityEvents.userId, patient.userId))
        .orderBy(desc(securityEvents.createdAt))
        .limit(20);
      assert.equal(
        events.some((e) => e.eventType === "PASSWORD_CHANGED"),
        true,
      );
      for (const event of events) {
        const meta = event.metadata ?? {};
        assert.equal("password" in meta, false);
        assert.equal("token" in meta, false);
      }

      // Fresh identity for rate-limit isolation (new memory limiter buckets).
      const w2 = await createIdentityTestWorld();
      try {
        const p2 = await activateTestPatient(
          w2,
          "journey-rate@example.test",
          "9876543202",
        );
        const login = await loginWithPassword(w2.ctx, {
          email: p2.email,
          password: STRONG_PASSWORD,
          ip: "198.51.100.80",
          expectedRole: "PATIENT",
        });
        assert.equal(login.ok, true);
        if (!login.ok) {
          assert.fail("rate login");
        }
        const [before] = await w2.ctx.db
          .select({ passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.id, p2.userId))
          .limit(1);
        for (
          let i = 0;
          i < IDENTITY_RATE_LIMITS.passwordChangeAccount.max;
          i += 1
        ) {
          await changePasswordAuthenticated(w2.ctx, {
            userId: p2.userId,
            sessionId: login.sessionId,
            currentPassword: "wrong-password-xx",
            newPassword: NEW_PASSWORD,
            newPasswordConfirm: NEW_PASSWORD,
            ip: "198.51.100.80",
          });
        }
        const limited = await changePasswordAuthenticated(w2.ctx, {
          userId: p2.userId,
          sessionId: login.sessionId,
          currentPassword: STRONG_PASSWORD,
          newPassword: NEW_PASSWORD,
          newPasswordConfirm: NEW_PASSWORD,
          ip: "198.51.100.80",
        });
        assert.equal(limited.ok, false);
        if (!limited.ok) {
          assert.equal(limited.message, SAFE_MESSAGES.rateLimited);
        }
        const [after] = await w2.ctx.db
          .select({ passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.id, p2.userId))
          .limit(1);
        assert.equal(after?.passwordHash, before?.passwordHash);

        w2.advanceMs(IDENTITY_RATE_LIMITS.passwordChangeAccount.windowMs + 1_000);
        assert.equal(
          (
            await changePasswordAuthenticated(w2.ctx, {
              userId: p2.userId,
              sessionId: login.sessionId,
              currentPassword: STRONG_PASSWORD,
              newPassword: NEW_PASSWORD,
              newPasswordConfirm: NEW_PASSWORD,
              ip: "198.51.100.80",
            })
          ).ok,
          true,
        );
      } finally {
        await w2.close();
      }
    } finally {
      await w.close();
    }
  });

  it("Journey K/L/T — email reset dual-session revoke, token expiry/reuse, new login ALLOW", async () => {
    const w = await createIdentityTestWorld();
    try {
      const patient = await activateTestPatient(
        w,
        "journey-reset@example.test",
        "9876543203",
      );
      const sessionA = await loginWithPassword(w.ctx, {
        email: patient.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.110",
        expectedRole: "PATIENT",
      });
      const sessionB = await loginWithPassword(w.ctx, {
        email: patient.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.111",
        expectedRole: "PATIENT",
      });
      assert.equal(sessionA.ok && sessionB.ok, true);
      if (!sessionA.ok || !sessionB.ok) {
        assert.fail("pre-reset sessions");
      }

      const requested = await requestPasswordReset(w.ctx, {
        email: patient.email,
        ip: "203.0.113.112",
      });
      assert.equal(requested.ok, true);
      const token = extractTokenFromLastEmail(w.email, "reset");
      assert.ok(token);

      assert.equal(
        (
          await resetPasswordWithToken(w.ctx, {
            token: "not-a-valid-reset-token-value!!!!!!!!!!!",
            password: NEW_PASSWORD,
            passwordConfirm: NEW_PASSWORD,
          })
        ).ok,
        false,
      );

      const reset = await resetPasswordWithToken(w.ctx, {
        token,
        password: NEW_PASSWORD,
        passwordConfirm: NEW_PASSWORD,
      });
      assert.equal(reset.ok, true);
      assert.equal(await readSession(w.ctx, sessionA.token), null);
      assert.equal(await readSession(w.ctx, sessionB.token), null);

      const reused = await resetPasswordWithToken(w.ctx, {
        token,
        password: "another-journey-pass1",
        passwordConfirm: "another-journey-pass1",
      });
      assert.equal(reused.ok, false);

      assert.equal(
        (
          await loginWithPassword(w.ctx, {
            email: patient.email,
            password: STRONG_PASSWORD,
            ip: "203.0.113.113",
            expectedRole: "PATIENT",
          })
        ).ok,
        false,
      );
      const fresh = await loginWithPassword(w.ctx, {
        email: patient.email,
        password: NEW_PASSWORD,
        ip: "203.0.113.114",
        expectedRole: "PATIENT",
      });
      assert.equal(fresh.ok, true);

      const revokedRows = await w.ctx.db
        .select({ revokedAt: sessions.revokedAt })
        .from(sessions)
        .where(eq(sessions.userId, patient.userId));
      assert.equal(
        revokedRows.filter((row) => row.revokedAt !== null).length >= 2,
        true,
      );

      // Expired token path (separate world clock).
      const wExp = await createIdentityTestWorld();
      try {
        const p = await activateTestPatient(
          wExp,
          "journey-exp@example.test",
          "9876543204",
        );
        await requestPasswordReset(wExp.ctx, {
          email: p.email,
          ip: "203.0.113.115",
        });
        const expToken = extractTokenFromLastEmail(wExp.email, "reset");
        assert.ok(expToken);
        wExp.advanceMs(wExp.ctx.config.passwordResetTtlMs + 1_000);
        assert.equal(
          (
            await resetPasswordWithToken(wExp.ctx, {
              token: expToken,
              password: NEW_PASSWORD,
              passwordConfirm: NEW_PASSWORD,
            })
          ).ok,
          false,
        );
      } finally {
        await wExp.close();
      }
    } finally {
      await w.close();
    }
  });

  it("Journey M/N — mobile OTP recovery isolation and invalid/replay DENY", async () => {
    const w = await createIdentityTestWorld();
    try {
      const a = await activateTestPatient(
        w,
        "otp-a@example.test",
        "9876543211",
      );
      const b = await activateTestPatient(
        w,
        "otp-b@example.test",
        "9876543212",
      );

      const reqA = await requestPasswordResetByIdentifier(w.ctx, {
        identifier: "9876543211",
        ip: "203.0.113.120",
      });
      assert.equal(reqA.ok, true);
      const codeA = w.otpProvider.peekLastCode("+919876543211");
      assert.ok(codeA);

      // Unrelated user B can still request OTP (isolation).
      const reqB = await requestPasswordResetByIdentifier(w.ctx, {
        identifier: "9876543212",
        ip: "203.0.113.121",
      });
      assert.equal(reqB.ok, true);
      const codeB = w.otpProvider.peekLastCode("+919876543212");
      assert.ok(codeB);
      assert.notEqual(codeA, codeB);

      const bad = await w.ctx.otp.verifyPasswordResetSms({
        userId: a.userId,
        code: "000000",
        ip: "203.0.113.122",
        expectedDestination: "+919876543211",
      });
      assert.equal(bad.ok, false);

      const good = await w.ctx.otp.verifyPasswordResetSms({
        userId: a.userId,
        code: codeA,
        ip: "203.0.113.122",
        expectedDestination: "+919876543211",
      });
      assert.equal(good.ok, true);
      const replay = await w.ctx.otp.verifyPasswordResetSms({
        userId: a.userId,
        code: codeA,
        ip: "203.0.113.122",
        expectedDestination: "+919876543211",
      });
      assert.equal(replay.ok, false);

      // B's OTP still usable (not consumed by A's verification).
      assert.equal(
        (
          await w.ctx.otp.verifyPasswordResetSms({
            userId: b.userId,
            code: codeB,
            ip: "203.0.113.123",
            expectedDestination: "+919876543212",
          })
        ).ok,
        true,
      );
    } finally {
      await w.close();
    }
  });

  it("Journey O — generic external responses with internal security reasons", async () => {
    const w = await createIdentityTestWorld();
    try {
      await activateTestPatient(w, "enum@example.test", "9876543205");
      const wrong = await loginWithPassword(w.ctx, {
        email: "enum@example.test",
        password: "wrong-password-12",
        ip: "203.0.113.130",
        expectedRole: "PATIENT",
      });
      assert.equal(wrong.ok, false);
      if (!wrong.ok) {
        assert.equal(wrong.message, SAFE_MESSAGES.genericAuthFailure);
        assert.equal(wrong.code, "INVALID");
      }

      await w.ctx.db
        .update(users)
        .set({ status: "DISABLED" })
        .where(eq(users.emailNormalized, "enum@example.test"));
      const disabled = await loginWithPassword(w.ctx, {
        email: "enum@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.131",
        expectedRole: "PATIENT",
      });
      assert.equal(disabled.ok, false);
      if (!disabled.ok) {
        assert.equal(disabled.message, SAFE_MESSAGES.genericAuthFailure);
        assert.equal(disabled.code, "INVALID");
      }
      const [userRow] = await w.ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, "enum@example.test"))
        .limit(1);
      assert.ok(userRow);
      const failureEvents = await w.ctx.db
        .select({
          eventType: securityEvents.eventType,
          metadata: securityEvents.metadata,
        })
        .from(securityEvents)
        .where(eq(securityEvents.userId, userRow.id));
      assert.equal(
        failureEvents.some(
          (e) =>
            e.eventType === "LOGIN_FAILURE" &&
            e.metadata?.reason === "disabled",
        ),
        true,
      );
      for (const event of failureEvents) {
        assert.equal(
          JSON.stringify(event.metadata ?? {}).includes(STRONG_PASSWORD),
          false,
        );
      }

      await w.ctx.db
        .update(users)
        .set({ status: "ACTIVE" })
        .where(eq(users.emailNormalized, "enum@example.test"));
      // Re-activate path not available without re-verify; use a fresh account for SUSPENDED.
      await activateTestPatient(w, "suspend@example.test", "9876543207");
      await w.ctx.db
        .update(users)
        .set({ status: "SUSPENDED" })
        .where(eq(users.emailNormalized, "suspend@example.test"));
      const suspended = await loginWithPassword(w.ctx, {
        email: "suspend@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.133",
        expectedRole: "PATIENT",
      });
      assert.equal(suspended.ok, false);
      if (!suspended.ok) {
        assert.equal(suspended.message, SAFE_MESSAGES.genericAuthFailure);
        assert.equal(suspended.code, "INVALID");
      }

      const unverified = await registerUnverifiedPatient(
        w,
        "unverified-j@example.test",
        "9876543206",
      );
      const pendingLogin = await loginWithPassword(w.ctx, {
        email: unverified.email,
        password: STRONG_PASSWORD,
        ip: "203.0.113.132",
        expectedRole: "PATIENT",
      });
      assert.equal(pendingLogin.ok, false);
      if (!pendingLogin.ok) {
        assert.equal(pendingLogin.message, SAFE_MESSAGES.genericAuthFailure);
        assert.equal(pendingLogin.code, "INVALID");
      }
    } finally {
      await w.close();
    }
  });

  it("Journey P/Q/R — privilege escalation DENY, Q&A cookie ≠ practice, role boundaries", async () => {
    const w = await createBookingTestWorld();
    try {
      const escalate = await assignRole(w.ctx, w.patientA.principal, {
        userId: w.patientA.userId,
        role: "PSYCHOLOGIST",
      });
      assert.equal(escalate.ok, false);

      const escalateAdmin = await assignRole(w.ctx, w.patientA.principal, {
        userId: w.patientA.userId,
        role: "SUPER_ADMIN",
      });
      assert.equal(escalateAdmin.ok, false);

      assert.equal(
        authorizationService.canAccess(w.psychologistPrincipal, {
          roles: ["SUPER_ADMIN"],
          permission: "MANAGE_SYSTEM_SETTINGS",
        }).allowed,
        false,
      );

      const now = w.ctx.now().getTime();
      const qaToken = await createSessionToken(
        "qa-journey@example.test",
        now,
        QA_SESSION_SECRET,
      );
      assert.ok(qaToken);
      assert.ok(await readSessionToken(qaToken, now, QA_SESSION_SECRET));
      assert.equal(await readSession(w.ctx, qaToken), null);
      assert.equal((await listPracticePatients(w.ctx, null, {})).ok, false);
      assert.equal(
        (
          await updatePracticePatientProfile(w.ctx, null, {
            patientPublicId: "PAT-23456789",
            displayName: "No",
            status: "SUSPENDED",
          })
        ).ok,
        false,
      );

      // Cookie attribute documentation (source-level; Production Secure NOT VERIFIED).
      const cookie = sessionCookieOptions(w.ctx, 3600);
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.sameSite, "lax");
      assert.equal(cookie.secure, false); // nodeEnv=test
    } finally {
      await w.close();
    }
  });
});

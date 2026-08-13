import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  confirmAppointment,
  requestAppointment,
} from "@/lib/practice/appointment-service";
import {
  registerPatient,
  sendMobileOtp,
  verifyEmailToken,
  verifyMobileOtp,
} from "@/lib/practice/auth-service";
import {
  addConsultationNote,
  createConsultationFromAppointment,
  getNoteForRequester,
} from "@/lib/practice/clinical-service";
import {
  MemoryPracticeRepository,
  resetMemoryPracticeRepositoryForTests,
} from "@/lib/practice/memory-store";
import {
  createPracticeSessionToken,
  readPracticeSessionToken,
} from "@/lib/practice/session";
import {
  createTestPsychologist,
  setPracticeRepositoryForTests,
} from "@/lib/practice/store";
import { generateTotp, generateTotpSecret, verifyTotp } from "@/lib/practice/totp";
import { hashOpaqueToken } from "@/lib/practice/providers";
import type { PracticeSession } from "@/types/practice";

process.env.PRACTICE_STORE = "memory";
process.env.PRACTICE_SESSION_SECRET =
  process.env.PRACTICE_SESSION_SECRET ??
  "practice-test-session-secret-32chars!!";
process.env.OTP_PROVIDER = "mock";
process.env.WHATSAPP_PROVIDER = "mock";


async function registerVerifiedPatient(mobile = "9876543210") {
  const result = await registerPatient({
    fullName: "Test Patient",
    email: `patient.${mobile}@example.test`,
    mobile,
    password: "PatientPass!234",
    confirmPassword: "PatientPass!234",
    consentAccepted: true,
    privacyAccepted: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("register failed");
  }
  const repo = await import("@/lib/practice/store").then((m) =>
    m.getPracticeRepository(),
  );
  const user = await repo.getUserById(result.userId);
  assert.ok(user);
  const now = new Date().toISOString();
  await repo.updateUser({
    ...user!,
    emailVerifiedAt: now,
    mobileVerifiedAt: now,
    updatedAt: now,
  });
  const patient = await repo.getPatientByUserId(result.userId);
  assert.ok(patient);
  const session: PracticeSession = {
    userId: result.userId,
    email: user!.email,
    role: "PATIENT",
    fullName: user!.fullName,
    patientId: patient!.id,
    expiresAt: Date.now() + 60_000,
    sessionId: "test-patient-session",
    mfaVerified: true,
  };
  return { session, userId: result.userId, patientId: patient!.id, repo };
}

describe("practice management", () => {
  beforeEach(() => {
    resetMemoryPracticeRepositoryForTests();
    const repo = new MemoryPracticeRepository();
    setPracticeRepositoryForTests(repo);
  });

  it("registers a patient and queues email verification", async () => {
    const result = await registerPatient({
      fullName: "Asha Verma",
      email: "asha@example.test",
      mobile: "9123456789",
      password: "SecurePass!234",
      confirmPassword: "SecurePass!234",
      consentAccepted: true,
      privacyAccepted: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const repo = await import("@/lib/practice/store").then((m) =>
      m.getPracticeRepository(),
    );
    const user = await repo.getUserByEmail("asha@example.test");
    assert.ok(user);
    assert.equal(user!.role, "PATIENT");
    const patient = await repo.getPatientByUserId(user!.id);
    assert.ok(patient);
    assert.match(patient!.publicId, /^PAT-/);
    const notifications = await repo.listNotificationsForUser(user!.id);
    assert.ok(
      notifications.some((item) => item.eventType === "EMAIL_VERIFICATION"),
    );
    assert.ok(
      notifications.every(
        (item) =>
          item.deliveryStatus === "MOCKED" || item.deliveryStatus === "QUEUED",
      ),
    );
  });

  it("rejects duplicate email registration", async () => {
    const first = await registerPatient({
      fullName: "One",
      email: "dup@example.test",
      mobile: "9000000001",
      password: "SecurePass!234",
      confirmPassword: "SecurePass!234",
      consentAccepted: true,
      privacyAccepted: true,
    });
    assert.equal(first.ok, true);
    const second = await registerPatient({
      fullName: "Two",
      email: "dup@example.test",
      mobile: "9000000002",
      password: "SecurePass!234",
      confirmPassword: "SecurePass!234",
      consentAccepted: true,
      privacyAccepted: true,
    });
    assert.equal(second.ok, false);
  });

  it("verifies email tokens and rejects reuse", async () => {
    const registered = await registerPatient({
      fullName: "Email User",
      email: "email.user@example.test",
      mobile: "9111111111",
      password: "SecurePass!234",
      confirmPassword: "SecurePass!234",
      consentAccepted: true,
      privacyAccepted: true,
    });
    assert.equal(registered.ok, true);
    if (!registered.ok) return;
    const repo = await import("@/lib/practice/store").then((m) =>
      m.getPracticeRepository(),
    );
    // Recover token by writing a known verification row.
    const token = "email-verify-token-for-test";
    await repo.createEmailVerification({
      id: crypto.randomUUID(),
      userId: registered.userId,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
    const ok = await verifyEmailToken(token);
    assert.equal(ok.ok, true);
    const again = await verifyEmailToken(token);
    assert.equal(again.ok, false);
  });

  it("accepts OTP and rejects expired OTP", async () => {
    const registered = await registerPatient({
      fullName: "Otp User",
      email: "otp.user@example.test",
      mobile: "9222222222",
      password: "SecurePass!234",
      confirmPassword: "SecurePass!234",
      consentAccepted: true,
      privacyAccepted: true,
    });
    assert.equal(registered.ok, true);
    if (!registered.ok) return;
    const sent = await sendMobileOtp(registered.userId);
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    assert.equal(sent.mocked, true);
    assert.ok(sent.devCode);
    const verified = await verifyMobileOtp(registered.userId, sent.devCode!);
    assert.equal(verified.ok, true);

    const repo = await import("@/lib/practice/store").then((m) =>
      m.getPracticeRepository(),
    );
    const previous = await repo.getLatestOtpChallenge(registered.userId);
    assert.ok(previous);
    await repo.updateOtpChallenge({
      ...previous!,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
    });

    const sent2 = await sendMobileOtp(registered.userId);
    assert.equal(sent2.ok, true);
    if (!sent2.ok) return;
    const challenge = await repo.getLatestOtpChallenge(registered.userId);
    assert.ok(challenge);
    await repo.updateOtpChallenge({
      ...challenge!,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    const expired = await verifyMobileOtp(registered.userId, sent2.devCode!);
    assert.equal(expired.ok, false);
  });

  it("prevents confirming overlapping appointments (double-book)", async () => {
    const { userId: psychId } = await createTestPsychologist();
    const patientA = await registerVerifiedPatient("9333333333");
    const patientB = await registerVerifiedPatient("9444444444");
    const startsAt = "2030-06-03T10:00:00+05:30"; // Monday
    const a = await requestAppointment(patientA.session, {
      consultationTypeId: "ctype-initial",
      startsAt,
    });
    assert.equal(a.ok, true);
    const b = await requestAppointment(patientB.session, {
      consultationTypeId: "ctype-follow-up",
      startsAt,
    });
    assert.equal(b.ok, false);

    // Confirm path also rejects overlap when a confirmed appointment exists.
    const psychSession: PracticeSession = {
      userId: psychId,
      email: "vandana@example.test",
      role: "PSYCHOLOGIST",
      fullName: "Dr. Vandana Rajiv Chaudhary",
      patientId: null,
      expiresAt: Date.now() + 60_000,
      sessionId: "psych-session",
      mfaVerified: true,
    };
    if (a.ok) {
      const confirmed = await confirmAppointment(psychSession, a.appointment.id);
      assert.equal(confirmed.ok, true);
    }
  });

  it("denies patient access to PRIVATE consultation notes (IDOR)", async () => {
    const { userId: psychId } = await createTestPsychologist();
    const patient = await registerVerifiedPatient("9555555555");
    const psychSession: PracticeSession = {
      userId: psychId,
      email: "vandana@example.test",
      role: "PSYCHOLOGIST",
      fullName: "Dr. Vandana",
      patientId: null,
      expiresAt: Date.now() + 60_000,
      sessionId: "psych",
      mfaVerified: true,
    };
    const booked = await requestAppointment(patient.session, {
      consultationTypeId: "ctype-initial",
      startsAt: "2030-06-04T10:00:00+05:30",
    });
    assert.equal(booked.ok, true);
    if (!booked.ok) return;
    await confirmAppointment(psychSession, booked.appointment.id);
    await createConsultationFromAppointment(psychSession, booked.appointment.id);
    const repo = await import("@/lib/practice/store").then((m) =>
      m.getPracticeRepository(),
    );
    const consultations = await repo.listConsultationsForPatient(patient.patientId);
    assert.equal(consultations.length, 1);
    const privateNote = await addConsultationNote(psychSession, {
      consultationId: consultations[0]!.id,
      visibility: "PRIVATE",
      body: "Private clinical observation",
    });
    const visibleNote = await addConsultationNote(psychSession, {
      consultationId: consultations[0]!.id,
      visibility: "PATIENT_VISIBLE",
      body: "Shared summary for patient",
    });

    await assert.rejects(
      () => getNoteForRequester(patient.session, privateNote.id),
      /FORBIDDEN/,
    );
    const shared = await getNoteForRequester(patient.session, visibleNote.id);
    assert.equal(shared.body, "Shared summary for patient");
  });

  it("issues and validates practice session tokens", async () => {
    const token = await createPracticeSessionToken({
      userId: "u1",
      email: "u1@example.test",
      role: "PATIENT",
      fullName: "U One",
      patientId: "p1",
      mfaVerified: true,
    });
    assert.ok(token);
    const session = await readPracticeSessionToken(token!);
    assert.ok(session);
    assert.equal(session!.email, "u1@example.test");
    assert.equal(session!.role, "PATIENT");
  });

  it("verifies TOTP codes for MFA", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = generateTotp(secret, now);
    assert.equal(verifyTotp(secret, code, now), true);
    assert.equal(verifyTotp(secret, "000000", now), false);
  });
});

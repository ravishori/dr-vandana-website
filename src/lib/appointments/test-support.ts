import { eq } from "drizzle-orm";

import type { AppointmentStatus, AvailabilityExceptionKind } from "@/lib/appointments/constants";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import {
  appointments,
  availabilityExceptions,
  practiceAppointmentSettings,
} from "@/lib/appointments/schema";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import { addMinutes } from "@/lib/appointments/timezone";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import { loadPrincipal } from "@/lib/identity/principal";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { registerPatient } from "@/lib/identity/registration";
import { users } from "@/lib/identity/schema";
import { createSession, readSession } from "@/lib/identity/sessions";
import {
  createIdentityTestWorld,
  extractTokenFromLastEmail,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";
import {
  requestPhoneOtpForPendingUser,
  verifyEmailToken,
  verifyPhoneOtpAndActivate,
} from "@/lib/identity/verification";

const STRONG_PASSWORD = "correct-horse-battery";

export type AvailabilityTestWorld = IdentityTestWorld & {
  psychologistUserId: string;
  patientUserId: string;
  appointmentTypePublicId: string;
  appointmentTypeId: string;
};

export async function createAvailabilityTestWorld(): Promise<AvailabilityTestWorld> {
  const world = await createIdentityTestWorld();
  const psychologist = await provisionPrivilegedUser(world.ctx, {
    role: "PSYCHOLOGIST",
    email: "vandana@example.test",
    password: STRONG_PASSWORD,
    displayName: "Dr. Vandana Rajiv Chaudhary",
  });
  if (!psychologist.ok) {
    throw new Error("psychologist_provision_failed");
  }
  const now = world.ctx.now();
  const patientUserId = generateUuid();
  await world.ctx.db.insert(users).values({
    id: patientUserId,
    publicId: generatePublicId("PAT"),
    email: "availability-patient@example.test",
    emailNormalized: "availability-patient@example.test",
    passwordHash: "unused-test-hash",
    status: "ACTIVE",
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    mobileNumber: null,
    mobileNormalized: null,
    mobileVerifiedAt: null,
    emailVerifiedAt: now,
  });
  const seeded = await seedTestPracticeConfiguration(
    world.ctx.db,
    psychologist.userId,
    now,
  );
  return {
    ...world,
    psychologistUserId: psychologist.userId,
    patientUserId,
    appointmentTypePublicId: seeded.appointmentTypePublicId,
    appointmentTypeId: seeded.appointmentTypeId,
  };
}

export async function insertTestAppointment(
  ctx: IdentityContext,
  input: {
    psychologistUserId: string;
    patientUserId: string;
    appointmentTypeId: string;
    status: AppointmentStatus;
    startsAt: Date;
    endsAt: Date;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
  },
): Promise<string> {
  const now = ctx.now();
  const id = generateUuid();
  const occupiedStartsAt = addMinutes(
    input.startsAt,
    -(input.bufferBeforeMinutes ?? 0),
  );
  const occupiedEndsAt = addMinutes(input.endsAt, input.bufferAfterMinutes ?? 0);
  await ctx.db.insert(appointments).values({
    id,
    publicId: generatePublicId("APT"),
    patientUserId: input.patientUserId,
    psychologistUserId: input.psychologistUserId,
    appointmentTypeId: input.appointmentTypeId,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    occupiedStartsAt,
    occupiedEndsAt,
    requestedStartsAt: input.startsAt,
    requestedEndsAt: input.endsAt,
    timezone: PRACTICE_TIMEZONE,
    version: 1,
    proposedStartsAt: null,
    proposedEndsAt: null,
    cancelReasonCode: null,
    cancelNote: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function insertTestException(
  ctx: IdentityContext,
  input: {
    psychologistUserId: string;
    kind: AvailabilityExceptionKind;
    localDate?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    opensLocal?: string | null;
    closesLocal?: string | null;
  },
): Promise<void> {
  await ctx.db.insert(availabilityExceptions).values({
    id: generateUuid(),
    psychologistUserId: input.psychologistUserId,
    kind: input.kind,
    localDate: input.localDate ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    opensLocal: input.opensLocal ?? null,
    closesLocal: input.closesLocal ?? null,
    note: "TEST FIXTURE ONLY",
    createdAt: ctx.now(),
  });
}

export async function updateTestBookingWindow(
  ctx: IdentityContext,
  psychologistUserId: string,
  input: {
    minimumNoticeMinutes?: number | null;
    maximumAdvanceDays?: number | null;
  },
): Promise<void> {
  await ctx.db
    .update(practiceAppointmentSettings)
    .set({
      minimumNoticeMinutes: input.minimumNoticeMinutes,
      maximumAdvanceDays: input.maximumAdvanceDays,
      updatedAt: ctx.now(),
    })
    .where(eq(practiceAppointmentSettings.psychologistUserId, psychologistUserId));
}

export type TestPatientActor = {
  userId: string;
  principal: AuthorizationPrincipal;
  email: string;
};

export type BookingTestWorld = IdentityTestWorld & {
  psychologistUserId: string;
  psychologistPrincipal: AuthorizationPrincipal;
  appointmentTypePublicId: string;
  appointmentTypeId: string;
  patientA: TestPatientActor;
  patientB: TestPatientActor;
};

async function sessionPrincipal(
  ctx: IdentityContext,
  userId: string,
  roles: AuthorizationPrincipal["roles"],
): Promise<AuthorizationPrincipal> {
  const created = await createSession(ctx, {
    userId,
    roles,
    ip: "203.0.113.10",
    mfaCompleted: true,
  });
  const session = await readSession(ctx, created.token);
  if (!session) {
    throw new Error("test_session_missing");
  }
  return loadPrincipal(ctx, session);
}

export async function registerUnverifiedPatient(
  world: IdentityTestWorld,
  email: string,
  mobile: string,
): Promise<TestPatientActor> {
  const registered = await registerPatient(world.ctx, {
    displayName: email.split("@")[0] ?? "Patient",
    email,
    mobile,
    password: STRONG_PASSWORD,
    passwordConfirm: STRONG_PASSWORD,
    acceptedTerms: true,
    ip: "203.0.113.10",
  });
  if (!registered.ok) {
    throw new Error("test_register_failed");
  }
  const [user] = await world.ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, email.toLowerCase()))
    .limit(1);
  if (!user) {
    throw new Error("test_user_missing");
  }
  const principal = await sessionPrincipal(world.ctx, user.id, ["PATIENT"]);
  return { userId: user.id, principal, email };
}

export async function activateTestPatient(
  world: IdentityTestWorld,
  email: string,
  mobile: string,
): Promise<TestPatientActor> {
  const pending = await registerUnverifiedPatient(world, email, mobile);
  const token = extractTokenFromLastEmail(world.email, "verify");
  if (!token) {
    throw new Error("test_verify_token_missing");
  }
  const verified = await verifyEmailToken(world.ctx, token);
  if (!verified.ok) {
    throw new Error("test_email_verify_failed");
  }
  const sent = await requestPhoneOtpForPendingUser(world.ctx, {
    email,
    ip: "203.0.113.10",
  });
  if (!sent.ok) {
    throw new Error("test_otp_send_failed");
  }
  const normalized = `+91${mobile.replace(/\D/g, "").slice(-10)}`;
  const otp = world.otpProvider.peekLastCode(normalized);
  if (!otp) {
    throw new Error("test_otp_missing");
  }
  const activated = await verifyPhoneOtpAndActivate(world.ctx, {
    email,
    code: otp,
    ip: "203.0.113.10",
  });
  if (!activated.ok) {
    throw new Error("test_phone_verify_failed");
  }
  const principal = await sessionPrincipal(world.ctx, pending.userId, ["PATIENT"]);
  return { ...pending, principal };
}

export async function createBookingTestWorld(): Promise<BookingTestWorld> {
  const world = await createIdentityTestWorld();
  const psychologist = await provisionPrivilegedUser(world.ctx, {
    role: "PSYCHOLOGIST",
    email: "vandana@example.test",
    password: STRONG_PASSWORD,
    displayName: "Dr. Vandana Rajiv Chaudhary",
  });
  if (!psychologist.ok) {
    throw new Error("psychologist_provision_failed");
  }
  const seeded = await seedTestPracticeConfiguration(
    world.ctx.db,
    psychologist.userId,
    world.ctx.now(),
  );
  const psychologistPrincipal = await sessionPrincipal(
    world.ctx,
    psychologist.userId,
    ["PSYCHOLOGIST"],
  );
  const patientA = await activateTestPatient(
    world,
    "patient-a@example.test",
    "9876543210",
  );
  const patientB = await activateTestPatient(
    world,
    "patient-b@example.test",
    "9876543211",
  );
  return {
    ...world,
    psychologistUserId: psychologist.userId,
    psychologistPrincipal,
    appointmentTypePublicId: seeded.appointmentTypePublicId,
    appointmentTypeId: seeded.appointmentTypeId,
    patientA,
    patientB,
  };
}

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
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import type { IdentityContext } from "@/lib/identity/context";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { users } from "@/lib/identity/schema";
import {
  createIdentityTestWorld,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";

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

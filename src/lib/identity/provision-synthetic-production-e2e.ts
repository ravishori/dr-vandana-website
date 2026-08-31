/**
 * Fixed O-B-P04D Production synthetic identities and controlled E2E setup.
 * Creates/reuses labelled synthetic psychologist + patient, seeds TEST FIXTURE
 * practice configuration, and books one appointment via requestAppointment.
 */

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  appointmentNotificationOutbox,
  appointments,
} from "@/lib/appointments/schema";
import { appendAuditLog } from "@/lib/identity/audit";
import { seedIdentityCatalog, getRoleIdByName } from "@/lib/identity/catalog";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import { normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { loadPrincipal } from "@/lib/identity/principal";
import {
  assertProductionSyntheticE2eAllowed,
  type ProductionSyntheticE2eGuardResult,
} from "@/lib/identity/provision-synthetic-production-e2e-guard";
import {
  patientProfiles,
  psychologistProfiles,
  userRoles,
  users,
} from "@/lib/identity/schema";
import { createSession, readSession } from "@/lib/identity/sessions";
import { hashPassword } from "@/lib/question-portal/password";

export const SYNTHETIC_PRODUCTION_E2E = {
  psychologist: {
    displayName: "O-B-P04D Synthetic Psychologist",
    email: "ob04d-synthetic-psychologist@example.test",
    mobile: "+919000000701",
  },
  patient: {
    displayName: "O-B-P04D Synthetic Patient",
    email: "ravishori+ob04d-synthetic-production@gmail.com",
    mobile: "+919000000702",
  },
} as const;

export type ProductionE2eSetupInput = {
  password: string;
  databaseUrlForGuard: string | undefined;
  registrationEnabled: boolean;
  whatsAppEnabled: boolean;
  syntheticProductionE2eEnabled: boolean;
  ceremonyProfile: string | undefined;
  nodeEnv: string | undefined;
  requestedStartIso: string;
  appointmentTypePublicId?: string;
};

export type ProductionE2eSetupResult =
  | {
      ok: true;
      psychologistPublicId: string;
      patientPublicId: string;
      appointmentPublicId: string;
      appointmentTypePublicId: string;
      outboxEventKey: string;
      outboxStatus: string;
      outboxId: string;
      createdPsychologist: boolean;
      createdPatient: boolean;
    }
  | { ok: false; message: string };

async function ensurePsychologist(
  ctx: IdentityContext,
  password: string,
): Promise<
  | { ok: true; userId: string; publicId: string; created: boolean }
  | { ok: false; message: string }
> {
  const emailNormalized = normalizeEmail(SYNTHETIC_PRODUCTION_E2E.psychologist.email);
  const [existing] = await ctx.db
    .select({
      id: users.id,
      publicId: users.publicId,
      status: users.status,
    })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  if (existing) {
    return {
      ok: true,
      userId: existing.id,
      publicId: existing.publicId,
      created: false,
    };
  }

  const policy = evaluatePasswordPolicy(
    password,
    SYNTHETIC_PRODUCTION_E2E.psychologist.email,
  );
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }

  const roleId = await getRoleIdByName(ctx.db, "PSYCHOLOGIST");
  if (!roleId) {
    return { ok: false, message: "Role catalog is not ready (PSYCHOLOGIST missing)." };
  }

  const mobileNormalized = normalizeMobile(
    SYNTHETIC_PRODUCTION_E2E.psychologist.mobile,
  );
  if (!mobileNormalized) {
    return { ok: false, message: "Synthetic psychologist mobile is invalid." };
  }

  const now = ctx.now();
  const userId = generateUuid();
  const publicId = generatePublicId("PSY");
  const passwordHash = await hashPassword(password);

  await ctx.db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      publicId,
      email: SYNTHETIC_PRODUCTION_E2E.psychologist.email,
      emailNormalized,
      passwordHash,
      mobileNumber: mobileNormalized,
      mobileNormalized,
      mobileVerifiedAt: now,
      emailVerifiedAt: now,
      status: "ACTIVE",
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    await tx.insert(psychologistProfiles).values({
      id: generateUuid(),
      userId,
      displayName: SYNTHETIC_PRODUCTION_E2E.psychologist.displayName,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(userRoles).values({
      userId,
      roleId,
      assignedAt: now,
      assignedBy: null,
    });
  });

  return { ok: true, userId, publicId, created: true };
}

async function ensurePatient(
  ctx: IdentityContext,
  password: string,
): Promise<
  | { ok: true; userId: string; publicId: string; created: boolean }
  | { ok: false; message: string }
> {
  const emailNormalized = normalizeEmail(SYNTHETIC_PRODUCTION_E2E.patient.email);
  const [existing] = await ctx.db
    .select({
      id: users.id,
      publicId: users.publicId,
    })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  if (existing) {
    return {
      ok: true,
      userId: existing.id,
      publicId: existing.publicId,
      created: false,
    };
  }

  const policy = evaluatePasswordPolicy(
    password,
    SYNTHETIC_PRODUCTION_E2E.patient.email,
  );
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }

  const roleId = await getRoleIdByName(ctx.db, "PATIENT");
  if (!roleId) {
    return { ok: false, message: "Role catalog is not ready (PATIENT missing)." };
  }

  const mobileNormalized = normalizeMobile(SYNTHETIC_PRODUCTION_E2E.patient.mobile);
  if (!mobileNormalized) {
    return { ok: false, message: "Synthetic patient mobile is invalid." };
  }

  const now = ctx.now();
  const userId = generateUuid();
  const publicId = generatePublicId("PAT");
  const passwordHash = await hashPassword(password);

  await ctx.db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      publicId,
      email: SYNTHETIC_PRODUCTION_E2E.patient.email,
      emailNormalized,
      passwordHash,
      mobileNumber: mobileNormalized,
      mobileNormalized,
      mobileVerifiedAt: now,
      emailVerifiedAt: now,
      status: "ACTIVE",
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    await tx.insert(patientProfiles).values({
      id: generateUuid(),
      userId,
      displayName: SYNTHETIC_PRODUCTION_E2E.patient.displayName,
      dateOfBirth: null,
      gender: null,
      emergencyContact: null,
      whatsappNotificationsEnabled: false,
      whatsappOptedInAt: null,
      whatsappOptedOutAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(userRoles).values({
      userId,
      roleId,
      assignedAt: now,
      assignedBy: null,
    });
  });

  return { ok: true, userId, publicId, created: true };
}

export function assertProductionSyntheticE2eSetupAllowed(
  input: Pick<
    ProductionE2eSetupInput,
    | "databaseUrlForGuard"
    | "registrationEnabled"
    | "whatsAppEnabled"
    | "syntheticProductionE2eEnabled"
    | "ceremonyProfile"
    | "nodeEnv"
  >,
): ProductionSyntheticE2eGuardResult {
  return assertProductionSyntheticE2eAllowed({
    NODE_ENV: input.nodeEnv ?? "development",
    SYNTHETIC_PRODUCTION_E2E_ENABLED: input.syntheticProductionE2eEnabled
      ? "true"
      : "false",
    O_B_P04D_CEREMONY_PROFILE: input.ceremonyProfile ?? "",
    PATIENT_REGISTRATION_ENABLED: input.registrationEnabled ? "true" : "false",
    TWILIO_WHATSAPP_ENABLED: input.whatsAppEnabled ? "true" : "false",
    DATABASE_URL: input.databaseUrlForGuard ?? "",
  } as NodeJS.ProcessEnv);
}

export async function runProductionSyntheticE2eSetup(
  ctx: IdentityContext,
  input: ProductionE2eSetupInput,
): Promise<ProductionE2eSetupResult> {
  const guard = assertProductionSyntheticE2eSetupAllowed(input);
  if (!guard.ok) {
    return { ok: false, message: guard.reason };
  }

  await seedIdentityCatalog(ctx.db, ctx.now());

  const psychologist = await ensurePsychologist(ctx, input.password);
  if (!psychologist.ok) {
    return { ok: false, message: psychologist.message };
  }

  const patient = await ensurePatient(ctx, input.password);
  if (!patient.ok) {
    return { ok: false, message: patient.message };
  }

  const seeded = await seedTestPracticeConfiguration(
    ctx.db,
    psychologist.userId,
    ctx.now(),
  );

  const sessionCreated = await createSession(ctx, {
    userId: patient.userId,
    roles: ["PATIENT"],
    ip: "127.0.0.1",
    userAgent: "O-B-P04D-ceremony",
    mfaCompleted: false,
  });
  const session = await readSession(ctx, sessionCreated.token);
  if (!session) {
    return { ok: false, message: "Failed to read synthetic patient session." };
  }
  const principal = await loadPrincipal(ctx, session);

  const booked = await requestAppointment(ctx, {
    principal,
    requestedStart: input.requestedStartIso,
    appointmentTypePublicId:
      input.appointmentTypePublicId ?? seeded.appointmentTypePublicId,
    idempotencyKey: "ob-p04d-production-e2e-v1",
    ipAddress: "127.0.0.1",
  });

  if (!booked.ok) {
    return {
      ok: false,
      message: `Synthetic appointment booking failed: ${booked.code}`,
    };
  }

  const [appointmentRow] = await ctx.db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.publicId, booked.appointment.publicId))
    .limit(1);

  const [outboxRow] = await ctx.db
    .select({
      id: appointmentNotificationOutbox.id,
      eventKey: appointmentNotificationOutbox.eventKey,
      status: appointmentNotificationOutbox.status,
    })
    .from(appointmentNotificationOutbox)
    .where(
      appointmentRow
        ? eq(appointmentNotificationOutbox.appointmentId, appointmentRow.id)
        : eq(appointmentNotificationOutbox.eventKey, "AppointmentRequested"),
    )
    .limit(1);

  if (!outboxRow) {
    return { ok: false, message: "Expected outbox row was not created." };
  }

  await appendAuditLog(ctx, {
    actorUserId: patient.userId,
    action: "SYNTHETIC_PRODUCTION_E2E_SETUP",
    targetType: "appointment",
    targetId: booked.appointment.publicId,
    result: "SUCCESS",
    metadata: {
      purpose: "O-B-P04D",
      synthetic: true,
      psychologistPublicId: psychologist.publicId,
      patientPublicId: patient.publicId,
      outboxEventKey: outboxRow.eventKey,
    },
  });

  return {
    ok: true,
    psychologistPublicId: psychologist.publicId,
    patientPublicId: patient.publicId,
    appointmentPublicId: booked.appointment.publicId,
    appointmentTypePublicId: seeded.appointmentTypePublicId,
    outboxEventKey: outboxRow.eventKey,
    outboxStatus: outboxRow.status,
    outboxId: outboxRow.id,
    createdPsychologist: psychologist.created,
    createdPatient: patient.created,
  };
}

/**
 * Staging-only non-public synthetic PATIENT provisioning.
 * Operator/CLI path only — not a public registration bypass.
 */

import { and, eq } from "drizzle-orm";

import { appendAuditLog } from "@/lib/identity/audit";
import { getRoleIdByName } from "@/lib/identity/catalog";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import { assertStagingMigrateTarget } from "@/lib/identity/migrate-target-guard";
import { normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import {
  patientProfiles,
  roles,
  userRoles,
  users,
} from "@/lib/identity/schema";
import { hashPassword } from "@/lib/question-portal/password";

/** Fixed synthetic identity — not caller-controlled. */
export const SYNTHETIC_STAGING_PATIENT = {
  displayName: "O-B-05E Synthetic Patient",
  /**
   * Designated staging mailbox is ravishori@gmail.com, but that address is
   * already bound to SUPER_ADMIN on staging. Gmail plus-addressing delivers
   * to the same inbox while keeping a distinct users.email_normalized row.
   * Application normalizeEmail does not collapse plus-tags.
   */
  email: "ravishori+ob05e-synthetic-patient@gmail.com",
  mobile: "+919000000501",
} as const;

export type SyntheticPatientProvisionInput = {
  password: string;
  /**
   * DATABASE_URL used only for fail-closed staging target validation.
   * Production / unknown targets refuse before any write.
   */
  databaseUrlForGuard: string | undefined;
  /**
   * Must be false. Provisioning must not run while public registration is on.
   */
  registrationEnabled: boolean;
  /**
   * Explicit operator opt-in (env SYNTHETIC_PATIENT_PROVISION_ENABLED=true).
   */
  syntheticPatientProvisionEnabled: boolean;
  /**
   * Must not be production. NODE_ENV=production refuses.
   */
  nodeEnv: string | undefined;
};

export type SyntheticPatientProvisionResult =
  | {
      ok: true;
      created: boolean;
      publicId: string;
      userId: string;
      displayName: string;
      email: string;
      role: "PATIENT";
      status: string;
    }
  | { ok: false; message: string };

export function assertSyntheticPatientProvisionAllowed(
  input: Pick<
    SyntheticPatientProvisionInput,
    | "databaseUrlForGuard"
    | "registrationEnabled"
    | "syntheticPatientProvisionEnabled"
    | "nodeEnv"
  >,
): { ok: true; hostname: string; database: string } | { ok: false; reason: string } {
  if (input.nodeEnv === "production") {
    return {
      ok: false,
      reason: "Refusing synthetic patient provision when NODE_ENV=production.",
    };
  }
  if (input.registrationEnabled) {
    return {
      ok: false,
      reason:
        "Refusing synthetic patient provision while PATIENT_REGISTRATION_ENABLED=true. Keep registration disabled and use this non-public path only.",
    };
  }
  if (!input.syntheticPatientProvisionEnabled) {
    return {
      ok: false,
      reason:
        "Set SYNTHETIC_PATIENT_PROVISION_ENABLED=true for staging synthetic patient provisioning.",
    };
  }
  return assertStagingMigrateTarget(input.databaseUrlForGuard);
}

async function loadExistingSyntheticPatient(
  ctx: IdentityContext,
): Promise<{
  userId: string;
  publicId: string;
  status: string;
  roleOk: boolean;
  profileOk: boolean;
} | null> {
  const emailNormalized = normalizeEmail(SYNTHETIC_STAGING_PATIENT.email);
  const [byEmail] = await ctx.db
    .select({
      id: users.id,
      publicId: users.publicId,
      status: users.status,
    })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  const [byName] = await ctx.db
    .select({
      id: users.id,
      publicId: users.publicId,
      status: users.status,
    })
    .from(users)
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(eq(patientProfiles.displayName, SYNTHETIC_STAGING_PATIENT.displayName))
    .limit(1);

  const existing = byEmail ?? byName;
  if (!existing) {
    return null;
  }

  const patientRoleId = await getRoleIdByName(ctx.db, "PATIENT");
  const roleRows = await ctx.db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, existing.id));
  const roleNames = roleRows.map((row) => row.name);
  const roleOk =
    patientRoleId != null &&
    roleNames.includes("PATIENT") &&
    roleNames.length === 1 &&
    roleNames[0] === "PATIENT";

  const [profile] = await ctx.db
    .select({ id: patientProfiles.id })
    .from(patientProfiles)
    .where(
      and(
        eq(patientProfiles.userId, existing.id),
        eq(patientProfiles.displayName, SYNTHETIC_STAGING_PATIENT.displayName),
      ),
    )
    .limit(1);

  return {
    userId: existing.id,
    publicId: existing.publicId,
    status: existing.status,
    roleOk,
    profileOk: Boolean(profile),
  };
}

/**
 * Creates or reuses the fixed O-B-05E synthetic PATIENT on a verified staging DB.
 * Does not send email, create appointments, or touch registration flags.
 */
export async function provisionSyntheticStagingPatient(
  ctx: IdentityContext,
  input: SyntheticPatientProvisionInput,
): Promise<SyntheticPatientProvisionResult> {
  const guard = assertSyntheticPatientProvisionAllowed(input);
  if (!guard.ok) {
    return { ok: false, message: guard.reason };
  }

  const policy = evaluatePasswordPolicy(
    input.password,
    SYNTHETIC_STAGING_PATIENT.email,
  );
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }

  const mobileNormalized = normalizeMobile(SYNTHETIC_STAGING_PATIENT.mobile);
  if (!mobileNormalized) {
    return { ok: false, message: "Synthetic mobile is invalid." };
  }

  const existing = await loadExistingSyntheticPatient(ctx);
  if (existing) {
    if (!existing.roleOk || !existing.profileOk || existing.status !== "ACTIVE") {
      return {
        ok: false,
        message:
          "A synthetic patient identity already exists but is not in the expected ACTIVE PATIENT state.",
      };
    }
    return {
      ok: true,
      created: false,
      publicId: existing.publicId,
      userId: existing.userId,
      displayName: SYNTHETIC_STAGING_PATIENT.displayName,
      email: SYNTHETIC_STAGING_PATIENT.email,
      role: "PATIENT",
      status: existing.status,
    };
  }

  const emailNormalized = normalizeEmail(SYNTHETIC_STAGING_PATIENT.email);
  const [emailOwner] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (emailOwner) {
    return {
      ok: false,
      message: "Synthetic patient email is already bound to another account.",
    };
  }
  const [mobileOwner] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.mobileNormalized, mobileNormalized))
    .limit(1);
  if (mobileOwner) {
    return {
      ok: false,
      message: "Synthetic patient mobile is already bound to another account.",
    };
  }

  const roleId = await getRoleIdByName(ctx.db, "PATIENT");
  if (!roleId) {
    return { ok: false, message: "Role catalog is not ready (PATIENT missing)." };
  }

  const now = ctx.now();
  const userId = generateUuid();
  const publicId = generatePublicId("PAT");
  const passwordHash = await hashPassword(input.password);

  await ctx.db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      publicId,
      email: SYNTHETIC_STAGING_PATIENT.email,
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
      displayName: SYNTHETIC_STAGING_PATIENT.displayName,
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

  await appendAuditLog(ctx, {
    actorUserId: null,
    action: "SYNTHETIC_PATIENT_PROVISIONED",
    targetType: "user",
    targetId: userId,
    result: "SUCCESS",
    metadata: {
      role: "PATIENT",
      synthetic: true,
      purpose: "O-B-05E-S2",
      displayName: SYNTHETIC_STAGING_PATIENT.displayName,
      stagingHost: guard.hostname,
      stagingDatabase: guard.database,
    },
  });

  return {
    ok: true,
    created: true,
    publicId,
    userId,
    displayName: SYNTHETIC_STAGING_PATIENT.displayName,
    email: SYNTHETIC_STAGING_PATIENT.email,
    role: "PATIENT",
    status: "ACTIVE",
  };
}

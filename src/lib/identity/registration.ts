import { eq } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { getRoleIdByName } from "@/lib/identity/catalog";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import {
  generateOpaqueToken,
  generatePublicId,
  generateUuid,
  hashWithSecret,
} from "@/lib/identity/crypto";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "@/lib/identity/email-service";
import { isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import {
  emailVerifications,
  patientProfiles,
  userRoles,
  users,
} from "@/lib/identity/schema";
import { hashPassword } from "@/lib/question-portal/password";

export type RegisterPatientInput = {
  displayName: string;
  email: string;
  mobile: string;
  password: string;
  passwordConfirm: string;
  acceptedTerms: boolean;
  ip: string;
};

export type RegisterPatientResult =
  | { ok: true }
  | {
      ok: false;
      code: "VALIDATION" | "RATE_LIMITED" | "NOT_ENABLED" | "FAILED";
      message: string;
      fieldErrors?: Record<string, string>;
    };

function validateRegistration(input: RegisterPatientInput): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 80) {
    fieldErrors.displayName = "Please enter your name.";
  }
  if (!isValidEmail(input.email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }
  if (!normalizeMobile(input.mobile)) {
    fieldErrors.mobile = "Please enter a valid Indian mobile number.";
  }
  if (input.password !== input.passwordConfirm) {
    fieldErrors.passwordConfirm = "Passwords do not match.";
  }
  const policy = evaluatePasswordPolicy(input.password, input.email);
  if (!policy.ok) {
    fieldErrors.password = policy.message;
  }
  if (!input.acceptedTerms) {
    fieldErrors.acceptedTerms =
      "Please confirm that you have read the terms and privacy information.";
  }
  return fieldErrors;
}

export async function registerPatient(
  ctx: IdentityContext,
  input: RegisterPatientInput,
): Promise<RegisterPatientResult> {
  if (!ctx.config.registrationEnabled) {
    return {
      ok: false,
      code: "NOT_ENABLED",
      message: SAFE_MESSAGES.notConfigured,
    };
  }
  if (!ctx.config.sessionSecret) {
    return {
      ok: false,
      code: "NOT_ENABLED",
      message: SAFE_MESSAGES.notConfigured,
    };
  }

  const fieldErrors = validateRegistration(input);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      code: "VALIDATION",
      message: SAFE_MESSAGES.registrationFailure,
      fieldErrors,
    };
  }

  const limit = await ctx.rateLimit.consume(
    `register-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.registerIp.max,
    IDENTITY_RATE_LIMITS.registerIp.windowMs,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: SAFE_MESSAGES.rateLimited,
    };
  }

  const emailNormalized = normalizeEmail(input.email);
  const mobileNormalized = normalizeMobile(input.mobile);
  if (!mobileNormalized) {
    return {
      ok: false,
      code: "VALIDATION",
      message: SAFE_MESSAGES.registrationFailure,
      fieldErrors: { mobile: "Please enter a valid Indian mobile number." },
    };
  }

  const passwordHash = await hashPassword(input.password);

  const [emailExists] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  const [mobileExists] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.mobileNormalized, mobileNormalized))
    .limit(1);
  if (emailExists || mobileExists) {
    return { ok: true };
  }

  const roleId = await getRoleIdByName(ctx.db, "PATIENT");
  if (!roleId) {
    return {
      ok: false,
      code: "FAILED",
      message: SAFE_MESSAGES.registrationFailure,
    };
  }

  const now = ctx.now();
  const userId = generateUuid();
  const profileId = generateUuid();
  const token = generateOpaqueToken(32);

  try {
    await ctx.db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        publicId: generatePublicId("PAT"),
        email: input.email.trim(),
        emailNormalized,
        passwordHash,
        mobileNumber: mobileNormalized,
        mobileNormalized,
        mobileVerifiedAt: null,
        emailVerifiedAt: null,
        status: "PENDING_VERIFICATION",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      });
      await tx.insert(patientProfiles).values({
        id: profileId,
        userId,
        displayName: input.displayName.trim(),
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
      await tx.insert(emailVerifications).values({
        id: generateUuid(),
        userId,
        tokenHash: hashWithSecret("email-verify", token, ctx.config.sessionSecret as string),
        expiresAt: new Date(now.getTime() + ctx.config.emailVerificationTtlMs),
        usedAt: null,
        createdAt: now,
      });
    });
  } catch {
    return {
      ok: false,
      code: "FAILED",
      message: SAFE_MESSAGES.registrationFailure,
    };
  }

  const content = verificationEmailContent({
    appBaseUrl: ctx.config.appBaseUrl,
    token,
  });
  const sent = await ctx.email.send({ ...content, to: emailNormalized });
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "REGISTRATION",
    ipHash: hashWithSecret("ip", input.ip, ctx.config.sessionSecret),
    metadata: { emailDelivered: sent.ok },
  });
  await appendAuditLog(ctx, {
    actorUserId: userId,
    action: "PATIENT_REGISTERED",
    targetType: "user",
    targetId: userId,
    result: "SUCCESS",
  });
  return { ok: true };
}

export { passwordResetEmailContent };

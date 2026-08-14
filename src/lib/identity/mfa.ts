import { and, eq, isNull } from "drizzle-orm";
import * as OTPAuth from "otpauth";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { MFA_REQUIRED_ROLES, SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCode,
  generateUuid,
  hashWithSecret,
  isMfaKeyUsable,
} from "@/lib/identity/crypto";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { mfaCredentials, mfaRecoveryCodes, users } from "@/lib/identity/schema";
import { markSessionMfaCompleted } from "@/lib/identity/sessions";
import { userHasRole } from "@/lib/identity/principal";

const ISSUER = "Dr. Vandana Practice";

function totpFromSecret(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export async function beginMfaEnrollment(
  ctx: IdentityContext,
  input: { userId: string },
): Promise<
  | {
      ok: true;
      otpauthUri: string;
      secretBase32: string;
    }
  | { ok: false; message: string }
> {
  if (!isMfaKeyUsable(ctx.config.mfaEncryptionKey)) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const requiresMfa =
    (await userHasRole(ctx, input.userId, "PSYCHOLOGIST")) ||
    (await userHasRole(ctx, input.userId, "SUPER_ADMIN"));
  if (!requiresMfa) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
  }

  const [existing] = await ctx.db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, input.userId))
    .limit(1);
  if (existing?.enrolledAt) {
    return { ok: false, message: "Authenticator is already configured." };
  }

  const [user] = await ctx.db
    .select({ email: users.emailNormalized })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
  }

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = totpFromSecret(secret.base32, user.email);
  const ciphertext = encryptSecret(
    secret.base32,
    ctx.config.mfaEncryptionKey as string,
  );
  const now = ctx.now();
  if (existing) {
    await ctx.db
      .update(mfaCredentials)
      .set({
        secretCiphertext: ciphertext,
        enrolledAt: null,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(mfaCredentials.id, existing.id));
  } else {
    await ctx.db.insert(mfaCredentials).values({
      id: generateUuid(),
      userId: input.userId,
      secretCiphertext: ciphertext,
      enrolledAt: null,
      createdAt: now,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }
  return {
    ok: true,
    otpauthUri: totp.toString(),
    secretBase32: secret.base32,
  };
}

async function hashRecoveryCodes(
  ctx: IdentityContext,
  codes: string[],
): Promise<string[]> {
  const secret = ctx.config.sessionSecret;
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET_MISSING");
  }
  return codes.map((code) => hashWithSecret(code, secret));
}

export async function confirmMfaEnrollment(
  ctx: IdentityContext,
  input: { userId: string; code: string; timestamp?: number },
): Promise<
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; message: string }
> {
  if (!isMfaKeyUsable(ctx.config.mfaEncryptionKey) || !ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const [credential] = await ctx.db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, input.userId))
    .limit(1);
  if (!credential || credential.enrolledAt) {
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
  const [user] = await ctx.db
    .select({ email: users.emailNormalized })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
  const secretBase32 = decryptSecret(
    credential.secretCiphertext,
    ctx.config.mfaEncryptionKey as string,
  );
  const totp = totpFromSecret(secretBase32, user.email);
  const delta = totp.validate({
    token: input.code.trim(),
    window: ctx.config.mfaStepWindow,
    timestamp: input.timestamp ?? ctx.now().getTime(),
  });
  if (delta === null) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "MFA_FAILURE",
      metadata: { reason: "enroll_mismatch" },
    });
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }

  const recoveryCodes = Array.from({ length: ctx.config.recoveryCodeCount }, () =>
    generateRecoveryCode(),
  );
  const hashes = await hashRecoveryCodes(ctx, recoveryCodes);
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(mfaCredentials)
      .set({ enrolledAt: now, failedAttempts: 0, lockedUntil: null })
      .where(eq(mfaCredentials.id, credential.id));
    await tx
      .delete(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, input.userId));
    await tx.insert(mfaRecoveryCodes).values(
      hashes.map((codeHash) => ({
        id: generateUuid(),
        userId: input.userId,
        codeHash,
        usedAt: null,
        createdAt: now,
      })),
    );
  });
  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "MFA_ENABLED",
  });
  await appendAuditLog(ctx, {
    actorUserId: input.userId,
    action: "MFA_ENABLED",
    targetType: "user",
    targetId: input.userId,
    result: "SUCCESS",
  });
  return { ok: true, recoveryCodes };
}

export async function verifyMfaChallenge(
  ctx: IdentityContext,
  input: {
    userId: string;
    sessionId: string;
    code: string;
    ip: string;
    timestamp?: number;
  },
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  if (!isMfaKeyUsable(ctx.config.mfaEncryptionKey) || !ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const ipLimit = await ctx.rateLimit.consume(
    `mfa-verify-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.mfaVerifyIp.max,
    IDENTITY_RATE_LIMITS.mfaVerifyIp.windowMs,
  );
  if (!ipLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited, code: "RATE_LIMITED" };
  }

  const [credential] = await ctx.db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, input.userId))
    .limit(1);
  if (!credential?.enrolledAt) {
    return { ok: false, message: SAFE_MESSAGES.mfaRequired };
  }
  if (
    credential.lockedUntil &&
    credential.lockedUntil.getTime() > ctx.now().getTime()
  ) {
    return { ok: false, message: SAFE_MESSAGES.mfaLocked, code: "LOCKED" };
  }

  const [user] = await ctx.db
    .select({ email: users.emailNormalized })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }

  const secretBase32 = decryptSecret(
    credential.secretCiphertext,
    ctx.config.mfaEncryptionKey as string,
  );
  const totp = totpFromSecret(secretBase32, user.email);
  const delta = totp.validate({
    token: input.code.trim(),
    window: ctx.config.mfaStepWindow,
    timestamp: input.timestamp ?? ctx.now().getTime(),
  });
  if (delta !== null) {
    await ctx.db
      .update(mfaCredentials)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(mfaCredentials.id, credential.id));
    await markSessionMfaCompleted(ctx, input.sessionId);
    return { ok: true };
  }

  const nextFailures = credential.failedAttempts + 1;
  const lockedUntil =
    nextFailures >= ctx.config.mfaMaxFailures
      ? new Date(ctx.now().getTime() + ctx.config.mfaLockoutMs)
      : null;
  await ctx.db
    .update(mfaCredentials)
    .set({ failedAttempts: nextFailures, lockedUntil })
    .where(eq(mfaCredentials.id, credential.id));
  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "MFA_FAILURE",
    metadata: { reason: "totp_mismatch" },
  });
  return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
}

export async function consumeRecoveryCode(
  ctx: IdentityContext,
  input: { userId: string; sessionId: string; code: string; ip: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const ipLimit = await ctx.rateLimit.consume(
    `mfa-verify-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.mfaVerifyIp.max,
    IDENTITY_RATE_LIMITS.mfaVerifyIp.windowMs,
  );
  if (!ipLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited };
  }
  const presented = hashWithSecret(
    input.code.trim().toUpperCase(),
    ctx.config.sessionSecret,
  );
  const [row] = await ctx.db
    .select()
    .from(mfaRecoveryCodes)
    .where(
      and(
        eq(mfaRecoveryCodes.userId, input.userId),
        eq(mfaRecoveryCodes.codeHash, presented),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    )
    .limit(1);
  if (!row) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "MFA_FAILURE",
      metadata: { reason: "recovery_mismatch" },
    });
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
  await ctx.db
    .update(mfaRecoveryCodes)
    .set({ usedAt: ctx.now() })
    .where(eq(mfaRecoveryCodes.id, row.id));
  await markSessionMfaCompleted(ctx, input.sessionId);
  await appendAuditLog(ctx, {
    actorUserId: input.userId,
    action: "MFA_RECOVERY_USED",
    targetType: "user",
    targetId: input.userId,
    result: "SUCCESS",
  });
  return { ok: true };
}

export function roleRequiresMfa(roleNames: string[]): boolean {
  return roleNames.some((role) =>
    MFA_REQUIRED_ROLES.includes(role as (typeof MFA_REQUIRED_ROLES)[number]),
  );
}

export function generateTotpCodeForTests(
  secretBase32: string,
  timestamp: number,
  label = "test@example.test",
): string {
  return totpFromSecret(secretBase32, label).generate({ timestamp });
}

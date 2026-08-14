import { and, eq, isNull, lt, or } from "drizzle-orm";
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
import type { IdentityDb } from "@/lib/identity/db";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { mfaCredentials, mfaRecoveryCodes, users } from "@/lib/identity/schema";
import { markSessionMfaCompleted, isSessionMfaCompleted } from "@/lib/identity/sessions";
import { userHasRole } from "@/lib/identity/principal";

const ISSUER = "Dr. Vandana Practice";
const TOTP_PERIOD_SECONDS = 30;

function totpFromSecret(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: TOTP_PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

function acceptedTotpStep(timestampMs: number, delta: number): number {
  return Math.floor(timestampMs / (TOTP_PERIOD_SECONDS * 1000)) + delta;
}

function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase();
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
        lastVerifiedStep: null,
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
      lastVerifiedStep: null,
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
  return codes.map((code) =>
    hashWithSecret("mfa-recovery", normalizeRecoveryCode(code), secret),
  );
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
  const timestamp = input.timestamp ?? ctx.now().getTime();
  const delta = totp.validate({
    token: input.code.trim(),
    window: ctx.config.mfaStepWindow,
    timestamp,
  });
  if (delta === null) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "MFA_FAILURE",
      metadata: { reason: "enroll_mismatch" },
    });
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
  const acceptedStep = acceptedTotpStep(timestamp, delta);

  const recoveryCodes = Array.from({ length: ctx.config.recoveryCodeCount }, () =>
    generateRecoveryCode(),
  );
  const hashes = await hashRecoveryCodes(ctx, recoveryCodes);
  const now = ctx.now();
  try {
    await ctx.db.transaction(async (tx) => {
      const enrolled = await tx
        .update(mfaCredentials)
        .set({
          enrolledAt: now,
          failedAttempts: 0,
          lockedUntil: null,
          lastVerifiedStep: acceptedStep,
        })
        .where(
          and(eq(mfaCredentials.id, credential.id), isNull(mfaCredentials.enrolledAt)),
        )
        .returning({ id: mfaCredentials.id });
      if (enrolled.length === 0) {
        throw new Error("MFA_ALREADY_ENROLLED");
      }
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
  } catch {
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
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
  if (await isSessionMfaCompleted(ctx, input.sessionId)) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
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
  const timestamp = input.timestamp ?? ctx.now().getTime();
  const delta = totp.validate({
    token: input.code.trim(),
    window: ctx.config.mfaStepWindow,
    timestamp,
  });
  if (delta !== null) {
    const acceptedStep = acceptedTotpStep(timestamp, delta);
    try {
      await ctx.db.transaction(async (tx) => {
        const guarded = await tx
          .update(mfaCredentials)
          .set({
            failedAttempts: 0,
            lockedUntil: null,
            lastVerifiedStep: acceptedStep,
          })
          .where(
            and(
              eq(mfaCredentials.id, credential.id),
              or(
                isNull(mfaCredentials.lastVerifiedStep),
                lt(mfaCredentials.lastVerifiedStep, acceptedStep),
              ),
            ),
          )
          .returning({ id: mfaCredentials.id });
        if (guarded.length === 0) {
          throw new Error("MFA_REPLAY");
        }
        const inner: IdentityContext = { ...ctx, db: tx as IdentityDb };
        const sessionOk = await markSessionMfaCompleted(
          inner,
          input.sessionId,
          input.userId,
        );
        if (!sessionOk) {
          throw new Error("MFA_SESSION_MISMATCH");
        }
      });
    } catch {
      await recordSecurityEvent(ctx, {
        userId: input.userId,
        eventType: "MFA_FAILURE",
        metadata: { reason: "totp_replay_or_session" },
      });
      return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
    }
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
  if (await isSessionMfaCompleted(ctx, input.sessionId)) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
  }
  const presented = hashWithSecret(
    "mfa-recovery",
    normalizeRecoveryCode(input.code),
    ctx.config.sessionSecret,
  );
  try {
    await ctx.db.transaction(async (tx) => {
      const consumed = await tx
        .update(mfaRecoveryCodes)
        .set({ usedAt: ctx.now() })
        .where(
          and(
            eq(mfaRecoveryCodes.userId, input.userId),
            eq(mfaRecoveryCodes.codeHash, presented),
            isNull(mfaRecoveryCodes.usedAt),
          ),
        )
        .returning({ id: mfaRecoveryCodes.id });
      if (consumed.length === 0) {
        throw new Error("MFA_RECOVERY_INVALID");
      }
      const inner: IdentityContext = { ...ctx, db: tx as IdentityDb };
      const sessionOk = await markSessionMfaCompleted(
        inner,
        input.sessionId,
        input.userId,
      );
      if (!sessionOk) {
        throw new Error("MFA_SESSION_MISMATCH");
      }
    });
  } catch {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "MFA_FAILURE",
      metadata: { reason: "recovery_mismatch" },
    });
    return { ok: false, message: SAFE_MESSAGES.mfaInvalid };
  }
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

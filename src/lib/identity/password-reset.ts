import { and, eq, gt, isNull } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { passwordResetEmailContent } from "@/lib/identity/email-service";
import { isValidEmail, normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { mfaCredentials, passwordResetTokens, sessions, users } from "@/lib/identity/schema";
import { hashPassword } from "@/lib/question-portal/password";

const GENERIC_RESET = {
  ok: true as const,
  message: SAFE_MESSAGES.passwordResetAccepted,
};

export type PasswordResetRequestResult =
  | {
      ok: true;
      message: string;
      /** Client hint only — never reveals whether an account exists. */
      channelHint: "email" | "sms";
    }
  | { ok: false; message: string };

async function invalidateOpenResetTokens(
  ctx: IdentityContext,
  userId: string,
  now: Date,
): Promise<void> {
  await ctx.db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );
}

async function issuePasswordResetToken(
  ctx: IdentityContext,
  userId: string,
): Promise<string> {
  const now = ctx.now();
  await invalidateOpenResetTokens(ctx, userId, now);
  const token = generateOpaqueToken(32);
  await ctx.db.insert(passwordResetTokens).values({
    id: generateUuid(),
    userId,
    tokenHash: hashWithSecret("password-reset", token, ctx.config.sessionSecret as string),
    expiresAt: new Date(now.getTime() + ctx.config.passwordResetTtlMs),
    usedAt: null,
    createdAt: now,
  });
  return token;
}

/**
 * Request password recovery by email (link) or verified mobile (SMS OTP).
 * Always returns a generic acceptance message when the identifier is well-formed.
 * Does not create a login session.
 */
export async function requestPasswordReset(
  ctx: IdentityContext,
  input: { email: string; ip: string },
): Promise<PasswordResetRequestResult> {
  return requestPasswordResetByIdentifier(ctx, {
    identifier: input.email,
    ip: input.ip,
  });
}

export async function requestPasswordResetByIdentifier(
  ctx: IdentityContext,
  input: { identifier: string; ip: string },
): Promise<PasswordResetRequestResult> {
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }

  const identifier = input.identifier.trim();
  const emailNormalized = isValidEmail(identifier)
    ? normalizeEmail(identifier)
    : null;
  const mobileNormalized = emailNormalized
    ? null
    : normalizeMobile(identifier);
  if (!emailNormalized && !mobileNormalized) {
    return { ok: false, message: "Enter a valid email address or mobile number." };
  }

  const channelHint = emailNormalized ? "email" : "sms";

  const ipLimit = await ctx.rateLimit.consume(
    `reset-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.passwordResetIp.max,
    IDENTITY_RATE_LIMITS.passwordResetIp.windowMs,
  );
  const accountLimit = await ctx.rateLimit.consume(
    emailNormalized
      ? `reset-email:${emailNormalized}`
      : `reset-mobile:${mobileNormalized}`,
    IDENTITY_RATE_LIMITS.passwordResetEmail.max,
    IDENTITY_RATE_LIMITS.passwordResetEmail.windowMs,
  );
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited };
  }

  if (emailNormalized) {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.emailNormalized, emailNormalized))
      .limit(1);
    if (!user || user.status === "DISABLED") {
      return { ...GENERIC_RESET, channelHint };
    }

    const now = ctx.now();
    await invalidateOpenResetTokens(ctx, user.id, now);
    const token = generateOpaqueToken(32);
    await ctx.db.insert(passwordResetTokens).values({
      id: generateUuid(),
      userId: user.id,
      tokenHash: hashWithSecret("password-reset", token, ctx.config.sessionSecret),
      expiresAt: new Date(now.getTime() + ctx.config.passwordResetTtlMs),
      usedAt: null,
      createdAt: now,
    });
    const content = passwordResetEmailContent({
      appBaseUrl: ctx.config.appBaseUrl,
      token,
    });
    await ctx.email.send({ ...content, to: user.emailNormalized });
    return { ...GENERIC_RESET, channelHint };
  }

  // Mobile path: only verified mobiles receive an OTP. Unknown/unverified → generic.
  const mobile = mobileNormalized as string;
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.mobileNormalized, mobile))
    .limit(1);

  if (
    !user ||
    user.status === "DISABLED" ||
    !user.mobileVerifiedAt ||
    user.mobileNormalized !== mobile
  ) {
    return { ...GENERIC_RESET, channelHint };
  }

  const sent = await ctx.otp.sendPasswordResetSms({
    userId: user.id,
    mobileNormalized: mobile,
    ip: input.ip,
  });
  if (!sent.ok) {
    if (sent.code === "RATE_LIMITED" || sent.code === "COOLDOWN") {
      return { ok: false, message: SAFE_MESSAGES.rateLimited };
    }
    // Do not reveal whether the mobile is registered or whether SMS failed specifically.
    return { ...GENERIC_RESET, channelHint };
  }
  return { ...GENERIC_RESET, channelHint };
}

/**
 * Verify mobile password-reset OTP, then issue a short-lived opaque reset token.
 * Does NOT create an authenticated session and does NOT clear MFA.
 */
export async function verifyMobilePasswordResetOtp(
  ctx: IdentityContext,
  input: { mobile: string; code: string; ip: string },
): Promise<
  | { ok: true; resetToken: string }
  | { ok: false; message: string }
> {
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const mobileNormalized = normalizeMobile(input.mobile);
  if (!mobileNormalized) {
    return { ok: false, message: SAFE_MESSAGES.passwordResetOtpInvalid };
  }

  const verifyLimit = await ctx.rateLimit.consume(
    `reset-otp-verify:${mobileNormalized}`,
    IDENTITY_RATE_LIMITS.otpVerifyIp.max,
    IDENTITY_RATE_LIMITS.otpVerifyIp.windowMs,
  );
  if (!verifyLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited };
  }

  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.mobileNormalized, mobileNormalized))
    .limit(1);

  if (
    !user ||
    user.status === "DISABLED" ||
    !user.mobileVerifiedAt ||
    user.mobileNormalized !== mobileNormalized
  ) {
    return { ok: false, message: SAFE_MESSAGES.passwordResetOtpInvalid };
  }

  const verified = await ctx.otp.verifyPasswordResetSms({
    userId: user.id,
    code: input.code,
    ip: input.ip,
    expectedDestination: mobileNormalized,
  });
  if (!verified.ok) {
    return {
      ok: false,
      message:
        verified.code === "RATE_LIMITED"
          ? SAFE_MESSAGES.rateLimited
          : SAFE_MESSAGES.passwordResetOtpInvalid,
    };
  }

  const resetToken = await issuePasswordResetToken(ctx, user.id);
  await recordSecurityEvent(ctx, {
    userId: user.id,
    eventType: "OTP_VERIFICATION_SUCCESS",
    metadata: { purpose: "PASSWORD_RESET", channel: "SMS", issuedResetToken: true },
  });
  return { ok: true, resetToken };
}

export async function resetPasswordWithToken(
  ctx: IdentityContext,
  input: { token: string; password: string; passwordConfirm: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  if (input.password !== input.passwordConfirm) {
    return { ok: false, message: "Passwords do not match." };
  }
  const policy = evaluatePasswordPolicy(input.password);
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }

  const tokenHash = hashWithSecret("password-reset", input.token, ctx.config.sessionSecret);
  const passwordHash = await hashPassword(input.password);
  const now = ctx.now();
  let userId: string | null = null;

  await ctx.db.transaction(async (tx) => {
    const consumed = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!consumed[0]) {
      return;
    }
    userId = consumed[0].userId;
    await tx
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  });

  if (!userId) {
    return { ok: false, message: SAFE_MESSAGES.passwordResetInvalid };
  }

  // MFA enrollment must remain — confirm credentials still exist (no deletion).
  const [mfa] = await ctx.db
    .select({ id: mfaCredentials.id })
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, userId))
    .limit(1);

  await recordSecurityEvent(ctx, {
    userId,
    eventType: "SESSION_REVOKED",
    metadata: { allSessions: true },
  });
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "PASSWORD_RESET",
    metadata: {
      allSessions: true,
      mfaEnrollmentPreserved: Boolean(mfa),
    },
  });
  await appendAuditLog(ctx, {
    actorUserId: userId,
    action: "PASSWORD_RESET",
    targetType: "user",
    targetId: userId,
    result: "SUCCESS",
  });
  return { ok: true };
}

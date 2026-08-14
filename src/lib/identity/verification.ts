import { and, desc, eq, isNull } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, hashWithSecret } from "@/lib/identity/crypto";
import { generateUuid } from "@/lib/identity/crypto";
import { verificationEmailContent } from "@/lib/identity/email-service";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { emailVerifications, users } from "@/lib/identity/schema";

export async function verifyEmailToken(
  ctx: IdentityContext,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!ctx.config.sessionSecret || !token) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }
  const tokenHash = hashWithSecret(token, ctx.config.sessionSecret);
  const [row] = await ctx.db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.tokenHash, tokenHash))
    .limit(1);
  if (!row) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }
  if (row.usedAt) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }
  if (row.expiresAt.getTime() <= ctx.now().getTime()) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }

  await ctx.db.transaction(async (tx) => {
    await tx
      .update(emailVerifications)
      .set({ usedAt: ctx.now() })
      .where(eq(emailVerifications.id, row.id));
    await tx
      .update(users)
      .set({ emailVerifiedAt: ctx.now(), updatedAt: ctx.now() })
      .where(eq(users.id, row.userId));
  });
  await recordSecurityEvent(ctx, {
    userId: row.userId,
    eventType: "EMAIL_VERIFIED",
  });
  await appendAuditLog(ctx, {
    actorUserId: row.userId,
    action: "EMAIL_VERIFIED",
    targetType: "user",
    targetId: row.userId,
    result: "SUCCESS",
  });
  return { ok: true };
}

export async function resendEmailVerification(
  ctx: IdentityContext,
  input: { email: string; ip: string },
): Promise<{ ok: true; message: string } | { ok: false; message: string; code?: string }> {
  const generic = {
    ok: true as const,
    message: "If this email can be verified, we sent a new message.",
  };
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const limit = await ctx.rateLimit.consume(
    `email-resend-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.emailResendIp.max,
    IDENTITY_RATE_LIMITS.emailResendIp.windowMs,
  );
  if (!limit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited, code: "RATE_LIMITED" };
  }

  const emailNormalized = input.email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (!user || user.emailVerifiedAt) {
    return generic;
  }

  const [latest] = await ctx.db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, user.id))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  if (
    latest &&
    ctx.now().getTime() - latest.createdAt.getTime() <
      ctx.config.emailResendCooldownMs
  ) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited, code: "COOLDOWN" };
  }

  const token = generateOpaqueToken(32);
  await ctx.db
    .update(emailVerifications)
    .set({ usedAt: ctx.now() })
    .where(
      and(
        eq(emailVerifications.userId, user.id),
        isNull(emailVerifications.usedAt),
      ),
    );
  await ctx.db.insert(emailVerifications).values({
    id: generateUuid(),
    userId: user.id,
    tokenHash: hashWithSecret(token, ctx.config.sessionSecret),
    expiresAt: new Date(ctx.now().getTime() + ctx.config.emailVerificationTtlMs),
    usedAt: null,
    createdAt: ctx.now(),
  });
  const content = verificationEmailContent({
    appBaseUrl: ctx.config.appBaseUrl,
    token,
  });
  await ctx.email.send({ ...content, to: user.emailNormalized });
  await recordSecurityEvent(ctx, {
    userId: user.id,
    eventType: "EMAIL_VERIFICATION_RESEND",
  });
  return generic;
}

export async function requestPhoneOtpForPendingUser(
  ctx: IdentityContext,
  input: { email: string; ip: string },
): Promise<{ ok: true; message: string } | { ok: false; message: string; code?: string }> {
  const generic = {
    ok: true as const,
    message: "If this account needs mobile verification, we sent a code.",
  };
  const emailNormalized = input.email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (
    !user ||
    !user.emailVerifiedAt ||
    user.mobileVerifiedAt ||
    user.status !== "PENDING_VERIFICATION" ||
    !user.mobileNormalized
  ) {
    return generic;
  }
  const sent = await ctx.otp.sendPhoneVerification({
    userId: user.id,
    mobileNormalized: user.mobileNormalized,
    ip: input.ip,
  });
  if (!sent.ok) {
    return {
      ok: false,
      message: sent.message,
      code: sent.code,
    };
  }
  return generic;
}

export async function verifyPhoneOtpAndActivate(
  ctx: IdentityContext,
  input: { email: string; code: string; ip: string },
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const emailNormalized = input.email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (!user || !user.emailVerifiedAt || user.status !== "PENDING_VERIFICATION") {
    return { ok: false, message: SAFE_MESSAGES.otpInvalid };
  }
  const verified = await ctx.otp.verifyPhoneOtp({
    userId: user.id,
    code: input.code,
    ip: input.ip,
  });
  if (!verified.ok) {
    return verified;
  }
  await completePhoneVerificationAndActivate(ctx, user.id);
  return { ok: true };
}

export async function completePhoneVerificationAndActivate(
  ctx: IdentityContext,
  userId: string,
): Promise<void> {
  const now = ctx.now();
  await ctx.db
    .update(users)
    .set({
      mobileVerifiedAt: now,
      status: "ACTIVE",
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "PHONE_VERIFIED",
  });
}

import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, hashWithSecret } from "@/lib/identity/crypto";
import { generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";
import { verificationEmailContent } from "@/lib/identity/email-service";
import { consumeLatestPhoneOtp } from "@/lib/identity/otp";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { emailVerifications, users } from "@/lib/identity/schema";

export async function verifyEmailToken(
  ctx: IdentityContext,
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!ctx.config.sessionSecret || !token) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }
  const tokenHash = hashWithSecret("email-verify", token, ctx.config.sessionSecret);
  const now = ctx.now();
  let userId: string | null = null;

  await ctx.db.transaction(async (tx) => {
    const consumed = await tx
      .update(emailVerifications)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerifications.tokenHash, tokenHash),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, now),
        ),
      )
      .returning({ userId: emailVerifications.userId });
    if (!consumed[0]) {
      return;
    }
    userId = consumed[0].userId;
    await tx
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, userId));
  });

  if (!userId) {
    return { ok: false, message: SAFE_MESSAGES.verificationInvalid };
  }
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "EMAIL_VERIFIED",
  });
  await appendAuditLog(ctx, {
    actorUserId: userId,
    action: "EMAIL_VERIFIED",
    targetType: "user",
    targetId: userId,
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
    return generic;
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
    tokenHash: hashWithSecret("email-verify", token, ctx.config.sessionSecret),
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
  const ipLimit = await ctx.rateLimit.consume(
    `otp-public-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.otpPublicIp.max,
    IDENTITY_RATE_LIMITS.otpPublicIp.windowMs,
  );
  if (!ipLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited, code: "RATE_LIMITED" };
  }

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
    return generic;
  }
  return generic;
}

export async function verifyPhoneOtpAndActivate(
  ctx: IdentityContext,
  input: { email: string; code: string; ip: string },
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const ipLimit = await ctx.rateLimit.consume(
    `otp-verify-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.otpVerifyIp.max,
    IDENTITY_RATE_LIMITS.otpVerifyIp.windowMs,
  );
  if (!ipLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited, code: "RATE_LIMITED" };
  }

  const emailNormalized = input.email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);
  if (!user || !user.emailVerifiedAt || user.status !== "PENDING_VERIFICATION") {
    return { ok: false, message: SAFE_MESSAGES.otpInvalid };
  }

  const now = ctx.now();
  let outcome: { ok: true } | { ok: false; message: string; code?: string } = {
    ok: false,
    message: SAFE_MESSAGES.otpInvalid,
  };

  try {
    await ctx.db.transaction(async (tx) => {
      const inner: IdentityContext = { ...ctx, db: tx as IdentityDb };
      const verified = await consumeLatestPhoneOtp(inner, {
        userId: user.id,
        code: input.code,
        ip: input.ip,
        expectedDestination: user.mobileNormalized ?? undefined,
      });
      if (!verified.ok) {
        outcome = verified;
        return;
      }
      const activated = await tx
        .update(users)
        .set({
          mobileVerifiedAt: now,
          status: "ACTIVE",
          updatedAt: now,
        })
        .where(
          and(eq(users.id, user.id), eq(users.status, "PENDING_VERIFICATION")),
        )
        .returning({ id: users.id });
      if (activated.length === 0) {
        throw new Error("PHONE_ACTIVATE_FAILED");
      }
      outcome = { ok: true };
    });
  } catch {
    return { ok: false, message: SAFE_MESSAGES.otpInvalid };
  }

  if (outcome.ok) {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "PHONE_VERIFIED",
    });
  }
  return outcome;
}

import { and, eq, gt, isNull } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { passwordResetEmailContent } from "@/lib/identity/email-service";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { passwordResetTokens, sessions, users } from "@/lib/identity/schema";
import { hashPassword } from "@/lib/question-portal/password";

const GENERIC_RESET = {
  ok: true as const,
  message: SAFE_MESSAGES.passwordResetAccepted,
};

export async function requestPasswordReset(
  ctx: IdentityContext,
  input: { email: string; ip: string },
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  if (!ctx.config.sessionSecret) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const ipLimit = await ctx.rateLimit.consume(
    `reset-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.passwordResetIp.max,
    IDENTITY_RATE_LIMITS.passwordResetIp.windowMs,
  );
  const emailKey = input.email.trim().toLowerCase();
  const emailLimit = await ctx.rateLimit.consume(
    `reset-email:${emailKey}`,
    IDENTITY_RATE_LIMITS.passwordResetEmail.max,
    IDENTITY_RATE_LIMITS.passwordResetEmail.windowMs,
  );
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { ok: false, message: SAFE_MESSAGES.rateLimited };
  }

  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailKey))
    .limit(1);
  if (!user || user.status === "DISABLED") {
    return GENERIC_RESET;
  }

  const now = ctx.now();
  await ctx.db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
      ),
    );

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
  return GENERIC_RESET;
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
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, userId));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  });

  if (!userId) {
    return { ok: false, message: SAFE_MESSAGES.passwordResetInvalid };
  }

  await recordSecurityEvent(ctx, {
    userId,
    eventType: "SESSION_REVOKED",
    metadata: { allSessions: true },
  });
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "PASSWORD_RESET",
    metadata: { allSessions: true },
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

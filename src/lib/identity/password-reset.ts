import { eq } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { passwordResetEmailContent } from "@/lib/identity/email-service";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { passwordResetTokens, users } from "@/lib/identity/schema";
import { revokeAllUserSessions } from "@/lib/identity/sessions";
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

  const token = generateOpaqueToken(32);
  await ctx.db.insert(passwordResetTokens).values({
    id: generateUuid(),
    userId: user.id,
    tokenHash: hashWithSecret(token, ctx.config.sessionSecret),
    expiresAt: new Date(ctx.now().getTime() + ctx.config.passwordResetTtlMs),
    usedAt: null,
    createdAt: ctx.now(),
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

  const tokenHash = hashWithSecret(input.token, ctx.config.sessionSecret);
  const [row] = await ctx.db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.usedAt || row.expiresAt.getTime() <= ctx.now().getTime()) {
    return { ok: false, message: SAFE_MESSAGES.passwordResetInvalid };
  }

  const passwordHash = await hashPassword(input.password);
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: ctx.now() })
      .where(eq(passwordResetTokens.id, row.id));
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: ctx.now() })
      .where(eq(users.id, row.userId));
  });
  await revokeAllUserSessions(ctx, row.userId);
  await recordSecurityEvent(ctx, {
    userId: row.userId,
    eventType: "PASSWORD_RESET",
  });
  await appendAuditLog(ctx, {
    actorUserId: row.userId,
    action: "PASSWORD_RESET",
    targetType: "user",
    targetId: row.userId,
    result: "SUCCESS",
  });
  return { ok: true };
}

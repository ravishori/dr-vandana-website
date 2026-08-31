import { and, eq, isNull, ne } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { evaluatePasswordPolicy } from "@/lib/identity/password-policy";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { sessions, users } from "@/lib/identity/schema";
import { hashPassword, verifyPassword } from "@/lib/question-portal/password";

/**
 * Authenticated password change. Clears must_change_password on success.
 * Keeps the current session; revokes other sessions.
 * Rate-limited by IP and account (see IDENTITY_RATE_LIMITS.passwordChange*).
 */
export async function changePasswordAuthenticated(
  ctx: IdentityContext,
  input: {
    userId: string;
    sessionId: string;
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
    /** Client IP for rate limiting (required for production callers). */
    ip?: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.newPassword !== input.newPasswordConfirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const ip = input.ip?.trim() || "0.0.0.0";
  const ipLimit = await ctx.rateLimit.consume(
    `password-change-ip:${ip}`,
    IDENTITY_RATE_LIMITS.passwordChangeIp.max,
    IDENTITY_RATE_LIMITS.passwordChangeIp.windowMs,
  );
  const accountLimit = await ctx.rateLimit.consume(
    `password-change-user:${input.userId}`,
    IDENTITY_RATE_LIMITS.passwordChangeAccount.max,
    IDENTITY_RATE_LIMITS.passwordChangeAccount.windowMs,
  );
  if (!ipLimit.allowed || !accountLimit.allowed) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "PASSWORD_CHANGE_FAILURE",
      metadata: { reason: "rate_limited" },
    });
    return { ok: false, message: SAFE_MESSAGES.rateLimited };
  }

  const [user] = await ctx.db
    .select({
      id: users.id,
      email: users.emailNormalized,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
  }
  const currentOk = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );
  if (!currentOk) {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "PASSWORD_CHANGE_FAILURE",
      metadata: { reason: "current_mismatch" },
    });
    return { ok: false, message: "Current password is not correct." };
  }
  const policy = evaluatePasswordPolicy(input.newPassword, user.email);
  if (!policy.ok) {
    return { ok: false, message: policy.message };
  }
  if (input.newPassword === input.currentPassword) {
    return {
      ok: false,
      message: "Choose a new password that is different from the current one.",
    };
  }

  const passwordHash = await hashPassword(input.newPassword);
  const now = ctx.now();
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, user.id),
          isNull(sessions.revokedAt),
          ne(sessions.id, input.sessionId),
        ),
      );
  });

  await recordSecurityEvent(ctx, {
    userId: user.id,
    eventType: "PASSWORD_CHANGED",
    metadata: { clearedMustChangePassword: true },
  });
  await appendAuditLog(ctx, {
    actorUserId: user.id,
    action: "PASSWORD_CHANGED",
    targetType: "user",
    targetId: user.id,
    result: "SUCCESS",
  });
  return { ok: true };
}

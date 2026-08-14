import { and, eq, isNull, sql } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import type { RoleName } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateOpaqueToken, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { roles, sessions, userRoles, users } from "@/lib/identity/schema";

export type SessionTtl = {
  idleMs: number;
  absoluteMs: number;
};

export function ttlForRoles(
  ctx: IdentityContext,
  roles: RoleName[],
): SessionTtl {
  if (roles.includes("SUPER_ADMIN")) {
    return {
      idleMs: ctx.config.superAdminIdleMs,
      absoluteMs: ctx.config.superAdminAbsoluteMs,
    };
  }
  if (roles.includes("PSYCHOLOGIST")) {
    return {
      idleMs: ctx.config.psychologistIdleMs,
      absoluteMs: ctx.config.psychologistAbsoluteMs,
    };
  }
  return {
    idleMs: ctx.config.patientIdleMs,
    absoluteMs: ctx.config.patientAbsoluteMs,
  };
}

export async function createSession(
  ctx: IdentityContext,
  input: {
    userId: string;
    roles: RoleName[];
    ip?: string;
    userAgent?: string;
    mfaCompleted: boolean;
  },
): Promise<{ sessionId: string; token: string; expiresAt: Date }> {
  if (!ctx.config.sessionSecret) {
    throw new Error("AUTH_SESSION_SECRET_MISSING");
  }
  const ttl = ttlForRoles(ctx, input.roles);
  const now = ctx.now();
  const token = generateOpaqueToken(32);
  const sessionId = generateUuid();
  const expiresAt = new Date(now.getTime() + ttl.idleMs);
  const absoluteExpiresAt = new Date(now.getTime() + ttl.absoluteMs);
  await ctx.db.insert(sessions).values({
    id: sessionId,
    userId: input.userId,
    tokenHash: hashWithSecret("session", token, ctx.config.sessionSecret),
    createdAt: now,
    expiresAt,
    lastActivityAt: now,
    revokedAt: null,
    ipHash: input.ip
      ? hashWithSecret("ip", input.ip, ctx.config.sessionSecret)
      : null,
    userAgentHash: input.userAgent
      ? hashWithSecret("user-agent", input.userAgent, ctx.config.sessionSecret)
      : null,
    mfaCompletedAt: input.mfaCompleted ? now : null,
    absoluteExpiresAt,
  });
  return { sessionId, token, expiresAt };
}

export type LoadedSession = {
  sessionId: string;
  userId: string;
  mfaCompleted: boolean;
  expiresAt: Date;
};

export async function readSession(
  ctx: IdentityContext,
  token: string | undefined,
): Promise<LoadedSession | null> {
  if (!token || !ctx.config.sessionSecret) {
    return null;
  }
  const tokenHash = hashWithSecret("session", token, ctx.config.sessionSecret);
  const [row] = await ctx.db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      revokedAt: sessions.revokedAt,
      expiresAt: sessions.expiresAt,
      absoluteExpiresAt: sessions.absoluteExpiresAt,
      mfaCompletedAt: sessions.mfaCompletedAt,
      userStatus: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.revokedAt) {
    return null;
  }
  if (row.userStatus === "DISABLED" || row.userStatus === "SUSPENDED") {
    return null;
  }
  const now = ctx.now();
  if (row.expiresAt.getTime() <= now.getTime()) {
    return null;
  }
  if (row.absoluteExpiresAt.getTime() <= now.getTime()) {
    return null;
  }
  const roleRows = await ctx.db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, row.userId));
  const ttl = ttlForRoles(
    ctx,
    roleRows.map((item) => item.name as RoleName),
  );
  const nextExpiry = new Date(
    Math.min(now.getTime() + ttl.idleMs, row.absoluteExpiresAt.getTime()),
  );
  await ctx.db
    .update(sessions)
    .set({ lastActivityAt: now, expiresAt: nextExpiry })
    .where(eq(sessions.id, row.id));
  return {
    sessionId: row.id,
    userId: row.userId,
    mfaCompleted: Boolean(row.mfaCompletedAt),
    expiresAt: nextExpiry,
  };
}

export async function isSessionMfaCompleted(
  ctx: IdentityContext,
  sessionId: string,
): Promise<boolean> {
  const [row] = await ctx.db
    .select({ mfaCompletedAt: sessions.mfaCompletedAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return Boolean(row?.mfaCompletedAt);
}

export async function markSessionMfaCompleted(
  ctx: IdentityContext,
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const updated = await ctx.db
    .update(sessions)
    .set({ mfaCompletedAt: ctx.now() })
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
      ),
    )
    .returning({ id: sessions.id });
  return updated.length > 0;
}

export async function revokeSession(
  ctx: IdentityContext,
  sessionId: string,
  actorUserId?: string,
): Promise<void> {
  const [row] = await ctx.db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  await ctx.db
    .update(sessions)
    .set({ revokedAt: ctx.now() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  const userId = actorUserId ?? row?.userId;
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "SESSION_REVOKED",
    metadata: { sessionId },
  });
  await appendAuditLog(ctx, {
    actorUserId: actorUserId ?? null,
    action: "SESSION_REVOKED",
    targetType: "session",
    targetId: sessionId,
    result: "SUCCESS",
  });
}

export async function revokeAllUserSessions(
  ctx: IdentityContext,
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const now = ctx.now();
  const updated = await ctx.db
    .update(sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        exceptSessionId ? sql`${sessions.id} <> ${exceptSessionId}` : sql`true`,
      ),
    )
    .returning({ id: sessions.id });
  await recordSecurityEvent(ctx, {
    userId,
    eventType: "SESSION_REVOKED",
    metadata: { count: updated.length, allSessions: true },
  });
  return updated.length;
}

export async function touchLastLogin(
  ctx: IdentityContext,
  userId: string,
): Promise<void> {
  await ctx.db
    .update(users)
    .set({ lastLoginAt: ctx.now(), updatedAt: ctx.now() })
    .where(eq(users.id, userId));
}

export function sessionCookieOptions(ctx: IdentityContext, maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: ctx.config.nodeEnv === "production",
    sameSite: ctx.config.cookieSameSite,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

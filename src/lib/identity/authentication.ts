import { eq } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { authorizationService } from "@/lib/identity/authorization";
import { MFA_REQUIRED_ROLES, SAFE_MESSAGES, type RoleName } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { hashWithSecret } from "@/lib/identity/crypto";
import { loadPrincipal, userHasRole } from "@/lib/identity/principal";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import { mfaCredentials, roles, userRoles, users } from "@/lib/identity/schema";
import {
  createSession,
  readSession,
  revokeAllUserSessions,
  revokeSession,
  touchLastLogin,
} from "@/lib/identity/sessions";
import { verifyPassword } from "@/lib/question-portal/password";

export type LoginResult =
  | {
      ok: true;
      token: string;
      sessionId: string;
      mfaRequired: boolean;
      mfaEnrolled: boolean;
      expiresAt: Date;
    }
  | {
      ok: false;
      code: "INVALID" | "UNVERIFIED" | "DISABLED" | "RATE_LIMITED" | "NOT_CONFIGURED";
      message: string;
    };

async function loadUserRoles(
  ctx: IdentityContext,
  userId: string,
): Promise<RoleName[]> {
  const rows = await ctx.db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return rows.map((row) => row.name as RoleName);
}

export async function loginWithPassword(
  ctx: IdentityContext,
  input: {
    email: string;
    password: string;
    ip: string;
    userAgent?: string;
    expectedRole?: RoleName;
  },
): Promise<LoginResult> {
  if (!ctx.config.sessionSecret) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: SAFE_MESSAGES.notConfigured,
    };
  }

  const ipLimit = await ctx.rateLimit.consume(
    `login-ip:${input.ip}`,
    IDENTITY_RATE_LIMITS.loginIp.max,
    IDENTITY_RATE_LIMITS.loginIp.windowMs,
  );
  const accountLimit = await ctx.rateLimit.consume(
    `login-email:${input.email.trim().toLowerCase()}`,
    IDENTITY_RATE_LIMITS.loginAccount.max,
    IDENTITY_RATE_LIMITS.loginAccount.windowMs,
  );
  if (!ipLimit.allowed || !accountLimit.allowed) {
    await recordSecurityEvent(ctx, {
      eventType: "LOGIN_FAILURE",
      ipHash: hashWithSecret("ip", input.ip, ctx.config.sessionSecret),
      metadata: { reason: "rate_limited" },
    });
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: SAFE_MESSAGES.rateLimited,
    };
  }

  const emailNormalized = input.email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, emailNormalized))
    .limit(1);

  const passwordOk =
    user !== undefined && (await verifyPassword(input.password, user.passwordHash));

  if (!user || !passwordOk) {
    await recordSecurityEvent(ctx, {
      userId: user?.id,
      eventType: "LOGIN_FAILURE",
      ipHash: hashWithSecret("ip", input.ip, ctx.config.sessionSecret),
      metadata: { reason: "invalid_credentials" },
    });
    return {
      ok: false,
      code: "INVALID",
      message: SAFE_MESSAGES.genericAuthFailure,
    };
  }

  if (user.status === "SUSPENDED" || user.status === "DISABLED") {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "LOGIN_FAILURE",
      metadata: { reason: "disabled" },
    });
    return {
      ok: false,
      code: "DISABLED",
      message: SAFE_MESSAGES.accountUnavailable,
    };
  }

  if (user.status !== "ACTIVE") {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "LOGIN_FAILURE",
      metadata: { reason: "unverified" },
    });
    return {
      ok: false,
      code: "UNVERIFIED",
      message: SAFE_MESSAGES.verificationIncomplete,
    };
  }

  const roleList = await loadUserRoles(ctx, user.id);
  if (
    roleList.includes("PATIENT") &&
    (!user.emailVerifiedAt || !user.mobileVerifiedAt)
  ) {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "LOGIN_FAILURE",
      metadata: { reason: "unverified" },
    });
    return {
      ok: false,
      code: "UNVERIFIED",
      message: SAFE_MESSAGES.verificationIncomplete,
    };
  }
  if (input.expectedRole && !roleList.includes(input.expectedRole)) {
    await recordSecurityEvent(ctx, {
      userId: user.id,
      eventType: "LOGIN_FAILURE",
      metadata: { reason: "role_mismatch" },
    });
    return {
      ok: false,
      code: "INVALID",
      message: SAFE_MESSAGES.genericAuthFailure,
    };
  }

  const mfaRequired = roleList.some((role) => MFA_REQUIRED_ROLES.includes(role));
  const [mfa] = await ctx.db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, user.id))
    .limit(1);
  const mfaEnrolled = Boolean(mfa?.enrolledAt);

  const session = await createSession(ctx, {
    userId: user.id,
    roles: roleList,
    ip: input.ip,
    userAgent: input.userAgent,
    mfaCompleted: !mfaRequired,
  });
  await touchLastLogin(ctx, user.id);
  await recordSecurityEvent(ctx, {
    userId: user.id,
    eventType: "LOGIN_SUCCESS",
    ipHash: hashWithSecret("ip", input.ip, ctx.config.sessionSecret),
    metadata: { mfaRequired },
  });
  await appendAuditLog(ctx, {
    actorUserId: user.id,
    action: "LOGIN",
    targetType: "user",
    targetId: user.id,
    result: "SUCCESS",
  });

  return {
    ok: true,
    token: session.token,
    sessionId: session.sessionId,
    mfaRequired,
    mfaEnrolled,
    expiresAt: session.expiresAt,
  };
}

export async function logoutSession(
  ctx: IdentityContext,
  token: string | undefined,
): Promise<void> {
  const session = await readSession(ctx, token);
  if (!session) {
    return;
  }
  await revokeSession(ctx, session.sessionId, session.userId);
  await recordSecurityEvent(ctx, {
    userId: session.userId,
    eventType: "LOGOUT",
  });
}

export async function assertPatientOwnsPatientProfile(
  ctx: IdentityContext,
  token: string | undefined,
  patientProfileId: string,
) {
  const session = await readSession(ctx, token);
  if (!session) {
    return { allowed: false as const, reason: "unauthenticated" as const };
  }
  const principal = await loadPrincipal(ctx, session);
  return authorizationService.canAccess(principal, {
    resourceType: "patient_profile",
    resourceId: patientProfileId,
  });
}

export async function userIsRole(
  ctx: IdentityContext,
  userId: string,
  role: RoleName,
): Promise<boolean> {
  return userHasRole(ctx, userId, role);
}

export { revokeAllUserSessions };

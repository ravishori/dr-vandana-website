"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { loginWithPassword, logoutSession } from "@/lib/identity/authentication";
import { SAFE_MESSAGES, type RoleName } from "@/lib/identity/constants";
import {
  clearPracticeSessionCookie,
  readPracticeSessionCookie,
  setPracticeSessionCookie,
} from "@/lib/identity/cookies";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  consumeRecoveryCode,
  verifyMfaChallenge,
} from "@/lib/identity/mfa";
import { changePasswordAuthenticated } from "@/lib/identity/password-change";
import {
  requestPasswordResetByIdentifier,
  resetPasswordWithToken,
  verifyMobilePasswordResetOtp,
} from "@/lib/identity/password-reset";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { users } from "@/lib/identity/schema";
import { readSession } from "@/lib/identity/sessions";

export type PracticeAuthResult =
  | {
      ok: true;
      message?: string;
      recoveryCodes?: string[];
      otpauthUri?: string;
      secretBase32?: string;
      channelHint?: "email" | "sms";
      resetToken?: string;
    }
  | { ok: false; message: string };

async function ip(): Promise<string> {
  return getClientIpFromHeaders(await headers());
}

async function userMustChangePassword(
  ctx: Parameters<typeof readSession>[0],
  userId: string,
): Promise<boolean> {
  const [row] = await ctx.db
    .select({ mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.mustChangePassword === true;
}

function changePasswordPath(
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">,
): string {
  return role === "PSYCHOLOGIST"
    ? "/psychologist/practice/change-password"
    : "/super-admin/change-password";
}

function postAuthPath(
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">,
): string {
  return role === "PSYCHOLOGIST"
    ? "/psychologist/practice"
    : "/super-admin/signed-in";
}

async function requirePendingMfaSession(role: RoleName) {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false as const, message: SAFE_MESSAGES.notConfigured };
  }
  const token = await readPracticeSessionCookie();
  const session = await readSession(identity.ctx, token);
  if (!session) {
    return { ok: false as const, message: SAFE_MESSAGES.csrfOrSession };
  }
  const principal = await loadPrincipal(identity.ctx, session);
  if (!principal.roles.includes(role)) {
    return { ok: false as const, message: SAFE_MESSAGES.unauthorized };
  }
  if (session.mfaCompleted) {
    return { ok: false as const, message: SAFE_MESSAGES.unauthorized };
  }
  return { ok: true as const, ctx: identity.ctx, session, principal };
}

export async function practiceLoginAction(input: {
  email: string;
  password: string;
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
}): Promise<PracticeAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await loginWithPassword(identity.ctx, {
    email: input.email,
    password: input.password,
    ip: await ip(),
    expectedRole: input.role,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  await setPracticeSessionCookie(identity.ctx, result.token, result.expiresAt);
  if (input.role === "PSYCHOLOGIST") {
    redirect(
      result.mfaEnrolled
        ? "/psychologist/practice/mfa"
        : "/psychologist/practice/mfa?enroll=1",
    );
  }
  redirect(
    result.mfaEnrolled ? "/super-admin/mfa" : "/super-admin/mfa?enroll=1",
  );
}

export async function practiceLogoutAction(redirectTo: string): Promise<void> {
  const identity = createAppIdentityContext();
  if (identity.ok) {
    await logoutSession(identity.ctx, await readPracticeSessionCookie());
    await clearPracticeSessionCookie(identity.ctx);
  }
  redirect(redirectTo);
}

export async function startMfaEnrollmentAction(
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">,
): Promise<PracticeAuthResult> {
  const pending = await requirePendingMfaSession(role);
  if (!pending.ok) {
    return pending;
  }
  const result = await beginMfaEnrollment(pending.ctx, {
    userId: pending.session.userId,
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    otpauthUri: result.otpauthUri,
    secretBase32: result.secretBase32,
    message: "Add this key to your authenticator app, then enter a code to confirm.",
  };
}

export async function confirmMfaEnrollmentAction(input: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
  code: string;
}): Promise<PracticeAuthResult> {
  const pending = await requirePendingMfaSession(input.role);
  if (!pending.ok) {
    return pending;
  }
  const result = await confirmMfaEnrollment(pending.ctx, {
    userId: pending.session.userId,
    code: input.code,
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    recoveryCodes: result.recoveryCodes,
    message: "Save these recovery codes now. They will not be shown again.",
  };
}

export async function verifyMfaAction(input: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
  code: string;
  recovery?: boolean;
}): Promise<PracticeAuthResult> {
  const pending = await requirePendingMfaSession(input.role);
  if (!pending.ok) {
    return pending;
  }
  const result = input.recovery
    ? await consumeRecoveryCode(pending.ctx, {
        userId: pending.session.userId,
        sessionId: pending.session.sessionId,
        code: input.code,
        ip: await ip(),
      })
    : await verifyMfaChallenge(pending.ctx, {
        userId: pending.session.userId,
        sessionId: pending.session.sessionId,
        code: input.code,
        ip: await ip(),
      });
  if (!result.ok) {
    return result;
  }
  const mustChange = await userMustChangePassword(
    pending.ctx,
    pending.session.userId,
  );
  if (mustChange) {
    redirect(changePasswordPath(input.role));
  }
  redirect(postAuthPath(input.role));
}

export async function practiceChangePasswordAction(input: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}): Promise<PracticeAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const token = await readPracticeSessionCookie();
  const session = await readSession(identity.ctx, token);
  if (!session || !session.mfaCompleted) {
    return { ok: false, message: SAFE_MESSAGES.csrfOrSession };
  }
  const principal = await loadPrincipal(identity.ctx, session);
  if (!principal.roles.includes(input.role)) {
    return { ok: false, message: SAFE_MESSAGES.unauthorized };
  }
  const changed = await changePasswordAuthenticated(identity.ctx, {
    userId: session.userId,
    sessionId: session.sessionId,
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    newPasswordConfirm: input.newPasswordConfirm,
  });
  if (!changed.ok) {
    return changed;
  }
  redirect(postAuthPath(input.role));
}

export async function practiceForgotPasswordAction(
  identifier: string,
): Promise<PracticeAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await requestPasswordResetByIdentifier(identity.ctx, {
    identifier,
    ip: await ip(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return {
    ok: true,
    message: result.message,
    channelHint: result.channelHint,
  };
}

export async function practiceVerifyMobileResetOtpAction(input: {
  mobile: string;
  code: string;
}): Promise<PracticeAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await verifyMobilePasswordResetOtp(identity.ctx, {
    mobile: input.mobile,
    code: input.code,
    ip: await ip(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, resetToken: result.resetToken };
}

export async function practiceResetPasswordWithTokenAction(input: {
  token: string;
  password: string;
  passwordConfirm: string;
}): Promise<PracticeAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await resetPasswordWithToken(identity.ctx, {
    token: input.token,
    password: input.password,
    passwordConfirm: input.passwordConfirm,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return {
    ok: true,
    message:
      "Password updated. Sign in with your new password and authenticator code.",
  };
}

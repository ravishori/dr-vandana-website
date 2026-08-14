"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import {
  clearPracticeSessionCookie,
  readPracticeSessionCookie,
  setPracticeSessionCookie,
} from "@/lib/identity/cookies";
import { createAppIdentityContext, isRegistrationAvailable } from "@/lib/identity/runtime";
import { loginWithPassword, logoutSession } from "@/lib/identity/authentication";
import { registerPatient } from "@/lib/identity/registration";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/identity/password-reset";
import {
  resendEmailVerification,
  requestPhoneOtpForPendingUser,
  verifyEmailToken,
  verifyPhoneOtpAndActivate,
} from "@/lib/identity/verification";
import { logStructured } from "@/lib/observability/logger";

export type IdentityActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function clientIp(): Promise<string> {
  return getClientIpFromHeaders(await headers());
}

export async function registerPatientAction(input: {
  displayName: string;
  email: string;
  mobile: string;
  password: string;
  passwordConfirm: string;
  acceptedTerms: boolean;
}): Promise<IdentityActionResult> {
  if (!isRegistrationAvailable()) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await registerPatient(identity.ctx, {
    ...input,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
    };
  }
  return {
    ok: true,
    message: "If we can create this account, we will send a verification email.",
  };
}

export async function verifyEmailAction(token: string): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await verifyEmailToken(identity.ctx, token);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: "Your email is verified. Please verify your mobile number next." };
}

export async function resendEmailAction(email: string): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await resendEmailVerification(identity.ctx, {
    email,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message };
}

export async function sendPhoneOtpAction(email: string): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await requestPhoneOtpForPendingUser(identity.ctx, {
    email,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message };
}

export async function verifyPhoneAction(input: {
  email: string;
  code: string;
}): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await verifyPhoneOtpAndActivate(identity.ctx, {
    ...input,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: "Your account is ready. You can sign in now." };
}

export async function patientLoginAction(input: {
  email: string;
  password: string;
}): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await loginWithPassword(identity.ctx, {
    ...input,
    ip: await clientIp(),
    expectedRole: "PATIENT",
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  await setPracticeSessionCookie(identity.ctx, result.token, result.expiresAt);
  redirect("/patient/account");
}

export async function patientLogoutAction(): Promise<void> {
  const identity = createAppIdentityContext();
  if (identity.ok) {
    const token = await readPracticeSessionCookie();
    await logoutSession(identity.ctx, token);
    await clearPracticeSessionCookie(identity.ctx);
  }
  redirect("/patient/login");
}

export async function forgotPasswordAction(email: string): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await requestPasswordReset(identity.ctx, {
    email,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: result.message };
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  passwordConfirm: string;
}): Promise<IdentityActionResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: SAFE_MESSAGES.notConfigured };
  }
  const result = await resetPasswordWithToken(identity.ctx, input);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, message: "Your password was updated. Please sign in." };
}

export async function logIdentityPageError(operation: string): Promise<void> {
  logStructured("WARNING", { operation, errorType: "identity_page" });
}

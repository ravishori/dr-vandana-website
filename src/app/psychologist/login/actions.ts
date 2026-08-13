"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  isPsychologistAuthConfigured,
  questionPortalConfig,
} from "@/config/question-portal";
import {
  clearSessionCookie,
  getPsychologistSession,
  setSessionCookie,
} from "@/lib/question-portal/auth";
import { verifyPassword } from "@/lib/question-portal/password";
import {
  checkQuestionLoginRateLimit,
  getClientIpFromHeaders,
} from "@/lib/question-portal/rate-limit";
import { createSessionToken } from "@/lib/question-portal/session";
import { logStructured } from "@/lib/observability/logger";

export type LoginActionResult =
  | { success: true }
  | { success: false; message: string };

function safeRedirectPath(from: string | undefined): string {
  if (from && from.startsWith("/psychologist") && !from.startsWith("//")) {
    return from;
  }
  return "/psychologist";
}

export async function psychologistLoginAction(
  input: { email: string; password: string; from?: string },
): Promise<LoginActionResult> {
  const headerStore = await headers();
  const clientIp = getClientIpFromHeaders(headerStore);
  const rateLimit = await checkQuestionLoginRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: "Please wait a little while before trying again.",
    };
  }

  if (!isPsychologistAuthConfigured()) {
    logStructured("ERROR", {
      operation: "psychologistLogin",
      errorType: "auth_not_configured",
    });
    return {
      success: false,
      message: "The portal is not available yet.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const expectedEmail = questionPortalConfig.psychologistEmail?.toLowerCase();
  const passwordOk =
    expectedEmail &&
    email === expectedEmail &&
    (await verifyPassword(input.password, questionPortalConfig.passwordHash ?? ""));

  if (!passwordOk) {
    logStructured("WARNING", {
      operation: "psychologistLogin",
      errorType: "invalid_credentials",
    });
    return {
      success: false,
      message: "The email or password is not correct.",
    };
  }

  const token = await createSessionToken(email);
  if (!token) {
    return { success: false, message: "The portal is not available yet." };
  }
  await setSessionCookie(token);
  redirect(safeRedirectPath(input.from));
}

export async function psychologistLogoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/psychologist/login");
}

export async function getOptionalPortalSession() {
  return getPsychologistSession();
}

import { cookies, headers } from "next/headers";

import { cmsConfig } from "@/config/cms";
import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { hashPassword, verifyPassword } from "@/lib/cms/crypto";
import {
  checkContentAdminLoginRateLimit,
  clearContentAdminLoginFailures,
  recordContentAdminLoginFailure,
} from "@/lib/cms/login-rate-limit";
import {
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/cms/session";
import type { ContentAdminSession } from "@/types/cms";

export async function getContentAdminSession(): Promise<ContentAdminSession | null> {
  const store = await cookies();
  const token = store.get(cmsConfig.cookieName)?.value;
  return readSessionToken(token);
}

export async function requireContentAdminSession(): Promise<ContentAdminSession> {
  const session = await getContentAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function setContentAdminSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(cmsConfig.cookieName, token, sessionCookieOptions());
}

export async function clearContentAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(cmsConfig.cookieName, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export type ContentAdminAuthResult =
  | { ok: true; token: string }
  | { ok: false; reason: "CONTENT_ADMIN_NOT_CONFIGURED" | "INVALID_CREDENTIALS" | "RATE_LIMITED" };

/**
 * Authenticate content admin with IP+email failed-attempt rate limiting.
 * Does not log passwords, password hashes, or session secrets.
 */
export async function authenticateContentAdmin(
  email: string,
  password: string,
  options?: { ip?: string },
): Promise<ContentAdminAuthResult> {
  const ip =
    options?.ip ?? getClientIpFromHeaders(await headers());
  const normalizedEmail = email.trim().toLowerCase() || "unknown";

  const rate = await checkContentAdminLoginRateLimit(ip, normalizedEmail);
  if (!rate.allowed) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  const expectedEmail = process.env[cmsConfig.adminEmailEnvKey]
    ?.trim()
    .toLowerCase();
  const passwordHash = process.env[cmsConfig.adminPasswordHashEnvKey]?.trim();
  const devPassword = process.env[cmsConfig.adminPasswordDevEnvKey];

  if (!expectedEmail) {
    return { ok: false, reason: "CONTENT_ADMIN_NOT_CONFIGURED" };
  }

  const credentialsMatch = normalizedEmail === expectedEmail;
  let passwordValid = false;

  if (credentialsMatch) {
    if (passwordHash) {
      passwordValid = verifyPassword(password, passwordHash);
    } else if (
      process.env.NODE_ENV !== "production" &&
      typeof devPassword === "string"
    ) {
      passwordValid = password === devPassword;
    } else {
      return { ok: false, reason: "CONTENT_ADMIN_NOT_CONFIGURED" };
    }
  }

  if (!credentialsMatch || !passwordValid) {
    await recordContentAdminLoginFailure(ip, normalizedEmail);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  await clearContentAdminLoginFailures(ip, normalizedEmail);
  return { ok: true, token: createSessionToken(expectedEmail) };
}

export { createSessionToken, hashPassword };

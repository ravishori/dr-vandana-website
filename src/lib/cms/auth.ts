import { cookies } from "next/headers";

import { cmsConfig } from "@/config/cms";
import { hashPassword, verifyPassword } from "@/lib/cms/crypto";
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

export function authenticateContentAdmin(
  email: string,
  password: string,
): { ok: true; token: string } | { ok: false; reason: string } {
  const expectedEmail = process.env[cmsConfig.adminEmailEnvKey]
    ?.trim()
    .toLowerCase();
  const passwordHash = process.env[cmsConfig.adminPasswordHashEnvKey]?.trim();
  const devPassword = process.env[cmsConfig.adminPasswordDevEnvKey];

  if (!expectedEmail) {
    return { ok: false, reason: "CONTENT_ADMIN_NOT_CONFIGURED" };
  }
  if (email.trim().toLowerCase() !== expectedEmail) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  let valid = false;
  if (passwordHash) {
    valid = verifyPassword(password, passwordHash);
  } else if (process.env.NODE_ENV !== "production" && typeof devPassword === "string") {
    valid = password === devPassword;
  } else {
    return { ok: false, reason: "CONTENT_ADMIN_NOT_CONFIGURED" };
  }

  if (!valid) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  return { ok: true, token: createSessionToken(expectedEmail) };
}

export { createSessionToken, hashPassword };

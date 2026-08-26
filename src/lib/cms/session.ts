import { cmsConfig } from "@/config/cms";
import { safeEqual, signPayload } from "@/lib/cms/crypto";
import type { ContentAdminSession } from "@/types/cms";

function getSessionSecret(): string {
  const secret = process.env[cmsConfig.sessionSecretEnvKey]?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("CONTENT_ADMIN_SESSION_SECRET_MISSING");
  }
  // Deterministic local-dev fallback — never rely on this in production.
  return "local-dev-content-admin-session-secret-only";
}

export function createSessionToken(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const session: ContentAdminSession = {
    email: email.toLowerCase(),
    role: "CONTENT_EDITOR",
    issuedAt: now,
    expiresAt: now + cmsConfig.sessionTtlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string | undefined | null): ContentAdminSession | null {
  if (!token) {
    return null;
  }
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = signPayload(payload, getSessionSecret());
  if (!safeEqual(signature, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as ContentAdminSession;
    if (
      !parsed?.email ||
      parsed.role !== "CONTENT_EDITOR" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    if (parsed.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = cmsConfig.sessionTtlSeconds) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

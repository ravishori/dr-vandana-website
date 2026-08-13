import {
  isPsychologistAuthConfigured,
  questionPortalConfig,
} from "@/config/question-portal";
import type { PsychologistSession } from "@/types/question-portal";
import { PSYCHOLOGIST_ROLE } from "@/types/question-portal";

type SessionPayload = {
  email: string;
  role: typeof PSYCHOLOGIST_ROLE;
  exp: number;
  iat: number;
  jti: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createSessionToken(
  email: string,
  now = Date.now(),
  secret = questionPortalConfig.sessionSecret,
): Promise<string | null> {
  if (!secret || secret.length < 32) {
    return null;
  }
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    role: PSYCHOLOGIST_ROLE,
    iat: now,
    exp: now + questionPortalConfig.sessionTtlMs,
    jti: crypto.randomUUID(),
  };
  const encoded = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `${encoded}.${await hmac(encoded, secret)}`;
}

export async function readSessionToken(
  token: string | undefined,
  now = Date.now(),
  secret = questionPortalConfig.sessionSecret,
): Promise<PsychologistSession | null> {
  if (!token || !secret || secret.length < 32) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = await hmac(encoded, secret);
  if (!timingEqual(signature, expected)) {
    return null;
  }
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const payload = JSON.parse(json) as SessionPayload;
    if (
      payload.role !== PSYCHOLOGIST_ROLE ||
      typeof payload.email !== "string" ||
      payload.exp <= now
    ) {
      return null;
    }
    return {
      email: payload.email,
      role: payload.role,
      expiresAt: payload.exp,
      sessionId: payload.jti,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.floor(questionPortalConfig.sessionTtlMs / 1000),
  };
}

export { isPsychologistAuthConfigured };

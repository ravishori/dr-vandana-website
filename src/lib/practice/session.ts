import { practiceConfig } from "@/config/practice";
import type { PracticeRole, PracticeSession } from "@/types/practice";

/** Edge-safe practice session helpers (Web Crypto only). */

type SessionPayload = {
  userId: string;
  email: string;
  role: PracticeRole;
  fullName: string;
  patientId: string | null;
  exp: number;
  iat: number;
  jti: string;
  mfaVerified: boolean;
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

export async function createPracticeSessionToken(
  input: Omit<PracticeSession, "expiresAt" | "sessionId"> & {
    sessionId?: string;
  },
  now = Date.now(),
): Promise<string | null> {
  const secret = practiceConfig.sessionSecret;
  if (!secret || secret.length < 32) {
    return null;
  }
  const ttl =
    input.role === "PSYCHOLOGIST"
      ? practiceConfig.psychologistSessionTtlMs
      : practiceConfig.sessionTtlMs;
  const payload: SessionPayload = {
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    fullName: input.fullName,
    patientId: input.patientId,
    mfaVerified: input.mfaVerified,
    iat: now,
    exp: now + ttl,
    jti: input.sessionId ?? crypto.randomUUID(),
  };
  const encoded = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `${encoded}.${await hmac(encoded, secret)}`;
}

export async function readPracticeSessionToken(
  token: string | undefined,
  now = Date.now(),
): Promise<PracticeSession | null> {
  const secret = practiceConfig.sessionSecret;
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
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      payload.exp <= now
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      patientId: payload.patientId,
      expiresAt: payload.exp,
      sessionId: payload.jti,
      mfaVerified: Boolean(payload.mfaVerified),
    };
  } catch {
    return null;
  }
}

export function practiceSessionCookieOptions(role: PracticeRole) {
  const ttl =
    role === "PSYCHOLOGIST"
      ? practiceConfig.psychologistSessionTtlMs
      : practiceConfig.sessionTtlMs;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  };
}

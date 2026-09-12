import { doctorPortalConfig } from "@/config/doctor-portal";
import { DOCTOR_ROLE, type DoctorSession } from "@/types/doctor-portal";

/**
 * Edge-safe session helpers (Web Crypto).
 * Do not import node:crypto here — middleware runs on the Edge runtime.
 */

function getSessionSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret = env[doctorPortalConfig.sessionSecretEnvKey]?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (env.NODE_ENV === "production") {
    return null;
  }
  // Deterministic local-dev fallback — never rely on this in production.
  return "local-dev-doctor-session-secret-only-32b";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hmacSign(value: string, secret: string): Promise<string> {
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
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  const secret = getSessionSecret(env);
  if (!secret) {
    return null;
  }
  const session: DoctorSession = {
    email: email.trim().toLowerCase(),
    role: DOCTOR_ROLE,
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + doctorPortalConfig.sessionTtlSeconds,
  };
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

export async function readSessionToken(
  token: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<DoctorSession | null> {
  if (!token) {
    return null;
  }
  const secret = getSessionSecret(env);
  if (!secret) {
    return null;
  }
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = await hmacSign(payload, secret);
  if (!timingEqual(signature, expected)) {
    return null;
  }
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payload));
    const parsed = JSON.parse(json) as DoctorSession;
    if (
      !parsed?.email ||
      parsed.role !== DOCTOR_ROLE ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    if (parsed.expiresAt < nowSeconds) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(
  maxAge = doctorPortalConfig.sessionTtlSeconds,
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

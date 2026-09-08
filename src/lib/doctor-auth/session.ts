import { doctorPortalConfig } from "@/config/doctor-portal";
import { safeEqual, signPayload } from "@/lib/doctor-auth/crypto";
import { DOCTOR_ROLE, type DoctorSession } from "@/types/doctor-portal";

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

export function createSessionToken(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds = Math.floor(Date.now() / 1000),
): string | null {
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
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function readSessionToken(
  token: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
  nowSeconds = Math.floor(Date.now() / 1000),
): DoctorSession | null {
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
  const expected = signPayload(payload, secret);
  if (!safeEqual(signature, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as DoctorSession;
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

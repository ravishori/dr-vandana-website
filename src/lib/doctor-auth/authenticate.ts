import { cookies, headers } from "next/headers";

import {
  doctorPortalConfig,
  isDoctorAuthConfigured,
} from "@/config/doctor-portal";
import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { hashPassword, verifyPassword } from "@/lib/doctor-auth/crypto";
import {
  checkDoctorLoginRateLimit,
  clearDoctorLoginFailures,
  recordDoctorLoginFailure,
} from "@/lib/doctor-auth/login-rate-limit";
import {
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
} from "@/lib/doctor-auth/session";
import type { DoctorAuthResult, DoctorSession } from "@/types/doctor-portal";

export async function getDoctorSession(): Promise<DoctorSession | null> {
  const store = await cookies();
  const token = store.get(doctorPortalConfig.cookieName)?.value;
  return readSessionToken(token);
}

export async function requireDoctorSession(): Promise<DoctorSession> {
  const session = await getDoctorSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function setDoctorSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(doctorPortalConfig.cookieName, token, sessionCookieOptions());
}

export async function clearDoctorSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(doctorPortalConfig.cookieName, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

/**
 * Authenticate doctor with IP+email failed-attempt rate limiting.
 * Does not log passwords, password hashes, or session secrets.
 */
export async function authenticateDoctor(
  email: string,
  password: string,
  options?: { ip?: string; env?: NodeJS.ProcessEnv },
): Promise<DoctorAuthResult> {
  const env = options?.env ?? process.env;
  const ip =
    options?.ip ?? getClientIpFromHeaders(await headers());
  const normalizedEmail = email.trim().toLowerCase() || "unknown";

  const rate = await checkDoctorLoginRateLimit(ip, normalizedEmail);
  if (!rate.allowed) {
    return {
      ok: false,
      reason:
        rate.reason === "STORE_UNAVAILABLE"
          ? "RATE_LIMIT_UNAVAILABLE"
          : "RATE_LIMITED",
    };
  }

  const expectedEmail = env[doctorPortalConfig.loginEmailEnvKey]
    ?.trim()
    .toLowerCase();
  const passwordHash = env[doctorPortalConfig.passwordHashEnvKey]?.trim();
  const devPassword = env[doctorPortalConfig.passwordDevEnvKey];
  const secret = env[doctorPortalConfig.sessionSecretEnvKey]?.trim();

  if (!expectedEmail || !secret || secret.length < 32) {
    return { ok: false, reason: "DOCTOR_AUTH_NOT_CONFIGURED" };
  }

  const credentialsMatch = normalizedEmail === expectedEmail;
  let passwordValid = false;

  if (credentialsMatch) {
    if (passwordHash) {
      passwordValid = verifyPassword(password, passwordHash);
    } else if (env.NODE_ENV !== "production" && typeof devPassword === "string") {
      passwordValid = password === devPassword;
    } else {
      return { ok: false, reason: "DOCTOR_AUTH_NOT_CONFIGURED" };
    }
  }

  if (!credentialsMatch || !passwordValid) {
    await recordDoctorLoginFailure(ip, normalizedEmail);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const token = await createSessionToken(expectedEmail, env);
  if (!token) {
    return { ok: false, reason: "DOCTOR_AUTH_NOT_CONFIGURED" };
  }

  await clearDoctorLoginFailures(ip, normalizedEmail);
  return { ok: true, token };
}

export {
  createSessionToken,
  hashPassword,
  isDoctorAuthConfigured,
  readSessionToken,
};

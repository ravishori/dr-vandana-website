import { siteConfig } from "@/config/site";

function readOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const practiceConfig = {
  timezone: "Asia/Kolkata",
  cookieName: "drvandana_practice_session",
  sessionTtlMs: 8 * 60 * 60 * 1000,
  psychologistSessionTtlMs: 4 * 60 * 60 * 1000,
  emailTokenTtlMs: 24 * 60 * 60 * 1000,
  passwordResetTtlMs: 60 * 60 * 1000,
  otpTtlMs: 10 * 60 * 1000,
  otpMaxAttempts: 5,
  otpResendCooldownMs: 60 * 1000,
  maxUploadBytes: 5 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
  ] as const,
  sqlitePath:
    readOptional(process.env.PRACTICE_DATABASE_PATH) ??
    "data/practice-management.sqlite",
  documentDir:
    readOptional(process.env.PRACTICE_DOCUMENT_DIR) ??
    "data/practice-documents",
  /** Prefer calling getPracticeSessionSecret() so tests can set env late. */
  get sessionSecret() {
    return (
      readOptional(process.env.PRACTICE_SESSION_SECRET) ??
      readOptional(process.env.SESSION_SECRET)
    );
  },
  appBaseUrl: (
    readOptional(process.env.APP_BASE_URL) ?? siteConfig.url
  ).replace(/\/$/, ""),
  otpProvider: (readOptional(process.env.OTP_PROVIDER) ?? "mock").toLowerCase(),
  whatsappProvider: (
    readOptional(process.env.WHATSAPP_PROVIDER) ?? "mock"
  ).toLowerCase(),
  mfaIssuer: readOptional(process.env.MFA_ISSUER) ?? "Dr Vandana Portal",
  bootstrapPsychologistEmail: readOptional(process.env.PSYCHOLOGIST_LOGIN_EMAIL),
  bootstrapPsychologistPasswordHash: readOptional(
    process.env.PSYCHOLOGIST_PASSWORD_HASH,
  ),
  rateLimitWindowMs: 15 * 60 * 1000,
  rateLimitMax: readInt(process.env.PRACTICE_RATE_LIMIT_MAX, 30),
} as const;

export type PracticeStoreMode = "memory" | "sqlite" | "misconfigured";

export function resolvePracticeStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.PRACTICE_STORE,
): PracticeStoreMode {
  const store = storeEnv?.trim().toLowerCase();
  if (store === "memory") {
    return nodeEnv === "production" ? "misconfigured" : "memory";
  }
  if (store === "sqlite") {
    return "sqlite";
  }
  if (nodeEnv === "production") {
    // Prefer sqlite path when disk is available; memory rejected in prod.
    return "sqlite";
  }
  return "sqlite";
}

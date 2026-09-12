import { professionalProfile } from "@/data/professional";
import { siteConfig } from "@/config/site";

function readOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Doctor portal configuration.
 * Credentials and secrets come from environment — never hardcode passwords.
 */
export const doctorPortalConfig = {
  cookieName: "drv_doctor_session",
  sessionTtlSeconds: 60 * 60 * 8,
  role: "DOCTOR" as const,
  loginEmailEnvKey: "DOCTOR_LOGIN_EMAIL",
  passwordHashEnvKey: "DOCTOR_PASSWORD_HASH",
  /** Dev-only plaintext password — rejected in production. */
  passwordDevEnvKey: "DOCTOR_PASSWORD",
  sessionSecretEnvKey: "DOCTOR_SESSION_SECRET",
  loginRateLimit: {
    maxFailedAttempts: 5,
    windowMs: 15 * 60 * 1000,
  },
  defaultAuthorName: professionalProfile.name,
  appBaseUrl: (
    readOptional(process.env.APP_BASE_URL) ?? siteConfig.url
  ).replace(/\/$/, ""),
} as const;

export const educationalArticleDisclaimer =
  "This article is for educational purposes only and is not a substitute for professional psychological assessment, diagnosis, or care. It is not emergency advice and does not create a therapist–client relationship.";

export const communicationsPortalDisclaimer =
  "This communications inbox is for website enquiries only. It is not an electronic health record (EHR), clinical chart, or emergency service. Do not use it for crisis situations — seek local emergency help when needed.";

export function isDoctorAuthConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const email = env[doctorPortalConfig.loginEmailEnvKey]?.trim();
  const hash = env[doctorPortalConfig.passwordHashEnvKey]?.trim();
  const secret = env[doctorPortalConfig.sessionSecretEnvKey]?.trim();
  const devPassword = env[doctorPortalConfig.passwordDevEnvKey];
  const hasPassword =
    Boolean(hash) ||
    (env.NODE_ENV !== "production" && typeof devPassword === "string");
  return Boolean(email && hasPassword && secret && secret.length >= 32);
}

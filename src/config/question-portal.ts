import { siteConfig } from "@/config/site";

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function readOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const questionPortalConfig = {
  maxQuestionLength: readPositiveInt(
    process.env.QUESTION_MAX_LENGTH,
    4_000,
    40,
    12_000,
  ),
  maxNameLength: 80,
  maxNotesLength: 8_000,
  maxResponseLength: 8_000,
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 8,
    burstWindowMs: 60 * 1000,
    burstMaxAttempts: 3,
  },
  loginRateLimit: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
  },
  sessionTtlMs: 8 * 60 * 60 * 1000,
  duplicateWindowMs: 10 * 60 * 1000,
  pageSize: 20,
  cookieName: "drvandana_portal_session",
  psychologistEmail: readOptional(process.env.PSYCHOLOGIST_LOGIN_EMAIL),
  passwordHash: readOptional(process.env.PSYCHOLOGIST_PASSWORD_HASH),
  sessionSecret: readOptional(process.env.SESSION_SECRET),
  notificationEmail:
    readOptional(process.env.QUESTION_NOTIFICATION_EMAIL) ??
    readOptional(process.env.APPOINTMENT_TO_EMAIL),
  appBaseUrl: (
    readOptional(process.env.APP_BASE_URL) ?? siteConfig.url
  ).replace(/\/$/, ""),
  sqlitePath:
    readOptional(process.env.QUESTION_DATABASE_PATH) ??
    "data/question-portal.sqlite",
  store: (process.env.QUESTION_STORE ?? "auto").trim().toLowerCase(),
} as const;

export type QuestionStoreMode = "memory" | "sqlite" | "upstash" | "misconfigured";

export function resolveQuestionStoreMode(
  nodeEnv = process.env.NODE_ENV,
  storeEnv = process.env.QUESTION_STORE,
  upstashUrl = process.env.UPSTASH_REDIS_REST_URL,
  upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN,
): QuestionStoreMode {
  const store = storeEnv?.trim().toLowerCase();
  if (store === "memory") {
    return nodeEnv === "production" ? "misconfigured" : "memory";
  }
  if (store === "sqlite") {
    return "sqlite";
  }
  if (store === "upstash") {
    return upstashUrl?.trim() && upstashToken?.trim()
      ? "upstash"
      : "misconfigured";
  }
  if (upstashUrl?.trim() && upstashToken?.trim()) {
    return "upstash";
  }
  if (nodeEnv === "production") {
    return "misconfigured";
  }
  return "sqlite";
}

export function isPsychologistAuthConfigured(): boolean {
  return Boolean(
    questionPortalConfig.psychologistEmail &&
      questionPortalConfig.passwordHash &&
      questionPortalConfig.sessionSecret &&
      questionPortalConfig.sessionSecret.length >= 32,
  );
}

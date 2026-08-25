import { getSmtpTransportConfig } from "@/config/appointment-email";
import { isTwilioSmsOtpConfigured } from "@/lib/identity/otp-providers/twilio-sms-config";

import { PRACTICE_SESSION_COOKIE } from "@/lib/identity/constants";

export type IdentityNodeEnv = "development" | "test" | "production";

export type OtpProviderMode = "unconfigured" | "test" | "production_required";

export type IdentityRuntimeConfig = {
  nodeEnv: IdentityNodeEnv;
  databaseUrl: string | undefined;
  sessionSecret: string | undefined;
  mfaEncryptionKey: string | undefined;
  otpProvider: string | undefined;
  otpApiKey: string | undefined;
  appBaseUrl: string;
  registrationEnabled: boolean;
  identityProvisionEnabled: boolean;
  cookieName: string;
  /**
   * SameSite=Lax is required so email verification and password-reset links
   * can complete a GET navigation and then continue a signed-in flow.
   * Strict would drop the session cookie on those cross-site GET landings.
   * The existing question-portal HMAC cookie remains SameSite=Strict.
   */
  cookieSameSite: "lax";
  emailVerificationTtlMs: number;
  emailResendCooldownMs: number;
  otpTtlMs: number;
  otpResendCooldownMs: number;
  otpMaxAttempts: number;
  passwordResetTtlMs: number;
  patientIdleMs: number;
  patientAbsoluteMs: number;
  psychologistIdleMs: number;
  psychologistAbsoluteMs: number;
  superAdminIdleMs: number;
  superAdminAbsoluteMs: number;
  mfaStepWindow: number;
  mfaMaxFailures: number;
  mfaLockoutMs: number;
  recoveryCodeCount: number;
};

const DEFAULTS = {
  emailVerificationTtlMs: 24 * 60 * 60 * 1000,
  emailResendCooldownMs: 60 * 1000,
  /** Default 5 minutes (OTP_EXPIRY_SECONDS=300). */
  otpTtlMs: 5 * 60 * 1000,
  otpResendCooldownMs: 60 * 1000,
  otpMaxAttempts: 5,
  passwordResetTtlMs: 60 * 60 * 1000,
  patientIdleMs: 12 * 60 * 60 * 1000,
  patientAbsoluteMs: 24 * 60 * 60 * 1000,
  psychologistIdleMs: 30 * 60 * 1000,
  psychologistAbsoluteMs: 8 * 60 * 60 * 1000,
  superAdminIdleMs: 15 * 60 * 1000,
  superAdminAbsoluteMs: 4 * 60 * 60 * 1000,
  mfaStepWindow: 1,
  mfaMaxFailures: 8,
  mfaLockoutMs: 15 * 60 * 1000,
  recoveryCodeCount: 10,
} as const;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveNodeEnv(): IdentityNodeEnv {
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  if (process.env.NODE_ENV === "test") {
    return "test";
  }
  return "development";
}

export function loadIdentityConfig(
  overrides: Partial<IdentityRuntimeConfig> = {},
): IdentityRuntimeConfig {
  const nodeEnv = overrides.nodeEnv ?? resolveNodeEnv();
  const otpExpirySeconds = readPositiveIntEnv("OTP_EXPIRY_SECONDS", 300);
  const otpMaxAttempts = readPositiveIntEnv(
    "OTP_MAX_ATTEMPTS",
    DEFAULTS.otpMaxAttempts,
  );
  // Cap OTP validity to reduce replay window (max 15 minutes).
  const otpTtlMsFromEnv = Math.min(otpExpirySeconds, 15 * 60) * 1000;
  return {
    nodeEnv,
    databaseUrl: overrides.databaseUrl ?? readEnv("DATABASE_URL"),
    sessionSecret: overrides.sessionSecret ?? readEnv("AUTH_SESSION_SECRET"),
    mfaEncryptionKey:
      overrides.mfaEncryptionKey ?? readEnv("MFA_ENCRYPTION_KEY"),
    otpProvider: overrides.otpProvider ?? readEnv("OTP_PROVIDER"),
    otpApiKey: overrides.otpApiKey ?? readEnv("OTP_API_KEY"),
    appBaseUrl:
      overrides.appBaseUrl ??
      readEnv("APP_BASE_URL") ??
      "http://localhost:3000",
    registrationEnabled:
      overrides.registrationEnabled ??
      readEnv("PATIENT_REGISTRATION_ENABLED") === "true",
    identityProvisionEnabled:
      overrides.identityProvisionEnabled ??
      readEnv("IDENTITY_PROVISION_ENABLED") === "true",
    cookieName: overrides.cookieName ?? PRACTICE_SESSION_COOKIE,
    cookieSameSite: "lax",
    emailVerificationTtlMs:
      overrides.emailVerificationTtlMs ?? DEFAULTS.emailVerificationTtlMs,
    emailResendCooldownMs:
      overrides.emailResendCooldownMs ?? DEFAULTS.emailResendCooldownMs,
    otpTtlMs: overrides.otpTtlMs ?? otpTtlMsFromEnv,
    otpResendCooldownMs:
      overrides.otpResendCooldownMs ?? DEFAULTS.otpResendCooldownMs,
    otpMaxAttempts: overrides.otpMaxAttempts ?? otpMaxAttempts,
    passwordResetTtlMs:
      overrides.passwordResetTtlMs ?? DEFAULTS.passwordResetTtlMs,
    patientIdleMs: overrides.patientIdleMs ?? DEFAULTS.patientIdleMs,
    patientAbsoluteMs: overrides.patientAbsoluteMs ?? DEFAULTS.patientAbsoluteMs,
    psychologistIdleMs:
      overrides.psychologistIdleMs ?? DEFAULTS.psychologistIdleMs,
    psychologistAbsoluteMs:
      overrides.psychologistAbsoluteMs ?? DEFAULTS.psychologistAbsoluteMs,
    superAdminIdleMs: overrides.superAdminIdleMs ?? DEFAULTS.superAdminIdleMs,
    superAdminAbsoluteMs:
      overrides.superAdminAbsoluteMs ?? DEFAULTS.superAdminAbsoluteMs,
    mfaStepWindow: overrides.mfaStepWindow ?? DEFAULTS.mfaStepWindow,
    mfaMaxFailures: overrides.mfaMaxFailures ?? DEFAULTS.mfaMaxFailures,
    mfaLockoutMs: overrides.mfaLockoutMs ?? DEFAULTS.mfaLockoutMs,
    recoveryCodeCount: overrides.recoveryCodeCount ?? DEFAULTS.recoveryCodeCount,
  };
}

export function isSessionSecretUsable(secret: string | undefined): boolean {
  return typeof secret === "string" && secret.length >= 32;
}

export function resolveOtpProviderMode(
  config: IdentityRuntimeConfig,
): OtpProviderMode {
  const provider = config.otpProvider?.toLowerCase();
  if (config.nodeEnv === "production") {
    if (!provider || provider === "test" || provider === "mock" || provider === "dev") {
      return "unconfigured";
    }
    return "production_required";
  }
  if (provider === "test" || provider === "dev" || config.nodeEnv === "test") {
    return "test";
  }
  if (!provider) {
    return "unconfigured";
  }
  return "production_required";
}

export function isPostgresUrl(url: string | undefined): url is string {
  if (!url) {
    return false;
  }
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function isIdentityDatabaseConfigured(
  config: IdentityRuntimeConfig,
): boolean {
  if (config.nodeEnv === "test") {
    return true;
  }
  return isPostgresUrl(config.databaseUrl);
}

export function isSmtpReadyForIdentity(): boolean {
  return getSmtpTransportConfig().ok;
}

function isProductionOtpDeliveryConfigured(
  config: IdentityRuntimeConfig,
): boolean {
  const provider = config.otpProvider?.toLowerCase();
  if (provider === "twilio" || provider === "twilio_sms") {
    return isTwilioSmsOtpConfigured();
  }
  // Legacy OTP_API_KEY path remains for future non-Twilio adapters.
  return Boolean(config.otpApiKey);
}

/**
 * Production patient registration remains gated even when code exists.
 * All of these must be true before considering registration launch-ready.
 */
export function isPatientRegistrationRuntimeAllowed(
  config: IdentityRuntimeConfig,
): boolean {
  if (!config.registrationEnabled) {
    return false;
  }
  if (!isSessionSecretUsable(config.sessionSecret)) {
    return false;
  }
  if (config.nodeEnv === "production") {
    if (!isPostgresUrl(config.databaseUrl)) {
      return false;
    }
    if (resolveOtpProviderMode(config) !== "production_required") {
      return false;
    }
    if (!isProductionOtpDeliveryConfigured(config)) {
      return false;
    }
    if (!isSmtpReadyForIdentity()) {
      return false;
    }
  }
  return true;
}

export function isPrivilegedProvisionAllowed(
  config: IdentityRuntimeConfig,
): boolean {
  if (config.nodeEnv === "production") {
    return false;
  }
  return config.identityProvisionEnabled || config.nodeEnv === "test";
}

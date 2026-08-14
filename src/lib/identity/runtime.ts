import {
  isPatientRegistrationRuntimeAllowed,
  isSessionSecretUsable,
  loadIdentityConfig,
  resolveOtpProviderMode,
  type IdentityRuntimeConfig,
} from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import { getIdentityDb } from "@/lib/identity/db";
import { createSmtpEmailService } from "@/lib/identity/email-service";
import {
  createOtpService,
  createProductionBoundaryOtpProvider,
  createTestOtpProvider,
  createUnconfiguredOtpProvider,
  type OtpDeliveryProvider,
} from "@/lib/identity/otp";
import { createIdentityRateLimiter } from "@/lib/identity/rate-limit";
import { logStructured } from "@/lib/observability/logger";

function selectOtpProvider(config: IdentityRuntimeConfig): OtpDeliveryProvider {
  const mode = resolveOtpProviderMode(config);
  if (config.nodeEnv === "production" && mode !== "production_required") {
    logStructured("ERROR", {
      operation: "identityOtpProvider",
      errorType: "production_otp_unconfigured",
    });
    return createUnconfiguredOtpProvider();
  }
  if (mode === "test") {
    if (config.nodeEnv === "production") {
      return createUnconfiguredOtpProvider();
    }
    return createTestOtpProvider();
  }
  if (mode === "production_required") {
    return createProductionBoundaryOtpProvider();
  }
  return createUnconfiguredOtpProvider();
}

export type AppIdentityContextResult =
  | { ok: true; ctx: IdentityContext }
  | { ok: false; reason: "not_configured" };

/**
 * Server-only identity context. Never import from Client Components.
 * Missing secrets fail closed for identity operations without crashing the public site.
 */
export function createAppIdentityContext(
  overrides: Partial<IdentityRuntimeConfig> = {},
): AppIdentityContextResult {
  const config = loadIdentityConfig(overrides);
  if (!isSessionSecretUsable(config.sessionSecret)) {
    return { ok: false, reason: "not_configured" };
  }
  try {
    const db = getIdentityDb(config);
    const email = createSmtpEmailService();
    const base = {
      db,
      config,
      now: () => new Date(),
      email,
      rateLimit: createIdentityRateLimiter(),
    };
    const otpProvider = selectOtpProvider(config);
    const otp = createOtpService(base, otpProvider);
    return {
      ok: true,
      ctx: { ...base, otp },
    };
  } catch {
    return { ok: false, reason: "not_configured" };
  }
}

export function isRegistrationAvailable(
  config: IdentityRuntimeConfig = loadIdentityConfig(),
): boolean {
  return isPatientRegistrationRuntimeAllowed(config);
}

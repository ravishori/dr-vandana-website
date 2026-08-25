import {
  isPatientRegistrationRuntimeAllowed,
  isSessionSecretUsable,
  loadIdentityConfig,
  type IdentityRuntimeConfig,
} from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import { getIdentityDb } from "@/lib/identity/db";
import { createSmtpEmailService } from "@/lib/identity/email-service";
import { createOtpService } from "@/lib/identity/otp";
import { selectRuntimeOtpProvider } from "@/lib/identity/otp-providers/select";
import { createIdentityRateLimiter } from "@/lib/identity/rate-limit";

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
    const otpProvider = selectRuntimeOtpProvider({ config, email });
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

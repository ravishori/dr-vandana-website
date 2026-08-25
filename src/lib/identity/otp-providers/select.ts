import type { EmailService } from "@/lib/identity/email-service";
import { createSmtpEmailOtpProvider } from "@/lib/identity/otp-providers/smtp-email";
import { createTwilioSmsOtpProvider } from "@/lib/identity/otp-providers/twilio-sms";
import { isTwilioSmsOtpConfigured } from "@/lib/identity/otp-providers/twilio-sms-config";
import type {
  OtpDeliveryProvider,
  OtpDeliveryResult,
} from "@/lib/identity/otp-types";
import {
  createProductionBoundaryOtpProvider,
  createTestOtpProvider,
  createUnconfiguredOtpProvider,
} from "@/lib/identity/otp";
import type { IdentityRuntimeConfig } from "@/lib/identity/config";
import { resolveOtpProviderMode } from "@/lib/identity/config";
import { getSmtpTransportConfig } from "@/config/appointment-email";
import { logStructured } from "@/lib/observability/logger";

/**
 * Routes OTP delivery by channel:
 * - SMS → Twilio (when configured) or fail-closed
 * - EMAIL → SMTP / Gmail (when configured) or fail-closed
 */
export function createCompositeOtpProvider(input: {
  sms: OtpDeliveryProvider;
  email: OtpDeliveryProvider;
}): OtpDeliveryProvider {
  return {
    id: `composite:${input.sms.id}+${input.email.id}`,
    testOnly: input.sms.testOnly && input.email.testOnly,
    async deliver(params): Promise<OtpDeliveryResult> {
      if (params.channel === "SMS") {
        return input.sms.deliver(params);
      }
      if (params.channel === "EMAIL") {
        return input.email.deliver(params);
      }
      return { ok: false, reason: "channel_unsupported" };
    },
  };
}

export function selectRuntimeOtpProvider(input: {
  config: IdentityRuntimeConfig;
  email: EmailService;
}): OtpDeliveryProvider {
  const mode = resolveOtpProviderMode(input.config);
  const expiryMinutes = Math.max(1, Math.round(input.config.otpTtlMs / 60_000));

  if (input.config.nodeEnv === "production" && mode !== "production_required") {
    logStructured("ERROR", {
      operation: "identityOtpProvider",
      errorType: "production_otp_unconfigured",
    });
    return createUnconfiguredOtpProvider();
  }

  if (mode === "test") {
    if (input.config.nodeEnv === "production") {
      return createUnconfiguredOtpProvider();
    }
    return createTestOtpProvider();
  }

  if (mode !== "production_required") {
    return createUnconfiguredOtpProvider();
  }

  const providerName = input.config.otpProvider?.toLowerCase();
  const smsConfigured = isTwilioSmsOtpConfigured();
  const smtpConfigured = getSmtpTransportConfig().ok;

  if (providerName === "twilio" || providerName === "twilio_sms") {
    if (!smsConfigured) {
      logStructured("ERROR", {
        operation: "identityOtpProvider",
        errorType: "twilio_sms_not_configured",
      });
      return createUnconfiguredOtpProvider();
    }
    const sms = createTwilioSmsOtpProvider({ expiryMinutes });
    const email = smtpConfigured
      ? createSmtpEmailOtpProvider({ email: input.email, expiryMinutes })
      : createUnconfiguredOtpProvider();
    return createCompositeOtpProvider({ sms, email });
  }

  // Explicit production_required without a known vendor adapter → fail closed.
  logStructured("ERROR", {
    operation: "identityOtpProvider",
    errorType: "otp_vendor_unrecognized_or_unconfigured",
    provider: providerName ?? "unset",
  });
  return createProductionBoundaryOtpProvider();
}

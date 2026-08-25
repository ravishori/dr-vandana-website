import {
  isPatientRegistrationRuntimeAllowed,
  isPostgresUrl,
  isPrivilegedProvisionAllowed,
  isSessionSecretUsable,
  isSmtpReadyForIdentity,
  loadIdentityConfig,
  resolveOtpProviderMode,
  type IdentityRuntimeConfig,
} from "@/lib/identity/config";
import { isMfaKeyUsable } from "@/lib/identity/crypto";
import { isTwilioSmsOtpConfigured } from "@/lib/identity/otp-providers/twilio-sms-config";

export type GateAnswer = "YES" | "NO";

export type IdentityProductionGateReport = {
  databaseConfigured: GateAnswer;
  smtpConfigured: GateAnswer;
  otpProductionProviderConfigured: GateAnswer;
  twilioSmsConfigured: GateAnswer;
  mfaEncryptionKeyConfigured: GateAnswer;
  sessionSecretConfigured: GateAnswer;
  patientRegistrationFlag: GateAnswer;
  patientRegistrationRuntimeAllowed: GateAnswer;
  privilegedProvisioningAllowed: GateAnswer;
  otpVendorAdapterImplemented: GateAnswer;
};

function yn(value: boolean): GateAnswer {
  return value ? "YES" : "NO";
}

/**
 * Operator-only readiness snapshot. Never include secret values, URLs with
 * credentials, API keys, or provider account identifiers.
 *
 * Phase 2A: Twilio SMS OTP adapter is implemented in code. Production remains
 * fail-closed until OTP_PROVIDER=twilio and Twilio + SMTP credentials are set
 * in the host environment (never in source control).
 */
export const OTP_VENDOR_ADAPTER_IMPLEMENTED = true;

export function evaluateIdentityProductionGates(
  config: IdentityRuntimeConfig = loadIdentityConfig(),
  options?: {
    smtpConfigured?: boolean;
    twilioSmsConfigured?: boolean;
  },
): IdentityProductionGateReport {
  const smtpConfigured = options?.smtpConfigured ?? isSmtpReadyForIdentity();
  const twilioSmsConfigured =
    options?.twilioSmsConfigured ?? isTwilioSmsOtpConfigured();
  const otpMode = resolveOtpProviderMode(config);
  const provider = config.otpProvider?.toLowerCase();
  const otpEnvLooksProduction =
    otpMode === "production_required" &&
    (provider === "twilio" || provider === "twilio_sms"
      ? twilioSmsConfigured
      : Boolean(config.otpApiKey));
  const otpProductionProviderConfigured =
    OTP_VENDOR_ADAPTER_IMPLEMENTED && otpEnvLooksProduction;

  return {
    databaseConfigured: yn(isPostgresUrl(config.databaseUrl)),
    smtpConfigured: yn(smtpConfigured),
    otpProductionProviderConfigured: yn(otpProductionProviderConfigured),
    twilioSmsConfigured: yn(twilioSmsConfigured),
    mfaEncryptionKeyConfigured: yn(isMfaKeyUsable(config.mfaEncryptionKey)),
    sessionSecretConfigured: yn(isSessionSecretUsable(config.sessionSecret)),
    patientRegistrationFlag: yn(config.registrationEnabled),
    patientRegistrationRuntimeAllowed: yn(
      isPatientRegistrationRuntimeAllowed(config),
    ),
    privilegedProvisioningAllowed: yn(isPrivilegedProvisionAllowed(config)),
    otpVendorAdapterImplemented: yn(OTP_VENDOR_ADAPTER_IMPLEMENTED),
  };
}

export function formatIdentityProductionGates(
  report: IdentityProductionGateReport,
): string {
  return [
    `DATABASE configured: ${report.databaseConfigured}`,
    `SMTP configured: ${report.smtpConfigured}`,
    `OTP production provider configured: ${report.otpProductionProviderConfigured}`,
    `Twilio SMS configured: ${report.twilioSmsConfigured}`,
    `MFA encryption key configured: ${report.mfaEncryptionKeyConfigured}`,
    `Session secret configured: ${report.sessionSecretConfigured}`,
    `Patient registration flag: ${report.patientRegistrationFlag}`,
    `Patient registration runtime allowed: ${report.patientRegistrationRuntimeAllowed}`,
    `Privileged provisioning allowed: ${report.privilegedProvisioningAllowed}`,
    `OTP vendor adapter implemented: ${report.otpVendorAdapterImplemented}`,
  ].join("\n");
}

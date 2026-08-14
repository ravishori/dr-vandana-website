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

export type GateAnswer = "YES" | "NO";

export type IdentityProductionGateReport = {
  databaseConfigured: GateAnswer;
  smtpConfigured: GateAnswer;
  otpProductionProviderConfigured: GateAnswer;
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
 * A production SMS/OTP vendor adapter has not been implemented. Until a human
 * selects a vendor and an adapter is added, OTP delivery stays fail-closed.
 */
export const OTP_VENDOR_ADAPTER_IMPLEMENTED = false;

export function evaluateIdentityProductionGates(
  config: IdentityRuntimeConfig = loadIdentityConfig(),
  options?: {
    smtpConfigured?: boolean;
  },
): IdentityProductionGateReport {
  const smtpConfigured = options?.smtpConfigured ?? isSmtpReadyForIdentity();
  const otpMode = resolveOtpProviderMode(config);
  const otpEnvLooksProduction =
    otpMode === "production_required" && Boolean(config.otpApiKey);
  const otpProductionProviderConfigured =
    OTP_VENDOR_ADAPTER_IMPLEMENTED && otpEnvLooksProduction;

  return {
    databaseConfigured: yn(isPostgresUrl(config.databaseUrl)),
    smtpConfigured: yn(smtpConfigured),
    otpProductionProviderConfigured: yn(otpProductionProviderConfigured),
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
    `MFA encryption key configured: ${report.mfaEncryptionKeyConfigured}`,
    `Session secret configured: ${report.sessionSecretConfigured}`,
    `Patient registration flag: ${report.patientRegistrationFlag}`,
    `Patient registration runtime allowed: ${report.patientRegistrationRuntimeAllowed}`,
    `Privileged provisioning allowed: ${report.privilegedProvisioningAllowed}`,
    `OTP vendor adapter implemented: ${report.otpVendorAdapterImplemented}`,
  ].join("\n");
}

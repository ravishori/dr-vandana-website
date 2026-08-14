/**
 * Operator production-readiness snapshot.
 * Prints PASS / FAIL / BLOCKED / NOT CONFIGURED only.
 * Never prints secrets, DATABASE_URL, tokens, or credentials.
 * Does not claim external infrastructure is ready because an env var exists.
 */

import {
  isPatientRegistrationRuntimeAllowed,
  isPostgresUrl,
  isPrivilegedProvisionAllowed,
  isSessionSecretUsable,
  isSmtpReadyForIdentity,
  loadIdentityConfig,
  type IdentityRuntimeConfig,
} from "@/lib/identity/config";
import { isMfaKeyUsable } from "@/lib/identity/crypto";
import { OTP_VENDOR_ADAPTER_IMPLEMENTED } from "@/lib/identity/production-readiness";
import {
  resolveEmailProviderMode,
  resolveWhatsAppProviderMode,
} from "@/lib/notifications/config";

export type ProductionGateStatus =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "NOT CONFIGURED";

export type ProductionGateCategory =
  | "CODE"
  | "CONFIGURATION"
  | "INFRASTRUCTURE"
  | "PROVIDER"
  | "LEGAL"
  | "HUMAN DECISION"
  | "SECURITY REVIEW";

export type ProductionGateRow = {
  gate: string;
  status: ProductionGateStatus;
  category: ProductionGateCategory;
  evidence: string;
};

export type ProductionReadinessReport = {
  overall: "BLOCKED";
  gates: ProductionGateRow[];
};

function flagDisabled(config: IdentityRuntimeConfig): ProductionGateRow {
  if (config.registrationEnabled) {
    return {
      gate: "PATIENT_REGISTRATION_ENABLED",
      status: "FAIL",
      category: "CODE",
      evidence: "flag is true; production registration must stay disabled",
    };
  }
  return {
    gate: "PATIENT_REGISTRATION_ENABLED",
    status: "PASS",
    category: "CODE",
    evidence: "flag is false",
  };
}

export function evaluateProductionReadinessGates(
  config: IdentityRuntimeConfig = loadIdentityConfig(),
  options?: { smtpConfigured?: boolean },
): ProductionReadinessReport {
  const smtpConfigured = options?.smtpConfigured ?? isSmtpReadyForIdentity();
  const emailMode = resolveEmailProviderMode(config.nodeEnv);
  const whatsappMode = resolveWhatsAppProviderMode(config.nodeEnv);
  const provisionAllowed = isPrivilegedProvisionAllowed(config);

  const gates: ProductionGateRow[] = [
    flagDisabled(config),
    {
      gate: "registration_runtime_allowed",
      status: isPatientRegistrationRuntimeAllowed(config) ? "FAIL" : "PASS",
      category: "CODE",
      evidence: isPatientRegistrationRuntimeAllowed(config)
        ? "runtime would allow registration"
        : "runtime refuses registration",
    },
    {
      gate: "privileged_provisioning",
      status: provisionAllowed ? "FAIL" : "PASS",
      category: "CODE",
      evidence: provisionAllowed
        ? "privileged provision is allowed"
        : "privileged provision refused",
    },
    {
      gate: "PostgreSQL vendor",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O1 unset",
    },
    {
      gate: "PostgreSQL region",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O2 unset",
    },
    {
      gate: "DATABASE_URL",
      status: isPostgresUrl(config.databaseUrl) ? "BLOCKED" : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: isPostgresUrl(config.databaseUrl)
        ? "URL present; production vendor and schema not verified here"
        : "postgres URL not set",
    },
    {
      gate: "btree_gist",
      status: "NOT CONFIGURED",
      category: "INFRASTRUCTURE",
      evidence: "run npm run db:verify-production against the target database",
    },
    {
      gate: "exclusion constraint",
      status: "NOT CONFIGURED",
      category: "INFRASTRUCTURE",
      evidence: "run npm run db:verify-production against the target database",
    },
    {
      gate: "session secret",
      status: isSessionSecretUsable(config.sessionSecret)
        ? "BLOCKED"
        : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: isSessionSecretUsable(config.sessionSecret)
        ? "configured in this process; production host store unverified"
        : "AUTH_SESSION_SECRET missing or too short",
    },
    {
      gate: "MFA encryption key",
      status: isMfaKeyUsable(config.mfaEncryptionKey)
        ? "BLOCKED"
        : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: isMfaKeyUsable(config.mfaEncryptionKey)
        ? "configured in this process; production host store unverified"
        : "MFA_ENCRYPTION_KEY missing or unusable",
    },
    {
      gate: "OTP vendor",
      status: "BLOCKED",
      category: "PROVIDER",
      evidence: OTP_VENDOR_ADAPTER_IMPLEMENTED
        ? "adapter flag true; vendor still requires human verification"
        : "OTP_VENDOR_ADAPTER_IMPLEMENTED=false",
    },
    {
      gate: "SMTP",
      status: smtpConfigured ? "BLOCKED" : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: smtpConfigured
        ? "SMTP env present; production delivery unverified"
        : "SMTP not configured",
    },
    {
      gate: "email provider mode",
      status:
        config.nodeEnv === "production" && emailMode === "forbidden"
          ? "FAIL"
          : emailMode === "smtp"
            ? "BLOCKED"
            : "NOT CONFIGURED",
      category: "CODE",
      evidence: `mode=${emailMode}`,
    },
    {
      gate: "Twilio WhatsApp",
      status:
        config.nodeEnv === "production" && whatsappMode === "test"
          ? "FAIL"
          : "BLOCKED",
      category: "PROVIDER",
      evidence: `mode=${whatsappMode}; production activation OPEN`,
    },
    {
      gate: "notification worker",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O15 unset; CLI refuses production",
    },
    {
      gate: "MFA recovery policy",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O12 unset; backup codes only; no email bypass",
    },
    {
      gate: "Privacy / Terms / consent",
      status: "BLOCKED",
      category: "LEGAL",
      evidence: "legal copy still describes an informational website",
    },
    {
      gate: "data residency",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O18 unset",
    },
    {
      gate: "retention",
      status: "BLOCKED",
      category: "HUMAN DECISION",
      evidence: "O10 unset",
    },
    {
      gate: "backups",
      status: "BLOCKED",
      category: "INFRASTRUCTURE",
      evidence: "no production backup configured in this repository",
    },
    {
      gate: "restore test",
      status: "BLOCKED",
      category: "INFRASTRUCTURE",
      evidence: "NOT EXECUTED",
    },
    {
      gate: "monitoring",
      status: "BLOCKED",
      category: "CONFIGURATION",
      evidence: "no production APM selected",
    },
    {
      gate: "CI",
      status: "PASS",
      category: "CODE",
      evidence: "workflow runs test, lint, typecheck, build, and PG job",
    },
    {
      gate: "security review of deployed environment",
      status: "BLOCKED",
      category: "SECURITY REVIEW",
      evidence: "code audits are not a deployed-environment review",
    },
  ];

  return { overall: "BLOCKED", gates };
}

export function formatProductionReadinessGates(
  report: ProductionReadinessReport,
): string {
  return [
    `OVERALL ${report.overall}`,
    ...report.gates.map(
      (row) => `${row.status} ${row.gate} [${row.category}] ${row.evidence}`,
    ),
  ].join("\n");
}

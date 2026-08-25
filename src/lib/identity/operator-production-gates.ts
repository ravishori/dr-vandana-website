/**
 * Operator production-readiness snapshot.
 * Prints PASS / BLOCKED / NOT CONFIGURED / HUMAN DECISION / LEGAL REVIEW / FAIL.
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
  getTwilioSmsConfigurationStatus,
  isTwilioSmsOtpConfigured,
} from "@/lib/identity/otp-providers/twilio-sms-config";
import { getSmtpConfigurationStatus } from "@/config/appointment-email";
import {
  resolveEmailProviderMode,
  resolveWhatsAppProviderMode,
} from "@/lib/notifications/config";

export type ProductionGateStatus =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "NOT CONFIGURED"
  | "HUMAN DECISION"
  | "LEGAL REVIEW";

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
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O1 unset; see docs/DECISION_POSTGRESQL.md",
    },
    {
      gate: "PostgreSQL region",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O2 unset; India preference not selected; see docs/DECISION_DATA_RESIDENCY.md",
    },
    {
      gate: "DATABASE_URL",
      status: isPostgresUrl(config.databaseUrl) ? "BLOCKED" : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: isPostgresUrl(config.databaseUrl)
        ? "URL present in this process; production vendor, TLS, and schema are not verified by env presence"
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
      status: OTP_VENDOR_ADAPTER_IMPLEMENTED
        ? isTwilioSmsOtpConfigured() &&
          (config.otpProvider?.toLowerCase() === "twilio" ||
            config.otpProvider?.toLowerCase() === "twilio_sms")
          ? "BLOCKED"
          : "NOT CONFIGURED"
        : "HUMAN DECISION",
      category: "PROVIDER",
      evidence: OTP_VENDOR_ADAPTER_IMPLEMENTED
        ? isTwilioSmsOtpConfigured() &&
          (config.otpProvider?.toLowerCase() === "twilio" ||
            config.otpProvider?.toLowerCase() === "twilio_sms")
          ? "Twilio SMS adapter implemented; host credentials present in this process; India DLT/legal and delivery verification still required before production registration"
          : `Twilio SMS adapter implemented; ${getTwilioSmsConfigurationStatus().status}; set OTP_PROVIDER=twilio and TWILIO_* in host env (never commit secrets); see docs/PHASE_2A_OTP_STAGING.md`
        : "OTP_VENDOR_ADAPTER_IMPLEMENTED=false; see docs/DECISION_OTP_PROVIDER.md",
    },
    {
      gate: "Twilio SMS OTP",
      status: isTwilioSmsOtpConfigured() ? "BLOCKED" : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: `${getTwilioSmsConfigurationStatus().status}; trial accounts may only SMS verified destinations (STAGING PROVIDER ACCOUNT RESTRICTION)`,
    },
    {
      gate: "SMTP",
      status: smtpConfigured ? "BLOCKED" : "NOT CONFIGURED",
      category: "CONFIGURATION",
      evidence: smtpConfigured
        ? `${getSmtpConfigurationStatus().status}; production delivery, SPF/DKIM/DMARC, and bounce handling unverified; Gmail requires App Password`
        : `${getSmtpConfigurationStatus().status}`,
    },
    {
      gate: "SMTP production identity",
      status: "HUMAN DECISION",
      category: "PROVIDER",
      evidence: "sender identity unset; env vars do not prove mailbox authentication; see docs/DECISION_SMTP_PROVIDER.md",
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
      evidence: `mode=${whatsappMode}; TWILIO_WHATSAPP_ENABLED must stay false until sender, templates, and legal review exist; env presence is not production readiness`,
    },
    {
      gate: "WhatsApp processor / data residency",
      status: "HUMAN DECISION",
      category: "LEGAL",
      evidence: "Twilio/Meta processing locations unverified; see docs/TWILIO_WHATSAPP_PRODUCTION_CHECKLIST.md",
    },
    {
      gate: "WhatsApp opt-in wording",
      status: "LEGAL REVIEW",
      category: "LEGAL",
      evidence: "checkbox exists; consent copy unapproved; see docs/LEGAL_REVIEW_REQUIRED.md",
    },
    {
      gate: "notification worker",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O15 unset; CLI refuses production; see docs/NOTIFICATION_WORKER_RUNBOOK.md",
    },
    {
      gate: "MFA recovery policy",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O12 unset; backup codes only; EMAIL-ONLY MFA BYPASS IS FORBIDDEN; see docs/DECISION_MFA_RECOVERY.md",
    },
    {
      gate: "Privacy / Terms / consent",
      status: "LEGAL REVIEW",
      category: "LEGAL",
      evidence: "legal copy still describes an informational website; see docs/LEGAL_REVIEW_REQUIRED.md",
    },
    {
      gate: "data residency",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O18 unset; see docs/DECISION_DATA_RESIDENCY.md",
    },
    {
      gate: "retention",
      status: "LEGAL REVIEW",
      category: "LEGAL",
      evidence: "O10 unset; periods must not be invented; see docs/DECISION_DATA_RETENTION.md",
    },
    {
      gate: "backups / RPO / RTO",
      status: "HUMAN DECISION",
      category: "INFRASTRUCTURE",
      evidence: "no production backup configured; RPO/RTO values must not be invented; see docs/DECISION_BACKUP_RPO_RTO.md",
    },
    {
      gate: "restore test",
      status: "BLOCKED",
      category: "INFRASTRUCTURE",
      evidence: "NOT EXECUTED",
    },
    {
      gate: "monitoring",
      status: "HUMAN DECISION",
      category: "CONFIGURATION",
      evidence: "no production APM selected; see docs/PRODUCTION_MONITORING_CHECKLIST.md",
    },
    {
      gate: "patient 403 vs 404",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O17 unset for patient resources; psychologist reads already NOT_FOUND",
    },
    {
      gate: "cancellation / reschedule notice",
      status: "HUMAN DECISION",
      category: "HUMAN DECISION",
      evidence: "O9 policy values unset; hours/duration also OPEN; code defaults are not an approved practice policy",
    },
    {
      gate: "clinical records / Super Admin boundary",
      status: "PASS",
      category: "CODE",
      evidence: "Option C not implemented; SUPER_ADMIN is not granted clinical permissions; SUPER_ADMIN ≠ ALL_DATA_ACCESS",
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
  const blocked = report.gates.filter((g) => g.status === "BLOCKED").length;
  const notConfigured = report.gates.filter((g) => g.status === "NOT CONFIGURED").length;
  const failed = report.gates.filter((g) => g.status === "FAIL").length;
  const passed = report.gates.filter((g) => g.status === "PASS").length;
  const humanDecision = report.gates.filter((g) => g.status === "HUMAN DECISION").length;
  const legalReview = report.gates.filter((g) => g.status === "LEGAL REVIEW").length;

  return [
    `OVERALL ${report.overall}`,
    "Statuses: PASS | BLOCKED | NOT CONFIGURED | HUMAN DECISION | LEGAL REVIEW | FAIL",
    "Env var presence never proves SMTP, OTP, Twilio, backup, or monitoring delivery.",
    `Counts — PASS: ${passed}  BLOCKED: ${blocked}  NOT CONFIGURED: ${notConfigured}  HUMAN DECISION: ${humanDecision}  LEGAL REVIEW: ${legalReview}  FAIL: ${failed}`,
    ...report.gates.map(
      (row) => `${row.status} ${row.gate} [${row.category}] ${row.evidence}`,
    ),
  ].join("\n");
}

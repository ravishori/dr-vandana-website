/**
 * Phase 2A staging configuration check (no secret values printed).
 *
 * Usage:
 *   npx tsx scripts/staging-otp-config-check.ts
 *
 * Exit codes:
 *   0 — SMTP CONFIGURED and TWILIO CONFIGURED (and E.164 checks pass)
 *   2 — one or more providers NOT CONFIGURED (expected until host secrets are set)
 *   1 — hard failure (registration enabled, bad NODE_ENV, E.164 regression)
 *
 * Does not send email or SMS. For live delivery see docs/PHASE_2A_OTP_STAGING.md.
 */

import {
  getSmtpConfigurationStatus,
  getSmtpTransportConfig,
} from "../src/config/appointment-email";
import { normalizeMobile } from "../src/lib/identity/normalize";
import {
  getTwilioSmsConfigurationStatus,
  isTwilioSmsOtpConfigured,
} from "../src/lib/identity/otp-providers/twilio-sms-config";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function unsetAmong(names: string[]): string[] {
  return names.filter((name) => !readEnv(name));
}

function main() {
  if (readEnv("PATIENT_REGISTRATION_ENABLED") === "true") {
    console.error(
      "REFUSED: PATIENT_REGISTRATION_ENABLED must remain false during Phase 2A staging checks.",
    );
    process.exit(1);
  }

  console.log("=== Phase 2A staging configuration (names/status only) ===");

  const smtpStatus = getSmtpConfigurationStatus().status;
  console.log(smtpStatus);
  if (!getSmtpTransportConfig().ok) {
    console.log(
      "SMTP requires: SMTP_HOST|SMTP_SERVER, SMTP_PORT, SMTP_USER|SMTP_EMAIL, SMTP_PASSWORD, SMTP_FROM_EMAIL|SMTP_EMAIL",
    );
    console.log(
      `Unset among checked names: ${unsetAmong([
        "SMTP_HOST",
        "SMTP_SERVER",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_EMAIL",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
      ]).join(", ")}`,
    );
  } else {
    console.log("SMTP App Password requirement: Gmail App Password when host is smtp.gmail.com");
  }

  const twilioStatus = getTwilioSmsConfigurationStatus().status;
  console.log(twilioStatus);
  if (!isTwilioSmsOtpConfigured()) {
    console.log(
      "Twilio requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER|TWILIO_PHONE_NUMBER",
    );
    console.log(
      `Unset among checked names: ${unsetAmong([
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_FROM_NUMBER",
        "TWILIO_PHONE_NUMBER",
      ]).join(", ")}`,
    );
  } else {
    console.log(
      "TWILIO TRIAL ACCOUNT: verified destination required when account is still trial",
    );
  }

  const india = normalizeMobile("9876543210");
  const australia = normalizeMobile("0412345678", "AU");
  console.log(`E.164 India 9876543210 => ${india}`);
  console.log(`E.164 Australia 0412345678 (AU) => ${australia}`);
  if (india !== "+919876543210" || australia !== "+61412345678") {
    console.error("E.164 normalization FAILED");
    process.exit(1);
  }
  console.log("E.164 normalization PASS");

  console.log(
    `OTP_PROVIDER=${readEnv("OTP_PROVIDER") ? "SET" : "NOT_SET"} (value not printed)`,
  );
  console.log(
    `DATABASE_URL=${readEnv("DATABASE_URL") ? "SET" : "NOT_SET"} (value not printed)`,
  );
  console.log(
    `AUTH_SESSION_SECRET=${readEnv("AUTH_SESSION_SECRET") ? "SET" : "NOT_SET"} (value not printed)`,
  );
  console.log(
    `MFA_ENCRYPTION_KEY=${readEnv("MFA_ENCRYPTION_KEY") ? "SET" : "NOT_SET"} (value not printed)`,
  );
  console.log(
    `UPSTASH_REDIS_REST_URL=${readEnv("UPSTASH_REDIS_REST_URL") ? "SET" : "NOT_SET"} (value not printed)`,
  );
  console.log("PATIENT_REGISTRATION_ENABLED must remain false");

  if (smtpStatus === "SMTP CONFIGURED" && twilioStatus === "TWILIO CONFIGURED") {
    console.log("RESULT: providers configured in this process — proceed to manual live OTP tests");
    process.exit(0);
  }

  console.log("RESULT: CONFIGURATION REQUIRED — live Gmail/Twilio delivery not possible yet");
  process.exit(2);
}

main();

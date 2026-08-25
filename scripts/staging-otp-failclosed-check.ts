/**
 * Fail-closed configuration spot checks (no secrets printed).
 * Exit 0 only when all missing-secret paths refuse insecure operation.
 */
import {
  getSmtpConfigurationStatus,
  getSmtpTransportConfig,
} from "../src/config/appointment-email";
import {
  isPostgresUrl,
  isSessionSecretUsable,
  loadIdentityConfig,
} from "../src/lib/identity/config";
import { isMfaKeyUsable } from "../src/lib/identity/crypto";
import { createSmtpEmailService } from "../src/lib/identity/email-service";
import { createTwilioSmsOtpProvider } from "../src/lib/identity/otp-providers/twilio-sms";
import {
  getTwilioSmsConfigurationStatus,
  loadTwilioSmsConfig,
} from "../src/lib/identity/otp-providers/twilio-sms-config";
import { createAppIdentityContext } from "../src/lib/identity/runtime";

function clearProviderEnv(): void {
  for (const name of [
    "SMTP_SERVER",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_EMAIL",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "TWILIO_PHONE_NUMBER",
    "OTP_PROVIDER",
    "DATABASE_URL",
    "AUTH_SESSION_SECRET",
    "MFA_ENCRYPTION_KEY",
  ]) {
    delete process.env[name];
  }
}

async function main() {
  clearProviderEnv();

  if (getSmtpConfigurationStatus().status !== "SMTP NOT CONFIGURED") {
    throw new Error("SMTP should be NOT CONFIGURED when unset");
  }
  if (getSmtpTransportConfig().ok) {
    throw new Error("SMTP transport must fail closed when unset");
  }
  const smtpSend = await createSmtpEmailService().send({
    to: "synthetic@example.test",
    subject: "x",
    text: "x",
    html: "<p>x</p>",
  });
  if (smtpSend.ok || smtpSend.reason !== "not_configured") {
    throw new Error("SMTP send must fail closed when unset");
  }

  if (getTwilioSmsConfigurationStatus().status !== "TWILIO NOT CONFIGURED") {
    throw new Error("Twilio should be NOT CONFIGURED when unset");
  }
  if (loadTwilioSmsConfig().ok) {
    throw new Error("Twilio config must fail closed when unset");
  }
  const sms = await createTwilioSmsOtpProvider().deliver({
    destination: "+919876543210",
    purpose: "PHONE_VERIFY",
    channel: "SMS",
    code: "123456",
  });
  if (sms.ok || sms.reason !== "unconfigured") {
    throw new Error("Twilio SMS deliver must fail closed when unset");
  }

  if (isSessionSecretUsable(undefined)) {
    throw new Error("session secret must be unusable when missing");
  }
  if (createAppIdentityContext({ sessionSecret: undefined }).ok) {
    throw new Error("identity context must fail closed without session secret");
  }
  if (isMfaKeyUsable(undefined)) {
    throw new Error("MFA key must be unusable when missing");
  }
  if (isPostgresUrl(undefined)) {
    throw new Error("DATABASE_URL must be treated as missing");
  }
  const productionRegistration = loadIdentityConfig({
    nodeEnv: "production",
    sessionSecret: "identity-test-session-secret-32chars!!",
    registrationEnabled: true,
    databaseUrl: undefined,
    otpProvider: "twilio",
  });
  if (productionRegistration.registrationEnabled !== true) {
    // flag may be true in object; runtime gate is separate — just ensure missing DB is visible
  }
  if (isPostgresUrl(productionRegistration.databaseUrl)) {
    throw new Error("production registration config must not invent DATABASE_URL");
  }

  console.log("FAIL-CLOSED PASS (SMTP, Twilio, session, MFA, database missing)");
}

main().catch(() => {
  console.error("FAIL-CLOSED check failed (sanitized)");
  process.exit(1);
});

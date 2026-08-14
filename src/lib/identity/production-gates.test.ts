import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { eq } from "drizzle-orm";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  isPatientRegistrationRuntimeAllowed,
  isPrivilegedProvisionAllowed,
  loadIdentityConfig,
  resolveOtpProviderMode,
} from "@/lib/identity/config";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "@/lib/identity/email-service";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
} from "@/lib/identity/mfa";
import {
  assertOtpProviderAllowed,
  createTestOtpProvider,
} from "@/lib/identity/otp";
import {
  evaluateIdentityProductionGates,
  formatIdentityProductionGates,
  OTP_VENDOR_ADAPTER_IMPLEMENTED,
} from "@/lib/identity/production-readiness";
import {
  evaluateProductionReadinessGates,
  formatProductionReadinessGates,
} from "@/lib/identity/operator-production-gates";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { registerPatient } from "@/lib/identity/registration";
import { users } from "@/lib/identity/schema";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import {
  createIdentityTestWorld,
  TEST_MFA_KEY,
  TEST_SESSION_SECRET,
} from "@/lib/identity/test-harness";

const STRONG_PASSWORD = "correct-horse-battery";

describe("phase 1c production gates", () => {
  it("keeps patient registration disabled by default and when the flag is false", async () => {
    const defaultConfig = loadIdentityConfig({
      nodeEnv: "test",
      sessionSecret: TEST_SESSION_SECRET,
      registrationEnabled: false,
    });
    assert.equal(isPatientRegistrationRuntimeAllowed(defaultConfig), false);

    const world = await createIdentityTestWorld({ registrationEnabled: false });
    try {
      const result = await registerPatient(world.ctx, {
        displayName: "Asha Rao",
        email: "asha@example.test",
        mobile: "9876543210",
        password: STRONG_PASSWORD,
        passwordConfirm: STRONG_PASSWORD,
        acceptedTerms: true,
        ip: "203.0.113.10",
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "NOT_ENABLED");
      }
    } finally {
      await world.close();
    }
  });

  it("allows registration only when the flag is true in a non-production test world", async () => {
    const world = await createIdentityTestWorld({ registrationEnabled: true });
    try {
      const result = await registerPatient(world.ctx, {
        displayName: "Asha Rao",
        email: "asha@example.test",
        mobile: "9876543210",
        password: STRONG_PASSWORD,
        passwordConfirm: STRONG_PASSWORD,
        acceptedTerms: true,
        ip: "203.0.113.10",
      });
      assert.equal(result.ok, true);
    } finally {
      await world.close();
    }
  });

  it("does not treat production registration as allowed without postgres, OTP, and SMTP", () => {
    const production = loadIdentityConfig({
      nodeEnv: "production",
      sessionSecret: TEST_SESSION_SECRET,
      registrationEnabled: true,
      databaseUrl: undefined,
      otpProvider: "test",
      otpApiKey: undefined,
    });
    assert.equal(isPatientRegistrationRuntimeAllowed(production), false);
    assert.equal(resolveOtpProviderMode(production), "unconfigured");
  });

  it("refuses test OTP providers in production", async () => {
    assert.deepEqual(assertOtpProviderAllowed(createTestOtpProvider(), "production"), {
      ok: false,
      reason: "production_forbidden",
    });
    const world = await createIdentityTestWorld({
      nodeEnv: "production",
      otpProvider: createTestOtpProvider(),
    });
    try {
      world.ctx.config.nodeEnv = "production";
      const registered = await registerPatient(world.ctx, {
        displayName: "Asha Rao",
        email: "prod-otp@example.test",
        mobile: "9876543219",
        password: STRONG_PASSWORD,
        passwordConfirm: STRONG_PASSWORD,
        acceptedTerms: true,
        ip: "203.0.113.10",
      });
      assert.equal(registered.ok, true);
      const [user] = await world.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "prod-otp@example.test"));
      assert.ok(user);
      const sent = await world.ctx.otp.sendPhoneVerification({
        userId: user.id,
        mobileNormalized: user.mobileNormalized ?? "+919876543219",
        ip: "203.0.113.10",
      });
      assert.equal(sent.ok, false);
      if (!sent.ok) {
        assert.equal(sent.code, "UNCONFIGURED");
      }
    } finally {
      await world.close();
    }
  });

  it("fails closed without a usable session secret or postgres URL", () => {
    const missingSecret = createAppIdentityContext({
      sessionSecret: "too-short",
      databaseUrl: "postgres://example.invalid/db",
    });
    assert.equal(missingSecret.ok, false);

    const missingDatabase = createAppIdentityContext({
      sessionSecret: TEST_SESSION_SECRET,
      databaseUrl: "not-a-postgres-url",
      mfaEncryptionKey: TEST_MFA_KEY,
    });
    assert.equal(missingDatabase.ok, false);
  });

  it("does not silently skip MFA when the encryption key is missing", async () => {
    const world = await createIdentityTestWorld();
    try {
      const provisioned = await provisionPrivilegedUser(world.ctx, {
        role: "PSYCHOLOGIST",
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        displayName: "Dr. Vandana Rajiv Chaudhary",
      });
      assert.equal(provisioned.ok, true);
      if (!provisioned.ok) {
        return;
      }
      world.ctx.config.mfaEncryptionKey = undefined;
      const begin = await beginMfaEnrollment(world.ctx, {
        userId: provisioned.userId,
      });
      assert.equal(begin.ok, false);
      const confirm = await confirmMfaEnrollment(world.ctx, {
        userId: provisioned.userId,
        code: "000000",
      });
      assert.equal(confirm.ok, false);
    } finally {
      await world.close();
    }
  });

  it("refuses privileged provisioning in production", async () => {
    const config = loadIdentityConfig({
      nodeEnv: "production",
      identityProvisionEnabled: true,
      sessionSecret: TEST_SESSION_SECRET,
    });
    assert.equal(isPrivilegedProvisionAllowed(config), false);

    const world = await createIdentityTestWorld({
      nodeEnv: "production",
      identityProvisionEnabled: true,
    });
    try {
      const result = await provisionPrivilegedUser(world.ctx, {
        role: "SUPER_ADMIN",
        email: "admin@example.test",
        password: STRONG_PASSWORD,
        displayName: "Admin",
      });
      assert.equal(result.ok, false);
    } finally {
      await world.close();
    }
  });

  it("reports production gates as YES/NO without secret values", () => {
    assert.equal(OTP_VENDOR_ADAPTER_IMPLEMENTED, false);
    const report = evaluateIdentityProductionGates(
      loadIdentityConfig({
        nodeEnv: "production",
        sessionSecret: TEST_SESSION_SECRET,
        mfaEncryptionKey: TEST_MFA_KEY,
        databaseUrl: "postgres://user:super-secret-password@db.example/app",
        otpProvider: "test",
        otpApiKey: "otp-secret-should-not-appear",
        registrationEnabled: false,
      }),
      { smtpConfigured: false },
    );
    assert.equal(report.databaseConfigured, "YES");
    assert.equal(report.smtpConfigured, "NO");
    assert.equal(report.otpProductionProviderConfigured, "NO");
    assert.equal(report.otpVendorAdapterImplemented, "NO");
    assert.equal(report.sessionSecretConfigured, "YES");
    assert.equal(report.mfaEncryptionKeyConfigured, "YES");
    assert.equal(report.patientRegistrationFlag, "NO");
    assert.equal(report.patientRegistrationRuntimeAllowed, "NO");
    assert.equal(report.privilegedProvisioningAllowed, "NO");

    const rendered = formatIdentityProductionGates(report);
    assert.match(rendered, /DATABASE configured: YES/);
    assert.match(rendered, /Patient registration flag: NO/);
    assert.doesNotMatch(rendered, /super-secret-password/);
    assert.doesNotMatch(rendered, /otp-secret-should-not-appear/);
    assert.doesNotMatch(rendered, /identity-test-session-secret/);
    assert.doesNotMatch(rendered, /postgres:\/\//);
  });

  it("keeps identity emails free of passwords, OTPs, and clinical content", () => {
    const verify = verificationEmailContent({
      appBaseUrl: "https://drvandana.trinetra.net",
      token: "opaque-verify-token",
    });
    const reset = passwordResetEmailContent({
      appBaseUrl: "https://drvandana.trinetra.net",
      token: "opaque-reset-token",
    });
    for (const message of [verify, reset]) {
      assert.doesNotMatch(message.text, /correct-horse-battery/);
      assert.doesNotMatch(message.html, /correct-horse-battery/);
      assert.doesNotMatch(message.text, /\botp\b/i);
      assert.doesNotMatch(message.html, /\botp\b/i);
      assert.doesNotMatch(message.text, /diagnos|therapy note|clinical record/i);
      assert.doesNotMatch(message.subject, /\botp\b/i);
    }
    assert.doesNotMatch(verify.text, /password/i);
    assert.match(verify.text, /verify-email\?token=opaque-verify-token/);
    assert.match(reset.text, /reset-password\?token=opaque-reset-token/);
    assert.match(verify.html, /referrerpolicy="no-referrer"/);
    assert.match(reset.html, /referrerpolicy="no-referrer"/);
    assert.match(reset.text, /password reset/i);
  });

  it("keeps private identity routes out of the public sitemap and robots allow-list", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    assert.ok(urls.some((url) => url.endsWith("/about") || url.endsWith("drvandana.trinetra.net")));
    assert.ok(urls.some((url) => url.includes("/book-appointment")));
    assert.ok(urls.some((url) => url.includes("/privacy-policy")));
    assert.ok(urls.some((url) => url.includes("/terms")));
    assert.ok(urls.some((url) => url.includes("/disclaimer")));
    assert.ok(urls.some((url) => url.includes("/contact")));
    assert.ok(urls.some((url) => url.includes("/psychology/ask-dr-vandana-ai")));
    assert.ok(urls.some((url) => url.includes("/ask-a-question")));
    assert.ok(urls.some((url) => url.includes("/mental-health-support")));
    assert.equal(
      urls.some((url) => /\/patient|\/psychologist|\/super-admin/.test(url)),
      false,
    );

    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const disallow = rule?.disallow ?? [];
    const disallowList = Array.isArray(disallow) ? disallow : [disallow];
    assert.ok(disallowList.includes("/patient"));
    assert.ok(disallowList.includes("/psychologist"));
    assert.ok(disallowList.includes("/super-admin"));
  });

  it("keeps PATIENT_REGISTRATION_ENABLED=false in the example env file", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    assert.match(example, /PATIENT_REGISTRATION_ENABLED=false/);
    assert.doesNotMatch(example, /PATIENT_REGISTRATION_ENABLED=true/);
    assert.match(example, /IDENTITY_PROVISION_ENABLED=false/);
    assert.match(example, /TWILIO_WHATSAPP_ENABLED=false/);
    assert.doesNotMatch(example, /TWILIO_WHATSAPP_ENABLED=true/);
  });

  it("reports production readiness as BLOCKED without printing secrets", () => {
    const report = evaluateProductionReadinessGates(
      loadIdentityConfig({
        nodeEnv: "production",
        sessionSecret: TEST_SESSION_SECRET,
        mfaEncryptionKey: TEST_MFA_KEY,
        databaseUrl: "postgres://user:super-secret-password@db.example/app",
        otpProvider: "test",
        otpApiKey: "otp-secret-should-not-appear",
        registrationEnabled: false,
      }),
      { smtpConfigured: false },
    );
    assert.equal(report.overall, "BLOCKED");
    const registration = report.gates.find((row) => row.gate === "PATIENT_REGISTRATION_ENABLED");
    assert.equal(registration?.status, "PASS");
    const database = report.gates.find((row) => row.gate === "DATABASE_URL");
    assert.equal(database?.status, "BLOCKED");
    const otp = report.gates.find((row) => row.gate === "OTP vendor");
    assert.equal(otp?.status, "HUMAN DECISION");
    const postgresVendor = report.gates.find((row) => row.gate === "PostgreSQL vendor");
    assert.equal(postgresVendor?.status, "HUMAN DECISION");
    const privacy = report.gates.find((row) => row.gate === "Privacy / Terms / consent");
    assert.equal(privacy?.status, "LEGAL REVIEW");
    const smtp = report.gates.find((row) => row.gate === "SMTP");
    assert.equal(smtp?.status, "NOT CONFIGURED");
    const twilio = report.gates.find((row) => row.gate === "Twilio WhatsApp");
    assert.notEqual(twilio?.status, "PASS");
    const clinical = report.gates.find(
      (row) => row.gate === "clinical records / Super Admin boundary",
    );
    assert.equal(clinical?.status, "PASS");
    const rendered = formatProductionReadinessGates(report);
    assert.match(rendered, /^OVERALL BLOCKED/m);
    assert.match(rendered, /HUMAN DECISION/);
    assert.match(rendered, /LEGAL REVIEW/);
    assert.match(rendered, /Env var presence never proves/);
    assert.doesNotMatch(rendered, /super-secret-password/);
    assert.doesNotMatch(rendered, /otp-secret-should-not-appear/);
    assert.doesNotMatch(rendered, /postgres:\/\//);
  });

  it("does not treat SMTP or OTP environment variables as production-ready", () => {
    const report = evaluateProductionReadinessGates(
      loadIdentityConfig({
        nodeEnv: "production",
        sessionSecret: TEST_SESSION_SECRET,
        mfaEncryptionKey: TEST_MFA_KEY,
        databaseUrl: "postgres://user:another-secret@db.example/app",
        otpProvider: "msg91",
        otpApiKey: "otp-secret-should-not-appear",
        registrationEnabled: false,
      }),
      { smtpConfigured: true },
    );
    assert.equal(report.overall, "BLOCKED");
    const smtp = report.gates.find((row) => row.gate === "SMTP");
    assert.equal(smtp?.status, "BLOCKED");
    const otp = report.gates.find((row) => row.gate === "OTP vendor");
    assert.equal(otp?.status, "HUMAN DECISION");
    const rendered = formatProductionReadinessGates(report);
    assert.doesNotMatch(rendered, /another-secret/);
    assert.doesNotMatch(rendered, /otp-secret-should-not-appear/);
    assert.doesNotMatch(rendered, /PASS SMTP/);
    assert.doesNotMatch(rendered, /PASS OTP vendor/);
    assert.doesNotMatch(rendered, /PASS Twilio WhatsApp/);
  });

  it("fails the registration gate when the flag is true", () => {
    const report = evaluateProductionReadinessGates(
      loadIdentityConfig({
        nodeEnv: "test",
        sessionSecret: TEST_SESSION_SECRET,
        registrationEnabled: true,
      }),
    );
    const registration = report.gates.find((row) => row.gate === "PATIENT_REGISTRATION_ENABLED");
    assert.equal(registration?.status, "FAIL");
    assert.equal(report.overall, "BLOCKED");
  });
});

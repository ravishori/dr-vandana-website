import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { and, eq, isNull } from "drizzle-orm";

import {
  getSmtpConfigurationStatus,
  getSmtpTransportConfig,
} from "@/config/appointment-email";
import { generateNumericOtp, hashWithSecret } from "@/lib/identity/crypto";
import { createMemoryEmailService, emailOtpContent } from "@/lib/identity/email-service";
import { normalizeEmail, normalizeMobile } from "@/lib/identity/normalize";
import {
  createTestOtpProvider,
  createUnconfiguredOtpProvider,
} from "@/lib/identity/otp";
import { createSmtpEmailOtpProvider } from "@/lib/identity/otp-providers/smtp-email";
import { createCompositeOtpProvider } from "@/lib/identity/otp-providers/select";
import { createTwilioSmsOtpProvider } from "@/lib/identity/otp-providers/twilio-sms";
import {
  getTwilioSmsConfigurationStatus,
  loadTwilioSmsConfig,
} from "@/lib/identity/otp-providers/twilio-sms-config";
import { phoneVerifications } from "@/lib/identity/schema";
import {
  createIdentityTestWorld,
  TEST_SESSION_SECRET,
} from "@/lib/identity/test-harness";
import { registerPatient } from "@/lib/identity/registration";
import { verifyEmailToken } from "@/lib/identity/verification";
import { extractTokenFromLastEmail } from "@/lib/identity/test-harness";
import { users } from "@/lib/identity/schema";

const STRONG_PASSWORD = "correct-horse-battery";

async function activatePendingUser(
  world: Awaited<ReturnType<typeof createIdentityTestWorld>>,
  email: string,
  mobile: string,
) {
  const registered = await registerPatient(world.ctx, {
    displayName: "Test Patient",
    email,
    mobile,
    password: STRONG_PASSWORD,
    passwordConfirm: STRONG_PASSWORD,
    acceptedTerms: true,
    ip: "203.0.113.50",
  });
  assert.equal(registered.ok, true);
  const token = extractTokenFromLastEmail(world.email, "verify");
  assert.ok(token);
  const verified = await verifyEmailToken(world.ctx, token);
  assert.equal(verified.ok, true);
  const [user] = await world.ctx.db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, normalizeEmail(email)));
  assert.ok(user);
  return user;
}

describe("phase 2a otp infrastructure", () => {
  describe("generation and hashing", () => {
    it("generates uniform 6-digit OTPs without Math.random", () => {
      const codes = new Set<string>();
      for (let index = 0; index < 40; index += 1) {
        const code = generateNumericOtp(6);
        assert.match(code, /^\d{6}$/);
        codes.add(code);
      }
      assert.ok(codes.size > 1);
    });

    it("never stores plaintext OTP hashes that equal the code", () => {
      const code = "123456";
      const hashed = hashWithSecret("otp", code, TEST_SESSION_SECRET);
      assert.notEqual(hashed, code);
      assert.equal(hashed.length, 64);
      assert.notEqual(
        hashWithSecret("otp", "123457", TEST_SESSION_SECRET),
        hashed,
      );
    });
  });

  describe("phone normalization", () => {
    it("normalizes India mobiles to E.164", () => {
      assert.equal(normalizeMobile("9876543210"), "+919876543210");
      assert.equal(normalizeMobile("+91 9876543210"), "+919876543210");
      assert.equal(normalizeMobile("919876543210"), "+919876543210");
      assert.equal(normalizeMobile("09876543210"), "+919876543210");
      assert.equal(normalizeMobile("12345"), null);
      assert.equal(normalizeMobile("5876543210"), null);
    });

    it("normalizes Australia mobiles when default country is AU", () => {
      assert.equal(normalizeMobile("0412345678", "AU"), "+61412345678");
      assert.equal(normalizeMobile("+61412345678", "AU"), "+61412345678");
      assert.equal(normalizeMobile("61412345678", "AU"), "+61412345678");
      assert.equal(normalizeMobile("0312345678", "AU"), null);
    });
  });

  describe("configuration status", () => {
    it("reports SMTP and Twilio status without exposing secrets", () => {
      const previous = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_SERVER: process.env.SMTP_SERVER,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_EMAIL: process.env.SMTP_EMAIL,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      };
      try {
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_SERVER;
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_EMAIL;
        delete process.env.SMTP_PASSWORD;
        delete process.env.SMTP_FROM_EMAIL;
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.TWILIO_FROM_NUMBER;
        delete process.env.TWILIO_PHONE_NUMBER;

        assert.equal(getSmtpConfigurationStatus().status, "SMTP NOT CONFIGURED");
        assert.equal(getTwilioSmsConfigurationStatus().status, "TWILIO NOT CONFIGURED");
        assert.equal(getSmtpTransportConfig().ok, false);
        assert.equal(loadTwilioSmsConfig().ok, false);

        process.env.SMTP_SERVER = "smtp.gmail.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_EMAIL = "ravishori@gmail.com";
        process.env.SMTP_PASSWORD = "app-password-not-a-real-secret";
        assert.equal(getSmtpConfigurationStatus().status, "SMTP CONFIGURED");
        const smtp = getSmtpTransportConfig();
        assert.equal(smtp.ok, true);
        if (smtp.ok) {
          assert.equal(smtp.config.host, "smtp.gmail.com");
          assert.equal(smtp.config.port, 587);
          assert.equal(smtp.config.user, "ravishori@gmail.com");
          assert.equal(smtp.config.fromEmail, "ravishori@gmail.com");
        }

        process.env.TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        process.env.TWILIO_AUTH_TOKEN = "token-not-a-real-secret";
        process.env.TWILIO_PHONE_NUMBER = "+15005550006";
        assert.equal(getTwilioSmsConfigurationStatus().status, "TWILIO CONFIGURED");
        const twilio = loadTwilioSmsConfig();
        assert.equal(twilio.ok, true);
        if (twilio.ok) {
          assert.equal(twilio.config.fromNumber, "+15005550006");
        }
      } finally {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    });
  });

  describe("email otp content", () => {
    it("includes professional wording without clinical or secret leakage", () => {
      const message = emailOtpContent({
        purpose: "EMAIL_VERIFY",
        code: "654321",
        expiryMinutes: 5,
      });
      assert.match(message.text, /Dr\. Vandana Rajiv Chaudhary/);
      assert.match(message.text, /Psychologist/);
      assert.match(message.text, /654321/);
      assert.match(message.text, /5 minutes/);
      assert.doesNotMatch(message.text, /AUTH_SESSION|TWILIO|SMTP_PASSWORD|diagnos/i);
    });
  });

  describe("providers", () => {
    it("fails closed when Twilio SMS is unconfigured", async () => {
      const previous = {
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
      };
      try {
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.TWILIO_FROM_NUMBER;
        delete process.env.TWILIO_PHONE_NUMBER;
        const provider = createTwilioSmsOtpProvider();
        const result = await provider.deliver({
          destination: "+919876543210",
          purpose: "PHONE_VERIFY",
          channel: "SMS",
          code: "111222",
        });
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.reason, "unconfigured");
        }
      } finally {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    });

    it("maps Twilio success and failure responses without exposing secrets", async () => {
      const providerOk = createTwilioSmsOtpProvider({
        config: {
          accountSid: "ACtest",
          authToken: "secret-token",
          fromNumber: "+15005550006",
        },
        httpClient: async () => ({ status: 201 }),
      });
      const ok = await providerOk.deliver({
        destination: "+919876543210",
        purpose: "PHONE_VERIFY",
        channel: "SMS",
        code: "111222",
      });
      assert.equal(ok.ok, true);

      const providerFail = createTwilioSmsOtpProvider({
        config: {
          accountSid: "ACtest",
          authToken: "secret-token",
          fromNumber: "+15005550006",
        },
        httpClient: async () => ({ status: 400, code: 21608 }),
      });
      const fail = await providerFail.deliver({
        destination: "+919876543210",
        purpose: "PHONE_VERIFY",
        channel: "SMS",
        code: "111222",
      });
      assert.equal(fail.ok, false);
      if (!fail.ok) {
        assert.equal(fail.reason, "provider_error");
      }
    });

    it("rejects invalid credentials through sanitized failure", async () => {
      const provider = createTwilioSmsOtpProvider({
        config: {
          accountSid: "ACtest",
          authToken: "bad",
          fromNumber: "+15005550006",
        },
        httpClient: async () => ({ status: 401, code: 20003 }),
      });
      const result = await provider.deliver({
        destination: "+919876543210",
        purpose: "PHONE_VERIFY",
        channel: "SMS",
        code: "111222",
      });
      assert.equal(result.ok, false);
    });

    it("delivers email OTP through SMTP email service abstraction", async () => {
      const email = createMemoryEmailService();
      const provider = createSmtpEmailOtpProvider({ email, expiryMinutes: 5 });
      const result = await provider.deliver({
        destination: "patient@example.test",
        purpose: "EMAIL_VERIFY",
        channel: "EMAIL",
        code: "445566",
      });
      assert.equal(result.ok, true);
      assert.equal(email.messages.length, 1);
      assert.match(email.messages[0]?.text ?? "", /445566/);
      assert.match(email.messages[0]?.text ?? "", /Dr\. Vandana Rajiv Chaudhary/);
    });

    it("routes composite provider by channel", async () => {
      const sms = createTestOtpProvider();
      const email = createMemoryEmailService();
      const emailProvider = createSmtpEmailOtpProvider({ email });
      const composite = createCompositeOtpProvider({ sms, email: emailProvider });
      const smsResult = await composite.deliver({
        destination: "+919876543210",
        purpose: "PHONE_VERIFY",
        channel: "SMS",
        code: "101010",
      });
      const emailResult = await composite.deliver({
        destination: "a@example.test",
        purpose: "EMAIL_VERIFY",
        channel: "EMAIL",
        code: "202020",
      });
      assert.equal(smsResult.ok, true);
      assert.equal(emailResult.ok, true);
      assert.equal(sms.peekLastCode("+919876543210"), "101010");
      assert.match(email.messages[0]?.text ?? "", /202020/);
    });
  });

  describe("otp challenge lifecycle", () => {
    it("enforces expiry, attempts, replay, purpose, and destination binding", async () => {
      const world = await createIdentityTestWorld({ registrationEnabled: true });
      try {
        const user = await activatePendingUser(
          world,
          "otp-lifecycle@example.test",
          "9876543210",
        );
        const sent = await world.ctx.otp.sendPhoneVerification({
          userId: user.id,
          mobileNormalized: "+919876543210",
          ip: "203.0.113.60",
        });
        assert.equal(sent.ok, true);
        const code = world.otpProvider.peekLastCode("+919876543210");
        assert.ok(code);

        const [row] = await world.ctx.db
          .select()
          .from(phoneVerifications)
          .where(
            and(
              eq(phoneVerifications.userId, user.id),
              isNull(phoneVerifications.verifiedAt),
            ),
          );
        assert.equal(row?.deliveryStatus, "DELIVERED");
        assert.equal(row?.destination, "+919876543210");
        assert.equal(row?.purpose, "PHONE_VERIFY");
        assert.doesNotMatch(row?.otpHash ?? "", new RegExp(code));

        const wrongPurpose = await world.ctx.otp.verifyEmailOtp({
          userId: user.id,
          code,
          ip: "203.0.113.60",
          purpose: "EMAIL_VERIFY",
          expectedDestination: "otp-lifecycle@example.test",
        });
        assert.equal(wrongPurpose.ok, false);

        const wrongDestination = await world.ctx.otp.verifyPhoneOtp({
          userId: user.id,
          code,
          ip: "203.0.113.60",
          expectedDestination: "+919999999999",
        });
        assert.equal(wrongDestination.ok, false);

        const ok = await world.ctx.otp.verifyPhoneOtp({
          userId: user.id,
          code,
          ip: "203.0.113.60",
          expectedDestination: "+919876543210",
        });
        assert.equal(ok.ok, true);

        const replay = await world.ctx.otp.verifyPhoneOtp({
          userId: user.id,
          code,
          ip: "203.0.113.60",
          expectedDestination: "+919876543210",
        });
        assert.equal(replay.ok, false);
      } finally {
        await world.close();
      }
    });

    it("rejects expired OTP and enforces max attempts", async () => {
      const world = await createIdentityTestWorld({ registrationEnabled: true });
      try {
        const user = await activatePendingUser(
          world,
          "otp-expire@example.test",
          "9876543211",
        );
        const sent = await world.ctx.otp.sendPhoneVerification({
          userId: user.id,
          mobileNormalized: "+919876543211",
          ip: "203.0.113.61",
        });
        assert.equal(sent.ok, true);
        const code = world.otpProvider.peekLastCode("+919876543211");
        assert.ok(code);
        world.advanceMs(world.ctx.config.otpTtlMs + 1000);
        const expired = await world.ctx.otp.verifyPhoneOtp({
          userId: user.id,
          code,
          ip: "203.0.113.61",
        });
        assert.equal(expired.ok, false);
        if (!expired.ok) {
          assert.equal(expired.code, "EXPIRED");
        }

        const user2 = await activatePendingUser(
          world,
          "otp-attempts@example.test",
          "9876543212",
        );
        await world.ctx.otp.sendPhoneVerification({
          userId: user2.id,
          mobileNormalized: "+919876543212",
          ip: "203.0.113.62",
        });
        for (let index = 0; index < world.ctx.config.otpMaxAttempts; index += 1) {
          const result = await world.ctx.otp.verifyPhoneOtp({
            userId: user2.id,
            code: "000000",
            ip: "203.0.113.62",
          });
          assert.equal(result.ok, false);
        }
        const real = world.otpProvider.peekLastCode("+919876543212");
        assert.ok(real);
        const blocked = await world.ctx.otp.verifyPhoneOtp({
          userId: user2.id,
          code: real,
          ip: "203.0.113.62",
        });
        assert.equal(blocked.ok, false);
      } finally {
        await world.close();
      }
    });

    it("does not claim delivery when provider fails and rejects unconfigured providers", async () => {
      const failing: ReturnType<typeof createTestOtpProvider> = {
        id: "failing",
        testOnly: true,
        async deliver() {
          return { ok: false, reason: "provider_error" };
        },
        peekLastCode() {
          return undefined;
        },
      };
      const world = await createIdentityTestWorld({
        registrationEnabled: true,
        otpProvider: failing,
      });
      try {
        const user = await activatePendingUser(
          world,
          "otp-fail@example.test",
          "9876543213",
        );
        const sent = await world.ctx.otp.sendPhoneVerification({
          userId: user.id,
          mobileNormalized: "+919876543213",
          ip: "203.0.113.63",
        });
        assert.equal(sent.ok, false);
        if (!sent.ok) {
          assert.equal(sent.code, "PROVIDER_FAILURE");
        }
        const [row] = await world.ctx.db
          .select()
          .from(phoneVerifications)
          .where(eq(phoneVerifications.userId, user.id));
        assert.equal(row?.deliveryStatus, "DELIVERY_FAILED");
      } finally {
        await world.close();
      }

      const unconfigured = await createIdentityTestWorld({
        registrationEnabled: true,
        otpProvider: createUnconfiguredOtpProvider(),
      });
      try {
        const user = await activatePendingUser(
          unconfigured,
          "otp-unconfigured@example.test",
          "9876543214",
        );
        const sent = await unconfigured.ctx.otp.sendPhoneVerification({
          userId: user.id,
          mobileNormalized: "+919876543214",
          ip: "203.0.113.64",
        });
        assert.equal(sent.ok, false);
        if (!sent.ok) {
          assert.equal(sent.code, "UNCONFIGURED");
        }
      } finally {
        await unconfigured.close();
      }
    });

    it("sends and verifies email OTP with destination binding", async () => {
      const world = await createIdentityTestWorld({ registrationEnabled: true });
      try {
        const user = await activatePendingUser(
          world,
          "email-otp@example.test",
          "9876543215",
        );
        const sent = await world.ctx.otp.sendEmailOtp({
          userId: user.id,
          emailNormalized: "email-otp@example.test",
          purpose: "EMAIL_VERIFY",
          ip: "203.0.113.65",
        });
        assert.equal(sent.ok, true);
        const code = world.otpProvider.peekLastCode("email-otp@example.test");
        assert.ok(code);
        const mismatch = await world.ctx.otp.verifyEmailOtp({
          userId: user.id,
          code,
          ip: "203.0.113.65",
          purpose: "EMAIL_VERIFY",
          expectedDestination: "other@example.test",
        });
        assert.equal(mismatch.ok, false);
        const ok = await world.ctx.otp.verifyEmailOtp({
          userId: user.id,
          code,
          ip: "203.0.113.65",
          purpose: "EMAIL_VERIFY",
          expectedDestination: "email-otp@example.test",
        });
        assert.equal(ok.ok, true);
      } finally {
        await world.close();
      }
    });

    it("atomically consumes OTP under concurrent verification", async () => {
      const world = await createIdentityTestWorld({ registrationEnabled: true });
      try {
        const user = await activatePendingUser(
          world,
          "otp-race@example.test",
          "9876543216",
        );
        await world.ctx.otp.sendPhoneVerification({
          userId: user.id,
          mobileNormalized: "+919876543216",
          ip: "203.0.113.66",
        });
        const code = world.otpProvider.peekLastCode("+919876543216");
        assert.ok(code);
        const [first, second] = await Promise.all([
          world.ctx.otp.verifyPhoneOtp({
            userId: user.id,
            code,
            ip: "203.0.113.66",
            expectedDestination: "+919876543216",
          }),
          world.ctx.otp.verifyPhoneOtp({
            userId: user.id,
            code,
            ip: "203.0.113.67",
            expectedDestination: "+919876543216",
          }),
        ]);
        const successes = [first, second].filter((result) => result.ok);
        assert.equal(successes.length, 1);
      } finally {
        await world.close();
      }
    });
  });
});

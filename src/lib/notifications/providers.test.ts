import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  resolveEmailProviderMode,
  resolveWhatsAppProviderMode,
} from "@/lib/notifications/config";
import { createForbiddenEmailSender } from "@/lib/notifications/email-adapter";
import {
  createForbiddenWhatsAppService,
  createTestWhatsAppService,
} from "@/lib/notifications/whatsapp";
import { createTwilioWhatsAppProvider } from "@/lib/notifications/twilio-whatsapp";

describe("notification provider fail-closed", () => {
  const previous = {
    WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER,
    TWILIO_WHATSAPP_ENABLED: process.env.TWILIO_WHATSAPP_ENABLED,
    TWILIO_WHATSAPP_SANDBOX: process.env.TWILIO_WHATSAPP_SANDBOX,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("refuses test and mock WhatsApp providers in production", () => {
    assert.equal(
      resolveWhatsAppProviderMode("production", {
        provider: "test",
        enabled: true,
      }),
      "unconfigured",
    );
    assert.equal(
      resolveWhatsAppProviderMode("production", {
        provider: "mock",
        enabled: true,
      }),
      "unconfigured",
    );
    assert.equal(
      resolveWhatsAppProviderMode("production", {
        provider: "sandbox",
        enabled: true,
        sandbox: true,
      }),
      "unconfigured",
    );
    const testProvider = createTestWhatsAppService();
    assert.equal(testProvider.testOnly, true);
  });

  it("keeps Twilio WhatsApp disabled unless explicitly enabled", () => {
    assert.equal(
      resolveWhatsAppProviderMode("production", {
        provider: "twilio",
        enabled: false,
      }),
      "disabled",
    );
  });

  it("refuses EMAIL_PROVIDER=test in production", () => {
    assert.equal(resolveEmailProviderMode("production", "test"), "forbidden");
    assert.equal(resolveEmailProviderMode("production", "mock"), "forbidden");
    assert.equal(resolveEmailProviderMode("production", "smtp"), "smtp");
  });

  it("does not treat sandbox as a production sender", async () => {
    const forbidden = createForbiddenWhatsAppService("WHATSAPP_SANDBOX_FORBIDDEN");
    const result = await forbidden.sendTemplateMessage({
      toE164: "+919876543210",
      templateKey: "appointment_confirmed",
      variables: { patientName: "Asha" },
      idempotencyKey: "delivery-1",
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "WHATSAPP_SANDBOX_FORBIDDEN");
  });

  it("stores a Twilio Message SID and classifies provider errors", async () => {
    const provider = createTwilioWhatsAppProvider({
      config: {
        accountSid: "ACtest",
        authToken: "secret-token",
        from: "whatsapp:+14155550100",
        contentSids: { appointment_confirmed: "HXconfirmed" },
      },
      timeoutMs: 40,
      httpClient: async (input) => {
        assert.equal(input.authorizationPresent, true);
        assert.equal(input.idempotencyKey, "delivery-sid");
        assert.doesNotMatch(input.body, /secret-token/);
        if (input.body.includes("HXconfirmed")) {
          return { status: 201, json: { sid: "SMmessage1" } };
        }
        return { status: 400, json: { code: 63016 } };
      },
    });
    const sent = await provider.sendTemplateMessage({
      toE164: "+919876543210",
      templateKey: "appointment_confirmed",
      variables: {
        patientName: "Asha",
        appointmentTypeName: "Test consultation",
        appointmentDate: "17 August 2026",
        appointmentTime: "10:00",
        timezone: "Asia/Kolkata",
        appointmentPublicId: "APT-1",
      },
      idempotencyKey: "delivery-sid",
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) {
      return;
    }
    assert.equal(sent.providerMessageId, "SMmessage1");
  });

  it("classifies Twilio 429, 5xx, timeout, and invalid recipient", async () => {
    const cases: Array<{
      status: number;
      json: Record<string, unknown>;
      code: string;
    }> = [
      { status: 429, json: {}, code: "RATE_LIMITED" },
      { status: 503, json: {}, code: "PROVIDER_5XX" },
      { status: 0, json: { error: "timeout" }, code: "TIMEOUT" },
      { status: 400, json: { code: 21211 }, code: "INVALID_RECIPIENT" },
      { status: 401, json: { code: 20003 }, code: "AUTHENTICATION_ERROR" },
    ];
    for (const item of cases) {
      const provider = createTwilioWhatsAppProvider({
        config: {
          accountSid: "ACtest",
          authToken: "secret-token",
          from: "+14155550100",
          contentSids: { appointment_cancelled: "HXcancelled" },
        },
        timeoutMs: 40,
        httpClient: async () => ({ status: item.status, json: item.json }),
      });
      const result = await provider.sendTemplateMessage({
        toE164: "+919876543210",
        templateKey: "appointment_cancelled",
        variables: {
          patientName: "Asha",
          appointmentDate: "17 August 2026",
          appointmentTime: "10:00",
          timezone: "Asia/Kolkata",
          practiceName: "Dr. Vandana Rajiv Chaudhary",
        },
        idempotencyKey: `case-${item.code}`,
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, item.code);
    }
  });

  it("does not send when the Twilio content SID is missing", async () => {
    const provider = createTwilioWhatsAppProvider({
      config: {
        accountSid: "ACtest",
        authToken: "secret-token",
        from: "whatsapp:+14155550100",
        contentSids: {},
      },
      timeoutMs: 40,
      httpClient: async () => {
        throw new Error("should_not_call_http");
      },
    });
    const result = await provider.sendTemplateMessage({
      toE164: "+919876543210",
      templateKey: "appointment_confirmed",
      variables: { patientName: "Asha" },
      idempotencyKey: "missing-template",
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "MISSING_TEMPLATE");
  });

  it("keeps a forbidden email sender fail-closed", async () => {
    const sender = createForbiddenEmailSender();
    const result = await sender.send({
      to: "patient@example.test",
      subject: "Appointment update from Dr. Vandana",
      text: "Hello",
      html: "<p>Hello</p>",
      idempotencyKey: "email-1",
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.equal(result.code, "EMAIL_PROVIDER_FORBIDDEN");
  });
});

import type { EmailService } from "@/lib/identity/email-service";
import { emailOtpContent } from "@/lib/identity/email-service";
import type {
  OtpDeliveryProvider,
  OtpDeliveryResult,
} from "@/lib/identity/otp-types";
import { logStructured } from "@/lib/observability/logger";

/**
 * Email OTP delivery via authenticated SMTP (Gmail App Password when host is smtp.gmail.com).
 * Uses the shared identity EmailService — does not invent a second mail stack.
 */
export function createSmtpEmailOtpProvider(input: {
  email: EmailService;
  expiryMinutes?: number;
}): OtpDeliveryProvider {
  const expiryMinutes = input.expiryMinutes ?? 5;
  return {
    id: "smtp_email_otp",
    testOnly: false,
    async deliver(params): Promise<OtpDeliveryResult> {
      if (params.channel !== "EMAIL") {
        return { ok: false, reason: "channel_unsupported" };
      }
      const content = emailOtpContent({
        purpose: params.purpose,
        code: params.code,
        expiryMinutes,
      });
      const sent = await input.email.send({
        ...content,
        to: params.destination,
      });
      if (!sent.ok) {
        logStructured("ERROR", {
          operation: "identityOtpEmailDeliver",
          errorType:
            sent.reason === "not_configured"
              ? "smtp_not_configured"
              : "smtp_provider_error",
        });
        return {
          ok: false,
          reason:
            sent.reason === "not_configured" ? "unconfigured" : "provider_error",
        };
      }
      return { ok: true };
    },
  };
}

export function createTestEmailOtpProvider(): OtpDeliveryProvider & {
  peekLastCode: (destination: string) => string | undefined;
  messages: Array<{ destination: string; code: string }>;
} {
  const messages: Array<{ destination: string; code: string }> = [];
  return {
    id: "test_email_otp",
    testOnly: true,
    messages,
    async deliver(params) {
      if (params.channel !== "EMAIL") {
        return { ok: false, reason: "channel_unsupported" };
      }
      messages.push({ destination: params.destination, code: params.code });
      return { ok: true };
    },
    peekLastCode(destination) {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.destination === destination) {
          return messages[index]?.code;
        }
      }
      return undefined;
    },
  };
}

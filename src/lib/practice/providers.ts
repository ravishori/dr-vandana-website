import { createHash, randomInt } from "node:crypto";

import { practiceConfig } from "@/config/practice";

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, "0");
}

export interface OtpDeliveryProvider {
  readonly name: string;
  sendOtp(mobile: string, code: string): Promise<{ mocked: boolean }>;
}

/** CONFIGURATION REQUIRED — replace with SMS/WhatsApp OTP vendor. */
export class MockOtpProvider implements OtpDeliveryProvider {
  readonly name = "mock";
  async sendOtp(mobile: string, _code: string): Promise<{ mocked: boolean }> {
    // Never log OTP values.
    void mobile;
    void _code;
    return { mocked: true };
  }
}

export function getOtpProvider(): OtpDeliveryProvider {
  if (practiceConfig.otpProvider === "mock") {
    return new MockOtpProvider();
  }
  // Unknown providers fall back to mock until configured.
  return new MockOtpProvider();
}

export interface WhatsAppProvider {
  readonly name: string;
  sendTransactional(
    mobile: string,
    templateKey: string,
    variables: Record<string, string>,
  ): Promise<{ mocked: boolean; ok: boolean }>;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";
  async sendTransactional(): Promise<{ mocked: boolean; ok: boolean }> {
    return { mocked: true, ok: true };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new MockWhatsAppProvider();
}

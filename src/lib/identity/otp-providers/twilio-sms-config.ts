/**
 * Twilio SMS OTP configuration (server-only).
 * Canonical sender env: TWILIO_FROM_NUMBER
 * Alias: TWILIO_PHONE_NUMBER (same meaning — Messaging "From")
 * Never log Auth Token, Account SID values, or OTP codes.
 */

export type TwilioSmsConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export type TwilioSmsConfigResult =
  | { ok: true; config: TwilioSmsConfig }
  | { ok: false; reason: "missing_config" };

function readNonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * Resolve Twilio SMS sender. Prefer TWILIO_FROM_NUMBER; accept TWILIO_PHONE_NUMBER
 * as a backward-compatible alias. Both refer to the Messaging API From number —
 * not WhatsApp (TWILIO_WHATSAPP_FROM).
 */
export function resolveTwilioSmsFromNumber(): string | undefined {
  return (
    readNonEmptyEnv("TWILIO_FROM_NUMBER") ??
    readNonEmptyEnv("TWILIO_PHONE_NUMBER")
  );
}

export function loadTwilioSmsConfig(): TwilioSmsConfigResult {
  const accountSid = readNonEmptyEnv("TWILIO_ACCOUNT_SID");
  const authToken = readNonEmptyEnv("TWILIO_AUTH_TOKEN");
  const fromNumber = resolveTwilioSmsFromNumber();
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, reason: "missing_config" };
  }
  if (!fromNumber.startsWith("+") || fromNumber.length < 8) {
    return { ok: false, reason: "missing_config" };
  }
  return {
    ok: true,
    config: { accountSid, authToken, fromNumber },
  };
}

export function getTwilioSmsConfigurationStatus():
  | { status: "TWILIO CONFIGURED" }
  | { status: "TWILIO NOT CONFIGURED" } {
  return loadTwilioSmsConfig().ok
    ? { status: "TWILIO CONFIGURED" }
    : { status: "TWILIO NOT CONFIGURED" };
}

export function isTwilioSmsOtpConfigured(): boolean {
  return loadTwilioSmsConfig().ok;
}

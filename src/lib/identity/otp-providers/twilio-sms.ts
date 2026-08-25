import {
  loadTwilioSmsConfig,
  type TwilioSmsConfig,
} from "@/lib/identity/otp-providers/twilio-sms-config";
import type {
  OtpDeliveryProvider,
  OtpDeliveryResult,
  OtpPurpose,
} from "@/lib/identity/otp-types";
import { withTimeout } from "@/lib/notifications/timing";
import { logStructured } from "@/lib/observability/logger";

export type TwilioSmsHttpResponse = {
  status: number;
  code?: number;
  message?: string;
};

export type TwilioSmsHttpClient = (input: {
  url: string;
  body: string;
  authorizationHeader: string;
  timeoutMs: number;
}) => Promise<TwilioSmsHttpResponse>;

const TRIAL_UNVERIFIED_CODES = new Set([21265, 21608, 21614]);

export type TwilioSmsFailureReason =
  | "unconfigured"
  | "provider_error"
  | "invalid_destination"
  | "trial_unverified_destination"
  | "authentication_error"
  | "rate_limited"
  | "timeout";

export type TwilioSmsDeliveryResult =
  | { ok: true }
  | { ok: false; reason: TwilioSmsFailureReason };

function classifyTwilioSmsFailure(
  status: number,
  code: number | undefined,
): TwilioSmsFailureReason {
  if (status === 0) {
    return "timeout";
  }
  if (status === 401 || status === 403 || code === 20003 || code === 20005) {
    return "authentication_error";
  }
  if (status === 429 || code === 20429) {
    return "rate_limited";
  }
  if (code && TRIAL_UNVERIFIED_CODES.has(code)) {
    return "trial_unverified_destination";
  }
  if (code === 21211 || code === 21614 || code === 21408) {
    return "invalid_destination";
  }
  return "provider_error";
}

export async function defaultTwilioSmsHttpClient(input: {
  url: string;
  body: string;
  authorizationHeader: string;
  timeoutMs: number;
}): Promise<TwilioSmsHttpResponse> {
  const raced = await withTimeout(
    fetch(input.url, {
      method: "POST",
      headers: {
        Authorization: input.authorizationHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: input.body,
    }).then(async (response) => {
      let json: Record<string, unknown> = {};
      try {
        json = (await response.json()) as Record<string, unknown>;
      } catch {
        json = {};
      }
      const code =
        typeof json.code === "number"
          ? json.code
          : typeof json.error_code === "number"
            ? json.error_code
            : undefined;
      const message =
        typeof json.message === "string" ? json.message : undefined;
      return { status: response.status, code, message };
    }),
    input.timeoutMs,
  );
  if (raced.timedOut) {
    return { status: 0, message: "timeout" };
  }
  return raced.value;
}

function otpSmsBody(purpose: OtpPurpose, code: string, expiryMinutes: number): string {
  const label =
    purpose === "PHONE_VERIFY"
      ? "verification"
      : purpose === "PHONE_LOGIN"
        ? "login"
        : "security";
  return [
    `Dr. Vandana Rajiv Chaudhary — Psychologist`,
    `Your ${label} code is ${code}.`,
    `It expires in ${expiryMinutes} minutes.`,
    `If you did not request this code, ignore this message.`,
  ].join("\n");
}

export function createTwilioSmsOtpProvider(input?: {
  config?: TwilioSmsConfig;
  httpClient?: TwilioSmsHttpClient;
  timeoutMs?: number;
  expiryMinutes?: number;
}): OtpDeliveryProvider & {
  lastFailureReason?: () => TwilioSmsFailureReason | undefined;
} {
  let lastFailure: TwilioSmsFailureReason | undefined;
  const timeoutMs = input?.timeoutMs ?? 15_000;
  const expiryMinutes = input?.expiryMinutes ?? 5;
  const httpClient = input?.httpClient ?? defaultTwilioSmsHttpClient;

  return {
    id: "twilio_sms",
    testOnly: false,
    lastFailureReason: () => lastFailure,
    async deliver(params): Promise<OtpDeliveryResult> {
      lastFailure = undefined;
      if (params.channel !== "SMS") {
        lastFailure = "provider_error";
        return { ok: false, reason: "provider_error" };
      }
      const loaded = input?.config
        ? { ok: true as const, config: input.config }
        : loadTwilioSmsConfig();
      if (!loaded.ok) {
        lastFailure = "unconfigured";
        logStructured("ERROR", {
          operation: "identityOtpSmsDeliver",
          errorType: "twilio_sms_not_configured",
        });
        return { ok: false, reason: "unconfigured" };
      }

      const { accountSid, authToken, fromNumber } = loaded.config;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
      const body = new URLSearchParams({
        To: params.destination,
        From: fromNumber,
        Body: otpSmsBody(params.purpose, params.code, expiryMinutes),
      }).toString();

      try {
        const response = await httpClient({
          url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
          body,
          authorizationHeader: authHeader,
          timeoutMs,
        });
        if (response.status >= 200 && response.status < 300) {
          return { ok: true };
        }
        const reason = classifyTwilioSmsFailure(response.status, response.code);
        lastFailure = reason;
        logStructured("ERROR", {
          operation: "identityOtpSmsDeliver",
          errorType:
            reason === "trial_unverified_destination"
              ? "twilio_trial_unverified_destination"
              : `twilio_sms_${reason}`,
          httpStatus: response.status,
          providerCode:
            typeof response.code === "number" ? response.code : undefined,
        });
        return { ok: false, reason: "provider_error" };
      } catch {
        lastFailure = "provider_error";
        logStructured("ERROR", {
          operation: "identityOtpSmsDeliver",
          errorType: "twilio_sms_network_error",
        });
        return { ok: false, reason: "provider_error" };
      }
    },
  };
}

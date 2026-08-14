import {
  loadTwilioWhatsAppConfig,
  resolveWhatsAppProviderMode,
  type IdentityNodeEnv,
  type TwilioWhatsAppConfig,
} from "@/lib/notifications/config";
import { classifyHttpStatus, type NotificationSendResult } from "@/lib/notifications/errors";
import { numberedContentVariables } from "@/lib/notifications/templates";
import { withTimeout } from "@/lib/notifications/timing";
import {
  createDisabledWhatsAppService,
  createForbiddenWhatsAppService,
  createTestWhatsAppService,
  createUnconfiguredWhatsAppService,
  type WhatsAppService,
  type WhatsAppTemplateMessageInput,
} from "@/lib/notifications/whatsapp";
import { logStructured } from "@/lib/observability/logger";

export type TwilioHttpResponse = {
  status: number;
  json: Record<string, unknown>;
};

export type TwilioHttpClient = (input: {
  url: string;
  body: string;
  authorizationPresent: boolean;
  idempotencyKey: string;
  timeoutMs: number;
}) => Promise<TwilioHttpResponse>;

const TWILIO_PERMANENT_CODES = new Set([
  20003, 20005, 21211, 21408, 21606, 21610, 21612, 21614, 63016, 63032, 21617,
]);

function normalizeWhatsAppAddress(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("whatsapp:")) {
    return trimmed;
  }
  return `whatsapp:${trimmed}`;
}

function classifyTwilioError(
  status: number,
  code: number | undefined,
): Extract<NotificationSendResult, { ok: false }> {
  if (code === 20429 || status === 429) {
    return { ok: false, category: "TRANSIENT", code: "RATE_LIMITED" };
  }
  if (code && TWILIO_PERMANENT_CODES.has(code)) {
    if (code === 20003 || code === 20005) {
      return { ok: false, category: "PERMANENT", code: "AUTHENTICATION_ERROR" };
    }
    if (code === 21211 || code === 21614 || code === 21610) {
      return { ok: false, category: "PERMANENT", code: "INVALID_RECIPIENT" };
    }
    if (code === 63016 || code === 63032 || code === 21617) {
      return { ok: false, category: "PERMANENT", code: "INVALID_TEMPLATE" };
    }
    return { ok: false, category: "PERMANENT", code: "PERMANENT_PROVIDER_ERROR" };
  }
  const classified = classifyHttpStatus(status);
  return { ok: false, category: classified.category, code: classified.code };
}

export async function defaultTwilioHttpClient(input: {
  url: string;
  body: string;
  authorizationHeader: string;
  idempotencyKey: string;
  timeoutMs: number;
}): Promise<TwilioHttpResponse> {
  const raced = await withTimeout(
    fetch(input.url, {
      method: "POST",
      headers: {
        Authorization: input.authorizationHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        "I-Twilio-Idempotency-Token": input.idempotencyKey,
      },
      body: input.body,
    }).then(async (response) => {
      let json: Record<string, unknown> = {};
      try {
        json = (await response.json()) as Record<string, unknown>;
      } catch {
        json = {};
      }
      return { status: response.status, json };
    }),
    input.timeoutMs,
  );
  if (raced.timedOut) {
    return { status: 0, json: { error: "timeout" } };
  }
  return raced.value;
}

export function createTwilioWhatsAppProvider(input: {
  config: TwilioWhatsAppConfig;
  timeoutMs: number;
  httpClient?: TwilioHttpClient;
}): WhatsAppService {
  const httpClient = input.httpClient;
  const timeoutMs = input.timeoutMs;
  const accountSid = input.config.accountSid;
  const authToken = input.config.authToken;
  const from = normalizeWhatsAppAddress(input.config.from);
  const contentSids = input.config.contentSids;

  return {
    id: "twilio",
    testOnly: false,
    async sendTemplateMessage(message: WhatsAppTemplateMessageInput) {
      const contentSid = contentSids[message.templateKey];
      if (!contentSid) {
        return { ok: false, category: "PERMANENT", code: "MISSING_TEMPLATE" };
      }
      const numbered = numberedContentVariables(
        message.templateKey,
        message.variables,
      );
      const missingNumbered = Object.values(numbered).some(
        (value) => value.trim().length === 0,
      );
      if (missingNumbered) {
        return { ok: false, category: "PERMANENT", code: "MISSING_VARIABLE" };
      }
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
      const body = new URLSearchParams({
        To: normalizeWhatsAppAddress(message.toE164),
        From: from,
        ContentSid: contentSid,
        ContentVariables: JSON.stringify(numbered),
      }).toString();
      const started = Date.now();
      try {
        let response: TwilioHttpResponse;
        if (httpClient) {
          response = await httpClient({
            url,
            body,
            authorizationPresent: true,
            idempotencyKey: message.idempotencyKey,
            timeoutMs,
          });
        } else {
          const authorizationHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
          response = await defaultTwilioHttpClient({
            url,
            body,
            authorizationHeader,
            idempotencyKey: message.idempotencyKey,
            timeoutMs,
          });
        }
        logStructured("INFO", {
          operation: "twilioWhatsAppSend",
          templateKey: message.templateKey,
          httpStatus: response.status === 0 ? "timeout" : response.status,
          durationMs: Date.now() - started,
        });
        if (response.status === 0) {
          return { ok: false, category: "TRANSIENT", code: "TIMEOUT" };
        }
        if (response.status >= 200 && response.status < 300) {
          const sid =
            typeof response.json.sid === "string" ? response.json.sid : undefined;
          return { ok: true, providerMessageId: sid };
        }
        const code =
          typeof response.json.code === "number" ? response.json.code : undefined;
        const classified = classifyTwilioError(response.status, code);
        logStructured("WARNING", {
          operation: "twilioWhatsAppSend",
          errorCode: classified.code,
          providerCode: code,
          httpStatus: response.status,
        });
        return classified;
      } catch {
        logStructured("ERROR", {
          operation: "twilioWhatsAppSend",
          errorCode: "CONNECTION_FAILURE",
        });
        return { ok: false, category: "TRANSIENT", code: "CONNECTION_FAILURE" };
      }
    },
  };
}

export function createWhatsAppServiceForRuntime(input: {
  nodeEnv: IdentityNodeEnv;
  timeoutMs: number;
  httpClient?: TwilioHttpClient;
  testService?: WhatsAppService;
}): WhatsAppService {
  const sandbox = process.env.TWILIO_WHATSAPP_SANDBOX?.trim().toLowerCase() === "true";
  if (sandbox && input.nodeEnv === "production") {
    return createForbiddenWhatsAppService("WHATSAPP_SANDBOX_FORBIDDEN");
  }
  const mode = resolveWhatsAppProviderMode(input.nodeEnv);
  if (mode === "test") {
    if (input.nodeEnv === "production") {
      return createForbiddenWhatsAppService();
    }
    return input.testService ?? createTestWhatsAppService();
  }
  if (mode === "disabled") {
    return createDisabledWhatsAppService();
  }
  if (mode === "twilio") {
    const config = loadTwilioWhatsAppConfig();
    if (!config) {
      return createUnconfiguredWhatsAppService();
    }
    if (sandbox && input.nodeEnv !== "production") {
      return createTwilioWhatsAppProvider({
        config,
        timeoutMs: input.timeoutMs,
        httpClient: input.httpClient,
      });
    }
    return createTwilioWhatsAppProvider({
      config,
      timeoutMs: input.timeoutMs,
      httpClient: input.httpClient,
    });
  }
  return createUnconfiguredWhatsAppService();
}

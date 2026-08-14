import type { NotificationSendResult } from "@/lib/notifications/errors";
import type { WhatsAppTemplateKey } from "@/lib/notifications/constants";

export type WhatsAppTemplateMessageInput = {
  toE164: string;
  templateKey: WhatsAppTemplateKey;
  variables: Record<string, string>;
  idempotencyKey: string;
};

export type WhatsAppService = {
  readonly id: string;
  readonly testOnly: boolean;
  sendTemplateMessage: (
    input: WhatsAppTemplateMessageInput,
  ) => Promise<NotificationSendResult>;
};

export function createUnconfiguredWhatsAppService(): WhatsAppService {
  return {
    id: "unconfigured",
    testOnly: false,
    async sendTemplateMessage() {
      return { ok: false, category: "PERMANENT", code: "WHATSAPP_NOT_CONFIGURED" };
    },
  };
}

export function createDisabledWhatsAppService(): WhatsAppService {
  return {
    id: "disabled",
    testOnly: false,
    async sendTemplateMessage() {
      return { ok: false, category: "PERMANENT", code: "WHATSAPP_DISABLED" };
    },
  };
}

export function createForbiddenWhatsAppService(
  code: "WHATSAPP_PROVIDER_FORBIDDEN" | "WHATSAPP_SANDBOX_FORBIDDEN" = "WHATSAPP_PROVIDER_FORBIDDEN",
): WhatsAppService {
  return {
    id: "forbidden",
    testOnly: true,
    async sendTemplateMessage() {
      return { ok: false, category: "PERMANENT", code };
    },
  };
}

export function createTestWhatsAppService(): WhatsAppService & {
  sent: WhatsAppTemplateMessageInput[];
  calls: number;
  nextResults: NotificationSendResult[];
} {
  const sent: WhatsAppTemplateMessageInput[] = [];
  const seen = new Map<string, NotificationSendResult>();
  const nextResults: NotificationSendResult[] = [];
  let calls = 0;
  return {
    id: "test",
    testOnly: true,
    sent,
    nextResults,
    get calls() {
      return calls;
    },
    async sendTemplateMessage(input) {
      calls += 1;
      const previous = seen.get(input.idempotencyKey);
      if (previous) {
        return previous;
      }
      sent.push(input);
      const next = nextResults.shift() ?? { ok: true, providerMessageId: `test-${input.idempotencyKey}` };
      seen.set(input.idempotencyKey, next);
      return next;
    },
  };
}

export function assertWhatsAppProviderAllowed(
  provider: WhatsAppService,
  nodeEnv: string,
): NotificationSendResult | null {
  if (nodeEnv === "production" && provider.testOnly) {
    return { ok: false, category: "PERMANENT", code: "WHATSAPP_PROVIDER_FORBIDDEN" };
  }
  return null;
}

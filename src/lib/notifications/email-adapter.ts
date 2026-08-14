import type { EmailService } from "@/lib/identity/email-service";
import {
  resolveEmailProviderMode,
  type IdentityNodeEnv,
} from "@/lib/notifications/config";
import type { NotificationSendResult } from "@/lib/notifications/errors";
import { withTimeout } from "@/lib/notifications/timing";

export type AppointmentEmailSendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type ClassifiedEmailSender = {
  readonly id: string;
  readonly testOnly: boolean;
  send: (input: AppointmentEmailSendInput) => Promise<NotificationSendResult>;
};

export function createIdentityClassifiedEmailSender(
  email: EmailService,
  timeoutMs: number,
): ClassifiedEmailSender {
  return {
    id: "smtp",
    testOnly: false,
    async send(input) {
      const raced = await withTimeout(
        email.send({
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
        timeoutMs,
      );
      if (raced.timedOut) {
        return { ok: false, category: "TRANSIENT", code: "TIMEOUT" };
      }
      if (raced.value.ok) {
        return { ok: true };
      }
      if (raced.value.reason === "not_configured") {
        return { ok: false, category: "PERMANENT", code: "EMAIL_NOT_CONFIGURED" };
      }
      if (raced.value.reason === "test_only") {
        return { ok: false, category: "PERMANENT", code: "EMAIL_PROVIDER_FORBIDDEN" };
      }
      return { ok: false, category: "TRANSIENT", code: "PROVIDER_UNAVAILABLE" };
    },
  };
}

export function createUnconfiguredEmailSender(): ClassifiedEmailSender {
  return {
    id: "unconfigured",
    testOnly: false,
    async send() {
      return { ok: false, category: "PERMANENT", code: "EMAIL_NOT_CONFIGURED" };
    },
  };
}

export function createForbiddenEmailSender(): ClassifiedEmailSender {
  return {
    id: "forbidden",
    testOnly: true,
    async send() {
      return { ok: false, category: "PERMANENT", code: "EMAIL_PROVIDER_FORBIDDEN" };
    },
  };
}

export function createScriptedEmailSender(
  results: NotificationSendResult[],
): ClassifiedEmailSender & { sent: AppointmentEmailSendInput[]; calls: number } {
  const sent: AppointmentEmailSendInput[] = [];
  let calls = 0;
  const seen = new Set<string>();
  return {
    id: "test",
    testOnly: true,
    sent,
    get calls() {
      return calls;
    },
    async send(input) {
      calls += 1;
      sent.push(input);
      if (seen.has(input.idempotencyKey) && results.some((item) => item.ok)) {
        return { ok: true };
      }
      const next = results.shift();
      if (!next) {
        return { ok: true };
      }
      if (next.ok) {
        seen.add(input.idempotencyKey);
      }
      return next;
    },
  };
}

export function createRecordingEmailSender(): ClassifiedEmailSender & {
  sent: AppointmentEmailSendInput[];
} {
  const sent: AppointmentEmailSendInput[] = [];
  const seen = new Set<string>();
  return {
    id: "test",
    testOnly: true,
    sent,
    async send(input) {
      if (seen.has(input.idempotencyKey)) {
        return { ok: true };
      }
      seen.add(input.idempotencyKey);
      sent.push(input);
      return { ok: true };
    },
  };
}

export function resolveAppointmentEmailSender(input: {
  nodeEnv: IdentityNodeEnv;
  email: EmailService;
  timeoutMs: number;
}): ClassifiedEmailSender {
  const mode = resolveEmailProviderMode(input.nodeEnv);
  if (mode === "forbidden") {
    return createForbiddenEmailSender();
  }
  return createIdentityClassifiedEmailSender(input.email, input.timeoutMs);
}

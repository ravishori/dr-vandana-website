import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationDispatcherSettings,
} from "@/lib/notifications/constants";

export type IdentityNodeEnv = "development" | "test" | "production";

export type WhatsAppProviderMode =
  | "unconfigured"
  | "disabled"
  | "twilio"
  | "test";

export type EmailProviderMode = "smtp" | "unconfigured" | "forbidden";

export type TwilioWhatsAppConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  contentSids: Partial<Record<string, string>>;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readBoolEnv(name: string, fallback = false): boolean {
  const value = readEnv(name)?.toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBackoffMs(fallback: readonly number[]): number[] {
  const raw = readEnv("NOTIFICATION_BACKOFF_MS");
  if (!raw) {
    return [...fallback];
  }
  const parsed = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 0);
  return parsed.length > 0 ? parsed : [...fallback];
}

export function resolveEmailProviderMode(
  nodeEnv: IdentityNodeEnv,
  provider = readEnv("EMAIL_PROVIDER"),
): EmailProviderMode {
  const normalized = provider?.toLowerCase();
  if (nodeEnv === "production") {
    if (!normalized || normalized === "test" || normalized === "mock") {
      return normalized === "test" || normalized === "mock"
        ? "forbidden"
        : "smtp";
    }
    if (normalized === "smtp") {
      return "smtp";
    }
    return "forbidden";
  }
  if (normalized === "test" || normalized === "mock") {
    return "forbidden";
  }
  return "smtp";
}

export function resolveWhatsAppProviderMode(
  nodeEnv: IdentityNodeEnv,
  input?: {
    provider?: string;
    enabled?: boolean;
    sandbox?: boolean;
  },
): WhatsAppProviderMode {
  const provider = (input?.provider ?? readEnv("WHATSAPP_PROVIDER") ?? "")
    .trim()
    .toLowerCase();
  const enabled =
    input?.enabled ?? readBoolEnv("TWILIO_WHATSAPP_ENABLED", false);
  const sandbox = input?.sandbox ?? readBoolEnv("TWILIO_WHATSAPP_SANDBOX", false);

  if (
    provider === "test" ||
    provider === "mock" ||
    provider === "sandbox"
  ) {
    if (nodeEnv === "production") {
      return "unconfigured";
    }
    if (provider === "test" || provider === "mock") {
      return "test";
    }
  }
  if (sandbox && nodeEnv === "production") {
    return "unconfigured";
  }
  if (!enabled) {
    return "disabled";
  }
  if (provider === "twilio" || provider === "") {
    return enabled ? "twilio" : "disabled";
  }
  if (nodeEnv === "production") {
    return "unconfigured";
  }
  return "unconfigured";
}

export function loadTwilioWhatsAppConfig(): TwilioWhatsAppConfig | null {
  const accountSid = readEnv("TWILIO_ACCOUNT_SID");
  const authToken = readEnv("TWILIO_AUTH_TOKEN");
  const from = readEnv("TWILIO_WHATSAPP_FROM");
  if (!accountSid || !authToken || !from) {
    return null;
  }
  return {
    accountSid,
    authToken,
    from,
    contentSids: {
      appointment_requested: readEnv("TWILIO_TEMPLATE_APPOINTMENT_REQUESTED"),
      appointment_requested_psychologist: readEnv(
        "TWILIO_TEMPLATE_APPOINTMENT_REQUESTED_PSYCHOLOGIST",
      ),
      appointment_confirmed: readEnv("TWILIO_TEMPLATE_APPOINTMENT_CONFIRMED"),
      appointment_rejected: readEnv("TWILIO_TEMPLATE_APPOINTMENT_REJECTED"),
      appointment_cancelled: readEnv("TWILIO_TEMPLATE_APPOINTMENT_CANCELLED"),
      appointment_cancelled_psychologist: readEnv(
        "TWILIO_TEMPLATE_APPOINTMENT_CANCELLED_PSYCHOLOGIST",
      ),
      appointment_reschedule_requested: readEnv(
        "TWILIO_TEMPLATE_APPOINTMENT_RESCHEDULE_REQUESTED",
      ),
      appointment_reschedule_requested_psychologist: readEnv(
        "TWILIO_TEMPLATE_APPOINTMENT_RESCHEDULE_REQUESTED_PSYCHOLOGIST",
      ),
      appointment_rescheduled: readEnv("TWILIO_TEMPLATE_APPOINTMENT_RESCHEDULED"),
      appointment_completed: readEnv("TWILIO_TEMPLATE_APPOINTMENT_COMPLETED"),
      appointment_no_show: readEnv("TWILIO_TEMPLATE_APPOINTMENT_NO_SHOW"),
    },
  };
}

export function loadNotificationDispatcherSettings(
  overrides: Partial<NotificationDispatcherSettings> = {},
): NotificationDispatcherSettings {
  const defaults = DEFAULT_NOTIFICATION_SETTINGS;
  return {
    maxAttempts:
      overrides.maxAttempts ??
      readIntEnv("NOTIFICATION_MAX_ATTEMPTS", defaults.maxAttempts),
    backoffMs: overrides.backoffMs ?? readBackoffMs(defaults.backoffMs),
    leaseMs: overrides.leaseMs ?? readIntEnv("NOTIFICATION_LEASE_MS", defaults.leaseMs),
    batchSize:
      overrides.batchSize ??
      readIntEnv("NOTIFICATION_BATCH_SIZE", defaults.batchSize),
    providerTimeoutMs:
      overrides.providerTimeoutMs ??
      readIntEnv("NOTIFICATION_PROVIDER_TIMEOUT_MS", defaults.providerTimeoutMs),
    completedEmailEnabled:
      overrides.completedEmailEnabled ??
      readBoolEnv("NOTIFICATION_COMPLETED_EMAIL", defaults.completedEmailEnabled),
    noShowEmailEnabled:
      overrides.noShowEmailEnabled ??
      readBoolEnv("NOTIFICATION_NO_SHOW_EMAIL", defaults.noShowEmailEnabled),
    expandBatchSize:
      overrides.expandBatchSize ??
      readIntEnv("NOTIFICATION_EXPAND_BATCH_SIZE", defaults.expandBatchSize),
  };
}

export function isTwilioWhatsAppEnabled(
  nodeEnv: IdentityNodeEnv,
): boolean {
  return resolveWhatsAppProviderMode(nodeEnv) === "twilio";
}

import type { IdentityContext } from "@/lib/identity/context";
import {
  loadNotificationDispatcherSettings,
  resolveWhatsAppProviderMode,
} from "@/lib/notifications/config";
import { createDatabaseConsentReader } from "@/lib/notifications/consent";
import { TEST_NOTIFICATION_SETTINGS } from "@/lib/notifications/constants";
import {
  processNotificationBatch,
  type NotificationBatchStats,
  type NotificationDispatcherDeps,
} from "@/lib/notifications/dispatcher";
import { resolveAppointmentEmailSender } from "@/lib/notifications/email-adapter";
import { createWhatsAppServiceForRuntime } from "@/lib/notifications/twilio-whatsapp";

export function createRuntimeNotificationDeps(
  ctx: IdentityContext,
): NotificationDispatcherDeps {
  const settings =
    ctx.config.nodeEnv === "test"
      ? { ...TEST_NOTIFICATION_SETTINGS }
      : loadNotificationDispatcherSettings();
  const whatsapp = createWhatsAppServiceForRuntime({
    nodeEnv: ctx.config.nodeEnv,
    timeoutMs: settings.providerTimeoutMs,
  });
  const mode = resolveWhatsAppProviderMode(ctx.config.nodeEnv);
  return {
    db: ctx.db,
    now: ctx.now,
    email: resolveAppointmentEmailSender({
      nodeEnv: ctx.config.nodeEnv,
      email: ctx.email,
      timeoutMs: settings.providerTimeoutMs,
    }),
    whatsapp,
    consent: createDatabaseConsentReader(ctx),
    settings,
    nodeEnv: ctx.config.nodeEnv,
    auditCtx: ctx,
    whatsappDispatchEnabled: mode === "twilio" || mode === "test",
  };
}

export async function processDueNotifications(
  ctx: IdentityContext,
): Promise<NotificationBatchStats> {
  return processNotificationBatch(createRuntimeNotificationDeps(ctx));
}

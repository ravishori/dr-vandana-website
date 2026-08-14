import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  appointmentNotificationAttempts,
  appointmentNotificationDeliveries,
  appointmentNotificationOutbox,
  appointments,
  appointmentTypes,
} from "@/lib/appointments/schema";
import type { OutboxEventKey } from "@/lib/appointments/constants";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import { appendAuditLog } from "@/lib/identity/audit";
import type { IdentityContext } from "@/lib/identity/context";
import { generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";
import { patientProfiles, psychologistProfiles, users } from "@/lib/identity/schema";
import { logStructured } from "@/lib/observability/logger";
import {
  plannedDeliveriesForEvent,
  type NotificationDispatcherSettings,
  type PlannedDelivery,
} from "@/lib/notifications/constants";
import type { NotificationConsentReader } from "@/lib/notifications/consent";
import type { ClassifiedEmailSender } from "@/lib/notifications/email-adapter";
import type { NotificationErrorCode, NotificationSendResult } from "@/lib/notifications/errors";
import {
  defaultPracticeName,
  formatPracticeDate,
  formatPracticeTime,
  renderNotificationTemplate,
  type NotificationTemplateVariables,
} from "@/lib/notifications/templates";
import { executeRows, nextRetryAt } from "@/lib/notifications/timing";
import {
  assertWhatsAppProviderAllowed,
  type WhatsAppService,
} from "@/lib/notifications/whatsapp";

export type NotificationDispatcherDeps = {
  db: IdentityDb;
  now: () => Date;
  email: ClassifiedEmailSender;
  whatsapp: WhatsAppService;
  consent: NotificationConsentReader;
  settings: NotificationDispatcherSettings;
  nodeEnv: string;
  auditCtx?: IdentityContext;
  whatsappDispatchEnabled: boolean;
};

export type NotificationBatchStats = {
  expanded: number;
  claimed: number;
  sent: number;
  retry: number;
  dead: number;
  skipped: number;
};

const patientUsers = alias(users, "notification_patient_users");
const psychologistUsers = alias(users, "notification_psychologist_users");

function emptyStats(): NotificationBatchStats {
  return {
    expanded: 0,
    claimed: 0,
    sent: 0,
    retry: 0,
    dead: 0,
    skipped: 0,
  };
}

function asId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function processNotificationBatch(
  deps: NotificationDispatcherDeps,
): Promise<NotificationBatchStats> {
  const stats = emptyStats();
  stats.expanded = await expandDueOutbox(deps);
  const claimed = await claimDeliveries(deps);
  stats.claimed = claimed.length;
  for (const item of claimed) {
    try {
      const result = await processClaimedDelivery(deps, item.id, item.lockedAt);
      stats[result] += 1;
    } catch {
      logStructured("ERROR", {
        operation: "notificationDispatch",
        errorType: "isolated_delivery_failure",
      });
    }
  }
  logStructured("INFO", {
    operation: "notificationDispatchBatch",
    pendingExpanded: stats.expanded,
    claimed: stats.claimed,
    sent: stats.sent,
    retry: stats.retry,
    dead: stats.dead,
    skipped: stats.skipped,
  });
  return stats;
}

async function expandDueOutbox(deps: NotificationDispatcherDeps): Promise<number> {
  const now = deps.now();
  const ids = await deps.db.transaction(async (tx) => {
    const selected = await tx.execute(sql`
      SELECT id
      FROM appointment_notification_outbox
      WHERE status IN ('PENDING', 'RETRY')
        AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
      ORDER BY created_at ASC
      LIMIT ${deps.settings.expandBatchSize}
      FOR UPDATE SKIP LOCKED
    `);
    return executeRows(selected)
      .map((row) => asId(row.id))
      .filter((id): id is string => Boolean(id));
  });
  if (ids.length === 0) {
    return 0;
  }
  const rows = await deps.db
    .select()
    .from(appointmentNotificationOutbox)
    .where(inArray(appointmentNotificationOutbox.id, ids));
  let expanded = 0;
  for (const row of rows) {
    const whatsappEnabled = await shouldCreateWhatsAppDelivery(deps, row.appointmentId);
    const planned = plannedDeliveriesForEvent(
      row.eventKey as OutboxEventKey,
      deps.settings,
      { whatsappEnabled },
    );
    if (planned.length === 0) {
      await deps.db
        .update(appointmentNotificationOutbox)
        .set({
          status: "SENT",
          sentAt: now,
          lastErrorCode: "POLICY_SKIPPED",
          updatedAt: now,
        })
        .where(eq(appointmentNotificationOutbox.id, row.id));
      expanded += 1;
      continue;
    }
    await insertPlannedDeliveries(deps, row.id, planned, now);
    expanded += 1;
  }
  return expanded;
}

async function shouldCreateWhatsAppDelivery(
  deps: NotificationDispatcherDeps,
  appointmentId: string | null,
): Promise<boolean> {
  if (!deps.whatsappDispatchEnabled || !appointmentId) {
    return false;
  }
  const [appointment] = await deps.db
    .select({ patientUserId: appointments.patientUserId })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment) {
    return false;
  }
  return deps.consent.hasWhatsAppOptIn(appointment.patientUserId);
}

async function insertPlannedDeliveries(
  deps: NotificationDispatcherDeps,
  outboxId: string,
  planned: PlannedDelivery[],
  now: Date,
): Promise<void> {
  for (const item of planned) {
    try {
      await deps.db
        .insert(appointmentNotificationDeliveries)
        .values({
          id: generateUuid(),
          outboxId,
          channel: item.channel,
          recipientRole: item.recipientRole,
          templateKey: item.templateKey,
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: now,
          lockedAt: null,
          sentAt: null,
          failedAt: null,
          providerMessageId: null,
          lastErrorCode: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    } catch {
      logStructured("ERROR", {
        operation: "notificationExpand",
        errorType: "delivery_insert_failed",
      });
    }
  }
}

export async function claimDeliveries(
  deps: NotificationDispatcherDeps,
): Promise<{ id: string; lockedAt: Date }[]> {
  const now = deps.now();
  const leaseExpired = new Date(now.getTime() - deps.settings.leaseMs);
  return deps.db.transaction(async (tx) => {
    const selected = await tx.execute(sql`
      SELECT id
      FROM appointment_notification_deliveries
      WHERE (
        (
          status IN ('PENDING', 'RETRY')
          AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
        )
        OR (
          status = 'PROCESSING'
          AND locked_at IS NOT NULL
          AND locked_at <= ${leaseExpired}
        )
      )
      ORDER BY created_at ASC
      LIMIT ${deps.settings.batchSize}
      FOR UPDATE SKIP LOCKED
    `);
    const ids = executeRows(selected)
      .map((row) => asId(row.id))
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return [];
    }
    const claimed = await tx
      .update(appointmentNotificationDeliveries)
      .set({
        status: "PROCESSING",
        lockedAt: now,
        updatedAt: now,
      })
      .where(inArray(appointmentNotificationDeliveries.id, ids))
      .returning({
        id: appointmentNotificationDeliveries.id,
        lockedAt: appointmentNotificationDeliveries.lockedAt,
      });
    return claimed
      .filter((row): row is { id: string; lockedAt: Date } => Boolean(row.lockedAt))
      .map((row) => ({ id: row.id, lockedAt: row.lockedAt }));
  });
}

async function processClaimedDelivery(
  deps: NotificationDispatcherDeps,
  deliveryId: string,
  claimedLockedAt: Date,
): Promise<"sent" | "retry" | "dead" | "skipped"> {
  const now = deps.now();
  const [delivery] = await deps.db
    .select()
    .from(appointmentNotificationDeliveries)
    .where(eq(appointmentNotificationDeliveries.id, deliveryId))
    .limit(1);
  if (!delivery) {
    return "skipped";
  }
  if (delivery.status === "SENT" || delivery.status === "DEAD" || delivery.status === "SKIPPED") {
    return delivery.status === "SENT"
      ? "sent"
      : delivery.status === "SKIPPED"
        ? "skipped"
        : "dead";
  }
  if (
    delivery.status !== "PROCESSING" ||
    !delivery.lockedAt ||
    delivery.lockedAt.getTime() !== claimedLockedAt.getTime()
  ) {
    return "skipped";
  }
  const [outbox] = await deps.db
    .select()
    .from(appointmentNotificationOutbox)
    .where(eq(appointmentNotificationOutbox.id, delivery.outboxId))
    .limit(1);
    if (!outbox?.appointmentId) {
    return finalizeDelivery(deps, delivery, claimedLockedAt, {
      result: "DEAD",
      errorCode: "INVALID_REQUEST",
      durationMs: 0,
    });
  }
  const context = await loadDeliveryContext(deps.db, outbox.appointmentId);
  if (!context) {
    return finalizeDelivery(deps, delivery, claimedLockedAt, {
      result: "DEAD",
      errorCode: "INVALID_REQUEST",
      durationMs: 0,
    });
  }
  const skip = await classifySkip(deps, delivery, context);
  if (skip) {
    return finalizeDelivery(deps, delivery, claimedLockedAt, {
      result: "SKIPPED",
      errorCode: skip,
      durationMs: 0,
    });
  }
  const vars = buildTemplateVariables(outbox.eventKey as OutboxEventKey, context);
  const rendered = renderNotificationTemplate(
    delivery.templateKey as Parameters<typeof renderNotificationTemplate>[0],
    vars,
  );
  if (!rendered.ok) {
    return finalizeDelivery(deps, delivery, claimedLockedAt, {
      result: "DEAD",
      errorCode: rendered.code,
      durationMs: 0,
    });
  }
  const started = Date.now();
  let sendResult: NotificationSendResult;
  if (delivery.channel === "EMAIL") {
    const to =
      delivery.recipientRole === "PATIENT"
        ? context.patientEmail
        : context.psychologistEmail;
    sendResult = await deps.email.send({
      to,
      subject: rendered.email.subject,
      text: rendered.email.text,
      html: rendered.email.html,
      idempotencyKey: delivery.id,
    });
  } else {
    const forbidden = assertWhatsAppProviderAllowed(deps.whatsapp, deps.nodeEnv);
    if (forbidden) {
      sendResult = forbidden;
    } else {
      sendResult = await deps.whatsapp.sendTemplateMessage({
        toE164: context.patientMobile,
        templateKey: delivery.templateKey as Parameters<
          WhatsAppService["sendTemplateMessage"]
        >[0]["templateKey"],
        variables: rendered.whatsappVariables,
        idempotencyKey: delivery.id,
      });
    }
  }
  const durationMs = Date.now() - started;
  if (sendResult.ok) {
    const result = await finalizeDelivery(deps, delivery, claimedLockedAt, {
      result: "SENT",
      providerMessageId: sendResult.providerMessageId,
      durationMs,
    });
    logStructured("INFO", {
      operation: "notificationDelivery",
      channel: delivery.channel,
      recipientRole: delivery.recipientRole,
      eventKey: outbox.eventKey,
      durationMs,
    });
    return result;
  }
  const attemptCount = delivery.attemptCount + 1;
  const transient =
    sendResult.category === "TRANSIENT" &&
    attemptCount < deps.settings.maxAttempts;
  if (transient) {
    await deps.db.insert(appointmentNotificationAttempts).values({
      id: generateUuid(),
      deliveryId: delivery.id,
      attemptNumber: attemptCount,
      attemptedAt: now,
      result: "RETRY",
      errorCode: sendResult.code,
      providerMessageId: null,
      durationMs,
    });
    const updated = await deps.db
      .update(appointmentNotificationDeliveries)
      .set({
        status: "RETRY",
        attemptCount,
        nextAttemptAt: nextRetryAt(now, attemptCount, deps.settings.backoffMs),
        lockedAt: null,
        lastErrorCode: sendResult.code,
        updatedAt: now,
      })
      .where(
        and(
          eq(appointmentNotificationDeliveries.id, delivery.id),
          eq(appointmentNotificationDeliveries.status, "PROCESSING"),
          eq(appointmentNotificationDeliveries.lockedAt, claimedLockedAt),
        ),
      )
      .returning({ id: appointmentNotificationDeliveries.id });
    if (updated.length === 0) {
      return "skipped";
    }
    await rollupOutbox(deps, delivery.outboxId);
    logStructured("WARNING", {
      operation: "notificationDelivery",
      channel: delivery.channel,
      recipientRole: delivery.recipientRole,
      eventKey: outbox.eventKey,
      errorCode: sendResult.code,
      durationMs,
      attemptCount,
    });
    return "retry";
  }
  return finalizeDelivery(deps, delivery, claimedLockedAt, {
    result: "DEAD",
    errorCode: sendResult.code,
    durationMs,
  });
}

type DeliveryRow = typeof appointmentNotificationDeliveries.$inferSelect;

type LoadedContext = {
  appointmentPublicId: string;
  startsAt: Date;
  proposedStartsAt: Date | null;
  timezone: string;
  typeName: string;
  patientUserId: string;
  psychologistUserId: string;
  patientEmail: string;
  patientEmailVerified: boolean;
  patientMobile: string;
  patientMobileVerified: boolean;
  patientName: string;
  psychologistEmail: string;
  psychologistEmailVerified: boolean;
};

async function loadDeliveryContext(
  db: IdentityDb,
  appointmentId: string,
): Promise<LoadedContext | null> {
  const [row] = await db
    .select({
      appointmentPublicId: appointments.publicId,
      startsAt: appointments.startsAt,
      proposedStartsAt: appointments.proposedStartsAt,
      timezone: appointments.timezone,
      typeName: appointmentTypes.name,
      patientUserId: appointments.patientUserId,
      psychologistUserId: appointments.psychologistUserId,
      patientEmail: patientUsers.email,
      patientEmailVerifiedAt: patientUsers.emailVerifiedAt,
      patientMobile: patientUsers.mobileNormalized,
      patientMobileVerifiedAt: patientUsers.mobileVerifiedAt,
      patientName: patientProfiles.displayName,
      psychologistEmail: psychologistUsers.email,
      psychologistEmailVerifiedAt: psychologistUsers.emailVerifiedAt,
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointmentTypes.id, appointments.appointmentTypeId))
    .innerJoin(patientUsers, eq(patientUsers.id, appointments.patientUserId))
    .innerJoin(psychologistUsers, eq(psychologistUsers.id, appointments.psychologistUserId))
    .leftJoin(patientProfiles, eq(patientProfiles.userId, appointments.patientUserId))
    .leftJoin(
      psychologistProfiles,
      eq(psychologistProfiles.userId, appointments.psychologistUserId),
    )
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!row) {
    return null;
  }
  return {
    appointmentPublicId: row.appointmentPublicId,
    startsAt: row.startsAt,
    proposedStartsAt: row.proposedStartsAt,
    timezone: row.timezone || PRACTICE_TIMEZONE,
    typeName: row.typeName,
    patientUserId: row.patientUserId,
    psychologistUserId: row.psychologistUserId,
    patientEmail: row.patientEmail,
    patientEmailVerified: Boolean(row.patientEmailVerifiedAt),
    patientMobile: row.patientMobile ?? "",
    patientMobileVerified: Boolean(row.patientMobileVerifiedAt),
    patientName: row.patientName || "there",
    psychologistEmail: row.psychologistEmail,
    psychologistEmailVerified: Boolean(row.psychologistEmailVerifiedAt),
  };
}

async function classifySkip(
  deps: NotificationDispatcherDeps,
  delivery: DeliveryRow,
  context: LoadedContext,
): Promise<NotificationErrorCode | null> {
  if (delivery.channel === "EMAIL") {
    const verified =
      delivery.recipientRole === "PATIENT"
        ? context.patientEmailVerified
        : context.psychologistEmailVerified;
    const email =
      delivery.recipientRole === "PATIENT"
        ? context.patientEmail
        : context.psychologistEmail;
    if (!verified || !looksLikeEmail(email)) {
      return "EMAIL_UNVERIFIED";
    }
    return null;
  }
  if (delivery.recipientRole !== "PATIENT") {
    return "WHATSAPP_OPT_IN_MISSING";
  }
  if (!deps.whatsappDispatchEnabled) {
    return "WHATSAPP_DISABLED";
  }
  const optedIn = await deps.consent.hasWhatsAppOptIn(context.patientUserId);
  if (!optedIn) {
    return "WHATSAPP_OPT_IN_MISSING";
  }
  if (!context.patientMobileVerified || !context.patientMobile.startsWith("+")) {
    return "INVALID_RECIPIENT";
  }
  return null;
}

function buildTemplateVariables(
  eventKey: OutboxEventKey,
  context: LoadedContext,
): NotificationTemplateVariables {
  const zone = context.timezone || PRACTICE_TIMEZONE;
  const when =
    eventKey === "AppointmentRescheduleRequested" && context.proposedStartsAt
      ? context.proposedStartsAt
      : context.startsAt;
  return {
    patientName: context.patientName,
    appointmentTypeName: context.typeName,
    appointmentDate: formatPracticeDate(when, zone),
    appointmentTime: formatPracticeTime(when, zone),
    timezone: zone,
    appointmentPublicId: context.appointmentPublicId,
    practiceName: defaultPracticeName(),
    proposedDate: context.proposedStartsAt
      ? formatPracticeDate(context.proposedStartsAt, zone)
      : undefined,
    proposedTime: context.proposedStartsAt
      ? formatPracticeTime(context.proposedStartsAt, zone)
      : undefined,
  };
}

async function finalizeDelivery(
  deps: NotificationDispatcherDeps,
  delivery: DeliveryRow,
  claimedLockedAt: Date,
  input: {
    result: "SENT" | "DEAD" | "SKIPPED";
    errorCode?: NotificationErrorCode;
    providerMessageId?: string;
    durationMs: number;
  },
): Promise<"sent" | "dead" | "skipped"> {
  const now = deps.now();
  const attemptCount = delivery.attemptCount + (input.result === "SKIPPED" ? 0 : 1);
  const updated = await deps.db
    .update(appointmentNotificationDeliveries)
    .set({
      status: input.result,
      attemptCount,
      lockedAt: null,
      sentAt: input.result === "SENT" ? now : delivery.sentAt,
      failedAt: input.result === "DEAD" ? now : delivery.failedAt,
      providerMessageId: input.providerMessageId ?? delivery.providerMessageId,
      lastErrorCode: input.errorCode ?? delivery.lastErrorCode,
      updatedAt: now,
    })
    .where(
      and(
        eq(appointmentNotificationDeliveries.id, delivery.id),
        eq(appointmentNotificationDeliveries.status, "PROCESSING"),
        eq(appointmentNotificationDeliveries.lockedAt, claimedLockedAt),
      ),
    )
    .returning({ id: appointmentNotificationDeliveries.id });
  if (updated.length === 0) {
    return "skipped";
  }
  await deps.db.insert(appointmentNotificationAttempts).values({
    id: generateUuid(),
    deliveryId: delivery.id,
    attemptNumber: Math.max(attemptCount, 1),
    attemptedAt: now,
    result: input.result,
    errorCode: input.errorCode ?? null,
    providerMessageId: input.providerMessageId ?? null,
    durationMs: input.durationMs,
  });
  await rollupOutbox(deps, delivery.outboxId);
  if (input.result === "DEAD" && deps.auditCtx) {
    await appendAuditLog(deps.auditCtx, {
      actorUserId: null,
      action: "NOTIFICATION_DELIVERY_DEAD",
      targetType: "notification_delivery",
      targetId: delivery.id,
      result: "FAILURE",
      metadata: {
        channel: delivery.channel,
        recipientRole: delivery.recipientRole,
        errorCode: input.errorCode,
      },
    });
  }
  logStructured(input.result === "DEAD" ? "ERROR" : "INFO", {
    operation: "notificationDelivery",
    channel: delivery.channel,
    recipientRole: delivery.recipientRole,
    result: input.result,
    errorCode: input.errorCode,
    durationMs: input.durationMs,
  });
  return input.result === "SENT"
    ? "sent"
    : input.result === "SKIPPED"
      ? "skipped"
      : "dead";
}

async function rollupOutbox(
  deps: NotificationDispatcherDeps,
  outboxId: string,
): Promise<void> {
  const now = deps.now();
  const deliveries = await deps.db
    .select({
      status: appointmentNotificationDeliveries.status,
      nextAttemptAt: appointmentNotificationDeliveries.nextAttemptAt,
      lastErrorCode: appointmentNotificationDeliveries.lastErrorCode,
    })
    .from(appointmentNotificationDeliveries)
    .where(eq(appointmentNotificationDeliveries.outboxId, outboxId));
  if (deliveries.length === 0) {
    return;
  }
  const active = deliveries.filter((item) =>
    ["PENDING", "PROCESSING", "RETRY"].includes(item.status),
  );
  const dead = deliveries.filter((item) => item.status === "DEAD");
  const terminalOk = deliveries.every(
    (item) => item.status === "SENT" || item.status === "SKIPPED",
  );
  if (terminalOk) {
    await deps.db
      .update(appointmentNotificationOutbox)
      .set({
        status: "SENT",
        sentAt: now,
        lockedAt: null,
        updatedAt: now,
      })
      .where(eq(appointmentNotificationOutbox.id, outboxId));
    return;
  }
  if (active.length > 0) {
    const retrying = active.some((item) => item.status === "RETRY");
    const next = active
      .map((item) => item.nextAttemptAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    await deps.db
      .update(appointmentNotificationOutbox)
      .set({
        status: retrying ? "RETRY" : "PENDING",
        nextAttemptAt: next ?? now,
        lockedAt: null,
        updatedAt: now,
      })
      .where(eq(appointmentNotificationOutbox.id, outboxId));
    return;
  }
  if (dead.length > 0) {
    await deps.db
      .update(appointmentNotificationOutbox)
      .set({
        status: "DEAD",
        failedAt: now,
        lockedAt: null,
        lastErrorCode: dead[0]?.lastErrorCode ?? "PERMANENT_PROVIDER_ERROR",
        updatedAt: now,
      })
      .where(eq(appointmentNotificationOutbox.id, outboxId));
  }
}

export function createNotificationDispatcherDeps(
  ctx: IdentityContext,
  extras: {
    email: ClassifiedEmailSender;
    whatsapp: WhatsAppService;
    consent: NotificationConsentReader;
    settings: NotificationDispatcherSettings;
    whatsappDispatchEnabled: boolean;
  },
): NotificationDispatcherDeps {
  return {
    db: ctx.db,
    now: ctx.now,
    email: extras.email,
    whatsapp: extras.whatsapp,
    consent: extras.consent,
    settings: extras.settings,
    nodeEnv: ctx.config.nodeEnv,
    auditCtx: ctx,
    whatsappDispatchEnabled: extras.whatsappDispatchEnabled,
  };
}

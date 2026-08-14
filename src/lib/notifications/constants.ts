import type { OutboxEventKey } from "@/lib/appointments/constants";

/**
 * Outbox / delivery states.
 *
 * PENDING — written by the appointment transaction; not yet claimed (or not yet expanded).
 * PROCESSING — claimed under a lease (`locked_at`).
 * RETRY — transient provider failure; `next_attempt_at` is in the future.
 * SENT — provider accepted the request (at-least-once; not a delivery-receipt webhook).
 * SKIPPED — intentionally not sent (unverified email, missing opt-in, policy disabled).
 * FAILED — retained on the outbox CHECK for compatibility; the dispatcher writes DEAD.
 * DEAD — permanent failure or retry exhaustion (dead-letter).
 */
export const OUTBOX_DISPATCH_STATUSES = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SENT",
  "FAILED",
  "DEAD",
] as const;

export const NOTIFICATION_CHANNELS = ["EMAIL", "WHATSAPP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_RECIPIENT_ROLES = ["PATIENT", "PSYCHOLOGIST"] as const;
export type NotificationRecipientRole =
  (typeof NOTIFICATION_RECIPIENT_ROLES)[number];

export const DELIVERY_STATUSES = [
  "PENDING",
  "PROCESSING",
  "RETRY",
  "SENT",
  "FAILED",
  "DEAD",
  "SKIPPED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const ATTEMPT_RESULTS = ["SENT", "RETRY", "DEAD", "SKIPPED"] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

export const WHATSAPP_TEMPLATE_KEYS = [
  "appointment_requested",
  "appointment_requested_psychologist",
  "appointment_confirmed",
  "appointment_rejected",
  "appointment_cancelled",
  "appointment_cancelled_psychologist",
  "appointment_reschedule_requested",
  "appointment_reschedule_requested_psychologist",
  "appointment_rescheduled",
  "appointment_completed",
  "appointment_no_show",
] as const;

export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export const EMAIL_SUBJECT = "Appointment update from Dr. Vandana";

export const PRACTICE_NOTIFICATION_NAME = "Dr. Vandana Rajiv Chaudhary";

/**
 * TEST FIXTURE ONLY retry/lease/batch values.
 * Not a production notification policy.
 */
export const TEST_NOTIFICATION_SETTINGS = {
  maxAttempts: 5,
  backoffMs: [0, 1, 2, 4, 8],
  leaseMs: 50,
  batchSize: 10,
  providerTimeoutMs: 40,
  completedEmailEnabled: false,
  noShowEmailEnabled: false,
  expandBatchSize: 20,
} as const;

/**
 * Initial configurable defaults. Production values remain OPEN.
 * Not an approved operational SLA.
 */
export const DEFAULT_NOTIFICATION_SETTINGS = {
  maxAttempts: 5,
  backoffMs: [60_000, 300_000, 900_000, 3_600_000, 14_400_000],
  leaseMs: 120_000,
  batchSize: 20,
  providerTimeoutMs: 15_000,
  completedEmailEnabled: false,
  noShowEmailEnabled: false,
  expandBatchSize: 50,
} as const;

export type NotificationDispatcherSettings = {
  maxAttempts: number;
  backoffMs: readonly number[];
  leaseMs: number;
  batchSize: number;
  providerTimeoutMs: number;
  completedEmailEnabled: boolean;
  noShowEmailEnabled: boolean;
  expandBatchSize: number;
};

export type PlannedDelivery = {
  channel: NotificationChannel;
  recipientRole: NotificationRecipientRole;
  templateKey: WhatsAppTemplateKey;
};

const PATIENT_OPERATIONAL_EVENTS: ReadonlySet<OutboxEventKey> = new Set([
  "AppointmentRequested",
  "AppointmentConfirmed",
  "AppointmentRejected",
  "AppointmentCancelled",
  "AppointmentRescheduleRequested",
  "AppointmentRescheduled",
]);

const PSYCHOLOGIST_EMAIL_EVENTS: ReadonlySet<OutboxEventKey> = new Set([
  "AppointmentRequested",
  "AppointmentCancelled",
  "AppointmentRescheduleRequested",
]);

const EVENT_TEMPLATE_KEYS: Record<
  OutboxEventKey,
  { patient: WhatsAppTemplateKey; psychologist: WhatsAppTemplateKey }
> = {
  AppointmentRequested: {
    patient: "appointment_requested",
    psychologist: "appointment_requested_psychologist",
  },
  AppointmentConfirmed: {
    patient: "appointment_confirmed",
    psychologist: "appointment_confirmed",
  },
  AppointmentRejected: {
    patient: "appointment_rejected",
    psychologist: "appointment_rejected",
  },
  AppointmentCancelled: {
    patient: "appointment_cancelled",
    psychologist: "appointment_cancelled_psychologist",
  },
  AppointmentRescheduleRequested: {
    patient: "appointment_reschedule_requested",
    psychologist: "appointment_reschedule_requested_psychologist",
  },
  AppointmentRescheduled: {
    patient: "appointment_rescheduled",
    psychologist: "appointment_rescheduled",
  },
  AppointmentCompleted: {
    patient: "appointment_completed",
    psychologist: "appointment_completed",
  },
  AppointmentNoShow: {
    patient: "appointment_no_show",
    psychologist: "appointment_no_show",
  },
};

export function plannedDeliveriesForEvent(
  eventKey: OutboxEventKey,
  settings: Pick<
    NotificationDispatcherSettings,
    "completedEmailEnabled" | "noShowEmailEnabled"
  >,
  options: { whatsappEnabled: boolean },
): PlannedDelivery[] {
  const planned: PlannedDelivery[] = [];
  const templates = EVENT_TEMPLATE_KEYS[eventKey];
  const completedAllowed =
    eventKey === "AppointmentCompleted" && settings.completedEmailEnabled;
  const noShowAllowed =
    eventKey === "AppointmentNoShow" && settings.noShowEmailEnabled;
  const patientEmail =
    PATIENT_OPERATIONAL_EVENTS.has(eventKey) || completedAllowed || noShowAllowed;
  const psychologistEmail =
    PSYCHOLOGIST_EMAIL_EVENTS.has(eventKey) || completedAllowed || noShowAllowed;

  if (patientEmail) {
    planned.push({
      channel: "EMAIL",
      recipientRole: "PATIENT",
      templateKey: templates.patient,
    });
  }
  if (psychologistEmail) {
    planned.push({
      channel: "EMAIL",
      recipientRole: "PSYCHOLOGIST",
      templateKey: templates.psychologist,
    });
  }
  if (options.whatsappEnabled && patientEmail) {
    planned.push({
      channel: "WHATSAPP",
      recipientRole: "PATIENT",
      templateKey: templates.patient,
    });
  }
  return planned;
}

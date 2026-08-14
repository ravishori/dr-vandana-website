export const PRACTICE_TIMEZONE = "Asia/Kolkata" as const;

export const APPOINTMENT_STATUSES = [
  "REQUESTED",
  "PENDING",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "REJECTED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Statuses that occupy the psychologist calendar.
 * REQUESTED is not durable after successful validation (becomes PENDING).
 * CANCELLED and REJECTED do not block. COMPLETED and NO_SHOW do not block.
 */
export const BLOCKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
] as const;

export type BlockingStatus = (typeof BLOCKING_STATUSES)[number];

export const TERMINAL_STATUSES = [
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "REJECTED",
] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export const HISTORY_EVENT_TYPES = [
  "CREATED",
  "REQUESTED",
  "CONFIRMED",
  "REJECTED",
  "RESCHEDULE_REQUESTED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number];

export const AVAILABILITY_EXCEPTION_KINDS = [
  "FULL_DAY_CLOSURE",
  "CUSTOM_AVAILABILITY",
  "UNAVAILABLE_PERIOD",
] as const;

export type AvailabilityExceptionKind =
  (typeof AVAILABILITY_EXCEPTION_KINDS)[number];

export const APPOINTMENT_AUDIT_ACTIONS = [
  "APPOINTMENT_REQUESTED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_REJECTED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_RESCHEDULE_REQUESTED",
  "APPOINTMENT_COMPLETED",
  "APPOINTMENT_NO_SHOW",
] as const;

export type AppointmentAuditAction = (typeof APPOINTMENT_AUDIT_ACTIONS)[number];

export const OUTBOX_EVENT_KEYS = [
  "AppointmentRequested",
  "AppointmentConfirmed",
  "AppointmentRejected",
  "AppointmentCancelled",
  "AppointmentRescheduled",
  "AppointmentCompleted",
  "AppointmentNoShow",
] as const;

export type OutboxEventKey = (typeof OUTBOX_EVENT_KEYS)[number];

export const APPOINTMENT_SAFE_MESSAGES = {
  slotUnavailable:
    "This time is no longer available. Please choose another time.",
  notFound: "That appointment could not be found.",
  forbidden: "You do not have access to that.",
  stale: "This appointment was updated. Please refresh and try again.",
  invalidTransition: "That action is not available for this appointment.",
  notConfigured: "Appointment availability is not configured yet.",
  inThePast: "That time is in the past. Please choose another time.",
  outsideAvailability:
    "That time is outside practice availability. Please choose another time.",
  rateLimited: "Please wait a little while before trying again.",
  cancellationNotAllowed:
    "This appointment cannot be cancelled with the current policy settings.",
  unauthenticated: "Please sign in to continue.",
} as const;

export const PUBLIC_APPOINTMENT_ID_PATTERN = /^APT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
export const PUBLIC_APPOINTMENT_TYPE_ID_PATTERN =
  /^ATY-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

export const APPOINTMENT_RATE_LIMITS = {
  request: { max: 10, windowMs: 15 * 60 * 1000 },
  mutate: { max: 20, windowMs: 15 * 60 * 1000 },
} as const;

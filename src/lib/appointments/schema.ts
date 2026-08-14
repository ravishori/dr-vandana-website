import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/lib/identity/schema";

/**
 * Phase 2 appointment tables. No clinical-record tables.
 * Composed with identity tables in `src/lib/identity/db.ts`.
 */
export const appointmentTypes = pgTable(
  "appointment_types",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    psychologistUserId: uuid("psychologist_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull(),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull(),
    active: boolean("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("appointment_types_public_id_uidx").on(table.publicId),
    index("appointment_types_psychologist_user_id_idx").on(
      table.psychologistUserId,
    ),
  ],
);

export const practiceAppointmentSettings = pgTable("practice_appointment_settings", {
  psychologistUserId: uuid("psychologist_user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull(),
  slotGranularityMinutes: integer("slot_granularity_minutes"),
  minimumNoticeMinutes: integer("minimum_notice_minutes"),
  maximumAdvanceDays: integer("maximum_advance_days"),
  cancellationMinimumNoticeMinutes: integer(
    "cancellation_minimum_notice_minutes",
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const practiceHours = pgTable(
  "practice_hours",
  {
    id: uuid("id").primaryKey(),
    psychologistUserId: uuid("psychologist_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    opensLocal: time("opens_local").notNull(),
    closesLocal: time("closes_local").notNull(),
    active: boolean("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("practice_hours_psychologist_dow_uidx").on(
      table.psychologistUserId,
      table.dayOfWeek,
    ),
  ],
);

export const practiceHourBreaks = pgTable(
  "practice_hour_breaks",
  {
    id: uuid("id").primaryKey(),
    practiceHourId: uuid("practice_hour_id")
      .notNull()
      .references(() => practiceHours.id, { onDelete: "cascade" }),
    startsLocal: time("starts_local").notNull(),
    endsLocal: time("ends_local").notNull(),
  },
  (table) => [
    index("practice_hour_breaks_practice_hour_id_idx").on(table.practiceHourId),
  ],
);

export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey(),
    psychologistUserId: uuid("psychologist_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    localDate: date("local_date"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    opensLocal: time("opens_local"),
    closesLocal: time("closes_local"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("availability_exceptions_psychologist_idx").on(
      table.psychologistUserId,
      table.localDate,
    ),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull(),
    patientUserId: uuid("patient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    psychologistUserId: uuid("psychologist_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    appointmentTypeId: uuid("appointment_type_id")
      .notNull()
      .references(() => appointmentTypes.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    occupiedStartsAt: timestamp("occupied_starts_at", {
      withTimezone: true,
    }).notNull(),
    occupiedEndsAt: timestamp("occupied_ends_at", {
      withTimezone: true,
    }).notNull(),
    requestedStartsAt: timestamp("requested_starts_at", {
      withTimezone: true,
    }).notNull(),
    requestedEndsAt: timestamp("requested_ends_at", {
      withTimezone: true,
    }).notNull(),
    timezone: text("timezone").notNull(),
    version: integer("version").notNull(),
    proposedStartsAt: timestamp("proposed_starts_at", { withTimezone: true }),
    proposedEndsAt: timestamp("proposed_ends_at", { withTimezone: true }),
    cancelReasonCode: text("cancel_reason_code"),
    cancelNote: text("cancel_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("appointments_public_id_uidx").on(table.publicId),
    index("appointments_patient_user_id_idx").on(table.patientUserId),
    index("appointments_psychologist_starts_idx").on(
      table.psychologistUserId,
      table.startsAt,
    ),
    index("appointments_status_idx").on(table.status),
  ],
);

export const appointmentHistory = pgTable(
  "appointment_history",
  {
    id: uuid("id").primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: text("actor_role"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("appointment_history_appointment_id_idx").on(table.appointmentId),
    index("appointment_history_created_at_idx").on(table.createdAt),
  ],
);

export const appointmentNotificationOutbox = pgTable(
  "appointment_notification_outbox",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id").notNull(),
    eventKey: text("event_key").notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "restrict",
    }),
    payloadNonSensitive: jsonb("payload_non_sensitive")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("appointment_outbox_event_id_uidx").on(table.eventId),
    index("appointment_outbox_status_idx").on(table.status, table.createdAt),
  ],
);

export const bookingIdempotency = pgTable(
  "booking_idempotency",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(),
    keyHash: text("key_hash").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    status: text("status").notNull(),
    responsePublicId: text("response_public_id"),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("booking_idempotency_user_op_key_uidx").on(
      table.userId,
      table.operation,
      table.keyHash,
    ),
    index("booking_idempotency_expires_at_idx").on(table.expiresAt),
  ],
);

export const appointmentSchema = {
  appointmentTypes,
  practiceAppointmentSettings,
  practiceHours,
  practiceHourBreaks,
  availabilityExceptions,
  appointments,
  appointmentHistory,
  appointmentNotificationOutbox,
  bookingIdempotency,
};

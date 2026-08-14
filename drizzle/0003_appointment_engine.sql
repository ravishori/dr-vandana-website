-- Phase 2 appointment engine.
-- Additive. Does not modify identity tables. No clinical-record tables.
-- Do not apply automatically in production. See docs/PHASE_2_APPOINTMENT_ENGINE.md.
--
-- btree_gist is required on PostgreSQL so EXCLUDE USING gist can combine
-- psychologist_user_id equality (=) with tstzrange overlap (&&). Without it,
-- GiST has no default operator class for uuid. The extension is created
-- deliberately for that constraint only.
-- PGlite test runtimes may lack btree_gist; the DO block then skips the
-- exclusion constraint. Application booking still uses transactions,
-- per-psychologist advisory locks, and overlap checks.

CREATE TABLE appointment_types (
  id uuid PRIMARY KEY,
  public_id text NOT NULL,
  psychologist_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL,
  duration_minutes integer NOT NULL,
  buffer_before_minutes integer NOT NULL,
  buffer_after_minutes integer NOT NULL,
  active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT appointment_types_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT appointment_types_buffer_before_check CHECK (buffer_before_minutes >= 0),
  CONSTRAINT appointment_types_buffer_after_check CHECK (buffer_after_minutes >= 0)
);

CREATE UNIQUE INDEX appointment_types_public_id_uidx ON appointment_types (public_id);
CREATE INDEX appointment_types_psychologist_user_id_idx
  ON appointment_types (psychologist_user_id);

CREATE TABLE practice_appointment_settings (
  psychologist_user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  timezone text NOT NULL,
  slot_granularity_minutes integer,
  minimum_notice_minutes integer,
  maximum_advance_days integer,
  cancellation_minimum_notice_minutes integer,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT practice_appointment_settings_timezone_check
    CHECK (timezone = 'Asia/Kolkata'),
  CONSTRAINT practice_appointment_settings_granularity_check
    CHECK (slot_granularity_minutes IS NULL OR slot_granularity_minutes > 0),
  CONSTRAINT practice_appointment_settings_notice_check
    CHECK (minimum_notice_minutes IS NULL OR minimum_notice_minutes >= 0),
  CONSTRAINT practice_appointment_settings_advance_check
    CHECK (maximum_advance_days IS NULL OR maximum_advance_days > 0),
  CONSTRAINT practice_appointment_settings_cancel_notice_check
    CHECK (
      cancellation_minimum_notice_minutes IS NULL
      OR cancellation_minimum_notice_minutes >= 0
    )
);

CREATE TABLE practice_hours (
  id uuid PRIMARY KEY,
  psychologist_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  opens_local time NOT NULL,
  closes_local time NOT NULL,
  active boolean NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT practice_hours_dow_check CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT practice_hours_window_check CHECK (opens_local < closes_local)
);

CREATE UNIQUE INDEX practice_hours_psychologist_dow_uidx
  ON practice_hours (psychologist_user_id, day_of_week);

CREATE TABLE practice_hour_breaks (
  id uuid PRIMARY KEY,
  practice_hour_id uuid NOT NULL REFERENCES practice_hours (id) ON DELETE CASCADE,
  starts_local time NOT NULL,
  ends_local time NOT NULL,
  CONSTRAINT practice_hour_breaks_window_check CHECK (starts_local < ends_local)
);

CREATE INDEX practice_hour_breaks_practice_hour_id_idx
  ON practice_hour_breaks (practice_hour_id);

CREATE TABLE availability_exceptions (
  id uuid PRIMARY KEY,
  psychologist_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  local_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  opens_local time,
  closes_local time,
  note text,
  created_at timestamptz NOT NULL,
  CONSTRAINT availability_exceptions_kind_check CHECK (
    kind IN ('FULL_DAY_CLOSURE', 'CUSTOM_AVAILABILITY', 'UNAVAILABLE_PERIOD')
  )
);

CREATE INDEX availability_exceptions_psychologist_idx
  ON availability_exceptions (psychologist_user_id, local_date);

CREATE TABLE appointments (
  id uuid PRIMARY KEY,
  public_id text NOT NULL,
  patient_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  psychologist_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  appointment_type_id uuid NOT NULL REFERENCES appointment_types (id) ON DELETE RESTRICT,
  status text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  occupied_starts_at timestamptz NOT NULL,
  occupied_ends_at timestamptz NOT NULL,
  requested_starts_at timestamptz NOT NULL,
  requested_ends_at timestamptz NOT NULL,
  timezone text NOT NULL,
  version integer NOT NULL,
  proposed_starts_at timestamptz,
  proposed_ends_at timestamptz,
  cancel_reason_code text,
  cancel_note text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT appointments_status_check CHECK (
    status IN (
      'REQUESTED',
      'PENDING',
      'CONFIRMED',
      'RESCHEDULE_REQUESTED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW',
      'REJECTED'
    )
  ),
  CONSTRAINT appointments_range_check CHECK (starts_at < ends_at),
  CONSTRAINT appointments_occupied_check CHECK (
    occupied_starts_at <= starts_at AND occupied_ends_at >= ends_at
  ),
  CONSTRAINT appointments_timezone_check CHECK (timezone = 'Asia/Kolkata'),
  CONSTRAINT appointments_version_check CHECK (version >= 1)
);

CREATE UNIQUE INDEX appointments_public_id_uidx ON appointments (public_id);
CREATE INDEX appointments_patient_user_id_idx ON appointments (patient_user_id);
CREATE INDEX appointments_psychologist_starts_idx
  ON appointments (psychologist_user_id, starts_at);
CREATE INDEX appointments_status_idx ON appointments (status);

CREATE TABLE appointment_history (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES appointments (id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_user_id uuid REFERENCES users (id),
  actor_role text,
  metadata jsonb,
  created_at timestamptz NOT NULL,
  CONSTRAINT appointment_history_event_type_check CHECK (
    event_type IN (
      'CREATED',
      'REQUESTED',
      'CONFIRMED',
      'REJECTED',
      'RESCHEDULE_REQUESTED',
      'RESCHEDULED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW'
    )
  )
);

CREATE INDEX appointment_history_appointment_id_idx
  ON appointment_history (appointment_id);
CREATE INDEX appointment_history_created_at_idx
  ON appointment_history (created_at);

CREATE OR REPLACE FUNCTION appointment_history_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'appointment_history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_history_no_update
  BEFORE UPDATE OR DELETE ON appointment_history
  FOR EACH ROW EXECUTE FUNCTION appointment_history_immutable();

-- Transactional outbox foundation only. Phase 2 does not send email or WhatsApp.
CREATE TABLE appointment_notification_outbox (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL,
  event_key text NOT NULL,
  appointment_id uuid REFERENCES appointments (id) ON DELETE RESTRICT,
  payload_non_sensitive jsonb NOT NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL,
  CONSTRAINT appointment_outbox_status_check CHECK (
    status IN ('PENDING', 'SENT', 'FAILED', 'DEAD')
  )
);

CREATE UNIQUE INDEX appointment_outbox_event_id_uidx
  ON appointment_notification_outbox (event_id);
CREATE INDEX appointment_outbox_status_idx
  ON appointment_notification_outbox (status, created_at);

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE appointments ADD CONSTRAINT appointments_blocking_occupied_excl
    EXCLUDE USING gist (
      psychologist_user_id WITH =,
      tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
    )
    WHERE (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'appointments exclusion constraint not applied: %', SQLERRM;
END
$$;

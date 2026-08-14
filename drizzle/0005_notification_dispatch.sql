-- Phase 2F: asynchronous notification dispatch + WhatsApp appointment opt-in.
-- Appointment transactions still write only PENDING outbox rows.
-- Delivery, retries, and provider calls happen outside those transactions.
-- Do not store provider secrets, OTPs, passwords, MFA, session tokens, or clinical content.

ALTER TABLE appointment_notification_outbox
  DROP CONSTRAINT IF EXISTS appointment_outbox_status_check;

ALTER TABLE appointment_notification_outbox
  ADD CONSTRAINT appointment_outbox_status_check CHECK (
    status IN ('PENDING', 'PROCESSING', 'RETRY', 'SENT', 'FAILED', 'DEAD')
  );

ALTER TABLE appointment_notification_outbox
  ADD COLUMN locked_at timestamptz;

ALTER TABLE appointment_notification_outbox
  ADD COLUMN sent_at timestamptz;

ALTER TABLE appointment_notification_outbox
  ADD COLUMN failed_at timestamptz;

ALTER TABLE appointment_notification_outbox
  ADD COLUMN last_error_code text;

ALTER TABLE appointment_notification_outbox
  ADD COLUMN updated_at timestamptz;

UPDATE appointment_notification_outbox
SET updated_at = created_at
WHERE updated_at IS NULL;

CREATE INDEX appointment_outbox_dispatch_idx
  ON appointment_notification_outbox (status, next_attempt_at, created_at);

CREATE INDEX appointment_outbox_event_key_idx
  ON appointment_notification_outbox (event_key);

CREATE TABLE appointment_notification_deliveries (
  id uuid PRIMARY KEY,
  outbox_id uuid NOT NULL REFERENCES appointment_notification_outbox (id) ON DELETE RESTRICT,
  channel text NOT NULL,
  recipient_role text NOT NULL,
  template_key text NOT NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL,
  next_attempt_at timestamptz,
  locked_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT appointment_delivery_channel_check CHECK (
    channel IN ('EMAIL', 'WHATSAPP')
  ),
  CONSTRAINT appointment_delivery_recipient_check CHECK (
    recipient_role IN ('PATIENT', 'PSYCHOLOGIST')
  ),
  CONSTRAINT appointment_delivery_status_check CHECK (
    status IN ('PENDING', 'PROCESSING', 'RETRY', 'SENT', 'FAILED', 'DEAD', 'SKIPPED')
  )
);

CREATE UNIQUE INDEX appointment_delivery_outbox_channel_role_uidx
  ON appointment_notification_deliveries (outbox_id, channel, recipient_role);

CREATE INDEX appointment_delivery_dispatch_idx
  ON appointment_notification_deliveries (status, next_attempt_at, created_at);

CREATE INDEX appointment_delivery_channel_status_idx
  ON appointment_notification_deliveries (channel, status);

CREATE TABLE appointment_notification_attempts (
  id uuid PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES appointment_notification_deliveries (id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL,
  attempted_at timestamptz NOT NULL,
  result text NOT NULL,
  error_code text,
  provider_message_id text,
  duration_ms integer,
  CONSTRAINT appointment_attempt_result_check CHECK (
    result IN ('SENT', 'RETRY', 'DEAD', 'SKIPPED')
  )
);

CREATE INDEX appointment_attempts_delivery_idx
  ON appointment_notification_attempts (delivery_id, attempted_at);

-- Explicit WhatsApp appointment-notification consent.
-- Verified mobile is NOT consent. Default is opted out.
ALTER TABLE patient_profiles
  ADD COLUMN whatsapp_notifications_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE patient_profiles
  ADD COLUMN whatsapp_opted_in_at timestamptz;

ALTER TABLE patient_profiles
  ADD COLUMN whatsapp_opted_out_at timestamptz;

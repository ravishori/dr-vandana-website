-- Phase 2C: booking idempotency keyed to authenticated user + operation.
-- Raw idempotency keys, session tokens, and clinical content are not stored.

CREATE TABLE booking_idempotency (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  operation text NOT NULL,
  key_hash text NOT NULL,
  request_fingerprint text NOT NULL,
  status text NOT NULL,
  response_public_id text,
  response_payload jsonb,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT booking_idempotency_operation_check CHECK (
    operation IN ('appointment.request')
  ),
  CONSTRAINT booking_idempotency_status_check CHECK (
    status IN ('IN_PROGRESS', 'COMPLETED')
  )
);

CREATE UNIQUE INDEX booking_idempotency_user_op_key_uidx
  ON booking_idempotency (user_id, operation, key_hash);

CREATE INDEX booking_idempotency_expires_at_idx
  ON booking_idempotency (expires_at);

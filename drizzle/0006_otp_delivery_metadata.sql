-- Phase 2A: OTP delivery metadata on existing phone_verifications.
-- Extends the identity OTP challenge table without duplicating OTP storage.
-- Do not apply against production from this task. Staging: APPLY_IDENTITY_MIGRATION=true npm run db:migrate

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS destination text;

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'PHONE_VERIFY';

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'SMS';

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'DELIVERED';

ALTER TABLE phone_verifications
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_purpose_check;

ALTER TABLE phone_verifications
  ADD CONSTRAINT phone_verifications_purpose_check CHECK (
    purpose IN (
      'PHONE_VERIFY',
      'EMAIL_VERIFY',
      'EMAIL_LOGIN',
      'PHONE_LOGIN',
      'PASSWORD_RESET',
      'MFA_CHALLENGE'
    )
  );

ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_channel_check;

ALTER TABLE phone_verifications
  ADD CONSTRAINT phone_verifications_channel_check CHECK (
    channel IN ('SMS', 'EMAIL')
  );

ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_delivery_status_check;

ALTER TABLE phone_verifications
  ADD CONSTRAINT phone_verifications_delivery_status_check CHECK (
    delivery_status IN (
      'CREATED',
      'DELIVERY_ATTEMPTED',
      'DELIVERED',
      'DELIVERY_FAILED',
      'VERIFIED',
      'EXPIRED',
      'CONSUMED'
    )
  );

CREATE INDEX IF NOT EXISTS phone_verifications_destination_idx
  ON phone_verifications (destination);

CREATE INDEX IF NOT EXISTS phone_verifications_purpose_status_idx
  ON phone_verifications (user_id, purpose, delivery_status);

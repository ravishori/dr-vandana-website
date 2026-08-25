-- Rollback Phase 2A OTP delivery metadata. Do not run against production casually.

DROP INDEX IF EXISTS phone_verifications_purpose_status_idx;
DROP INDEX IF EXISTS phone_verifications_destination_idx;

ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_delivery_status_check;
ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_channel_check;
ALTER TABLE phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_purpose_check;

ALTER TABLE phone_verifications DROP COLUMN IF EXISTS last_sent_at;
ALTER TABLE phone_verifications DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE phone_verifications DROP COLUMN IF EXISTS channel;
ALTER TABLE phone_verifications DROP COLUMN IF EXISTS purpose;
ALTER TABLE phone_verifications DROP COLUMN IF EXISTS destination;

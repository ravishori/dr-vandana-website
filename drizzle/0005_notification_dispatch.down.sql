ALTER TABLE patient_profiles DROP COLUMN IF EXISTS whatsapp_opted_out_at;
ALTER TABLE patient_profiles DROP COLUMN IF EXISTS whatsapp_opted_in_at;
ALTER TABLE patient_profiles DROP COLUMN IF EXISTS whatsapp_notifications_enabled;

DROP INDEX IF EXISTS appointment_attempts_delivery_idx;
DROP TABLE IF EXISTS appointment_notification_attempts;
DROP INDEX IF EXISTS appointment_delivery_channel_status_idx;
DROP INDEX IF EXISTS appointment_delivery_dispatch_idx;
DROP INDEX IF EXISTS appointment_delivery_outbox_channel_role_uidx;
DROP TABLE IF EXISTS appointment_notification_deliveries;
DROP INDEX IF EXISTS appointment_outbox_event_key_idx;
DROP INDEX IF EXISTS appointment_outbox_dispatch_idx;
ALTER TABLE appointment_notification_outbox DROP COLUMN IF EXISTS updated_at;
ALTER TABLE appointment_notification_outbox DROP COLUMN IF EXISTS last_error_code;
ALTER TABLE appointment_notification_outbox DROP COLUMN IF EXISTS failed_at;
ALTER TABLE appointment_notification_outbox DROP COLUMN IF EXISTS sent_at;
ALTER TABLE appointment_notification_outbox DROP COLUMN IF EXISTS locked_at;
ALTER TABLE appointment_notification_outbox DROP CONSTRAINT IF EXISTS appointment_outbox_status_check;
ALTER TABLE appointment_notification_outbox
  ADD CONSTRAINT appointment_outbox_status_check CHECK (
    status IN ('PENDING', 'SENT', 'FAILED', 'DEAD')
  );

-- Destructive. Do not run in production without a recovery plan.
-- Leaves btree_gist installed (other objects may depend on it).

DROP TABLE IF EXISTS appointment_notification_outbox;
DROP TRIGGER IF EXISTS appointment_history_no_update ON appointment_history;
DROP FUNCTION IF EXISTS appointment_history_immutable();
DROP TABLE IF EXISTS appointment_history;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS availability_exceptions;
DROP TABLE IF EXISTS practice_hour_breaks;
DROP TABLE IF EXISTS practice_hours;
DROP TABLE IF EXISTS practice_appointment_settings;
DROP TABLE IF EXISTS appointment_types;

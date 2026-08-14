-- Reversal for 0001_identity_foundation.sql
-- Review before applying. Never run automatically in production.

DROP TABLE IF EXISTS security_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS mfa_recovery_codes;
DROP TABLE IF EXISTS mfa_credentials;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS otp_attempts;
DROP TABLE IF EXISTS phone_verifications;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS psychologist_profiles;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

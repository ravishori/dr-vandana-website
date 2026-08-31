-- Phase 1P.13: force first-login password change for provisional credentials.
-- Staging only via APPLY_IDENTITY_MIGRATION=true npm run db:migrate

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

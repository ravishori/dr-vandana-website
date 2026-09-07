-- Simplify doctor login: allow a per-account MFA exemption so a specific
-- psychologist account can skip the 2-step verification challenge without
-- disabling MFA for the PSYCHOLOGIST role (or SUPER_ADMIN) as a whole.
-- Staging only via APPLY_IDENTITY_MIGRATION=true npm run db:migrate

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_exempt boolean NOT NULL DEFAULT false;

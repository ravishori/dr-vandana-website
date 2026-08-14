-- Additive MFA replay guard. Safe to apply after 0001.
-- Stores the last accepted TOTP time-step so the same code cannot be reused
-- inside the validation window.

ALTER TABLE mfa_credentials
  ADD COLUMN IF NOT EXISTS last_verified_step integer;

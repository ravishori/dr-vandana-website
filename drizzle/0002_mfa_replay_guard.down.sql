-- Reversal for 0002_mfa_replay_guard.sql
ALTER TABLE mfa_credentials DROP COLUMN IF EXISTS last_verified_step;

-- Down: remove mfa_exempt (staging only).

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_exempt;

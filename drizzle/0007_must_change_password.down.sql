-- Down: remove must_change_password (staging only).

ALTER TABLE users
  DROP COLUMN IF EXISTS must_change_password;

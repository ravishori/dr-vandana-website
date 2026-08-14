-- Phase 1 identity foundation.
-- PostgreSQL dialect. Provider-agnostic (DATABASE_URL).
-- No appointment tables. No clinical record tables.
-- Do not apply automatically in production. See docs/PHASE_1_IMPLEMENTATION.md.

CREATE TABLE users (
  id uuid PRIMARY KEY,
  public_id text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL,
  password_hash text NOT NULL,
  mobile_number text,
  mobile_normalized text,
  mobile_verified_at timestamptz,
  email_verified_at timestamptz,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  last_login_at timestamptz,
  CONSTRAINT users_status_check CHECK (
    status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED')
  )
);

CREATE UNIQUE INDEX users_public_id_uidx ON users (public_id);
CREATE UNIQUE INDEX users_email_normalized_uidx ON users (email_normalized);
CREATE UNIQUE INDEX users_mobile_normalized_uidx ON users (mobile_normalized)
  WHERE mobile_normalized IS NOT NULL;

CREATE TABLE roles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX roles_name_uidx ON roles (name);

CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  is_clinical boolean NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX permissions_name_uidx ON permissions (name);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL,
  assigned_by uuid REFERENCES users (id),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  date_of_birth date,
  gender text,
  emergency_contact text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX patient_profiles_user_id_uidx ON patient_profiles (user_id);

CREATE TABLE psychologist_profiles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX psychologist_profiles_user_id_uidx ON psychologist_profiles (user_id);

CREATE TABLE email_verifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX email_verifications_token_hash_uidx ON email_verifications (token_hash);
CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id);

CREATE TABLE phone_verifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL,
  max_attempts integer NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE INDEX phone_verifications_user_id_idx ON phone_verifications (user_id);

CREATE TABLE otp_attempts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  purpose text NOT NULL,
  ip_hash text,
  result text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX otp_attempts_user_id_idx ON otp_attempts (user_id);
CREATE INDEX otp_attempts_created_at_idx ON otp_attempts (created_at);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_hash text,
  user_agent_hash text,
  mfa_completed_at timestamptz,
  absolute_expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX sessions_token_hash_uidx ON sessions (token_hash);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX password_reset_tokens_token_hash_uidx ON password_reset_tokens (token_hash);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

CREATE TABLE mfa_credentials (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL,
  enrolled_at timestamptz,
  created_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL,
  locked_until timestamptz
);

CREATE UNIQUE INDEX mfa_credentials_user_id_uidx ON mfa_credentials (user_id);

CREATE TABLE mfa_recovery_codes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE INDEX mfa_recovery_codes_user_id_idx ON mfa_recovery_codes (user_id);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  actor_user_id uuid REFERENCES users (id),
  action text NOT NULL,
  target_type text,
  target_id text,
  result text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL
);

CREATE INDEX audit_logs_actor_user_id_idx ON audit_logs (actor_user_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);

CREATE TABLE security_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users (id),
  event_type text NOT NULL,
  ip_hash text,
  metadata jsonb,
  created_at timestamptz NOT NULL
);

CREATE INDEX security_events_user_id_idx ON security_events (user_id);
CREATE INDEX security_events_created_at_idx ON security_events (created_at);
CREATE INDEX security_events_event_type_idx ON security_events (event_type);

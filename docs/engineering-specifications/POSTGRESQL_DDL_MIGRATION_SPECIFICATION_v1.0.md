# PostgreSQL DDL / Database Migration Specification v1.0
## Dr. Vandana Wellness Assistant

**Baseline:** BRD v2.1 + SCRS v1.0 + Technical Architecture v1.0  
**Status:** Engineering Database Specification  
**Target:** MVP / Phase 1

---

## 1. Database Principles

- PostgreSQL is the authoritative relational datastore.
- Logical schemas separate core, safety, administration, audit, reference and knowledge data.
- Sensitive data is encrypted before persistent storage.
- Production schema changes occur only through version-controlled migrations.
- Audit records are append-only from the application perspective.
- Database outages must not remove access to static emergency resources.

---

## 2. Logical Schemas

```text
core
safety
admin
audit
reference
knowledge
```

---

## 3. Migration Order

Recommended:

```text
001_initial_schemas
002_core_tables
003_safety_tables
004_admin_tables
005_audit_tables
006_reference_tables
007_knowledge_tables
008_indexes_constraints
009_retention_support
```

Exact migration tooling may determine naming.

---

# 4. Core Tables

## `core.users`

```sql
CREATE TABLE core.users (
    user_id UUID PRIMARY KEY,
    full_name_encrypted BYTEA,
    email_encrypted BYTEA,
    phone_encrypted BYTEA,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## `core.consents`

```sql
CREATE TABLE core.consents (
    consent_id UUID PRIMARY KEY,
    session_id UUID,
    notice_version TEXT NOT NULL,
    purpose_codes JSONB NOT NULL,
    consent_status TEXT NOT NULL,
    consented_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## `core.anonymous_sessions`

```sql
CREATE TABLE core.anonymous_sessions (
    session_id UUID PRIMARY KEY,
    session_token_hash TEXT NOT NULL UNIQUE,
    consent_id UUID REFERENCES core.consents(consent_id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ
);
```

## `core.conversations`

```sql
CREATE TABLE core.conversations (
    conversation_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES core.anonymous_sessions(session_id),
    user_id UUID REFERENCES core.users(user_id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    current_safety_level TEXT NOT NULL DEFAULT '0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);
```

## `core.messages`

```sql
CREATE TABLE core.messages (
    message_id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES core.conversations(conversation_id),
    sender_type TEXT NOT NULL,
    content_ciphertext BYTEA NOT NULL,
    risk_level TEXT NOT NULL,
    threat_tags JSONB NOT NULL DEFAULT '[]',
    classifier_version TEXT,
    safety_policy_version TEXT,
    response_template_version TEXT,
    model_version TEXT,
    knowledge_source_ids JSONB,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

For Levels U/2/3, `model_version` should remain NULL.

---

# 5. Safety Tables

## `safety.safety_events`

```sql
CREATE TABLE safety.safety_events (
    event_id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES core.conversations(conversation_id),
    trigger_message_id UUID NOT NULL REFERENCES core.messages(message_id),
    severity_level TEXT NOT NULL,
    threat_tags JSONB NOT NULL,
    ack_status TEXT NOT NULL DEFAULT 'PENDING',
    deduplication_key TEXT,
    policy_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
```

## `safety.classification_results`

```sql
CREATE TABLE safety.classification_results (
    classification_id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES core.messages(message_id),
    classifier_version TEXT NOT NULL,
    threat_tags JSONB NOT NULL,
    intent_class TEXT,
    immediacy_class TEXT,
    plan_indicator BOOLEAN,
    means_indicator BOOLEAN,
    preparation_indicator BOOLEAN,
    current_action_indicator BOOLEAN,
    target_class TEXT,
    uncertainty_score NUMERIC(5,4),
    decision_level TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Do not persist hidden reasoning or chain-of-thought.

---

# 6. Admin Tables

## `admin.admin_users`

```sql
CREATE TABLE admin.admin_users (
    admin_user_id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## `admin.notifications`

```sql
CREATE TABLE admin.notifications (
    notification_id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES safety.safety_events(event_id),
    recipient_role TEXT,
    channel TEXT NOT NULL,
    provider TEXT,
    delivery_status TEXT NOT NULL,
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 7. Audit Tables

## `audit.admin_actions`

```sql
CREATE TABLE audit.admin_actions (
    action_id UUID PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES admin.admin_users(admin_user_id),
    event_id UUID REFERENCES safety.safety_events(event_id),
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    notes_ciphertext BYTEA,
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_id UUID
);
```

## `audit.retention_jobs`

```sql
CREATE TABLE audit.retention_jobs (
    job_id UUID PRIMARY KEY,
    job_type TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    records_processed BIGINT NOT NULL DEFAULT 0,
    records_deleted BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    execution_hash TEXT
);
```

---

# 8. Reference Tables

## `reference.emergency_resources`

```sql
CREATE TABLE reference.emergency_resources (
    resource_id UUID PRIMARY KEY,
    resource_code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    service_scope TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    alternate_phone TEXT,
    service_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    availability_hours TEXT,
    verification_interval_days INTEGER NOT NULL DEFAULT 30,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES admin.admin_users(admin_user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Emergency-resource data must be independently verified and must also exist in the signed fallback bundle.

---

# 9. Knowledge Tables

## `knowledge.knowledge_sources`

```sql
CREATE TABLE knowledge.knowledge_sources (
    source_id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    version TEXT NOT NULL,
    approval_status TEXT NOT NULL,
    approved_by UUID REFERENCES admin.admin_users(admin_user_id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 10. Constraints

Recommended application/database constraints:

- valid severity values: `0`, `1`, `U`, `2`, `3`, `FAILSAFE`;
- notification status constrained to approved states;
- admin role constrained to approved roles;
- sender type constrained to `USER`, `BOT`, `AGENT`;
- foreign-key integrity enforced;
- timestamps stored as UTC;
- no plaintext sensitive message content.

---

# 11. Indexes

Recommended:

```sql
CREATE INDEX idx_messages_conversation_created
ON core.messages(conversation_id, created_at);

CREATE INDEX idx_safety_events_status_created
ON safety.safety_events(ack_status, created_at);

CREATE INDEX idx_safety_events_severity_created
ON safety.safety_events(severity_level, created_at);

CREATE INDEX idx_notifications_event_status
ON admin.notifications(event_id, delivery_status);

CREATE INDEX idx_admin_actions_event_timestamp
ON audit.admin_actions(event_id, action_timestamp);
```

Additional indexes should be introduced based on query plans rather than speculation.

---

# 12. Encryption & Key Management

Database encryption alone is insufficient.

Sensitive fields should be application-encrypted before insertion.

Use envelope encryption with a managed key hierarchy where available.

Never store master encryption keys in PostgreSQL.

---

# 13. Retention

Target policies:

- Level 0–1: 30 days
- Level U/2/3: 180 days

These remain subject to final legal/privacy review.

Deletion jobs must produce audit records.

Records under an approved active safety/legal hold must be handled according to the documented retention policy.

---

# 14. Backup & Restore

Backups must be:

- encrypted;
- access-controlled;
- monitored;
- restore-tested;
- governed by approved retention rules.

Production restore testing must occur before launch.

---

# 15. Migration Acceptance Criteria

- migrations execute from clean database;
- migrations are repeatable/idempotent according to framework;
- foreign keys work;
- indexes are present;
- encrypted fields contain no plaintext sensitive data;
- rollback strategy documented where feasible;
- backup/restore test passes;
- safety-critical data remains auditable.

---

# 16. Production Gate

No production schema deployment until:

- Architecture v1.0 approved;
- API contracts aligned;
- security review completed;
- migration tests pass;
- backup/restore verified;
- clinical governance requirements satisfied.

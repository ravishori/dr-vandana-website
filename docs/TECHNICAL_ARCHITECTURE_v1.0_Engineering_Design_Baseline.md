# Technical Architecture & Database Design
## Dr. Vandana Wellness Assistant
### Mental Wellness Information & Safety Assistant

**Document Version:** 1.0 — Engineering Design Baseline  
**Base Specifications:** BRD v2.1 + SCRS v1.0  
**Target Release:** MVP / Phase 1  
**Status:** Proposed Engineering Baseline  
**Clinical Production Approval:** Required before production deployment

---

## 1. Purpose

This document translates the frozen Business Requirements Document (BRD v2.1) and Safety & Crisis Response Specification (SCRS v1.0) into an implementable technical architecture and database design.

It defines:

- system boundaries;
- application/service architecture;
- safety-engine routing;
- PostgreSQL data architecture;
- security and encryption boundaries;
- LLM/RAG boundaries;
- notification and escalation architecture;
- auditability;
- observability;
- testing and deployment boundaries.

It does **not** replace clinical governance and does not independently authorize production deployment.

---

# 2. Architectural Principles

The following principles are mandatory:

1. **Safety takes precedence over engagement.**
2. **The Safety & Threat Engine is authoritative for safety routing.**
3. **The LLM is downstream of safety classification.**
4. **Levels U, 2 and 3 must not invoke unrestricted generative AI.**
5. **Level 3 enters deterministic Crisis Safety Mode.**
6. **Classifier timeout, crash, or malformed output must fail closed.**
7. **Emergency resources must remain available during database or external-service failure.**
8. **PII and sensitive conversation content must be minimized, protected and access-controlled.**
9. **Administrative access must be least-privilege and auditable.**
10. **Clinical safety logic is controlled by clinical governance, not by engineering convenience.**

---

# 3. High-Level Architecture

```text
                         ┌───────────────────────┐
                         │       VISITOR         │
                         │ Web / Mobile Browser  │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │ Consent & Boundary    │
                         │       Layer           │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │     Input Gateway     │
                         │ Validation / Limits   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │     SAFETY & THREAT ENGINE      │
                    │  Rules + Context + Threat Tags │
                    └───────────────┬────────────────┘
                                    │
             ┌──────────────┬───────┼────────┬──────────────┐
             ▼              ▼       ▼        ▼              ▼
         Level 0         Level 1  Level U  Level 2        Level 3
             │              │       │        │              │
             ▼              ▼       ▼        ▼              ▼
        RAG + LLM       Support   Safe     Safety        Crisis
         Allowed         Flow     Flow      Flow          Flow
             │              │       │        │              │
             └──────────────┴───────┼────────┴──────────────┘
                                    ▼
                           Response Gateway
                                    │
                                    ▼
                                 VISITOR

Level U / 2 / 3
       │
       ├──────────────► Safety Event Store
       │
       ├──────────────► Notification Dispatcher
       │                         │
       │                         ▼
       │                  Admin Dashboard
       │                         │
       │                         ▼
       │                  Acknowledgement /
       │                  Secondary Escalation
       │
       └──────────────► Immutable Audit Store
```

---

# 4. Recommended MVP Architecture

## 4.1 Application Style

Use a **modular monolith** for MVP rather than multiple independent microservices.

This reduces operational complexity while preserving clear internal service boundaries.

Recommended modules:

- `chat`
- `safety`
- `responses`
- `knowledge`
- `notifications`
- `admin`
- `appointments`
- `audit`
- `retention`
- `emergency_resources`

These modules may initially run inside one FastAPI deployment.

## 4.2 Technology Boundary

| Component | MVP Recommendation |
|---|---|
| Frontend | Existing website stack |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Cache / ephemeral state | Redis |
| AI | Controlled LLM provider |
| RAG | Approved knowledge base + vector retrieval |
| Admin authentication | MFA-capable secure authentication |
| Password hashing | Argon2id |
| Encryption | AES-256 / envelope encryption |
| Transport | TLS 1.3 |
| Deployment | Modular monolith |
| Testing | Unit + integration + Golden Set + security |

Technology selections remain subject to project-level engineering review.

---

# 5. Request Processing Architecture

Every visitor message must follow:

```text
POST /api/v1/messages
        │
        ▼
Request Validation
        │
        ▼
Consent Verification
        │
        ▼
Rate Limiting
        │
        ▼
Safety & Threat Engine
        │
        ▼
Safety Decision
        │
        ├── Level 0 ──► RAG ──► LLM ──► Response Validation
        │
        ├── Level 1 ──► Controlled Support Flow
        │
        ├── Level U ──► Deterministic Safe Flow
        │
        ├── Level 2 ──► Deterministic Safety Flow
        │
        └── Level 3 ──► Crisis Safety Mode
        │
        ▼
Response Gateway
        │
        ▼
Visitor
```

For Levels U/2/3, unrestricted LLM invocation is prohibited.

---

# 6. Safety & Threat Engine

## 6.1 Logical Stages

```text
1. Input normalization
        ↓
2. Boundary / injection checks
        ↓
3. Threat extraction
        ↓
4. Contextual risk evaluation
        ↓
5. Severity determination
        ↓
6. Routing decision
```

## 6.2 Threat Tags

Threat tags are non-mutually-exclusive:

- `THREAT_SH`
- `THREAT_V`
- `THREAT_DUAL`
- `THREAT_AMB`
- `THREAT_DIST`
- `THREAT_MED`

A message can carry multiple tags.

Example:

```text
Intentional overdose
       ↓
THREAT_SH + THREAT_MED
       ↓
Level 3 when approved imminent/current-harm criteria are met
```

## 6.3 Structured Classification Result

Example internal result:

```json
{
  "severity": "3",
  "threat_tags": ["THREAT_SH", "THREAT_MED"],
  "confidence": 0.98,
  "classifier_version": "SAFETY-1.0",
  "policy_version": "SCRS-V1.0-2026-08"
}
```

Internal scores and labels must never be displayed to visitors.

Do not persist unnecessary raw model reasoning or chain-of-thought.

---

# 7. LLM Boundary

The LLM is permitted only after the Safety & Threat Engine explicitly allows the normal path.

```text
Safety Decision
│
├── Level 0 → LLM permitted
├── Level 1 → Controlled support policy
├── Level U → LLM prohibited
├── Level 2 → LLM prohibited
└── Level 3 → LLM prohibited
```

For Level U/2/3:

```text
Safety Engine
     ↓
Deterministic Response Engine
     ↓
Response Gateway
```

A downstream component must never downgrade a critical safety state and re-enable unrestricted generation.

---

# 8. Level 3 Crisis Architecture

Level 3 must enter Crisis Safety Mode.

```text
Level 3 Trigger
      │
      ├── Stop normal LLM generation
      │
      ├── Create safety event
      │
      ├── Dispatch critical alert
      │
      ├── Start acknowledgement timer
      │
      └── Display emergency card
```

Emergency hierarchy:

1. Call 112 / seek urgent emergency assistance where immediate physical danger exists.
2. Alert someone physically nearby.
3. Contact Tele-MANAS: 14416 / 1800-89-14416.

Restricted safety interaction may include approved quick replies such as:

- “I called 112”
- “Someone is with me”
- “I cannot call”

Any free-text safety input remains outside the LLM path.

---

# 9. Fail-Safe Architecture

The safety pipeline must fail closed.

```text
Safety Engine
     │
     ├── Success → Normal classification
     │
     ├── Timeout >200ms ──┐
     ├── Crash ──────────┤
     └── Malformed ──────┤
                         ▼
                     FAILSAFE
                         │
                         ▼
                 Emergency Resources
                         │
                         └──► NO unrestricted LLM
```

A signed/static emergency-resource bundle must be available to the client/application so emergency information remains available during database or backend outages.

---

# 10. PostgreSQL Architecture

Recommended logical schemas:

```text
core
safety
admin
audit
reference
knowledge
```

Use migrations for every schema change.

Never modify production schema manually outside the migration process.

---

# 11. Core Database Model

## 11.1 `core.users`

Stores identified users only when identity is required.

```text
user_id UUID PRIMARY KEY
full_name_encrypted BYTEA
email_encrypted BYTEA
phone_encrypted BYTEA
status
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

PII must not be duplicated into message records.

## 11.2 `core.anonymous_sessions`

```text
session_id UUID PRIMARY KEY
session_token_hash
consent_id UUID
status
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
last_activity_at TIMESTAMPTZ
```

Anonymous visitors should not require permanent identity.

## 11.3 `core.conversations`

```text
conversation_id UUID PRIMARY KEY
session_id UUID
user_id UUID NULL
status
current_safety_level
created_at TIMESTAMPTZ
closed_at TIMESTAMPTZ
```

## 11.4 `core.messages`

```text
message_id UUID PRIMARY KEY
conversation_id UUID
sender_type
content_ciphertext BYTEA
risk_level
threat_tags JSONB
classifier_version
safety_policy_version
response_template_version
model_version NULL
knowledge_source_ids JSONB
latency_ms
created_at TIMESTAMPTZ
```

For Levels U/2/3:

```text
model_version = NULL
```

This supports auditable confirmation that generative AI was not used on critical paths.

---

# 12. Safety Database

## `safety.safety_events`

```text
event_id UUID PRIMARY KEY
conversation_id UUID
trigger_message_id UUID
severity_level
threat_tags JSONB
ack_status
deduplication_key
policy_version
created_at
acknowledged_at
resolved_at
```

Severity values:

```text
U
2
3
```

## `safety.classification_results`

Keep structured classifier metadata separate from the message itself.

```text
classification_id UUID PRIMARY KEY
message_id UUID
classifier_version
threat_tags JSONB
intent_class
immediacy_class
plan_indicator
means_indicator
preparation_indicator
current_action_indicator
target_class
uncertainty_score
decision_level
created_at
```

Do not store unnecessary hidden reasoning.

---

# 13. Consent Architecture

## `core.consents`

```text
consent_id UUID PRIMARY KEY
session_id UUID
notice_version
purpose_code
consent_status
consented_at
withdrawn_at
created_at
```

Consent notices must be versioned.

The consent record must make it possible to establish which notice and purposes applied when the session began.

---

# 14. Emergency Resource Registry

## `reference.emergency_resources`

```text
resource_id UUID PRIMARY KEY
resource_code
display_name
jurisdiction
service_scope
primary_phone
alternate_phone
service_url
is_active
availability_hours
verification_interval_days
verified_at
verified_by
created_at
updated_at
```

Emergency resources should use:

```text
Database
   ↓
Application cache
   ↓
Signed static fallback bundle
```

All active resources require periodic verification according to SCRS.

Do not allow emergency numbers to be modified casually through ordinary administrative UI.

---

# 15. Administration & RBAC

## `admin.admin_users`

```text
admin_user_id UUID PRIMARY KEY
email
password_hash
role
mfa_enabled
status
last_login_at
created_at
```

Initial roles:

```text
CLINICAL_REVIEWER
SYSTEM_ADMIN
```

### Clinical Reviewer

May:

- view authorized crisis events;
- inspect transcripts;
- add clinical notes;
- acknowledge/escalate events;
- resolve incidents according to policy.

### System Administrator

May:

- manage infrastructure;
- manage technical configuration;
- manage permissions;
- operate retention jobs;
- manage technical integrations.

Clinical reviewers should not automatically receive infrastructure privileges.

---

# 16. Admin Audit

## `audit.admin_actions`

```text
action_id UUID PRIMARY KEY
admin_user_id UUID
event_id UUID NULL
action_type
target_type
target_id
notes_ciphertext BYTEA
action_timestamp
request_id
```

Examples:

```text
TRANSCRIPT_VIEWED
SAFETY_EVENT_VIEWED
ADMIN_ACKNOWLEDGED
CLINICAL_NOTE_CREATED
MANUAL_REFERRAL
SECONDARY_ESCALATION
INCIDENT_RESOLVED
RESOURCE_VERIFIED
POLICY_CHANGED
```

Every transcript view must generate an immutable audit record.

---

# 17. Notification Architecture

## `safety.notifications`

```text
notification_id UUID PRIMARY KEY
event_id UUID
recipient_role
channel
provider
delivery_status
provider_message_id
attempt_count
dispatched_at
delivered_at
failed_at
created_at
```

Delivery states:

```text
DISPATCHED
DELIVERED
FAILED
ACKNOWLEDGED
SECONDARY_ESCALATION
```

Delivery confirmation and human acknowledgement are separate concepts.

---

# 18. Escalation State Machine

```text
NEW_EVENT
    ↓
DEDUPLICATION_CHECK
    ↓
ALERT_DISPATCHED
    ↓
ALERT_DELIVERED
    ↓
PENDING_ACK
    ├──────────────► ACKNOWLEDGED
    │                     ↓
    │                HUMAN_REVIEW
    │                     ↓
    │                 RESOLVED
    │
    └── timeout ──► SECONDARY_ESCALATION
                          ↓
                    HUMAN_REVIEW
                          ↓
                       RESOLVED
```

Default policy values:

```text
Level 3 acknowledgement = 180 seconds
Level 2 acknowledgement = 900 seconds
Deduplication window = 5 minutes
```

These must be configuration/policy values, not duplicated magic constants.

---

# 19. Deduplication

For an active conversation:

- multiple crisis messages within the configured suppression window remain stored;
- secondary administrative notifications may be suppressed;
- the original safety event remains auditable;
- a worsening severity must never be suppressed.

Example:

```text
Level 2
   ↓
Level 2 repeated message
   ↓
Deduplicate notification

BUT

Level 2
   ↓
Level 3
   ↓
New critical escalation MUST occur
```

---

# 20. Encryption & Security

## Data at Rest

Sensitive PII and message content:

**AES-256**

Recommended approach:

```text
Application
    ↓
Data Encryption Key
    ↓
Encrypted Data
    ↓
Key Encryption Key / KMS
```

Encryption master keys must not be stored in PostgreSQL.

## Data in Transit

**TLS 1.3**

## Passwords

Use a dedicated password hashing algorithm such as **Argon2id**.

Never encrypt passwords reversibly.

---

# 21. API Architecture

Initial API groups:

```text
/api/v1/consent
/api/v1/sessions
/api/v1/conversations
/api/v1/messages
/api/v1/safety
/api/v1/emergency-resources
/api/v1/admin/events
/api/v1/admin/notifications
/api/v1/admin/audit
/api/v1/appointments
```

The browser must never directly communicate with:

- PostgreSQL
- Redis
- LLM provider
- notification provider

All external integrations must be mediated by the backend.

---

# 22. Authentication & Authorization

## Visitor

Use an ephemeral anonymous session token.

## Administration

```text
MFA
 ↓
Authenticated session
 ↓
RBAC
 ↓
Resource-level authorization
 ↓
Audit context
```

Every administrative API request must verify:

1. authenticated identity;
2. role;
3. authorization;
4. audit context.

---

# 23. Rate Limiting & Abuse Protection

Implement:

- IP/session rate limits;
- message-frequency limits;
- request-size limits;
- authentication throttling;
- failed-login lockout;
- notification abuse protection;
- suspicious-request logging.

Rate limiting must not prevent the display of static emergency resources.

---

# 24. RAG Architecture

Normal approved knowledge flow:

```text
Approved Knowledge
      ↓
Document Processing
      ↓
Chunking
      ↓
Embeddings
      ↓
Vector Retrieval
      ↓
Relevant Approved Sources
      ↓
LLM
      ↓
Response Validation
      ↓
Visitor
```

Level 0 responses should retain:

```text
knowledge_source_ids
model_version
prompt_policy_version
response_timestamp
```

The knowledge base must be version-controlled.

---

# 25. Response Validation

For Level 0 responses, validation should check:

- no diagnosis;
- no medication prescribing;
- no unsupported clinical claims;
- no crisis-pathway bypass;
- no impersonation of Dr. Vandana;
- no unsupported claim of emergency/human intervention.

If validation fails, the response must be replaced by an approved safe response.

---

# 26. Observability

Recommended metrics:

```text
safety_classifier_latency_ms
safety_classifier_errors
failsafe_events
level_u_events
level_2_events
level_3_events
llm_invocations
blocked_llm_invocations
notification_delivery_rate
notification_failure_rate
acknowledgement_latency
secondary_escalations
```

Critical security invariant:

```text
Level U/2/3 → unrestricted LLM invocation = 0
```

Any non-zero occurrence must generate an engineering/security alert.

---

# 27. Audit Architecture

Audit events should include:

- event ID;
- timestamp;
- actor/service;
- action;
- target;
- request/correlation ID;
- policy version where relevant;
- result/status.

Audit records must be append-only from the application perspective.

Examples:

```text
SAFETY_EVENT_CREATED
CLASSIFICATION_COMPLETED
FAILSAFE_TRIGGERED
ALERT_DISPATCHED
ALERT_DELIVERED
ALERT_FAILED
TRANSCRIPT_VIEWED
ADMIN_ACKNOWLEDGED
SECONDARY_ESCALATION
CLINICAL_NOTE_CREATED
INCIDENT_RESOLVED
RESOURCE_VERIFIED
POLICY_CHANGED
RETENTION_JOB_COMPLETED
```

---

# 28. Retention Architecture

## `audit.retention_jobs`

```text
job_id UUID PRIMARY KEY
job_type
started_at
completed_at
records_processed
records_deleted
status
execution_hash
```

Target retention from BRD/SCRS:

- Level 0–1: 30 days
- Level U/2/3: 180 days

These are target policies subject to final legal/privacy review.

Safety/audit records under an active permitted audit hold must be isolated and retained only for the documented lawful purpose and period.

---

# 29. Backup & Recovery

PostgreSQL backups must be:

- encrypted;
- access-controlled;
- monitored;
- restore-tested periodically.

Backup retention must respect the approved data-lifecycle policy.

Production recovery procedures must be documented and tested before production launch.

---

# 30. Environment Separation

At minimum:

```text
development
staging
production
```

Rules:

- Production credentials must never be committed to Git.
- Clinical safety testing should use synthetic/test data in staging.
- Production data must never be copied into development without an approved secure process.
- Safety policy changes must be validated in staging before production.

---

# 31. Deployment Architecture

Recommended MVP:

```text
                    INTERNET
                       │
                    CDN/WAF
                       │
                Web Application
                       │
                  FastAPI API
                       │
        ┌──────────────┼───────────────┐
        ↓              ↓               ↓
   PostgreSQL        Redis         LLM/RAG
        │
        ↓
 Encrypted Backups

FastAPI Modules
├── Safety
├── Chat
├── Response
├── Knowledge
├── Notification
├── Admin
├── Appointment
├── Audit
└── Retention
```

The safety path must not depend on LLM provider availability.

---

# 32. CI/CD & Golden Set

Required pipeline:

```text
Code Change
    ↓
Static Checks
    ↓
Unit Tests
    ↓
Safety Golden Set
    ↓
Security Tests
    ↓
Integration Tests
    ↓
Build
    ↓
Staging Verification
    ↓
Approval Gate
```

Critical Golden Set failures block deployment.

The mandatory benchmark is 100% pass on the defined clinically reviewed critical set. This is not a claim of perfect real-world detection.

---

# 33. Database Migration Strategy

Use version-controlled migrations:

```text
migrations/
├── 001_initial_schemas
├── 002_core_tables
├── 003_safety_tables
├── 004_admin_tables
├── 005_audit_tables
├── 006_reference_tables
└── 007_knowledge_tables
```

Exact filenames may follow the chosen migration framework.

No manual production schema changes.

---

# 34. Security Boundaries

Never permit:

```text
Browser → PostgreSQL
Browser → Redis
Browser → LLM Provider
Browser → Notification Provider
```

Required pattern:

```text
Browser
   ↓
Authenticated / controlled Backend API
   ↓
Internal module
   ↓
External integration
```

---

# 35. Clinical vs Engineering Ownership

## Clinical Governance Controls

- risk thresholds;
- safety decision trees;
- crisis response copy;
- emergency-resource approval;
- psychoeducational content;
- Golden Set labels;
- safety policy changes.

## Engineering Controls

- authentication;
- encryption;
- infrastructure;
- APIs;
- database;
- notification delivery;
- audit infrastructure;
- performance;
- reliability;
- automated testing.

Neither side should silently change the other side's controlled domain.

---

# 36. Versioning

Safety-sensitive artifacts must include version metadata.

Required examples:

```text
safety_policy_version
classifier_version
response_template_version
knowledge_base_version
model_version
```

A safety policy change requires:

1. version increment;
2. clinical approval;
3. Golden Set regression;
4. staging verification;
5. production approval.

---

# 37. Production Gate

Production deployment requires:

```text
BRD v2.1 approved
        +
SCRS v1.0 approved
        +
Technical Architecture v1.0 approved
        +
Security verification
        +
Golden Set mandatory cases passed
        +
Clinical governance sign-off
        ↓
PRODUCTION APPROVAL
```

This document is an engineering design baseline and does not itself constitute clinical authorization.

---

# 38. Next Controlled Artifacts

After approval of this architecture:

1. **API Specification v1.0**
2. **PostgreSQL DDL / Migration Specification v1.0**
3. **Safety Golden Set Test Specification v1.0**
4. **Admin Dashboard & RBAC Specification v1.0**
5. **Implementation Plan**
6. **Cursor Engineering Implementation Prompt**

Implementation should begin only after the architecture and required contracts have been reviewed.

---

## Baseline Status

**BRD v2.1:** Frozen  
**SCRS v1.0:** Frozen  
**Technical Architecture & Database Design v1.0:** Engineering Design Baseline  
**Clinical Production Approval:** Not yet granted

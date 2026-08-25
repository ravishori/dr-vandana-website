# Business Requirements Document (BRD)
## Dr. Vandana Wellness Assistant
### Mental Wellness Information & Safety Assistant

**Document Version:** 2.1 — Engineering Freeze Baseline  
**Target Release:** MVP / Phase 1  
**Regulatory & Clinical Alignment:** Designed to support compliance with India’s Digital Personal Data Protection Act, 2023 and aligned with WHO digital mental-health and suicide-prevention guidance frameworks.

---

## 1. Executive Summary & Foundational Principles

The Dr. Vandana Wellness Assistant is an AI-augmented, safety-first web system built to provide psychoeducation, clarify clinical practice offerings, assist with scheduling inquiries, and detect mental-health distress or crisis in real time.

### Core Philosophy

- **Primary Purpose:** The assistant’s objective is to provide safe, evidence-informed information and serve as an accessible conduit to human support, not to prolong engagement.
- **Safety Precedence:** Safety takes absolute precedence over conversational continuity, personalization, response latency, and engagement metrics.

### Strict Guardrails & Out of Scope

- No clinical diagnoses, psychiatric assessments, or medical impressions.
- No medication prescriptions, adjustments, or therapeutic treatment regimens.
- Never impersonate Dr. Vandana or present itself as an autonomous licensed therapist.
- Never claim an emergency service or human responder has been notified unless the handoff has been cryptographically/authentically confirmed and recorded by the backend.

---

## 2. System Architecture & Information Flow

The Generative LLM sits downstream of the Safety & Threat Engine. The safety layer has authority over routing and execution.

**Visitor → Consent & Boundary Layer → Input Gateway → Safety & Threat Engine**

Routing:

- **Level 0:** LLM + approved Knowledge Base/RAG
- **Level 1:** Controlled support flow
- **Level U:** Conservative safe flow; no unrestricted LLM
- **Level 2:** Deterministic safety response engine
- **Level 3:** Deterministic crisis response engine

All safety events flow to the Admin Dashboard and immutable audit store.

---

## 3. Multi-Dimensional Risk & Threat Classification Matrix

Threat typologies:

- Self-Harm / Suicide
- Violence / Harm to Others
- Dual Threat
- Ambiguous / Indirect Risk
- Severe Emotional Distress

### Severity Levels

| Level | Severity | Example | System Action |
|---|---|---|---|
| 🟢 0 | Normal | “What are grounding techniques?” | Approved KB/RAG + LLM |
| 🟡 1 | Distress | “Everything is falling apart.” | Controlled supportive response |
| 🟣 U | Uncertain / Ambiguous | “Tonight everything will finally be over.” | Conservative deterministic safe flow |
| 🟠 2 | Active Risk | “I keep thinking about killing myself.” | Deterministic safety decision tree + high-priority event |
| 🔴 3 | Imminent / Current Harm | “I took a bottle of pills.” | Crisis Safety Mode + critical alert |

Internal classification labels and risk scores must not be exposed to visitors.

---

## 4. Functional Requirements

### Module 1 — Safety Classifier, Fail-Safe Engine & Guardrails

- **FR-1.1:** Safety evaluation target ≤150 ms; hard fail-safe timeout at 200 ms. Timeout, crash, or malformed output must prevent unrestricted LLM invocation and activate fallback resources.
- **FR-1.2:** Prompt injection must not override system safety policy. Adversarial attempts must enter a safe pathway.
- **FR-1.3:** Persistent “I Need Help Now” component with Tele-MANAS, 112, and appointment access.
- **FR-1.4:** Level 3 stops open-ended generation while retaining restricted safety interaction.

### Module 2 — Conversational Orchestration & Traceability

- **FR-2.1:** Level U/2/3 use deterministic, clinically validated logic.
- **FR-2.2:** Level 0 responses record knowledge source IDs, policy version, model version, and timestamp.
- **FR-2.3:** Human handoff is shown only after an authenticated administrative handshake.

### Module 3 — Admin Console & Escalation

- **FR-3.1:** Real-time triage feed: Critical, High Risk, Uncertain, Moderate, Normal.
- **FR-3.2:** Level 3 alerts dispatch multi-channel notifications and use a configurable acknowledgement timer; default 3 minutes.
- **FR-3.3:** Authorized staff can acknowledge, inspect transcripts, log notes, dispatch manual referrals, and resolve incidents.

---

## 5. Security Architecture & Administrative Access

- RBAC separates Clinical Reviewers from System Administrators.
- Bulk transcript exports are disabled by default.
- Transcript viewing is itself an immutable audit event.
- MFA is mandatory.
- 15-minute idle session timeout.
- IP/device session logging.
- Account lockout after five consecutive failed attempts.
- Audited break-glass access is available for high-severity unassigned events.

---

## 6. Data Architecture & DPDP Alignment

The architecture is designed to support DPDP compliance through minimization, pseudonymous session architecture, structural separation of identity from clinical conversation data, and documented data-rights workflows.

Core entities:

- `users`
- `anonymous_sessions`
- `consents`
- `conversations`
- `messages`
- `safety_events`
- `admin_users`
- `admin_actions`
- `notifications`
- `retention_jobs`

Message and PII content must be encrypted before persistent storage. TLS is required in transit.

### Target Data Lifecycle

- Standard Level 0–1 sessions: default target retention 30 days.
- Safety-flagged Level U/2/3 sessions: default target retention 180 days.
- Retention periods remain subject to final legal/privacy review and documented purpose limitation.
- Erasure, consent withdrawal, access, and correction workflows must be supported where legally applicable.

### Boundary Notice

> “This assistant provides mental wellness information and appointment assistance. It is not an alternative to emergency care or clinical psychological evaluation. Conversations are processed securely and retained for safety monitoring and service improvement under our Privacy Policy. Confidentiality cannot be maintained if there is an imminent risk of self-harm or harm to others.”

---

## 7. Clinical Governance & Change Control

### Clinical Ownership

- Safety decision trees
- Crisis-response copy
- Psychoeducational knowledge base
- Escalation rules and thresholds
- Emergency resource numbers

### Engineering Ownership

- Authentication/MFA
- Encryption
- Safety execution and fail-safe behaviour
- Notification APIs
- Immutable audit logging
- Infrastructure and backups

Changes to safety thresholds, decision trees, crisis resources, or response templates require clinical sign-off, version incrementing, staging verification, and Golden Set regression testing.

---

## 8. Non-Functional Requirements

- Safety classifier target ≤150 ms; hard timeout 200 ms.
- End-to-end response target ≤1.5 seconds.
- Safety/crisis modules target 99.99% availability independent of external LLM uptime.
- AES-256 encryption at rest.
- TLS 1.3 in transit.
- Append-only audit store for administrative actions, transcript views, and safety overrides.

---

## 9. Implementation Roadmap

### MVP / Phase 1

- Safety & Threat Engine
- Fail-safe emergency fallback
- Deterministic Level U/2/3 flows
- Granular PostgreSQL entities with version metadata
- Admin triage console
- Escalation timers
- Transcript-view audit logging
- Safety Evaluation Dataset / Golden Set

### Phase 2

- Marathi, Hindi and English multilingual capability
- Guided safety planning
- Cal.com/EHR appointment synchronization
- Data Subject Rights request portal

### Phase 3

- Therapist-client intake preparation
- Verified referral directory
- Institutional/corporate wellness profiles

---

## 10. Engineering Acceptance Criteria

- **AC-1:** Safety timeout/crash forces fail-safe mode and prevents unrestricted LLM invocation.
- **AC-2:** Level U/2/3 completely suppress unrestricted generative pipeline calls.
- **AC-3:** Mandatory clinically reviewed safety regressions achieve 100% pass; no known critical regression may ship.
- **AC-4:** Every message contains required policy/classifier/model provenance metadata where applicable, and transcript views create immutable audit records.
- **AC-5:** Unacknowledged Level 3 events trigger secondary escalation after the configured timer.

### Baseline Status

**BRD v2.1 — FROZEN**

The next controlled artifact is **SCRS v1.0**.

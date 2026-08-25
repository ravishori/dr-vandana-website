# Implementation Plan v1.0
## Dr. Vandana Wellness Assistant — MVP / Phase 1

**Baseline:** BRD v2.1 + SCRS v1.0 + Technical Architecture v1.0  
**Status:** Pre-Implementation Plan  
**Principle:** Build safety infrastructure before conversational intelligence

---

# 1. Implementation Strategy

Use a modular-monolith approach for MVP.

Primary implementation layers:

```text
Frontend
   ↓
FastAPI API
   ↓
Safety / Application Modules
   ↓
PostgreSQL + Redis
   ↓
Controlled External Providers
```

The implementation must proceed in controlled phases with safety gates.

---

# 2. Phase 0 — Repository & Environment Baseline

Tasks:

- confirm repository structure;
- confirm existing website stack;
- establish `docs/wellness-assistant/`;
- confirm BRD/SCRS/Architecture versions;
- establish development/staging configuration;
- configure environment variable strategy;
- configure secret handling;
- establish migration framework;
- establish CI baseline.

**Exit criteria:**

- clean reproducible development environment;
- no production secrets in Git;
- documentation baselines present.

---

# 3. Phase 1 — Database Foundation

Implement:

- PostgreSQL schemas;
- core tables;
- safety tables;
- admin tables;
- audit tables;
- emergency resources;
- knowledge metadata;
- indexes;
- constraints;
- migrations.

Security:

- application encryption;
- key-management integration point;
- database roles;
- least privilege.

**Exit criteria:**

- clean migration succeeds;
- rollback/recovery process documented;
- sensitive fields are protected;
- backup/restore test passes.

---

# 4. Phase 2 — Consent & Session Layer

Implement:

- boundary notice;
- consent versioning;
- anonymous session;
- session expiry;
- conversation lifecycle.

**Exit criteria:**

- chat cannot start without required consent;
- consent version is auditable;
- anonymous sessions work without unnecessary PII.

---

# 5. Phase 3 — Safety & Threat Engine

Implement:

- input normalization;
- boundary/injection defense;
- threat tagging;
- contextual safety evaluation;
- severity routing;
- deterministic policy selection;
- classifier versioning;
- fail-safe timeout.

Target:

- ≤150 ms normal safety execution;
- hard fail-safe at 200 ms.

**Critical exit gate:**

No unrestricted LLM invocation for Level U/2/3.

---

# 6. Phase 4 — Deterministic Safety Flows

Implement:

- Level U flow;
- Level 2 self-harm flow;
- Level 2 violence flow;
- Level 3 Crisis Safety Mode;
- restricted Level 3 actions;
- approved response templates;
- emergency-resource display.

Clinical copy must come from the approved SCRS.

Engineering must not independently rewrite clinical response text.

---

# 7. Phase 5 — Emergency Resource Infrastructure

Implement:

- emergency resource registry;
- verification metadata;
- cache;
- signed/static fallback bundle;
- resource-health checks.

Emergency resource data must be independently verified before production.

---

# 8. Phase 6 — Notification & Escalation

Implement:

- safety event creation;
- deduplication;
- notification dispatcher;
- delivery state;
- retries;
- Level 3 180-second timer;
- Level 2 900-second timer;
- secondary escalation;
- delivery audit.

Critical requirement:

A notification being dispatched must not be represented as human acknowledgement.

---

# 9. Phase 7 — Admin Dashboard

Implement:

- authentication;
- MFA;
- RBAC;
- triage feed;
- event detail;
- transcript access;
- acknowledgement;
- clinical notes;
- manual escalation;
- resolution;
- audit viewer;
- break-glass mechanism.

Every transcript view must generate an audit record.

---

# 10. Phase 8 — Level 0 Knowledge/RAG

Only after the safety pipeline is proven:

Implement:

- approved knowledge source registry;
- document ingestion;
- versioning;
- chunking;
- retrieval;
- embeddings/vector store;
- LLM integration;
- response validation;
- provenance metadata.

Normal LLM access must occur only after safety routing allows it.

---

# 11. Phase 9 — Appointment Integration

Implement:

- consultation information;
- appointment request flow;
- scheduler integration;
- crisis-aware routing.

An active crisis state must take precedence over appointment conversion.

---

# 12. Phase 10 — Golden Set & Security Evaluation

Automate:

- mandatory Golden Set;
- zero-LLM tests;
- false-positive tests;
- adversarial tests;
- timeout tests;
- database outage tests;
- notification failure tests;
- RBAC tests;
- audit tests;
- escalation tests.

Production gate:

**100% pass on mandatory critical Golden Set.**

---

# 13. Phase 11 — Staging Verification

Run:

- functional tests;
- security tests;
- performance tests;
- failure injection;
- notification simulations;
- backup/restore;
- clinical workflow review.

Use synthetic test data.

No real patient/client data should be used for routine development testing.

---

# 14. Phase 12 — Clinical Governance Gate

Clinical reviewer verifies:

- safety decision trees;
- crisis templates;
- emergency resources;
- Golden Set labels;
- escalation workflows;
- dashboard operational procedures.

Engineering verifies:

- safety routing;
- zero-LLM enforcement;
- encryption;
- auditability;
- reliability;
- performance.

Production remains blocked until required sign-offs are complete.

---

# 15. Suggested Implementation Order

```text
Repository Baseline
      ↓
Database
      ↓
Consent / Sessions
      ↓
Safety Engine
      ↓
Deterministic Safety Flows
      ↓
Emergency Resources
      ↓
Notifications / Escalation
      ↓
Admin Dashboard
      ↓
Golden Set
      ↓
Level 0 RAG / LLM
      ↓
Appointments
      ↓
Staging
      ↓
Clinical Governance
      ↓
Production
```

---

# 16. Engineering Workstreams

## Workstream A — Backend

- FastAPI;
- database;
- safety engine;
- orchestration;
- APIs.

## Workstream B — Frontend

- chat;
- emergency UI;
- safety states;
- admin dashboard.

## Workstream C — Security

- authentication;
- MFA;
- RBAC;
- encryption;
- audit;
- secrets.

## Workstream D — AI/RAG

- knowledge ingestion;
- retrieval;
- LLM boundary;
- provenance;
- response validation.

## Workstream E — Safety QA

- Golden Set;
- adversarial testing;
- failure injection;
- zero-LLM verification.

## Workstream F — Clinical Governance

- approve safety logic;
- approve response templates;
- approve resources;
- approve test labels.

---

# 17. Definition of Done — MVP

MVP is not complete until:

- BRD requirements mapped;
- SCRS requirements mapped;
- architecture implemented;
- database migrations pass;
- consent works;
- safety engine works;
- fail-safe works;
- U/2/3 deterministic flows work;
- Level 3 crisis mode works;
- emergency resources have verified fallback;
- notifications/escalation work;
- admin RBAC/MFA works;
- audit trail works;
- Golden Set passes 100%;
- zero-LLM critical-path tests pass;
- security tests pass;
- staging verification passes;
- clinical governance sign-off is complete.

---

# 18. Explicit Non-Goals for MVP

Do not add without a new approved specification:

- autonomous therapy;
- diagnosis;
- medication advice;
- unrestricted crisis conversation;
- autonomous emergency-service dialing;
- autonomous law-enforcement notification;
- therapist impersonation;
- hidden surveillance;
- uncontrolled bulk transcript export.

---

# 19. Change Control

Any change affecting:

- safety thresholds;
- decision trees;
- crisis copy;
- emergency resources;
- escalation timers;
- LLM routing;
- retention;
- access permissions

must be tracked as a controlled change.

Safety-sensitive changes require policy version increment and regression testing.

---

# 20. Recommended Implementation Milestones

### Milestone 1
Architecture + migrations

### Milestone 2
Consent + sessions + safety engine

### Milestone 3
Deterministic crisis flows + emergency resources

### Milestone 4
Notifications + escalation

### Milestone 5
Admin dashboard + RBAC

### Milestone 6
Golden Set + security hardening

### Milestone 7
Controlled Level 0 RAG/LLM

### Milestone 8
Staging + clinical governance

### Milestone 9
Production readiness review

---

# 21. Final Production Gate

```text
Engineering Complete
        +
Security Passed
        +
Golden Set 100%
        +
Operational Readiness
        +
Clinical Governance
        ↓
PRODUCTION APPROVAL
```

No individual engineering milestone should be interpreted as clinical approval.

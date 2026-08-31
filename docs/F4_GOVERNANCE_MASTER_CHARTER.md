# F4 GOVERNANCE MASTER CHARTER v1.0

**Document type:** Governance specification (not implementation)  
**Phase:** F4-A  
**Status:** DRAFT FOR HUMAN REVIEW — domains are **NOT YET DECIDED** unless separately approved  
**Baseline checkpoint:** `b32e1d0` (`security: verify notification and outbox controls`)  
**Related Option B decisions:** `docs/PATIENT_PRACTICE_DECISIONS.md`  
**Related retention (Option B):** `docs/DECISION_DATA_RETENTION.md` (OPEN / LEGAL REVIEW REQUIRED)

This charter does **not** constitute legal, regulatory, or professional compliance.  
Where counsel or licensed professional input is required: **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 1. Purpose

Define binding governance for any future clinical (Option C) functionality on the Dr. Vandana Digital Psychological Care & Practice Platform, so that clinical work cannot proceed without:

- explicit human approval of each governance domain;
- preservation of Option B security foundations;
- privacy, consent, audit, safety, and AI constraints;
- change-control gates before schema, UI, or AI processing.

## 2. Scope

**In scope for this charter:**

- Governance principles and the twelve F4 domains
- Conditions that must precede Option C, clinical databases, clinical UI, and clinical AI
- Decision and approval status vocabulary
- Cross-references to existing Option B decisions

**Out of scope for F4-A (and forbidden by this charter until later authorized phases):**

- Creating clinical tables, APIs, UI, notes, care plans, assessments, check-ins, documents, messaging, or AI clinical workflows
- Production deployment, Production database/secret changes, migrations
- Claiming legal compliance by virtue of this document alone

## 3. Current Option B Boundary

**APPROVED product scope (implementation exists; Production go-live remains separately gated):**

- Authentication, sessions, MFA, recovery, password change
- Patient / psychologist accounts (and architectural `SUPER_ADMIN` without automatic clinical access)
- Appointments, lifecycle, concurrency, idempotency
- Transactional notifications / outbox (worker Production hosting still OPEN)
- Operational dashboards and security/audit infrastructure for Option B
- Legacy Q&A stack (separate auth; not clinical EHR)

**Evidence baseline:** F1-B through F1-D-C security phases; F1-E-A consolidation assessment.

**Explicitly not Option B clinical data:** consultation charts, private/patient-visible clinical notes, clinical documents, assessments as clinical records.

## 4. Future Clinical Scope

Option C (clinical PMS) remains **DEFERRED** and **BLOCKED** for implementation until this charter’s domains are decided and Conditions Before Option C (§19) are satisfied.

Future clinical scope *may* eventually include (subject to domain approval — **NOT YET DECIDED** as product commitments):

- Private psychologist clinical working records
- Explicitly shared patient-visible clinical content
- Consent-governed communication
- Governed assessments / psychometrics
- Safety escalation workflows
- Auditable clinical access
- Constrained AI assistance (never autonomous clinical authority)

Until approved: treat all of the above as **forbidden to implement**.

## 5. Governance Principles

These principles are **binding** for any future clinical work. They are not automatically “approved clinical policy” for a specific jurisdiction; they are platform governance constraints.

### 1. Human Clinical Authority

The psychologist remains the clinical decision-maker. Systems may assist; they must not replace professional judgment.

### 2. Minimum Necessary Access

Users receive only access required for their role and relationship. Role alone is insufficient without resource relationship where applicable.

### 3. Patient Ownership Boundary

Patients may access only records explicitly intended for them (shared / patient-visible), never psychologist-private working content by default.

### 4. Psychologist Private Boundary

Psychologist-only clinical working information must not be exposed merely because it relates to the same patient or appointment.

### 5. Explicit Sharing

Patient-visible clinical information must be intentionally shared (or created as shared). Implicit sharing is forbidden.

### 6. Auditability

Sensitive clinical access and mutations must be attributable to an authenticated actor (and system actor where automated).

### 7. Version Preservation

Clinical records must preserve provenance and history sufficient to reconstruct what was known when.

### 8. No Client-Side Trust

Clinical authorization is server-side. UI hiding is not authorization.

### 9. No Autonomous Clinical AI

AI must not independently diagnose, prescribe, determine treatment plans, or publish clinical decisions without human authority.

### 10. Safety First

Potential crisis information requires explicit human-governed escalation procedures—not silent automation that substitutes for duty of care.

### 11. Data Minimization

Collect and retain only what is necessary for an authorized purpose.

### 12. Purpose Limitation

Clinical information may be used only for purposes authorized by policy, consent, and law (**LEGAL / PROFESSIONAL REVIEW REQUIRED** for jurisdictional mapping).

## 6. Clinical Data Governance Model

Until F4-01 and F4-02 are decided, the interim model is:

```text
Operational / Option B data
        ≠
Clinical data (Option C — BLOCKED)

Within future clinical data (when approved):
  Psychologist-private working record
        ≠
  Patient-shared / patient-visible record
```

**DECISION REQUIRED:** Formal classification taxonomy (labels, examples, storage rules) under F4-01.  
**DECISION REQUIRED:** Exact sharing semantics (share action, revoke, immutable snapshot vs live view) under F4-02.

`SUPER_ADMIN` must **not** receive automatic clinical-data access (already APPROVED architecturally in Option B decisions).

## 7. Privacy Principles

- Privacy notices and terms must truthfully describe accounts, appointments, and (if ever approved) clinical processing.
- Option B Production launch remains **BLOCKED** until privacy/terms/consent copy is updated for accounts (**LEGAL / PROFESSIONAL REVIEW REQUIRED**; see `PATIENT_PRACTICE_DECISIONS.md`).
- Clinical processing requires additional privacy/consent review before any schema or UI.
- Do not invent retention periods in this charter; see F4-09 and `DECISION_DATA_RETENTION.md`.

## 8. Access Control Principles

Pipeline (binding):

```text
Authentication
  → Role check
  → Explicit resource relationship
  → Server-side authorization
  → Data-access authorization
  → Operation
  → Audit/security event where applicable
```

- Deny by default for clinical resources.
- Cross-patient and cross-psychologist access denied unless an approved relationship and permission exist.
- **DECISION REQUIRED:** Final clinical permission matrix (including whether any clinical permission can attach to `SUPER_ADMIN`) — mirrors open decision O20.

## 9. Consent Principles

- Channel consents (e.g. WhatsApp) are not clinical treatment consents.
- Clinical consent categories must be defined before clinical features (**DECISION REQUIRED** under F4-03).
- Child/adolescent independent accounts and parental consent remain **DEFERRED** (**DECISION REQUIRED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**).
- Consent withdrawal effects on existing clinical records: **DECISION REQUIRED**.

## 10. Audit Principles

- Clinical read/write of sensitive records must be attributable.
- Audit must not store passwords, OTPs, MFA secrets, or unnecessary clinical body text (**aligned with Option B APPROVED audit hygiene**).
- Retention of audit vs erasure rights: **LEGAL / PROFESSIONAL REVIEW REQUIRED** (already flagged for Option B history/audit).

## 11. Safety Principles

- Crisis-adjacent content requires human-governed escalation (existing non-clinical crisis resources are not a clinical safety workflow).
- Automated “diagnosis” or autonomous crisis determination by AI is forbidden (Principle 9–10).
- **DECISION REQUIRED:** Escalation contacts, on-call expectations, documentation standards (F4-06).

## 12. AI Governance Principles

- AI may draft or summarize only under explicit human review gates when clinical AI is ever approved.
- AI must not publish clinical records, change diagnoses, or notify patients as if clinically authoritative without human action.
- Training/use of clinical text with third-party models: **DECISION REQUIRED** + **LEGAL / PROFESSIONAL REVIEW REQUIRED**.
- Current public “Ask AI” marketing/educational surfaces must remain non-clinical and must not become Option C by stealth.

## 13. Data Lifecycle Principles

- Classification → collection → use → retention → export → deletion/suppression must be purpose-bound.
- Retention periods: **UNSET** — do not invent (**LEGAL / PROFESSIONAL REVIEW REQUIRED**).
- Export/delete workflows for clinical data: **DECISION REQUIRED** (F4-09); not implemented.

## 14. Change-Control Principles

No clinical schema, API, UI, or AI processing may ship without:

1. Relevant F4 domain status = APPROVED or APPROVED WITH CONDITIONS  
2. Conditions in §§19–22 satisfied  
3. Explicit implementation milestone authorization (separate from this charter)  
4. Security review aligned with F1 invariants (authn/authz, no client trust, audit)

Migrations for clinical tables are **forbidden** until F4-12 and §20 conditions pass.

## 15. The 12 Governance Domains

Approval vocabulary for each domain:

| Status | Meaning |
| --- | --- |
| APPROVED | Domain policy accepted for implementation planning |
| APPROVED WITH CONDITIONS | Accepted subject to listed conditions |
| REQUIRES REVISION | Draft rejected; revise |
| BLOCKED | Must not proceed |
| NOT YET DECIDED | Default for all domains in F4-A |

---

### F4-01 — Clinical Data Classification

| Field | Content |
| --- | --- |
| **Objective** | Define what counts as clinical vs operational vs account/security data |
| **Scope** | Labels, examples, storage rules, prohibited mixes with Option B tables |
| **Key questions** | What is a clinical note vs operational appointment note? Are assessments clinical by default? |
| **Decisions required** | Taxonomy; whether appointment operational fields may ever hold clinical content |
| **Security implications** | Misclassification causes wrong access and audit gaps |
| **Privacy implications** | Wrong class → wrong notice/consent |
| **Implementation dependency** | Blocks all Option C schema |
| **Approval status** | **NOT YET DECIDED** |

### F4-02 — Doctor Private / Patient Shared Record

| Field | Content |
| --- | --- |
| **Objective** | Enforce psychologist-private vs patient-shared boundaries |
| **Scope** | Share/unshare semantics; visibility rules; export views |
| **Key questions** | Is sharing a snapshot or live document? Can patients comment? |
| **Decisions required** | Share model; revoke model; default private |
| **Security implications** | IDOR / over-sharing risk |
| **Privacy implications** | Patient access expectations |
| **Implementation dependency** | Blocks clinical notes UI/API |
| **Approval status** | **NOT YET DECIDED** |

### F4-03 — Patient Consent

| Field | Content |
| --- | --- |
| **Objective** | Define clinical and communication consents |
| **Scope** | Treatment/process consents; channel consents; minors |
| **Key questions** | What consents gate which features? Withdrawal effects? |
| **Decisions required** | Consent catalogue; minors policy (**LEGAL / PROFESSIONAL REVIEW REQUIRED**) |
| **Security implications** | Consent bypass = unauthorized processing |
| **Privacy implications** | Central to lawful/ethical processing |
| **Implementation dependency** | Blocks clinical processing and some channels |
| **Approval status** | **NOT YET DECIDED** |

### F4-04 — Clinical Authorization

| Field | Content |
| --- | --- |
| **Objective** | RBAC + relationship matrix for clinical resources |
| **Scope** | PATIENT / PSYCHOLOGIST / SUPER_ADMIN / STAFF clinical permissions |
| **Key questions** | Can SUPER_ADMIN ever hold clinical permissions? Break-glass? |
| **Decisions required** | Final matrix (O20); break-glass **DECISION REQUIRED** |
| **Security implications** | Privilege escalation / cross-tenant access |
| **Privacy implications** | Minimum necessary access |
| **Implementation dependency** | Blocks clinical APIs |
| **Approval status** | **NOT YET DECIDED** |

### F4-05 — Clinical Record Versioning

| Field | Content |
| --- | --- |
| **Objective** | Provenance, amendments, immutability rules |
| **Scope** | Version history; correction vs silent edit |
| **Key questions** | Soft-delete? Amendment trail? Patient-visible history? |
| **Decisions required** | Version policy; amendment UX rules |
| **Security implications** | Tamper evidence |
| **Privacy implications** | Accuracy and transparency |
| **Implementation dependency** | Blocks write APIs for clinical records |
| **Approval status** | **NOT YET DECIDED** |

### F4-06 — Safety & Escalation

| Field | Content |
| --- | --- |
| **Objective** | Human-governed handling of crisis-adjacent information |
| **Scope** | Escalation paths, documentation, on-call expectations |
| **Key questions** | What triggers escalation? Who is notified? What is logged? |
| **Decisions required** | Escalation SOP (**LEGAL / PROFESSIONAL REVIEW REQUIRED**) |
| **Security implications** | Notification of sensitive events; access to crisis flags |
| **Privacy implications** | Highly sensitive data |
| **Implementation dependency** | Blocks “safety AI” and clinical crisis features |
| **Approval status** | **NOT YET DECIDED** |

### F4-07 — Patient Communication

| Field | Content |
| --- | --- |
| **Objective** | Govern clinical vs operational messaging |
| **Scope** | In-app messages, email/WhatsApp for clinical content, inbox |
| **Key questions** | Is clinical messaging allowed at all? Separate from Option B outbox? |
| **Decisions required** | Allow/deny clinical messaging; channel rules |
| **Security implications** | Recipient integrity (must remain server-derived) |
| **Privacy implications** | Content sensitivity on third-party channels |
| **Implementation dependency** | Blocks clinical inbox/chat |
| **Approval status** | **NOT YET DECIDED** |

### F4-08 — Psychometric / Assessment Governance

| Field | Content |
| --- | --- |
| **Objective** | Govern instruments, scoring, interpretation, storage |
| **Scope** | Assessments, scoring visibility, clinical interpretation |
| **Key questions** | Which instruments? Who sees raw scores? AI scoring allowed? |
| **Decisions required** | Instrument list; interpretation authority (**PROFESSIONAL REVIEW REQUIRED**) |
| **Security implications** | Sensitive psychological data |
| **Privacy implications** | Special-category data risk (jurisdiction-dependent) |
| **Implementation dependency** | Blocks assessment features |
| **Approval status** | **NOT YET DECIDED** |

### F4-09 — Retention / Export / Deletion

| Field | Content |
| --- | --- |
| **Objective** | Lifecycle of clinical (and related) data |
| **Scope** | Retention, export, erasure/suppression, processor copies |
| **Key questions** | Periods? Appointment history immutability vs erasure? |
| **Decisions required** | All periods UNSET — **LEGAL / PROFESSIONAL REVIEW REQUIRED**; do not invent |
| **Security implications** | Over-retention increases breach impact |
| **Privacy implications** | Core rights and duties |
| **Implementation dependency** | Blocks Production clinical go-live; already blocks Option B Production on policy |
| **Approval status** | **NOT YET DECIDED** (Option B retention also OPEN) |

### F4-10 — Clinical Audit & Accountability

| Field | Content |
| --- | --- |
| **Objective** | Who accessed/changed what clinical data |
| **Scope** | Access logs, mutation logs, admin oversight |
| **Key questions** | Read auditing required for all clinical reads? Patient-visible audit? |
| **Decisions required** | Audit event catalogue; retention of audits |
| **Security implications** | Detection of misuse |
| **Privacy implications** | Audit itself is sensitive |
| **Implementation dependency** | Blocks clinical write paths without audit hooks |
| **Approval status** | **NOT YET DECIDED** |

### F4-11 — AI Governance

| Field | Content |
| --- | --- |
| **Objective** | Constrain AI relative to clinical authority and data |
| **Scope** | Assistive drafts, summarization, prohibited autonomous acts |
| **Key questions** | Which models? Is clinical text allowed as input? Human sign-off UX? |
| **Decisions required** | Allowed AI uses; vendor/data processing (**LEGAL / PROFESSIONAL REVIEW REQUIRED**) |
| **Security implications** | Data exfiltration to vendors; prompt injection |
| **Privacy implications** | Processor and purpose limitation |
| **Implementation dependency** | Blocks clinical AI features |
| **Approval status** | **NOT YET DECIDED** |

### F4-12 — Clinical Architecture Approval

| Field | Content |
| --- | --- |
| **Objective** | Gate any clinical technical architecture before build |
| **Scope** | Schema proposals, API surfaces, UI IA, integrations |
| **Key questions** | Who approves? What artifacts required? |
| **Decisions required** | Approval board/roles; required artifacts checklist |
| **Security implications** | Prevents insecure schema sprawl |
| **Privacy implications** | Ensures DPIA/PIA triggers are considered (**LEGAL REVIEW REQUIRED**) |
| **Implementation dependency** | Blocks migrations and clinical milestones |
| **Approval status** | **NOT YET DECIDED** |

## 16. Cross-Domain Dependencies

```text
F4-01 Classification
   → F4-02 Private/Shared
   → F4-04 Authorization
   → F4-05 Versioning
   → F4-10 Audit

F4-03 Consent ──┬→ F4-07 Communication
                └→ F4-08 Assessments

F4-06 Safety ←→ F4-07 Communication ←→ F4-11 AI

F4-09 Retention ← all clinical domains

F4-12 Architecture Approval ← all domains APPROVED / APPROVED WITH CONDITIONS
```

## 17. Governance Approval Matrix

| Domain | Owner input needed | Legal/professional review | Tech dependency | Status |
| --- | --- | --- | --- | --- |
| F4-01 | Practice owner | Yes if special-category mapping | Schema | NOT YET DECIDED |
| F4-02 | Practice owner | Yes (patient expectations) | Notes model | NOT YET DECIDED |
| F4-03 | Practice owner | **Required** | Consent store | NOT YET DECIDED |
| F4-04 | Practice owner + security | Yes for break-glass | RBAC | NOT YET DECIDED |
| F4-05 | Practice owner | Possibly | History model | NOT YET DECIDED |
| F4-06 | Practice owner | **Required** | Escalation workflows | NOT YET DECIDED |
| F4-07 | Practice owner | Yes (channels) | Messaging | NOT YET DECIDED |
| F4-08 | Practice owner | **Required** | Assessments | NOT YET DECIDED |
| F4-09 | Practice owner | **Required** | Jobs/export | NOT YET DECIDED |
| F4-10 | Practice owner + security | Yes (audit retention) | Audit events | NOT YET DECIDED |
| F4-11 | Practice owner | **Required** | AI adapters | NOT YET DECIDED |
| F4-12 | Practice owner + architecture | DPIA trigger | All builds | NOT YET DECIDED |

## 18. Outstanding Decisions

**DECISION REQUIRED** (non-exhaustive; each blocks premature Option C):

1. Clinical data taxonomy (F4-01)  
2. Private vs shared share/revoke model (F4-02)  
3. Clinical consent catalogue and minors policy (F4-03)  
4. Clinical permission matrix including SUPER_ADMIN (F4-04 / O20)  
5. Break-glass emergency access (F4-04)  
6. Versioning and amendment rules (F4-05)  
7. Safety escalation SOP (F4-06)  
8. Whether clinical patient messaging is allowed (F4-07)  
9. Assessment instruments and interpretation authority (F4-08)  
10. Retention/export/deletion periods (F4-09) — **do not invent**  
11. Clinical audit event catalogue (F4-10)  
12. Allowed AI clinical-assist uses and vendors (F4-11)  
13. Architecture approval authority and artifacts (F4-12)  
14. Option B privacy/terms update for accounts (existing Production BLOCKER)  
15. Production worker hosting and backup RPO/RTO (operational; not clinical, but go-live)

## 19. Conditions Before Option C

Option C implementation remains **BLOCKED** until:

1. F4 Governance Master Charter reviewed by practice owner  
2. Domains F4-01, F4-02, F4-03, F4-04, F4-09, F4-10, F4-12 at least **APPROVED** or **APPROVED WITH CONDITIONS**  
3. Privacy/terms/consent copy updated for any clinical claims (**LEGAL / PROFESSIONAL REVIEW REQUIRED**)  
4. Explicit written authorization for an Option C implementation milestone  
5. Option B security invariants remain green (authn/authz, appointment integrity, notification recipient integrity)

## 20. Conditions Before Clinical Database Creation

**Forbidden** until:

1. F4-01, F4-02, F4-04, F4-05, F4-09, F4-12 APPROVED / APPROVED WITH CONDITIONS  
2. Written schema proposal reviewed under F4-12  
3. Migration plan with rollback/verification strategy  
4. Separate explicit authorization to create migrations (not granted by F4-A)

## 21. Conditions Before Clinical UI

**Forbidden** until:

1. Relevant domain approvals (at least F4-02, F4-03, F4-04, F4-07 as applicable)  
2. Server-side authorization design reviewed  
3. No reliance on UI hiding for isolation  
4. Explicit UI milestone authorization

## 22. Conditions Before AI Processing

**Forbidden** for clinical content until:

1. F4-11 APPROVED / APPROVED WITH CONDITIONS  
2. F4-01 classification allows the proposed inputs  
3. Vendor/data-processing review (**LEGAL / PROFESSIONAL REVIEW REQUIRED**)  
4. Human sign-off UX defined (no autonomous clinical publication)  
5. Explicit AI milestone authorization

## 23. Governance Change-Control Process

1. Propose change to a domain or this charter (document diff)  
2. Mark impacted domains REQUIRES REVISION or NOT YET DECIDED as needed  
3. Obtain practice-owner decision (and legal/professional review when flagged)  
4. Update status to APPROVED / APPROVED WITH CONDITIONS / BLOCKED  
5. Only then authorize an engineering milestone  
6. Engineering must not “interpret silence as approval”

## 24. Final Approval Criteria

This charter reaches **APPROVED** (as a governance framework) only when:

- Practice owner explicitly accepts §§5–14 principles  
- Approval matrix (§17) is updated from NOT YET DECIDED for domains needed by the next planned clinical milestone  
- Outstanding decisions affecting that milestone are closed or explicitly deferred with BLOCKED implementation  

F4-A itself only **authors** the charter; it does **not** auto-approve any domain.

---

## Document control

| Version | Date | Authoring phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-A | Initial charter; all domains NOT YET DECIDED |

**Next recommended governance domain to decide:** **F4-01 Clinical Data Classification** (foundation for F4-02/F4-04/F4-12).  
Do not begin F4-01 implementation or domain workshop automation without separate authorization.

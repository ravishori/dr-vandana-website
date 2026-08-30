# F4-01 CLINICAL DATA CLASSIFICATION & DATA GOVERNANCE SPECIFICATION v1.0

**Document type:** Governance / classification specification (not implementation)  
**Phase:** F4-01  
**Status:** DRAFT — **NOT YET DECIDED** (practice-owner review required)  
**Baseline checkpoint:** `b32e1d0`  
**Parent charter:** `docs/F4_GOVERNANCE_MASTER_CHARTER.md`  
**Related:** `docs/PATIENT_PRACTICE_DECISIONS.md`, `docs/DECISION_DATA_RETENTION.md`

This document does **not** constitute legal or regulatory compliance.  
Where counsel or licensed professional input is required: **LEGAL / PROFESSIONAL REVIEW REQUIRED**.  
Retention periods are **UNSET** — do not invent them (F4-09).

---

## 1. Purpose

Answer:

> What categories of information may the future clinical platform encounter, store, process, share, audit, or generate, and what governance rules apply to each category?

Establish a precise, reviewable taxonomy that is:

- understandable and extensible;
- privacy-, authorization-, and audit-aware;
- clinically appropriate without prescribing diagnoses or schemas;
- **implementation-neutral** (no tables, APIs, or UI).

## 2. Scope

**In scope:** Classification framework; current Option B inventory; future clinical category proposals; invariants; open decisions.

**Out of scope / forbidden by this phase:** Clinical schema, migrations, APIs, UI, assessments, safety detection, AI clinical processing, Production changes, commits.

Option C remains **BLOCKED**.

## 3. Relationship to F4 Governance Charter

F4-01 elaborates charter domain **F4-01 Clinical Data Classification**. It does **not** rewrite F4-A.

Dependencies: F4-01 → F4-02 (private/shared) → F4-03 (consent) → F4-04 (authorization) → … → F4-12 (architecture approval).

Charter interim model remains:

```text
Operational / Option B data  ≠  Clinical data (Option C — BLOCKED)
```

## 4. Current Option B Data Boundary

**Layer A — implemented today** (Postgres identity + appointments; plus separate Q&A/crisis SQLite stores; public marketing content):

- Account/identity, sessions, MFA, OTP
- Non-clinical patient/psychologist profiles
- Appointments, history, scheduling configuration
- Transactional notification outbox/deliveries (non-sensitive operational payloads)
- Audit logs / security events
- Legacy psychology question portal (not an EHR)

**Not present in Option B:** consultation charts, clinical notes, care plans, assessments-as-clinical-records, clinical document vaults, clinical messaging inbox.

Evidence: `src/lib/identity/schema.ts`, `src/lib/appointments/schema.ts`, `docs/PATIENT_PRACTICE_DECISIONS.md`.

## 5. Future Clinical Data Boundary

**Layer B — GOVERNANCE PROPOSAL — NOT IMPLEMENTED**

Categories that a future governed clinical system *may* contain if Option C is later approved. Listing a category here is **not** product commitment and **not** authorization to build.

## 6. Classification Principles

1. Not all patient-related data is clinical.  
2. Provenance matters (patient vs psychologist vs system vs AI).  
3. Authority matters (self-report ≠ clinical observation ≠ clinical decision ≠ AI draft).  
4. Visibility is not implied by authentication or “same patient.”  
5. Content may force reclassification (**CONTENT-DEPENDENT CLASSIFICATION**).  
6. Minimization and purpose limitation apply before collection.  
7. `SUPER_ADMIN` operational privilege ≠ clinical visibility (invariant; detail in F4-04).  
8. Do not invent legal retention, consent periods, or compliance claims.

## 7. Top-Level Data Taxonomy

| Code | Category | Layer |
| --- | --- | --- |
| A | Public / general information | Current + ongoing |
| B | Account / identity data | Current Option B |
| C | Operational practice data | Current Option B |
| D | Communication data | Current (partial) + future |
| E | Patient-provided wellness data | Future proposal |
| F | Clinical data (general) | Future proposal |
| G | Clinical-private data | Future proposal |
| H | Clinical-shared data | Future proposal (F4-02) |
| I | Collaborative data | Future proposal (F4-02) |
| J | Assessment data | Future proposal (F4-08) |
| K | Safety-sensitive data | Future proposal (F4-06) |
| L | Clinical document data | Future proposal |
| M | Audit / security data | Current Option B (+ future clinical audit events) |
| N | System / technical metadata | Current + future |

## 8. Current-State Data Inventory

### 8.1 Postgres — identity (`src/lib/identity/schema.ts`)

| Entity / fields (summary) | Current role | Taxonomy |
| --- | --- | --- |
| `users` (email, mobile, password hash, status, verification timestamps) | Account/security | B |
| `roles`, `permissions`, `user_roles`, `role_permissions` | Authorization metadata | N / B |
| `patient_profiles` (`display_name`, optional `date_of_birth`, `gender`, `emergency_contact`, WhatsApp consent flags) | Non-clinical profile + channel consent | B; emergency contact = **sensitive personal**, not a clinical note; WhatsApp flags = channel consent ≠ clinical consent |
| `psychologist_profiles` (`display_name`) | Practice identity | B |
| `sessions`, `password_reset_tokens`, `email_verifications`, `phone_verifications`, `otp_attempts` | Auth lifecycle (hashes/outcomes, not OTP codes in audit) | B / M |
| `mfa_credentials`, `mfa_recovery_codes` | Privileged auth | B (high sensitivity security) |
| `audit_logs`, `security_events` | Accountability | M |

### 8.2 Postgres — appointments (`src/lib/appointments/schema.ts`)

| Entity / fields (summary) | Current role | Taxonomy |
| --- | --- | --- |
| `appointment_types`, `practice_*`, `availability_exceptions` | Scheduling configuration | C |
| `appointments` (parties, type, status, times, occupied range, version, cancel reason/note) | Operational scheduling | C; `cancel_note` may be **CONTENT-DEPENDENT** if free text carries clinical/safety content — **DECISION REQUIRED** |
| `appointment_history` | Append-only operational trail | C / M |
| `appointment_notification_outbox` (`payload_non_sensitive`) | Durable operational events | C / D / N |
| `appointment_notification_deliveries` / `attempts` | Dispatch status | C / N |
| `booking_idempotency` | Replay safety | N |

### 8.3 Other stores (not Option B clinical)

| Store | Current role | Taxonomy |
| --- | --- | --- |
| Question portal SQLite | Public Q&A / psychologist review of questions | D (communication); **not** clinical EHR |
| Crisis resource SQLite | Non-clinical crisis *resources* governance | A / operational safety resources — **not** patient clinical crisis records |
| Public site content | Education/marketing | A |
| Public `/book-appointment` enquiry | Operational enquiry email path | D / C |

## 9. Future Clinical Data Categories

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED**

| Category | Intent | Notes |
| --- | --- | --- |
| E Wellness | Patient self-report wellbeing | Not automatically clinical — transition rule **DECISION REQUIRED** |
| F Clinical (general) | Treatment-related professional information | Umbrella; prefer G/H/I when possible |
| G Clinical-private | Psychologist-only working information | Default private (F4-02) |
| H Clinical-shared | Intentionally patient-visible clinical content | Explicit share only |
| I Collaborative | Jointly maintained artifacts | Not all shared data is collaborative |
| J Assessment | Instruments, responses, scores, interpretation | Split subtypes (§19) |
| K Safety-sensitive | Crisis / harm concerns | Handling = F4-06 |
| L Clinical documents | Reports/files | Extension point; storage deferred historically |

## 10. Classification Dimensions

For each category, evaluate:

| Dimension | Question |
| --- | --- |
| Subject | Whom does it concern? |
| Source | Who/what generated it? |
| Purpose | Why collected? |
| Sensitivity | How sensitive? |
| Clinical status | Is it clinical? |
| Visibility | Who may see it? |
| Mutability | Can it change? |
| Versioning | Does history matter? |
| Consent | Explicit consent required? |
| Audit | Access/mutation audited? |
| Retention | Policy required? (periods UNSET) |
| Export / Deletion | Future handling? |
| AI | May AI process? |
| Sharing | Share with patient? |
| Safety | Escalation possible? |

## 11. Detailed Classification Matrix

Legend: **Y** = Yes, **N** = No, **C** = Conditional, **?** = **NOT YET DECIDED**

| Category | Examples | Current/Future | Clinical? | Sensitivity | Patient visible? | Psychologist visible? | Admin visible? | Consent | Audit | Versioning | AI | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A Public | Site pages, education | Current | N | Low | Y | Y | Y | N | N | N | C | Public |
| B Account/identity | email, mobile, names | Current | N | High | Own | Practice-bound | Ops limited | Channel C | Y | C | ? | No clinical body |
| C Operational | appointments, slots | Current | N | Med | Own appts | Own calendar | Ops C | Ops | Y | Y history | ? | Not EHR |
| D Communication | Q&A, appt emails | Current+future | C | Med–High | C | C | N clinical | C | C | C | ? | Content-dependent |
| E Wellness | mood/sleep self-report | Future | C | Med | Own | C | N | ? F4-03 | ? | ? | ? | Transition rule open |
| F Clinical general | interventions, progress | Future | Y | High | C | Y (authz) | N auto | ? | Y | Y | ? | Prefer G/H |
| G Clinical-private | working notes | Future | Y | Very high | N | Y | N auto | ? | Y | Y | ? | F4-02 |
| H Clinical-shared | shared goals/guidance | Future | Y | High | Y (shared) | Y | N auto | ? | Y | Y | ? | Explicit share |
| I Collaborative | joint plans | Future | Y | High | Y | Y | N auto | ? | Y | Y | ? | F4-02 |
| J Assessment | responses/scores/interp | Future | Y | Very high | C by subtype | Y | N auto | ? | Y | Y | ? | F4-08 |
| K Safety-sensitive | crisis-related content | Future | Y/C | Critical | C | Y | N auto | ? | Y | Y | N auto | F4-06 |
| L Clinical docs | reports/files | Future | Y | High | C | Y | N auto | ? | Y | Y | ? | Deferred storage |
| M Audit/security | access, auth fails | Current+future | N | High | N | Limited | Ops C | N | self | C | N | No clinical bodies |
| N Metadata | ids, timestamps, status | Current+future | N | Low–Med | C | C | C | N | C | C | C | Supportive |

## 12. Data Source / Provenance Model

| Source | Meaning |
| --- | --- |
| Patient-generated | Entered by the patient |
| Psychologist-generated | Entered by the psychologist |
| System-generated | Infrastructure (sessions, outbox status, locks) |
| AI-generated | Machine suggestion (**future**) — never automatically authoritative |

Provenance must be retained for patient-generated and clinical records (Invariant 5).

## 13. Authority Model

```text
Patient self-report
  ≠ Psychologist clinical observation
  ≠ AI-generated suggestion
  ≠ Clinical decision (human)
  ≠ Operational fact (schedule/status)
  ≠ System event
```

| Authority class | Examples |
| --- | --- |
| Authoritative clinical record | Only after human clinical authority rules (future) |
| Patient self-report | Wellness entries, some messages |
| Professional observation | Private notes (future) |
| Operational fact | Appointment start time, status |
| System event | Delivery SENT, session revoked |
| AI suggestion | Draft only until approved (F4-11) |
| Derived metric | Scores/calculations — not diagnosis |

## 14. Visibility Model

Governance meanings only — **Detailed sharing policy belongs to F4-02. Do not implement VisibilityScope.**

### `CLINICAL_ONLY` (proposed meaning)

- Create: authorized psychologist (relationship-bound) — **?** exact roles  
- Read: authorized clinical professionals — **not** patient by default; **not** SUPER_ADMIN by default  
- Modify: authorized psychologist per versioning rules (F4-05)  
- Share: explicit action to leave this class  
- Revocable sharing: **DECISION REQUIRED — F4-02**  
- Audit: **YES** for create/read/modify/share transitions (F4-10)

### `SHARED_READ` (proposed meaning)

- Patient may read; typically not edit  
- Create/publish: psychologist (or approved process)  
- Revoke / audit: **DECISION REQUIRED — F4-02**

### `SHARED_COLLABORATIVE` (proposed meaning)

- Both parties may contribute under rules  
- Not implied by SHARED_READ  
- **DECISION REQUIRED — F4-02**

## 15. Patient vs Psychologist vs Administrator Boundaries

| Actor | Operational Option B | Future clinical |
| --- | --- | --- |
| Patient | Own profile/appointments (bounded) | Only shared/collaborative as approved |
| Psychologist | Own calendar/practice patients (bounded) | Private + shared per F4-02/F4-04 |
| SUPER_ADMIN | Architectural config role; **no automatic clinical access** (APPROVED in Option B decisions) | **Admin clinical blindness** invariant — detail F4-04 |

## 16. Clinical vs Operational Boundary

| Example | Classification |
| --- | --- |
| Appointment start/end, status, type | Operational (C) |
| Appointment reminder email | Operational communication (D/C) |
| Therapy progress narrative | Clinical (F/G/H) — future |
| Free-text cancel note / enquiry body | **CONTENT-DEPENDENT** — may stay operational or escalate to D/K |
| Profile display name | Account (B) |
| Emergency contact field | Sensitive personal (B); not a clinical case note |

Do not create implementation rules yet.

## 17. Patient-Provided Wellness Data

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED**

Examples: self-reported mood, stress, sleep, activity, reflections.

**Governance question (DECISION REQUIRED):** When does wellness data become clinical data?

Possible future triggers (not decided): clinician adoption into clinical record; explicit “clinicalize” action; safety content detection (F4-06); patient request to share as clinical.

Until decided: treat wellness as **non-clinical by default** if ever collected, unless policy says otherwise.

## 18. Communication Data

| Current | Role |
| --- | --- |
| Appointment transactional notifications | Operational; payloads non-sensitive by design |
| Q&A portal questions | Communication; not EHR |
| Future clinical messaging | **DECISION REQUIRED — F4-07** |

**CONTENT-DEPENDENT CLASSIFICATION:** Same channel may carry operational, wellness, clinical, or safety-sensitive content. Governance must define classification/triage responsibilities without assuming keyword AI.

## 19. Assessment Data

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED** — detail F4-08.

Separate:

1. Instrument metadata  
2. Patient responses  
3. Raw score  
4. Derived score  
5. Psychologist interpretation  
6. Patient-facing explanation  
7. AI-generated suggestion  

```text
raw result ≠ interpretation ≠ diagnosis
```

Visibility may differ by subtype — **NOT YET DECIDED**.

## 20. Safety-Sensitive Data

**Why sensitive:** Immediate welfare risk; misuse or leakage has severe harm.  

**Potential accessors:** Authorized clinicians; emergency pathways — **DECISION REQUIRED — F4-06**.  

**Why normal handling may be insufficient:** Urgency, notification restrictions, specialized audit, human escalation.  

**Not in F4-01:** Keyword detection, AI detection, automated emergency SMS, crisis workflows.

Existing crisis *resource* pages/stores are **not** patient clinical crisis records.

## 21. Clinical Documents

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED.** Object storage remains deferred extension point (`PATIENT_PRACTICE_DECISIONS.md`). Classification must distinguish psychologist-generated vs patient-provided documents and visibility (G/H/L).

## 22. Audit / Security Data

Current: `audit_logs`, `security_events` — must not store passwords, OTPs, private clinical bodies (Option B APPROVED hygiene).

Future clinical audit events (access/share/export) — F4-10; must avoid unnecessarily duplicating clinical content in metadata.

## 23. AI-Related Data

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED** — F4-11.

| Kind | Authority |
| --- | --- |
| Source clinical data used as input | Still clinical; AI access gated |
| AI input package | Derived processing artifact |
| AI output / draft | Suggestion only |
| Psychologist-approved output | May become clinical if explicitly adopted |
| Rejected suggestion | Non-authoritative; retention **?** |

```text
AI output ≠ Authoritative clinical record
```

unless explicitly reviewed and approved by the authorized psychologist.

Public educational Ask-AI must not silently become Option C.

## 24. Derived / Interpreted Data

| Kind | Rule |
| --- | --- |
| Raw | Directly recorded |
| Derived | Calculated; inherits sensitivity; not automatic diagnosis |
| Interpreted | Professional judgment |
| AI-generated | Suggestion until approved |

## 25. Data Minimization

Minimize collection especially for: free-text operational notes; emergency contact over-collection; wellness fields without purpose; assessment items beyond instrument need; AI prompts containing excess clinical text.

Ask for every category: *Is this necessary for the stated purpose?*

## 26. Purpose Limitation

| Category | Intended purpose (current or proposed) | Prohibited secondary use (examples) |
| --- | --- | --- |
| B Account | Auth / contact | Marketing without consent — **LEGAL REVIEW** |
| C Appointments | Scheduling | Clinical charting by dumping notes into cancel fields |
| D Notifications | Operational updates | Embedding clinical note bodies |
| G Private clinical | Professional care | Admin browsing, AI training without approval |
| J Assessments | Clinical measurement | Public analytics of identified patients |

AI processing of clinical categories requires separate F4-11 approval. Sharing requires F4-02/F4-03.

## 27. Consent Dependencies

| Likely needing explicit consent | Possibly practice-operations | Special handling |
| --- | --- | --- |
| Clinical processing (future) | Appointment ops, security | Minors, WhatsApp channel, AI vendors |
| Clinical messaging | Transactional appointment email | Safety disclosures |

WhatsApp opt-in today = **channel consent**, not clinical treatment consent.

Unresolved: **DECISION REQUIRED — F4-03** (catalogue, withdrawal, minors).

## 28. Minor / Dependent User Considerations

Classification and access may differ by age, guardian relationship, legal authority, capacity, consent model.

Child/adolescent independent accounts remain **DEFERRED** in Option B decisions.

**LEGAL / PROFESSIONAL REVIEW REQUIRED** — do not invent policy. Detail in F4-03.

## 29. Notification Restrictions

Must **never** place into ordinary transactional appointment notifications (current or future):

- clinical-private notes / formulations  
- assessment raw responses or scores (unless a future domain explicitly approves a minimal patient-facing notice — **NOT YET DECIDED**)  
- safety-sensitive narratives  
- AI drafts  

Current architecture stores `payload_non_sensitive` only — preserve this boundary (F1-D-C).

## 30. Search / Analytics Considerations

| Concern | Guidance |
| --- | --- |
| Global search over clinical-private | Default **should not** — architecture later |
| Identified clinical analytics | **DECISION REQUIRED** + legal review |
| Aggregate de-identified metrics | **DECISION REQUIRED** |
| Operational scheduling analytics | Generally operational |

Do not implement search/analytics here.

## 31. Export / Deletion Considerations

Cross-reference **F4-09**. Periods **UNSET**.

| Category | Export (future) | Deletion (future) |
| --- | --- | --- |
| B/C Option B | Likely needed | Conditional (policy OPEN) |
| G/H/J/K clinical | Likely regulated | Often restricted / retention-bound |
| M Audit | Conditional | Often retention-bound vs erasure |

Do not implement export/deletion.

## 32. Classification Invariants

1. Clinical data must never be exposed merely because the caller is authenticated.  
2. Patient ownership does not automatically imply visibility into psychologist-private clinical information.  
3. Operational administrators (`SUPER_ADMIN`) do not automatically receive clinical visibility.  
4. AI-generated output is not authoritative clinical information without human approval.  
5. Patient-generated information must retain its provenance.  
6. Clinical information requires appropriate purpose and access controls.  
7. Safety-sensitive information requires governed handling (F4-06).  
8. Clinical records must not be casually mixed with ordinary notification payloads.

## 33. Security Requirements

Classification should influence (when implemented later): authorization predicates, encryption-at-rest expectations for high-sensitivity classes, logging redaction, backup access roles, export controls, notification content policy, AI allow-lists.

**Do not implement technical controls in F4-01.**

## 34. Cross-Domain Dependencies

```text
F4-01 Clinical Data Classification
      ↓
F4-02 Private / Shared
      ↓
F4-03 Consent
      ↓
F4-04 Authorization
      ↓
F4-05 Versioning
      ↓
F4-06 Safety
      ↓
F4-07 Communication
      ↓
F4-08 Assessments
      ↓
F4-09 Retention
      ↓
F4-10 Audit
      ↓
F4-11 AI
      ↓
F4-12 Architecture
```

F4-01 is foundational for schema proposals, sharing, consent mapping, and AI input eligibility.

## 35. Outstanding Decisions

**DECISION REQUIRED** unless noted as already decided elsewhere:

1. Final clinical taxonomy labels/storage rules (this draft is proposal)  
2. Exact definition boundary: operational free text vs clinical  
3. Wellness → clinical transition rule  
4. Message / cancel-note content classification process  
5. Private/shared/collaborative semantics — **F4-02**  
6. Assessment subtype visibility — **F4-08**  
7. Safety-sensitive access & escalation — **F4-06**  
8. Minors/dependents — **F4-03** + **LEGAL / PROFESSIONAL REVIEW REQUIRED**  
9. AI input/output classes — **F4-11**  
10. Analytics on clinical data  
11. Export classification — **F4-09**  
12. Deletion/suppression vs immutable history — **F4-09** + legal review  
13. Whether emergency_contact remains account-only or gains clinical coupling  

**Already established (authoritative Option B docs):** Option C deferred/blocked; SUPER_ADMIN no automatic clinical access; clinical notes/documents deferred; no inventing retention periods.

## 36. Legal / Professional Review Requirements

**LEGAL / PROFESSIONAL REVIEW REQUIRED** for: consent; minors; retention/deletion; clinical record duties; emergency/safety handling; assessment instruments; AI processing of clinical text; cross-border processors; patient export rights mapping.

This specification is **not** a Privacy Impact Assessment completion.

## 37. Implementation Restrictions

F4-01 does **NOT** authorize:

- schema/enums/migrations  
- clinical code, APIs, Server Actions, UI  
- AI, safety detectors, sharing controls  
- Production changes  

Future architectural consideration only: classification enums/tables — **not created here**.

## 38. F4-01 Approval Status

**NOT YET DECIDED**

This document is a **draft classification framework** for human/practice-owner review. It becomes APPROVED / APPROVED WITH CONDITIONS / REQUIRES REVISION / BLOCKED only by explicit governance decision — not by authorship alone.

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-01 | Initial classification draft; all policy decisions open unless cited |

**Recommended next domain:** **F4-02 — Doctor Private / Patient Shared Record** (do not start without authorization).

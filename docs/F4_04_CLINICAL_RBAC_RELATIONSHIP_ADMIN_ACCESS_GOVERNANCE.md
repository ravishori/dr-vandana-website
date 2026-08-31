# F4-04 CLINICAL RBAC, RELATIONSHIP & ADMINISTRATIVE ACCESS GOVERNANCE v1.0

**Document type:** Governance specification (not implementation; not legal certification)  
**Phase:** F4-04  
**Status:** DRAFT — **NOT YET DECIDED**  
**Baseline checkpoint:** `b32e1d0`  
**Parents:** `docs/F4_GOVERNANCE_MASTER_CHARTER.md`, `docs/F4_01_CLINICAL_DATA_CLASSIFICATION.md`, `docs/F4_02_PRIVATE_SHARED_RECORD_GOVERNANCE.md`, `docs/F4_03_PATIENT_CONSENT_GOVERNANCE.md`  
**Option B decisions:** `docs/PATIENT_PRACTICE_DECISIONS.md` (§2.5 RBAC; §2.10 SUPER_ADMIN ≠ clinical authority — **APPROVED** architecturally)

This document is **not** legal advice and does **not** claim regulatory compliance.  
**LEGAL / PROFESSIONAL REVIEW REQUIRED** where marked. Retention periods remain **UNSET** (F4-09).

---

## 1. Purpose

Define:

> Who may access which information, belonging to which patient, under which professional relationship, for which purpose, and with which permitted action?

Reject:

```text
AUTHENTICATED → ROLE = PSYCHOLOGIST → ACCESS EVERYTHING
```

Evaluate instead:

```text
AUTHENTICATION → ROLE → IDENTITY → PATIENT RELATIONSHIP → RELATIONSHIP STATUS
  → DATA CLASSIFICATION → PURPOSE → VISIBILITY → ACTION → AUDIT
```

Governance model only — not an implementation specification.

## 2. Scope

**In scope:** Clinical RBAC principles; relationship/access concepts; administrative blindness; matrices; threats; invariants; open decisions.

**Out of scope / forbidden:** Clinical RBAC tables, relationship/permission schemas, migrations, authz code/middleware/Server Action changes, break-glass/delegation/supervision/sharing/assessment/AI/safety implementation, UI, Option C, Production, commits.

Option C remains **BLOCKED**.

## 3. Governing Documents

Authoritative inputs listed in the header. Also: F1-B patient isolation, F1-C auth/session/MFA, F1-D appointment integrity and notification security.

Conflicts must be marked **DECISION REQUIRED**, not silently resolved.

**Known continuity (aligned, not conflicting):** Option B already requires `Authentication + Role + Resource ownership + Permission` and states SUPER_ADMIN ≠ unrestricted clinical access. F4-04 extends that model for future clinical resources without treating Option B appointment ownership as permanent clinical authority.

## 4. Current Option B Boundary

| Current (evidence) | Clinical authority? |
| --- | --- |
| Roles: `SUPER_ADMIN`, `PSYCHOLOGIST`, `STAFF` (reserved), `PATIENT` (`src/lib/identity/constants.ts`) | Operational roles; clinical permissions enums exist but are **DEFERRED** with Option C |
| Appointment ownership: patient ↔ psychologist via `patientUserId` / `psychologistUserId` | Practice/scheduling ownership — **not** clinical relationship |
| Cross-patient / cross-psychologist isolation (F1-B tests) | Security baseline for Option B |
| MFA required for `PSYCHOLOGIST` / `SUPER_ADMIN` | Authentication hardening — not clinical ACL |
| Notification workers / outbox | Machine operational delivery — not human clinical authority |
| `/super-admin/*` UI | **DEFERRED**; architecture forbids automatic clinical access |

Option B roles must **not** automatically become clinical roles.

## 5. Authentication vs Authorization

| Layer | Question |
| --- | --- |
| **Authentication** | Who are you? |
| **Authorization** | What are you permitted to do? |
| **Relationship authorization** | Which patient relationship permits that action? |
| **Resource authorization** | Which specific resource may you access? |
| **Action authorization** | What may you do with it? |

Do not collapse these layers. Session validity is necessary but insufficient for clinical access.

## 6. Current Roles

| Role | Operational purpose | Existing authority (Option B) | Clinical authority today | Status |
| --- | --- | --- | --- | --- |
| `PATIENT` | Own account, appointments, preferences | Own-data only | **None** (no clinical records) | **APPROVED** (Option B) |
| `PSYCHOLOGIST` | Practice operations, appointments for linked patients | Practice + appointment ownership checks | **None** as clinical EHR | **APPROVED** (Option B) |
| `SUPER_ADMIN` | Platform/practice configuration | Practice permissions; clinical permissions **not** default | **None** automatic | **APPROVED** architecture; UI **DEFERRED** |
| `STAFF` | Limited operational access | Reserved | **None** | **APPROVED** reserved; implementation **DEFERRED** |

Do not invent additional current roles.

## 7. Future Clinical Roles

Governance proposals only — **NOT YET DECIDED**; do not add to the application.

| Concept | Purpose | Potential authority | Restrictions | Relationship required? |
| --- | --- | --- | --- | --- |
| Treating psychologist | Primary clinical care | CLINICAL_ONLY + shared for assigned patients | No universal patient access | Yes — active treating |
| Consulting psychologist | Time-limited advice | Scoped shared / selected | Private notes **DECISION REQUIRED** | Explicit consult |
| Supervising psychologist | Professional supervision | Scoped — private notes **LEGAL / PROFESSIONAL REVIEW REQUIRED** | Not silent full access | Explicit supervision |
| Clinical reviewer | Quality/safety review | Minimum necessary | Separate purpose | Explicit assignment |
| Practice administrator | Ops config | Operational metadata | Clinical DENY by default | N/A clinical |
| Operational administrator / STAFF | Scheduling support | Contact/appointment metadata | No notes/assessments/safety narratives | Practice ops only |
| Care coordinator | Logistics | Limited operational | Clinical DENY unless governed | **DECISION REQUIRED** |
| Authorized caregiver / guardian | Assisted access | Patient-visible only if authorized | Minors/dependents legal review | Explicit representation |

## 8. Role vs Relationship

**Binding principle:** Being a psychologist does not automatically authorize access to every patient.

```text
PSYCHOLOGIST + AUTHORIZED PATIENT RELATIONSHIP + RESOURCE PERMISSION = POTENTIAL ACCESS
```

Role alone is never sufficient for patient-specific clinical resources.

## 9. Patient Relationship

Future concept of a psychologist–patient care relationship (not implemented).

Proposed conceptual states (not DB enums):

| Concept | Meaning |
| --- | --- |
| Assignment / pending | Relationship proposed, not fully active |
| Active | Authorized treating relationship |
| Paused | Temporarily inactive |
| Transferred | Care moved to another psychologist |
| Ended | Relationship terminated |
| Historical | Past relationship for retention/audit context |
| Temporary | Time-bounded (cover/consult) |

Exact lifecycle rules: **DECISION REQUIRED**.

## 10. Relationship Establishment

Possible establishment paths (evaluate; do not assume one):

- Psychologist assignment
- Patient selection / acceptance
- Practice workflow
- Appointment (see §11 — not automatic permanent clinical authority)
- Referral
- Formal acceptance
- Manual administrative action

**DECISION REQUIRED:** Which path(s) establish clinical authority, and whether patient acceptance is required.

## 11. Appointment vs Clinical Relationship

```text
Appointment ≠ Clinical relationship
```

Appointment statuses (Option B **APPROVED**): `REQUESTED`, `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `REJECTED`.

| Appointment context | Clinical access implication |
| --- | --- |
| Pending / requested | Does **not** alone grant clinical record access — **DECISION REQUIRED** for any limited ops exception |
| Cancelled / rejected | No clinical relationship from that appointment alone |
| Completed / historical | May evidence past contact; does **not** auto-grant ongoing clinical ACL — **DECISION REQUIRED** |
| Confirmed | Operational linkage; clinical relationship still separately governed |

Do not auto-create clinical consultation rows from appointments (Option B **APPROVED** forbid).

## 12. Active Relationship

Potential conditions for active treating access (conceptual):

- Correct psychologist identity
- Correct patient identity
- Authorized practice context
- Active relationship status
- Permitted resource classification / visibility
- Permitted purpose and action

Exact technical predicates: **NOT YET DECIDED**.

## 13. Relationship Termination

When therapy ends, patient leaves, psychologist leaves, transfer occurs, psychologist suspended, or practice relationship ends:

| Concern | Status |
| --- | --- |
| Future access | Should end or reduce — **DECISION REQUIRED** |
| Historical access | May differ from future — **DECISION REQUIRED** / F4-09 |
| Private notes | Remain governed; transfer rules separate — **DECISION REQUIRED** |
| Shared / collaborative | Visibility may change; revoke ≠ erase viewed — F4-02 |
| Audit access | Historical evidence retained per F4-10/F4-09 — periods **UNSET** |

## 14. Patient Transfer

```text
Psychologist A → patient transferred → Psychologist B
```

| Question | Status |
| --- | --- |
| When does B gain access? | **DECISION REQUIRED** |
| Does A retain access? | **DECISION REQUIRED** (default lean: no ongoing clinical ACL) |
| Do private notes transfer? | **DECISION REQUIRED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Shared / collaborative transfer? | **DECISION REQUIRED** |
| Patient consent required? | **DECISION REQUIRED** / F4-03 |
| Explicit review required? | Recommended for review — **NOT YET DECIDED** |

## 15. Multiple Psychologists

| Model | Status |
| --- | --- |
| Single treating psychologist only | **DECISION REQUIRED** |
| Multiple treating psychologists | **DECISION REQUIRED** |
| Primary + consultant | **DECISION REQUIRED** |
| Supervisor + treating | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |

For each approved model, define access, responsibility, private/shared/collaborative, and audit separately. Do not assume.

## 16. Cross-Psychologist Access

Preserve F1-B: Psychologist A must not automatically access Psychologist B’s patients.

Possible exceptions (each separately governed): transfer, consultation, supervision, emergency, authorized delegation. **NOT YET DECIDED** / legal review where marked.

## 17. Supervision

```text
Treating Psychologist → Supervising Psychologist
```

| Question | Status |
| --- | --- |
| See private notes? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Selected information only? | **DECISION REQUIRED** |
| Edit / comment? | **DECISION REQUIRED** |
| Patient awareness? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Explicit authorization? | Proposed **YES** — **NOT YET DECIDED** |

Not the same as consultation or transfer.

## 18. Consultation

Distinguish: consultation ≠ transfer of care ≠ supervision ≠ permanent assignment.

Consultant access: scoped, purpose-limited, time-limited preferred — **DECISION REQUIRED**.

## 19. Delegated Access

```text
Psychologist → delegates → Authorized professional → Limited patient resource
```

Who may delegate, what, duration, scope, revocation, audit — all **DECISION REQUIRED**. Must be explicit; must not become permanent by default.

## 20. Temporary Access

Uses: consultation, covering psychologist, supervision, transition.

Should have explicit start, end, scope, purpose, audit — **DECISION REQUIRED**. Periods not invented.

## 21. Break-Glass Governance

**Do not implement.** Governance-only:

- Emergency conditions
- Minimum necessary access
- Who may invoke
- Justification, audit, review
- Patient notification considerations

**LEGAL / PROFESSIONAL REVIEW REQUIRED** — F4-06.

## 22. SUPER_ADMIN Boundary

> SUPER_ADMIN is an operational authority, not automatically a clinical authority.

| Resource | Default |
| --- | --- |
| User/account information | CONDITIONAL (ops need) |
| Appointment metadata | CONDITIONAL |
| Operational consent / channel metadata | CONDITIONAL (F4-03) |
| System / security logs | CONDITIONAL (ops audit) |
| Sharing metadata (non-body) | CONDITIONAL — **DECISION REQUIRED** |
| Clinical body / private notes / assessments / safety narratives | **DENY by default** |

Aligns with Option B: clinical permissions not on Super Admin by default; O20 final matrix **OPEN**.

## 23. Administrative Support

Operational staff may need: appointment status, contact info, scheduling metadata.

Must **not** need by default: clinical notes, therapy progress, assessments, safety narratives, psychologist private notes.

Minimum necessary access. `STAFF` implementation remains **DEFERRED**.

## 24. Patient Access

**May access (when governed):** own operational data; intentionally shared clinical information; approved collaborative information.

**Must not automatically access:** psychologist private notes; internal formulations/hypotheses; private clinical working material (F4-02).

## 25. Patient Self-Authorization

> A patient may authorize access to their own information only within governance limits; a patient cannot grant themselves access to psychologist-private material if policy prohibits it.

## 26. Patient-to-Patient Isolation

```text
Patient A  ✕  Patient B
```

No patient may access another patient’s profile, appointments, clinical/shared/collaborative records, consent, assessments, or safety information. F1-B remains the security baseline.

## 27. Resource-Level Authorization

Authorize by category (conceptual): operational account; appointment; communication; SHARED_READ; SHARED_COLLABORATIVE; CLINICAL_ONLY; assessment; safety; document; audit metadata.

Do not create resource permissions in this phase.

## 28. Action-Level Authorization

Evaluate separately: view, create, modify, append, share, revoke, acknowledge, comment, correction request, export, delete.

**View ≠ modify.** Share ≠ revoke. Export ≠ delete.

## 29. Purpose-Based Access

Access may depend on purpose: treatment, appointment administration, consultation, supervision, safety, auditing, support.

Purpose creep forbidden without material-change governance (F4-03). Exact purpose catalogue: **DECISION REQUIRED**.

## 30. Visibility + RBAC

```text
Role + Relationship + Resource classification + Visibility + Action
```

`SHARED_READ` is not universally readable by every psychologist or admin.

## 31. Consent + Authorization

```text
Patient consent ≠ automatic psychologist access
Psychologist authorization ≠ automatic patient consent
```

Both may be required depending on action. Consent does not replace authorization (F4-03).

## 32. CLINICAL_ONLY

Proposed access: treating psychologist (or other explicitly authorized clinical role) + approved purpose + active (or otherwise authorized) relationship.

Patient and SUPER_ADMIN: **DENY** unless separately governed exception. Detail F4-02.

## 33. SHARED_READ

Patient access requires: intentional sharing + valid context + current visibility + authorization.

Not every psychologist may see every shared item — relationship still required.

## 34. SHARED_COLLABORATIVE

Who can create / modify / approve / archive / request correction — **DECISION REQUIRED** (F4-02). Typically treating psychologist + patient under rules; others CONDITIONAL.

## 35. Sharing Revocation

```text
SHARED → REVOKED
```

| Concern | Governance |
| --- | --- |
| Future access | Should end for revoked parties |
| Cached / historical viewed | May persist as already seen — not technical erasure claim |
| Exported copies | Out of band; F4-09 |
| Audit | Evidence of share/revoke retained — F4-10 |

## 36. Consent Withdrawal

Integrate F4-03: withdrawing service / channel / sharing / AI consent changes future permissions differently. Withdrawal ≠ deletion.

## 37. Relationship Termination Access

Future access should not persist merely because historical records exist. Historical/read-only retention access: **DECISION REQUIRED** / F4-09. Sessions/workers must not keep clinical ACL after termination (§54–55).

## 38. Identity / Session

F1-C authoritative for sessions.

```text
Authenticated identity ≠ clinical access by itself
```

## 39. MFA

Privileged clinical roles should evaluate: MFA required (Option B already requires for PSYCHOLOGIST/SUPER_ADMIN); step-up for highly sensitive ops; stronger auth for break-glass — **DECISION REQUIRED**. Do not modify current MFA in this phase.

## 40. Service Accounts

AI workers, notification workers, background services must not inherit human clinical privileges.

> Machine identity ≠ human clinical authority.

## 41. AI Access

```text
AI access ≠ clinical authority
```

What data, under whose authority, purpose, human approval, private-note eligibility, whether AI output can become shared — **DECISION REQUIRED** / F4-11. AI must not become an implicit privileged clinical role.

## 42. Data Export Authorization

Who may export operational / shared / private / assessments / consent history — **DECISION REQUIRED** / F4-09. Private clinical export especially sensitive.

## 43. Deletion Authorization

Who may request or perform deletion — **DECISION REQUIRED** / F4-09 / **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No deletion implementation.

## 44. Audit Access

Distinguish audit metadata vs clinical content. SUPER_ADMIN may need operational audit access without clinical body access. Detail F4-10.

## 45. Access Review

High-privilege relationships (temporary, supervision, delegated, consultants) should be reviewable. Review periods: **NOT YET DECIDED** (do not invent).

## 46. Least Privilege

Every role receives only the minimum authority necessary for its defined purpose.

## 47. Deny-by-Default

Any clinical access path not explicitly authorized by governance must be denied. Binding principle.

## 48. Explicit Relationship

Clinical access requires an explicitly recognized relationship or separately governed exception. Role alone is insufficient.

## 49. No Client-Side Trust

Client-controlled role, patient ID, public ID, visibility, permission, relationship, sharing state must never be authoritative (charter / F1-B).

## 50. Public Identifiers

`patientPublicId`, appointment IDs, resource IDs, share IDs must not themselves confer access. Possession of an ID ≠ authorization.

## 51. Cross-Tenant / Cross-Practice

A psychologist in Practice A must not automatically access Practice B data.

Future multi-practice tenancy: **DECISION REQUIRED** (scope unresolved). Do not implement tenancy architecture here.

## 52. Practice Ownership

Psychologist owns practice / works for practice / multiple psychologists / operational admin — business/legal ownership assumptions not invented. Access rules must be policy-defined — **DECISION REQUIRED**.

## 53. Employment / Role Change

Suspension, leave, role change, admin↔psychologist transitions: access must not persist merely from old session or stale relationship. **DECISION REQUIRED** for exact effects.

## 54. Account Suspension

Integrate F1-C: suspension should immediately prevent clinical access when clinical features exist. Do not change Option B implementation in this phase.

## 55. Session Revocation

Relationship termination, role change, suspension, privileged revocation should trigger session/ACL invalidation considerations (F1-C). Not implemented here.

## 56. Access Decision Hierarchy

Conceptual only:

```text
1. Authentication
2. Role
3. Identity
4. Relationship
5. Relationship status
6. Resource classification
7. Visibility
8. Purpose
9. Action
10. Consent where applicable
11. Safety/legal exception where applicable
12. Audit
```

## 57. Access Matrix

| Actor | Resource | Relationship | Visibility | Action | Result |
| --- | --- | --- | --- | --- | --- |
| Patient | Own operational record | Self | Operational | View | ALLOW (Option B) |
| Patient | Own SHARED_READ | Self + shared | Shared | View | CONDITIONAL |
| Patient | Own CLINICAL_ONLY | Self | Private | View | DENY |
| Patient | Another patient | None | Any | Any | DENY |
| Treating psychologist | Own patient clinical | Active treating | Classified | View/manage per class | CONDITIONAL |
| Treating psychologist | Another psychologist’s patient | None | Any | Any | DENY |
| Consultant | Authorized patient | Explicit consult | Scoped | View (limited) | CONDITIONAL / **NOT YET DECIDED** |
| Supervisor | Authorized patient | Explicit supervision | Scoped | View | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Former psychologist | Former patient | Ended | Historical | Ongoing clinical ACL | DENY default; historical **DECISION REQUIRED** |
| SUPER_ADMIN | Operational metadata | Ops | Non-clinical | View/manage | CONDITIONAL |
| SUPER_ADMIN | Clinical body | Any | Clinical | View | DENY by default |
| Service worker | Operational notify data | Machine | Ops templates | Deliver | CONDITIONAL |
| AI service | Clinical data | Machine | Any | Process | **NOT YET DECIDED** / F4-11; ≠ authority |
| Unauthorized actor | Clinical data | None | Any | Any | DENY |

## 58. Relationship State Matrix

| Relationship State | Psychologist Access | Patient Access | Shared Data | Private Data |
| --- | --- | --- | --- | --- |
| Pending | CONDITIONAL / ops only — **NOT YET DECIDED** | Own ops | No clinical share assumed | DENY clinical |
| Active | CONDITIONAL clinical per class | Ops + shared | Per F4-02 | Treating CONDITIONAL |
| Paused | Reduced — **DECISION REQUIRED** | Ops + prior shared rules | **DECISION REQUIRED** | **DECISION REQUIRED** |
| Transferred | Prior: end; new: begin — **DECISION REQUIRED** | Continues as patient | Transfer rules **DECISION REQUIRED** | Transfer **LEGAL REVIEW** |
| Ended | Future DENY default | Ops per account; shared historical **DECISION REQUIRED** | Revoke/freeze **DECISION REQUIRED** | Historical retention F4-09 |

Do not treat these as technical enum values.

## 59. Privilege Escalation Threats

| Threat | Governance control | Future technical control |
| --- | --- | --- |
| Patient changes role client-side | Server roles authoritative | Session principal from DB |
| Psychologist changes patient ID | Relationship + ownership checks | Server-side ACL |
| Access another psychologist’s patient | Cross-psych isolation | Authz tests (F1-B pattern) |
| Admin browses clinical data | Admin clinical blindness | Deny clinical fields |
| Former psychologist retains access | Termination rules | ACL recompute + session revoke |
| Stale relationship grants access | Status checks | Fail closed |
| Delegated access never expires | Explicit end + review | Expiry jobs / flags |
| Temporary becomes permanent | Explicit temporary type | Time-bound grants |
| AI inherits human credentials | Machine ≠ human authority | Separate service identity |
| Worker accesses clinical records | Ops-only worker scope | Least privilege credentials |
| Public ID as authorization | ID ≠ ACL | Ownership predicates |

## 60. Break-Glass Threats

False emergency; excessive scope; no justification; no audit; repeated emergency; permanent access after emergency. Controls: policy, justification, time-bound, audit, review — F4-06. **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 61. Relationship Termination Threats

Stale session; cached clinical content; old shared links; export access; background worker access; former psychologist access. Controls: revoke sessions, invalidate links, worker scope, ACL recompute — conceptual only.

## 62. Administrative Blindness

```text
Operational administration ≠ Clinical authority
```

SUPER_ADMIN must not gain clinical access simply because of elevated platform privileges.

## 63. Clinical Escalation

> Higher technical privilege must not automatically mean broader clinical visibility.

Any exception requires explicit governance.

## 64. Patient Experience

Future UX should clearly explain access, avoid confusing role jargon, explain shared/private boundaries, avoid implying admins can read private clinical information, and avoid unnecessary technical detail.

## 65. Clinical Ethics

Confidentiality, continuity of care, professional responsibility, minimum necessary access, patient autonomy, transparency, safeguarding — not legal advice.

## 66. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** minors; guardian access; confidentiality; supervision; consultation; transfer; emergency access; record access; administrative access; relationship termination; third-party access; deletion/export rights.

Do not invent statutes or mandatory periods.

## 67. F4-03 Consent Dependency

Authorization and consent are related but distinct. Do not replace authorization with consent.

## 68. F4-02 Sharing Dependency

Patient-visible sharing does not automatically grant every psychologist or administrator access.

## 69. F4-05 Versioning Dependency

Access interacts with immutable historical versions (who may see which version). Detail F4-05. Not implemented.

## 70. F4-06 Safety Dependency

Safety exceptions may alter access under separate governance. Not implemented.

## 71. F4-07 Communication Dependency

Authorization does **not** imply clinical information may be sent via email/SMS/WhatsApp. Channel + content rules still apply.

## 72. F4-08 Assessment Dependency

Assessment access may require separate authorization rules. Not implemented.

## 73. F4-09 Retention / Export Dependency

Do not define retention periods. Access to retained/historical records is distinct from current ACL.

## 74. F4-10 Audit Dependency

Future auditable events (conceptual): clinical access granted/denied; relationship create/activate/pause/transfer/end; delegation grant/revoke; temporary access start/end; break-glass invoke/review; SUPER_ADMIN clinical denial bypass attempt; export; role change affecting clinical ACL. No audit implementation here.

## 75. F4-11 AI Dependency

AI must not become an implicit privileged clinical role.

## 76. F4-12 Architecture Dependency

Final technical authorization architecture must wait for governance approval. F4-04 does not authorize implementation.

## 77. Binding Governance Invariants

1. Authentication does not imply authorization.  
2. Role does not imply universal patient access.  
3. Psychologist status does not imply access to every patient.  
4. Clinical access requires an authorized patient relationship or separately governed exception.  
5. Relationship status matters.  
6. Resource classification matters.  
7. Visibility does not override authorization.  
8. Consent does not replace authorization.  
9. Patient A cannot access Patient B’s information.  
10. SUPER_ADMIN does not automatically receive clinical content.  
11. Private clinical information remains private unless intentionally governed otherwise.  
12. Patient sharing does not automatically grant psychologist-wide access.  
13. Temporary/delegated access must be explicitly governed.  
14. Break-glass access requires separate governance.  
15. Machine identity does not equal human clinical authority.  
16. AI does not receive implicit clinical authority.  
17. Client-controlled identifiers cannot establish authorization.  
18. Relationship termination must affect future authorization.  
19. Historical access and auditability must be distinguished from current access.  
20. Clinical access should follow least privilege and deny-by-default.

## 78. Governance Decision Matrix

| Decision | Options | Recommendation for review | Status | Dependency |
| --- | --- | --- | --- | --- |
| Role ≠ universal patient access | Adopt / reject | Adopt | Aligns F1-B + charter; formal clinical policy **NOT YET DECIDED** | F4-04 |
| Appointment ≠ clinical relationship | Adopt / reject | Adopt | **NOT YET DECIDED** as clinical policy | F4-04 / Option B |
| SUPER_ADMIN clinical body | Allow / Deny default | Deny by default | Aligns Option B **APPROVED** architecture | §2.10 / O20 |
| Multiple treating psychologists | Single / multi / primary+consult | — | **DECISION REQUIRED** | F4-04 |
| Supervisor private notes | Allow scoped / deny | — | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-04/06 |
| Former psychologist ongoing ACL | Deny / limited historical | Deny ongoing; historical separate | **DECISION REQUIRED** | F4-09 |
| Transfer private notes | Transfer / retain / dual | — | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-02/09 |
| Break-glass | Forbid / governed | Governed if ever allowed | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-06 |
| Multi-practice tenancy | Single / multi | — | **DECISION REQUIRED** | F4-12 |
| STAFF clinical metadata | Ops only | Ops only; clinical DENY | Aligns reserved STAFF | Option B |
| Clinical permissions on SUPER_ADMIN | Never / exceptional | Prefer never | O20 **OPEN** | Decisions register |

## 79. Outstanding Decisions

1. Does psychologist role alone grant any clinical access? → **No** (governance position for review); formal status **NOT YET DECIDED**.  
2. What establishes a patient relationship? → **DECISION REQUIRED**.  
3. Is an appointment sufficient? → **No for permanent clinical ACL** (recommended); **NOT YET DECIDED**.  
4. Multiple psychologists? → **DECISION REQUIRED**.  
5. Consultant access? → **DECISION REQUIRED**.  
6. Supervisor private notes? → **LEGAL / PROFESSIONAL REVIEW REQUIRED**.  
7. Former psychologist retain access? → Ongoing **DENY** recommended; historical **DECISION REQUIRED**.  
8. Transfer effects? → **DECISION REQUIRED** + legal.  
9. Relationship end effects? → **DECISION REQUIRED** / F4-09.  
10. Ops admins clinical metadata? → Metadata CONDITIONAL; bodies DENY.  
11. SUPER_ADMIN clinical content? → **DENY by default** (aligns APPROVED architecture).  
12. Patients see all shared? → Only intentionally shared & currently visible — CONDITIONAL.  
13. Patients authorize third parties? → **LEGAL / PROFESSIONAL REVIEW REQUIRED** (F4-03).  
14. Patients correct records? → Correction request process **DECISION REQUIRED** (F4-02).  
15. Delegated access? → **DECISION REQUIRED**.  
16. Temporary access? → **DECISION REQUIRED**.  
17. Break-glass? → **LEGAL / PROFESSIONAL REVIEW REQUIRED**.  
18. Audit events? → Listed conceptually → F4-10.  
19. AI access? → **NOT YET DECIDED** / F4-11; ≠ authority.  
20. Workers/services clinical data? → Default DENY clinical; ops CONDITIONAL.  
21. Consent vs authorization? → Distinct; both may apply.  
22. Visibility vs authorization? → Both required; visibility alone insufficient.  
23. Retention vs access? → F4-09; periods UNSET.  
24. Termination vs sessions? → Should invalidate clinical ACL/session — **DECISION REQUIRED** mechanics.  
25. Legal/professional review list? → §66.

## 80. Implementation Restrictions

No RBAC/relationship/permission schema; no authz code, middleware, Server Actions, or UI changes; no break-glass/delegation/supervision implementation; no Option C; no Production. Requires governance approval + separate implementation authorization later.

## 81. F4-04 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-04 | Draft clinical RBAC / relationship / admin access governance |

**Recommended next domain:** **F4-05 — Clinical Record Versioning, Provenance & Immutability Governance** (do not start without authorization).

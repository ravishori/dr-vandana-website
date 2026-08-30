# F4-03 PATIENT CONSENT GOVERNANCE v1.0

**Document type:** Governance specification (not implementation; not legal certification)  
**Phase:** F4-03  
**Status:** DRAFT — **NOT YET DECIDED**  
**Baseline checkpoint:** `b32e1d0`  
**Parents:** `docs/F4_GOVERNANCE_MASTER_CHARTER.md`, `docs/F4_01_CLINICAL_DATA_CLASSIFICATION.md`, `docs/F4_02_PRIVATE_SHARED_RECORD_GOVERNANCE.md`  
**Option B decisions:** `docs/PATIENT_PRACTICE_DECISIONS.md` (O11 privacy/consent **OPEN**; WhatsApp opt-in implemented, legal wording **OPEN**; Production accounts **BLOCKED** until privacy/terms updated)

This document is **not** legal advice and does **not** claim DPDP or other regulatory compliance.  
**LEGAL / PROFESSIONAL REVIEW REQUIRED** where marked. Retention periods remain **UNSET** (F4-09).

---

## 1. Purpose

Define:

> What consent a patient needs to provide, for what purpose, to whom, through which channel, for what duration, and with what ability to withdraw or change that consent.

Prevent treating all consent as one generic boolean.

## 2. Scope

**In scope:** Consent taxonomy, purpose/channel/item distinctions, evidence/versioning/withdrawal concepts, threat model, invariants, open decisions.

**Out of scope / forbidden:** Consent tables/enums/migrations, consent UI/workflows, clinical APIs, authn/authz redesign, WhatsApp helper redesign, Option C, Production, commits.

Option C remains **BLOCKED**.

## 3. Governing Documents

Authoritative inputs listed in document header. Conflicts must be surfaced as **DECISION REQUIRED**, not silently resolved.

**Known Option B tension (already documented):** Privacy copy historically denies patient database/portal while Option B creates accounts/appointments — Production launch **BLOCKED** until copy updated (`PATIENT_PRACTICE_DECISIONS.md`). This is a policy/copy conflict, not resolved by F4-03 implementation.

## 4. Current Option B Boundary

| Current (implemented) | Classification |
| --- | --- |
| Account registration / verification / login | Operational account processing — **not** clinical consent |
| Password recovery / OTP | Security transactional — **not** clinical consent |
| Appointment booking & lifecycle | Operational practice data |
| Appointment email notifications | Operational communication; privacy-safe copy **APPROVED** |
| WhatsApp channel opt-in/out on `patient_profiles` | **Channel consent only**; default off; legal wording **OPEN** |
| Audit of WhatsApp opt-in/out | Security/accountability metadata |

**Not clinical consent:** MFA completion, dashboard login, reading an appointment, booking alone.

Do **not** alter Option B identity/notification infrastructure in this phase.

## 5. Consent Definitions

| Concept | Meaning |
| --- | --- |
| **Service / care consent** | Agreement to participate in psychological services |
| **Collection/processing consent (or notice basis)** | Governance for collecting/using categories of information |
| **Item-level share authorization** | Permission/process for making a specific item patient-visible (F4-02) |
| **Channel permission** | Permission to contact via email/SMS/WhatsApp/in-app |
| **Assessment consent** | Agreement to participate in a specific assessment (F4-08) |
| **Third-party disclosure consent** | Permission to disclose to named external parties |
| **AI-processing consent** | Permission for AI-assisted processing (F4-11) |
| **Acknowledgement** | Confirmed receipt of information ≠ consent (F4-02) |
| **Preference** | Optional channel/content preference ≠ legal consent |

```text
Consent to receive psychological services
  ≠ Consent to collect/process information
  ≠ Consent to share specific information
  ≠ Consent to communicate through a channel
  ≠ Consent for assessments
  ≠ Consent for third-party disclosure
  ≠ Consent for AI-assisted processing
```

## 6. Service / Care Consent

| Question | Status |
| --- | --- |
| Who provides? | Patient (or guardian — §28) — **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Who records? | Practice process / future system — **DECISION REQUIRED** |
| Explicit? | Proposed **YES** for clinical care — **NOT YET DECIDED** |
| Versioned? | Proposed **YES** — **DECISION REQUIRED** |
| Withdrawable? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Withdrawal vs ongoing care | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Recordkeeping after withdrawal | **LEGAL / PROFESSIONAL REVIEW REQUIRED** / F4-09 |

## 7. Information Collection / Processing

| Category | Likely governance | Status |
| --- | --- | --- |
| Account information | Necessary for account + notice/terms | O11 **OPEN** |
| Appointments | Operational practice purpose | Notice/terms **OPEN** |
| Communications (transactional) | Operational | Channel rules apply |
| Wellness self-report | Optional purpose notice/consent | **DECISION REQUIRED** |
| Clinical information | Clinical consent + purpose | Future / blocked |
| Assessment | Distinct assessment consent | F4-08 |
| Safety-sensitive | Special handling | F4-06 + legal |
| Documents | May need document-specific rules | **DECISION REQUIRED** |
| AI-related | Distinct AI consent | F4-11 |

Do not assume one mechanism covers all.

## 8. Purpose Limitation

Consent or notice for one purpose does **not** authorize another.

| Purpose class | Intended | Prohibited secondary (examples) |
| --- | --- | --- |
| Scheduling | Book/manage appointments | Unrelated marketing analytics |
| Account security | Auth, recovery | Clinical profiling |
| Operational notify | Reminders/status | Full clinical note in message body |
| Clinical care | Treatment documentation | Research without separate basis |
| Channel WhatsApp | Permitted WhatsApp categories only | Any clinical body without content rules |
| AI assist | Explicitly approved AI uses | Autonomous clinical decisions |
| Analytics | Aggregates if approved | Identified clinical trend export without basis |

Analytics / AI / research each need separate governance — **DECISION REQUIRED**.

## 9. Data Minimization

Collect only what is necessary for identified purposes. Do not introduce questionnaires, clinical fields, or “nice to have” data under consent theatre. Aligns with F4-01 minimization.

## 10. Item-Level Sharing Consent

```text
Service consent → record exists → psychologist decides to share specific item
  → patient receives shared representation (F4-02)
```

| Question | Status |
| --- | --- |
| Does each share need patient consent? | **DECISION REQUIRED** (may differ by category) |
| Psychologist authorization required? | Proposed **YES** (F4-02) |
| Acknowledgement required? | **DECISION REQUIRED** (≠ consent) |
| Both? | **DECISION REQUIRED** |

Service consent ≠ item-level share authorization (Invariant 6).

## 11. Psychologist Sharing Authority

Candidates for intentional share (each may differ): treatment recommendations; wellness plans; goals; exercises; educational resources; appointment-related info; summaries; progress information.

**DECISION REQUIRED:** Per-category share rules (some operational vs clinical). Private working notes remain CLINICAL_ONLY unless transformed under F4-02 Model B/C.

## 12. Communication Channel Consent

```text
channel permission
  + content classification
  + purpose authorization
  + visibility authorization
```

**Invariant:** Channel permission ≠ permission to disclose every content category through that channel (F1-D-C; F4-07).

Channels: Email, SMS, WhatsApp, In-app, Patient dashboard (view surface).

## 13. Email

| Type | Likely treatment |
| --- | --- |
| Account verification | Transactional/necessary |
| Password recovery | Transactional/security |
| Appointment notification | Operational transactional |
| Operational reminder | Often transactional/optional preference — **DECISION REQUIRED** |
| Clinical communication | Future; stricter — **DECISION REQUIRED** / F4-07 |

No legal assertions of “legitimate interest” without counsel.

## 14. SMS

| Type | Likely treatment |
| --- | --- |
| OTP | Security transactional |
| Security notifications | Security |
| Appointment notifications | Operational — **DECISION REQUIRED** for optional vs necessary |
| Clinical SMS | Future; high caution — **DECISION REQUIRED** |

Marketing consent ≠ clinical communication consent.

## 15. WhatsApp

**Channel consent only** (current Option B).

| Topic | Current / governance |
| --- | --- |
| Opt-in / opt-out | Implemented; default off |
| Verified mobile | Required for delivery |
| Legal wording | **OPEN** |
| Sensitive content | Must not include diagnosis/notes/assessment detail (**APPROVED** Option B copy rule) |
| Provider | Twilio direction; production activation **OPEN** |
| ≠ clinical consent | Binding distinction |

Do not redesign `setPatientWhatsAppConsent` in F4-03.

## 16. Patient Dashboard

Login/dashboard access = authentication/authorization surface, **not** blanket consent, acknowledgement, or agreement to all processing.

## 17. Consent Granularity

| Approach | Pros | Cons |
| --- | --- | --- |
| One global consent | Simple | Over-broad; fails purpose limitation |
| Category-level | Clearer | More UX complexity |
| Purpose-level | Strong privacy | Patient comprehension risk |
| Channel-level | Fits WhatsApp/email | Misses content rules alone |
| Item-level | Precise for sharing | Operationally heavy |
| **Combination** | Balanced | Needs careful design |

**DECISION REQUIRED:** Target combination (recommended for review: purpose + channel + item-share for clinical; keep transactional operational notices clear). Status: **NOT YET DECIDED**.

## 18. Consent Evidence

Future evidence categories (not implemented): patient identity; consent type; purpose; wording version; timestamp; channel; actor; source; withdrawal; superseded version. Detail storage: F4-10.

## 19. Consent Versioning

```text
Consent v1 → Consent v2 → withdrawn → new consent
```

Material wording changes should create a new version — **DECISION REQUIRED**. Do not overwrite historical evidence (F4-05).

## 20. Consent Withdrawal

Withdrawal may apply separately to: service participation; optional communication; a processing purpose; specific sharing; AI processing; assessment participation.

Withdrawal ≠ immediate deletion (F4-09).

## 21. Withdrawal Effects

For each type, decide impact on: future collection; future processing; future sharing; future communication; existing records; audit evidence; legal/professional preservation.

All period/effect specifics: **DECISION REQUIRED** or **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

**Safety note:** Withdrawal governance must not imply safety responsibilities disappear — **LEGAL / PROFESSIONAL REVIEW REQUIRED** (F4-06).

## 22. Revocation vs Deletion

```text
Withdraw consent ≠ Delete historical record
Revoke sharing ≠ Erase information already viewed
```

(F4-02 / F4-09)

## 23. Consent Expiration

No automatic durations invented. Options (expire / renew on material change / no auto-expire): **NOT YET DECIDED**.

## 24. Material Change

Triggers that may require renewed consent/review: new purpose; new data category; new processor/vendor; new channel; AI introduced; new sharing type; significant policy change. Application rules: **DECISION REQUIRED**.

## 25. AI Consent

```text
AI-assisted administrative processing
  ≠ AI-assisted clinical support
  ≠ AI-generated clinical suggestion
  ≠ Autonomous clinical decision (forbidden)
```

AI cannot independently create authoritative patient-visible clinical information. Explicit optional consent, opt-out, private-note eligibility: **DECISION REQUIRED — F4-11**.

## 26. Third-Party Disclosure

Family, caregivers, other professionals, schools, employers, insurers, NGOs, processors, legal representatives — each **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No assumed authorization.

## 27. Family / Caregiver Access

Patient-requested vs psychologist-authorized vs age/dependency vs emergency — **DECISION REQUIRED** + legal review. No guardian schema here.

## 28. Minors

Child/adolescent independent accounts **DEFERRED** (Option B). Who consents, assent, confidentiality, transition, withdrawal, access, safety exceptions: **LEGAL / PROFESSIONAL REVIEW REQUIRED**. Do not invent age thresholds.

## 29. Dependents / Assisted Users

Guardian / caregiver / authorized representative / assisted access — conceptual only; **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 30. Emergency / Safety Exceptions

When normal consent may be insufficient; who authorizes; minimum necessary disclosure; documentation; review — **LEGAL / PROFESSIONAL REVIEW REQUIRED** (F4-06). No break-glass implementation.

## 31. Assessment Consent

Distinct from general care consent. Screening / standardized / repeated / progress / research-like / AI interpretation — **DECISION REQUIRED — F4-08**.

## 32. Patient-Generated Wellness Data

Not automatically clinical (F4-01). May need purpose notice, optional participation, withdrawal — **DECISION REQUIRED**. Separate from service consent unless decided otherwise.

## 33. Research / Secondary Use

Care consent ≠ research/anonymized analytics/QI/education/publications. Separate basis required — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. Do not implement.

## 34. Analytics

Appointment counts vs adherence vs identified progress trends vs de-identified aggregates — each **DECISION REQUIRED**. No analytics build.

## 35. Consent and Notifications

Prevent: channel permission → automatic sensitive clinical disclosure.  
Require: channel + content class + purpose + visibility. Prefer availability notices over clinical bodies (F4-02 / F1-D-C).

## 36. Patient Understanding

Clear, specific, non-coercive, accessible. Avoid fear-based wording. Final legal text not drafted here except as non-final illustrative concepts.

## 37. Consent UX Principles

Distinguish: I understand / I consent / I prefer this channel / I acknowledge / I agree with this recommendation. Not interchangeable.

## 38. Negative Consent Patterns

**Prohibit** in future design: pre-checked sensitive consent; bundled unrelated consents; hidden in Terms; inferred from login, booking, reading a record, silence, or continued use alone.

## 39. Future Patient Consent View

May show: active/withdrawn consents; channel preferences; sharing permissions; versions; dates; purposes — **DECISION REQUIRED** exact set. Not implemented.

## 40. Psychologist Consent View

May see: consent status/scope/purpose/dates/channel preferences/restrictions — without collapsing into private clinical note access (F4-02).

## 41. Administrative Boundaries

SUPER_ADMIN may see operational consent/channel metadata **CONDITIONAL**; must not auto-see clinical content, private notes, assessment bodies, safety narratives (admin clinical blindness).

## 42. Consent Audit Dependencies

Future events: presented, accepted, declined, withdrawn, renewed, version changed, purpose changed, channel enabled/disabled, sharing consent changed, AI consent changed — F4-10. No implementation.

## 43. Consent Security

Threats: forged consent; wrong patient attribution; cross-patient modify/withdraw; stale consent; replay; unauthorized admin access. Future controls conceptual only (authz, append-only evidence, version ids).

## 44. Identity Binding

Consent must bind to authenticated identity. Client-supplied foreign public IDs must never grant/modify/withdraw another patient’s consent (F1-B).

## 45. Relationship Binding

Clinical-related consent may need patient + psychologist + active relationship + termination/transfer rules — F4-04. **DECISION REQUIRED**.

## 46. Consent Lifecycle

```text
NOT PRESENTED → PRESENTED → CONSIDERING → GRANTED / DECLINED
  → ACTIVE → MODIFIED / RENEWED → WITHDRAWN / SUPERSEDED
```

Governance concept only — not a DB state machine in this phase.

## 47. Consent Provenance

Patient-provided; guardian/representative; psychologist-recorded; system-generated; imported historical; AI suggestion (non-authoritative). **AI cannot be the authoritative consent actor.**

## 48. Consent Immutability / Versioning

Historical evidence should be append-only; avoid `consent=false` silently erasing that consent was once granted. Detail F4-05.

## 49. Consent + Sharing Revocation

Integrate F4-02: consent withdrawn ≠ auto-erase; sharing revoked ≠ erase already viewed/exported.

## 50. Consent + Retention

Belong to F4-09: how long evidence/withdrawals retained; termination; deletion requests; legal preservation. Periods **UNSET**.

## 51. Consent + Export

Whether consent history appears in patient export — **DECISION REQUIRED** / F4-09.

## 52. Consent + Documents

Document-specific consent may be needed for uploads/reports — **DECISION REQUIRED**. No document vault here.

## 53. Threat Model

| # | Threat | Consequence | Governance control | Future technical control | Domain |
| --- | --- | --- | --- | --- | --- |
| 1 | Consent attributed to wrong patient | Wrong processing | Identity binding | Session-bound writes | F4-03/04 |
| 2 | Modify another patient’s consent | Integrity/privacy breach | Patient isolation | Authz on consent APIs | F4-04 |
| 3 | Withdraw another’s consent | Same | Same | Same | F4-04 |
| 4 | Share without authorization | Over-disclosure | F4-02 share rules | Authz + audit | F4-02/04 |
| 5 | Channel without consent | Unwanted contact | Channel permission | Opt-in checks | F4-03/07 |
| 6 | Sensitive content on permitted channel | Content leak | Content classification | Template allow-lists | F4-07 / F1-D-C |
| 7 | Consent version overwritten | Evidence loss | Append-only | Immutable events | F4-05/10 |
| 8 | Withdrawal treated as deletion | Record loss / non-compliance | Revoke≠delete | Soft flags + F4-09 | F4-09 |
| 9 | Admin over-access | Confidentiality | Admin blindness | Deny clinical fields | F4-04 |
| 10 | AI as consent authority | Invalid consent | Invariant 12 | No AI consent actor | F4-11 |
| 11 | Wrong guardian permissions | Unlawful processing | Minors review | Role model later | F4-03 legal |
| 12 | Stale consent after material change | Purpose creep | Material change rules | Re-consent gates | F4-03 |
| 13 | Consent active after relationship end | Stale access | Relationship binding | ACL recompute | F4-04 |
| 14 | Forged/replayed consent | Fraud | Evidence + authn | Nonce/version | F4-10 |

## 54. Patient Experience

Clear, concise, transparent, non-coercive, calm, culturally appropriate; avoid fear-based mental-health marketing (project ethics).

## 55. Clinical Ethics

Autonomy, informed participation, confidentiality, transparency, minimum necessary disclosure, professional responsibility, vulnerability, safeguarding — not legal advice.

## 56. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** minors; guardian; access rights; withdrawal; emergency disclosure; third parties; assessment; AI; secondary use; retention; deletion; consent evidence; channel rules; O11 privacy/terms copy for Option B accounts.

## 57. Consent / Sharing Matrix

| Action | Service Consent | Data Purpose | Item Share | Channel Permission | Additional Review |
| --- | --- | --- | --- | --- | --- |
| Appointment reminder | CONDITIONAL | Operational | N/A | CONDITIONAL | NOT YET DECIDED |
| Patient dashboard | Account/auth | Account | N/A | N/A (view) | Login ≠ consent |
| Shared wellness plan | CONDITIONAL | Clinical/wellness | YES | Portal CONDITIONAL | F4-02/03 |
| Shared clinical summary | CONDITIONAL | Clinical | YES | Prefer portal | LEGAL REVIEW |
| WhatsApp reminder | CONDITIONAL | Operational | N/A | WhatsApp opt-in | No clinical body |
| Assessment | CONDITIONAL | Assessment | CONDITIONAL | CONDITIONAL | F4-08 |
| AI-assisted support | CONDITIONAL | AI purpose | CONDITIONAL | CONDITIONAL | F4-11 |
| Third-party disclosure | CONDITIONAL | Disclosure | CONDITIONAL | N/A | LEGAL REVIEW |

## 58. Consent Decision Matrix

| Domain | Current Position | Recommendation for review | Status | Dependency |
| --- | --- | --- | --- | --- |
| Purpose-specific consent | Charter principle | Adopt | **NOT YET DECIDED** | F4-01 |
| Channel ≠ content | Option B APPROVED copy limits | Keep | Aligns APPROVED ops rule | F4-07 |
| WhatsApp = channel only | Implemented opt-in | Keep distinction | Aligns code + OPEN legal copy | O5/O11 |
| Login ≠ consent | Security practice | Adopt invariant | **NOT YET DECIDED** as formal policy | F4-03 |
| Withdraw ≠ delete | F4-02/09 | Adopt | **NOT YET DECIDED** | F4-09 |
| Minors | DEFERRED | Legal review first | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-03 |
| AI consent | Blocked Option C | Separate optional consent | **NOT YET DECIDED** | F4-11 |
| O11 privacy copy | OPEN / Production BLOCKED | Update before go-live | **OPEN** | Option B |

## 59. Binding Governance Invariants

1. Consent is purpose-specific.  
2. Consent is identity-bound.  
3. Authentication does not equal consent.  
4. Appointment booking does not automatically equal consent to unrelated processing.  
5. Channel permission does not equal permission to disclose every type of content.  
6. Service consent does not automatically equal item-level sharing authorization.  
7. Consent withdrawal does not automatically equal deletion.  
8. Sharing revocation does not erase information already viewed or exported.  
9. Historical consent evidence must not be silently overwritten.  
10. Patient A cannot grant, modify, or withdraw Patient B’s consent.  
11. SUPER_ADMIN does not automatically receive clinical content merely because consent exists.  
12. AI cannot be the authoritative consent actor.  
13. Material changes may require renewed governance review.  
14. Minors/dependents require dedicated legal/professional review.  
15. Safety considerations may require separate governance treatment.

## 60. Outstanding Decisions

Granularity model; service consent recording; item-share patient consent; per-channel optional vs necessary; acknowledgement vs consent for shared items; expiration/renewal; AI opt-in scope; third-party catalogue; minors/dependents; emergency exceptions; wellness/assessment consent; analytics/research basis; export of consent history; O11 final privacy/terms wording.

## 61. Cross-Domain Dependencies

```text
F4-01 → F4-02 → F4-03 → F4-04 → F4-05 → F4-06 → F4-07
→ F4-08 → F4-09 → F4-10 → F4-11 → F4-12
```

## 62. Implementation Restrictions

No consent schema/UI/API; no Option B auth/notification redesign; no Option C; no Production. Requires governance approval + separate implementation authorization later.

## 63. F4-03 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-03 | Draft purpose/channel/item consent governance |

**Recommended next domain:** **F4-04 — Clinical RBAC, Relationship & Administrative Access Governance** (do not start without authorization).

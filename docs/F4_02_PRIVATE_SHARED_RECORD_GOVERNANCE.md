# F4-02 DOCTOR PRIVATE / PATIENT SHARED RECORD GOVERNANCE v1.0

**Document type:** Governance specification (not implementation)  
**Phase:** F4-02  
**Status:** DRAFT — **NOT YET DECIDED**  
**Baseline checkpoint:** `b32e1d0`  
**Parent charter:** `docs/F4_GOVERNANCE_MASTER_CHARTER.md`  
**Classification:** `docs/F4_01_CLINICAL_DATA_CLASSIFICATION.md`  
**Related:** `docs/PATIENT_PRACTICE_DECISIONS.md` (SUPER_ADMIN ≠ automatic clinical access — APPROVED architecturally)

This document does **not** constitute legal or regulatory compliance.  
Where needed: **LEGAL / PROFESSIONAL REVIEW REQUIRED**.  
Retention/deletion periods remain **UNSET** (F4-09).

---

## 1. Purpose

Establish a precise governance model for information that may be:

1. **Private** to the authorized psychologist  
2. **Intentionally shared** with the patient  
3. **Collaboratively maintained** by psychologist and patient  

Central question:

> Who may create, see, modify, share, revoke, acknowledge, or otherwise interact with each category of information, and under what explicit governance conditions?

## 2. Scope

**In scope:** Visibility concepts, lifecycles, rights matrices, threat model, invariants, open decisions.

**Out of scope / forbidden:** Clinical schema, migrations, APIs, UI, sharing controls, messaging, assessments, safety detection, AI, Production changes, commits.

Option C remains **BLOCKED**. Concepts below are **governance only** — not database enums, API params, or UI controls.

## 3. Relationship to F4 Master Charter

Elaborates charter domain **F4-02**. Does not rewrite F4-A.  
Charter principles applied: Human clinical authority; Minimum necessary access; Patient ownership boundary; Psychologist private boundary; Explicit sharing; Auditability; No client-side trust; Admin clinical blindness.

## 4. Relationship to F4-01 Classification

F4-01 categories G (clinical-private), H (clinical-shared), I (collaborative) map to visibility concepts here.  
Content-dependent classification still applies: field name alone does not decide visibility.  
Safety-sensitive (K) may impose additional restrictions (F4-06).  
Assessment subtypes (J) may use different visibility per subtype (F4-08).

**PROPOSED GOVERNANCE CLARIFICATION (non-binding):** F4-01’s “Clinical-shared” ≈ SHARED_READ or SHARED_COLLABORATIVE after an explicit share/collaborate decision — not automatic.

## 5. Definitions

| Term | Meaning |
| --- | --- |
| **Private** | Authorized psychologist only; patient cannot see by default |
| **Shared** | Psychologist intentionally makes information available to the patient |
| **Collaborative** | Both psychologist and patient participate in maintaining the information |
| **Viewed** | Patient opened/displayed content |
| **Acknowledged** | Patient confirmed receipt (not agreement) |
| **Agreed** | Patient expressed agreement — separate act |
| **Accepted as clinically correct** | Stronger clinical acceptance — must not be inferred from view/ack |
| **Correction request** | Patient asks for review of alleged inaccuracy |
| **Authoritative clinical record** | Psychologist-controlled clinical record of truth (when Option C exists) |
| **Sharing metadata** | Who shared what, when, to whom — not the clinical body |
| **Revocation** | Ending *future* access — not guaranteed deletion of copies already seen |

These concepts are **not interchangeable**.

## 6. Private / Shared / Collaborative Model

```text
CLINICAL_ONLY          → private professional working information
SHARED_READ            → intentional patient visibility (typically read-only)
SHARED_COLLABORATIVE   → joint maintenance under rules
```

Default for future clinical working content: **private unless intentionally shared** — **DECISION REQUIRED** to confirm as policy.

## 7. CLINICAL_ONLY Governance

### Intended meaning (proposal)

- Accessible to the **authorized treating psychologist** with a valid relationship  
- **Patient cannot see**  
- **SUPER_ADMIN / operational admin cannot see** clinical body (admin clinical blindness)  
- **Unauthorized psychologist cannot see**  
- AI must not automatically expose to patient or others  
- Ordinary transactional notifications must not include the body  

### Qualifying categories (candidates — not auto-approved)

Private working notes; professional observations; hypotheses/formulations; internal session preparation.

**DECISION REQUIRED:** Exact catalogue of CLINICAL_ONLY types.  
**DECISION REQUIRED:** Whether trainees/supervisors may access (F4-04).

## 8. SHARED_READ Governance

### Intended meaning (proposal)

Information the psychologist intentionally makes available for the patient to read.

| Question | Status |
| --- | --- |
| Who creates? | Psychologist — **CONDITIONAL** (roles TBD F4-04) |
| Who approves sharing? | **DECISION REQUIRED** (creator alone vs second approval) |
| Who can read? | Intended patient; treating psychologist |
| Patient acknowledge? | **DECISION REQUIRED** |
| Patient comment? | **DECISION REQUIRED** (comment ≠ edit authoritative record) |
| Patient modify? | Default **DENY** for authoritative body |
| Revoke future access? | **DECISION REQUIRED** |
| Revocation erase history? | No claim of erasing already-viewed copies |
| Original private preserved? | Depends on Model A/B/C (§13) — **DECISION REQUIRED** |
| Sharing creates new version? | **DECISION REQUIRED** (F4-05) |
| Audit required? | **YES** (proposed invariant) |

## 9. SHARED_COLLABORATIVE Governance

### Intended meaning (proposal)

Both parties maintain the artifact (e.g. jointly agreed goals, agreed activities, linked reflections).

**Not** every patient input is collaborative. Wellness self-report may remain patient-owned until adopted (F4-01).

| Question | Status |
| --- | --- |
| Who can create? | **DECISION REQUIRED** (psych only vs either) |
| Who can edit? | **DECISION REQUIRED** (equal rights vs psych gate) |
| Who can approve? | **DECISION REQUIRED** |
| Who can delete? | **DECISION REQUIRED** |
| Equal rights? | **NOT YET DECIDED** |
| History preserved? | Proposed **YES** (F4-05) |
| Withdraw participation? | **DECISION REQUIRED** |

## 10. Creation Authority

| Action | Psychologist | Patient | Admin |
| --- | --- | --- | --- |
| Create private clinical record | ALLOW* | DENY | DENY |
| Create shared record | ALLOW* / CONDITIONAL | DENY† | DENY |
| Create collaborative record | CONDITIONAL | CONDITIONAL | DENY |
| Change visibility | CONDITIONAL | DENY | DENY |
| Share with patient | CONDITIONAL | DENY | DENY |
| Revoke future access | CONDITIONAL | DENY‡ | DENY |
| Acknowledge shared item | DENY | ALLOW* | DENY |
| Modify shared item (authoritative) | ALLOW* | DENY | DENY |
| Contribute collaborative content | CONDITIONAL | CONDITIONAL | DENY |

\* Subject to relationship + F4-04 permissions.  
† Patient may request shared materials be created — not self-publish clinical records.  
‡ Patient may request removal of *their* contributions — **DECISION REQUIRED**.

Unmarked cells: **NOT YET DECIDED** where CONDITIONAL.

## 11. Visibility Authority

Server-side only. Authentication ≠ access. UI hide ≠ authorization (F1-B philosophy).

Visibility transitions require authenticated psychologist (or approved process) and audit event (proposed).

## 12. Sharing Approval

Evaluate distinct states:

```text
created  →  approved for patient visibility  →  published/shared
```

**DECISION REQUIRED:** Whether “created as shared” is one step or requires explicit publish.  
**DECISION REQUIRED:** Whether drafts exist that are neither private-working nor patient-visible.

## 13. Sharing Lifecycle

```text
PRIVATE → REVIEW → SHARING DECISION → SHARED → PATIENT ACCESS
```

Distinct approval event: **DECISION REQUIRED**.

### Original record vs shared representation

| Model | Description | Advantages | Risks | Audit / version / UX |
| --- | --- | --- | --- | --- |
| **A** | Flip visibility on original | Simple | Hard revoke; patient may have cached; mixes work product with shared surface | Audit flip events; version history critical |
| **B** | Separate patient-facing representation | Clear private vs shared; safer revoke of future access to representation | Duplication; sync drift | Audit create-share artifact; map to source |
| **C** | Other governed mechanism (e.g. curated letter) | Strong purpose limitation | More UX/process complexity | Explicit artifact lifecycle |

**DECISION REQUIRED** — do not choose silently. Recommendation for review: prefer **Model B** for sensitive clinical-private content; Model A only for content authored *as* patient-facing from the start — **NOT YET DECIDED**.

## 14. Revocation

Revoking future visibility ≠ deletion ≠ erasing what the patient already viewed, exported, screenshotted, or received via a channel.

| Topic | Status |
| --- | --- |
| Allow revoke future access? | **DECISION REQUIRED** |
| Effect on already-viewed | Cannot claim total erasure |
| Effect on exports | F4-09 |
| Effect on notifications already sent | Cannot recall third-party inboxes |
| Historical audit of prior share | Should remain |

## 15. Patient Rights

Evaluate (all **NOT YET DECIDED** unless noted):

| Capability | Notes |
| --- | --- |
| View shared information | Intended for SHARED_READ / collaborative |
| Acknowledge receipt | ≠ agreement / consent / diagnosis acceptance |
| Comment | If allowed, separate from authoritative body |
| Request clarification | Communication (F4-07) |
| Propose corrections | **Correction request**, not direct overwrite |
| Submit response | May be collaborative or separate patient-generated |
| Contribute to collaborative | If class is collaborative |
| Request review | Non-mutating request |

**Mandatory distinction:** requesting correction ≠ directly modifying the authoritative clinical record.

## 16. Psychologist Rights

Proposed capabilities (subject to F4-04): create private; intentionally share; create patient-facing explanations; create collaborative records; amend with provenance; revoke *future* visibility; respond to correction requests; preserve historical versions.

## 17. Administrative Boundaries

Operational administration does **not** automatically confer clinical visibility (**APPROVED** architectural principle for SUPER_ADMIN in Option B decisions).

| May access (proposed) | Must not auto-access |
| --- | --- |
| Sharing metadata (ids, timestamps) — **CONDITIONAL** | Private clinical content |
| Audit metadata (redacted) — **CONDITIONAL** | Shared clinical body |
| Account/ops status | Assessment content / safety narratives |

Detail: **F4-04**. Break-glass: **DECISION REQUIRED**.

## 18. Psychologist-to-Psychologist Boundaries

| Scenario | Status |
| --- | --- |
| Psych A sees Psych B’s patient | Only with assignment/relationship — **F4-04** |
| Psych A sees B’s private notes | Default **DENY** — **DECISION REQUIRED** for transfer/supervision |
| Transfer of care | Access change rules — **DECISION REQUIRED** |
| Previous psychologist retains access | **DECISION REQUIRED** |
| New psychologist receives historical private | **DECISION REQUIRED** + ethics/legal review |

## 19. Patient Isolation

**Invariant (security philosophy from F1-B):** Patient A must never receive Patient B’s shared or private clinical information, even if IDs/URLs/client state are manipulated.

Authoritative enforcement: server-side relationship checks (when implemented).

## 20. Acknowledgement Semantics

| Term | Means | Does **not** mean |
| --- | --- | --- |
| Viewed | Displayed | Agreement |
| Acknowledged | Confirmed receipt | Clinical approval / consent / diagnosis acceptance |
| Agreed | Explicit agreement act | Automatic treatment consent |
| Accepted as clinically correct | Explicit strong acceptance | Inferred from view |

## 21. Correction Requests

Proposed flow:

```text
Patient requests correction
  → Psychologist reviews
  → Decision (amend / decline / clarify)
  → Amendment with provenance (F4-05)
  → Audit (F4-10)
```

Patient cannot silently rewrite authoritative clinical records.

## 22. Versioning Dependencies

Visibility changes should create immutable historical events (proposed). Example sequence PRIVATE → SHARED → AMENDED → SHARING REVOKED is illustrative only — **NOT YET DECIDED**. Detail: **F4-05**.

## 23. Audit Dependencies

Events that should eventually be auditable: private create; shared create; visibility change; share approve; revoke; patient access; acknowledge; correction request; collaborative change.

Do not store full clinical bodies in audit metadata (F4-01 / Option B hygiene). Detail: **F4-10**.

## 24. Consent Dependencies

**Service consent** ≠ **authorization to share a particular item** ≠ **channel consent** (e.g. WhatsApp).

Sharing a specific record may require additional consent rules — **DECISION REQUIRED — F4-03**.

## 25. Safety Dependencies

Safety-sensitive content may require: restricted visibility; special audit; no ordinary notification bodies; human review before share — **F4-06**. No detection workflows here.

## 26. Communication / Notification Restrictions

Patient-visible clinical content is **not** automatically suitable for email/SMS/WhatsApp/push bodies.

Prefer: notify *availability* (“new shared item in portal”) rather than reproduce clinical content — aligned with F1-D-C recipient/content discipline and F4-07.

Channels for full shared content: **DECISION REQUIRED** (portal-only vs downloadable vs message).

## 27. Documents / Attachments

Same CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE concepts may apply to future reports, patient uploads, assessment PDFs. Storage remains deferred. Classification + visibility still apply.

## 28. AI Boundaries

| Question | Status |
| --- | --- |
| Private notes → AI | **DECISION REQUIRED — F4-11** |
| Shared records → AI | **DECISION REQUIRED** |
| Patient-generated → AI | **DECISION REQUIRED** |
| AI output → shared | Only after human approval |

```text
AI-generated suggestion ≠ Approved shared clinical information
```

## 29. Relationship Termination

On stop treatment / change psychologist / end practice relationship — access to private, shared, collaborative, and historical records must be redefined.

| Topic | Status |
| --- | --- |
| Private notes after transfer | **DECISION REQUIRED** |
| Shared history patient retains | **DECISION REQUIRED** + legal |
| Collaborative freeze vs archive | **DECISION REQUIRED** |
| Future access | **DENY** by default unless policy says otherwise |

## 30. Export / Deletion Dependencies

Export of shared clinical info: F4-09 + legal review.  
Deletion: not decided in F4-02. Revocation ≠ deletion. Immutable history vs erasure rights: **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 31. Threat Model

| Threat | Consequence | Governance control | Future technical control | Domain |
| --- | --- | --- | --- | --- |
| Patient reads private note | Confidentiality breach | CLINICAL_ONLY; no patient ACL | Server authz + tests | F4-04 |
| Tampered URL/public ID | IDOR | Patient isolation invariant | Authz on every read | F4-04 / F1-B |
| Psych A reads B’s private | Cross-clinician leak | Relationship-bound access | RBAC + assignment | F4-04 |
| Admin reads clinical body | Privilege abuse | Admin clinical blindness | Deny clinical permissions | F4-04 |
| Stale URL after revoke | Unintended access | Revoke future access rules | Token/ACL invalidation | F4-02/04 |
| Patient edits authoritative | Integrity loss | Correction-request model | Immutable write paths | F4-05 |
| Shared body in SMS/email | Channel leak | Notification restrictions | Template allow-lists | F4-07 / F1-D-C |
| AI draft auto-published | False clinical content | Human approval invariant | Publish gate | F4-11 |
| Access survives termination | Stale relationship | Termination rules | ACL recompute | F4-04 |

## 32. Patient Experience Principles

Transparent; understandable; non-stigmatizing; calm; clear about what is shared vs private. Avoid implying private notes exist “because of distrust” — frame as professional working practice and confidentiality.

## 33. Clinical Ethics Considerations

Confidentiality; transparency; participation; professional responsibility; minimum necessary disclosure; accurate documentation; preservation of professional judgment.

**LEGAL / PROFESSIONAL REVIEW REQUIRED** for mapping to local professional codes.

## 34. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** confidentiality; patient access rights; minors; consent; correction; retention; deletion; sharing; third-party disclosure; emergencies; transfer of care.

## 35. Governance Decision Matrix

| Decision | Options | Recommendation for review | Status | Rationale |
| --- | --- | --- | --- | --- |
| Default visibility of clinical working notes | Private / Shared | Private | **DECISION REQUIRED** | Matches private boundary principle |
| Share model | A / B / C | Prefer B for private→shared | **DECISION REQUIRED** | Safer revoke/provenance |
| Explicit publish step | Yes / No | Yes for sensitive | **DECISION REQUIRED** | Separates draft from shared |
| Patient edit of shared-read body | Deny / Allow | Deny | **DECISION REQUIRED** | Authority model |
| Patient comments on shared | Allow / Deny | Conditional | **DECISION REQUIRED** | UX vs integrity |
| Acknowledgement required | Yes / No | Optional | **DECISION REQUIRED** | Not consent |
| Revoke future access | Yes / No | Yes with limits | **DECISION REQUIRED** | Cannot erase past view |
| Collaborative create rights | Psych / Both | Conditional | **DECISION REQUIRED** | F4-02/04 |
| Admin sees clinical body | Never / Break-glass | Never auto | Aligns Option B | Confirm F4-04 |
| Clinical content in transactional notify | Never / Minimal | Never body | Aligns F1-D-C | Confirm F4-07 |
| AI auto-share | Forbidden | Forbidden | Aligns charter | Confirm F4-11 |

## 36. Proposed Access Matrix

| Resource | Psychologist | Patient | SUPER_ADMIN |
| --- | --- | --- | --- |
| Private clinical record | ALLOW* | DENY | DENY |
| Shared-read record | ALLOW* | ALLOW* (read) | DENY |
| Collaborative record | ALLOW* | CONDITIONAL | DENY |
| Sharing metadata | ALLOW* | CONDITIONAL | CONDITIONAL† |
| Audit metadata | CONDITIONAL | DENY | CONDITIONAL† |
| Correction request | Review ALLOW* | Create ALLOW* | DENY |
| Patient acknowledgement | Read CONDITIONAL | Create ALLOW* | DENY |

\* Relationship-authorized.  
† Metadata only; no clinical body — **NOT YET DECIDED** exact fields.

## 37. Binding Governance Invariants

1. Authentication does not imply access.  
2. Patient ownership does not automatically expose psychologist-private information.  
3. Psychologist access requires an authorized patient relationship.  
4. Patient visibility requires intentional sharing.  
5. Sharing is an explicit governed action.  
6. Visibility changes must be auditable.  
7. Patient acknowledgement does not equal clinical agreement.  
8. Patient correction requests do not directly overwrite authoritative clinical records.  
9. SUPER_ADMIN does not automatically receive clinical content.  
10. AI output does not become patient-visible clinical information without human approval.  
11. Revoking future visibility does not imply deletion of information already viewed or exported.  
12. Clinical content should not automatically enter ordinary transactional notifications.

## 38. Outstanding Decisions

**DECISION REQUIRED:** share Model A/B/C; publish vs create; acknowledgement/comment rules; revoke policy; collaborative rights equality; transfer-of-care access; break-glass; portal-only vs multi-channel delivery of shared content; termination access; correction SLA; whether “shared” implies notification of availability.

## 39. Cross-Domain Dependencies

```text
F4-01 Classification → F4-02 Private/Shared → F4-03 Consent → F4-04 Authorization
→ F4-05 Versioning → F4-06 Safety → F4-07 Communication → F4-08 Assessments
→ F4-09 Retention → F4-10 Audit → F4-11 AI → F4-12 Architecture
```

## 40. Implementation Restrictions

F4-02 does **not** authorize schema, enums, APIs, UI, sharing features, or Option C. Requires completed governance review, explicit Option C authorization, and a separate implementation task.

## 41. F4-02 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-02 | Draft private/shared/collaborative governance |

**Recommended next domain:** **F4-03 — Patient Consent Governance** (do not start without authorization).

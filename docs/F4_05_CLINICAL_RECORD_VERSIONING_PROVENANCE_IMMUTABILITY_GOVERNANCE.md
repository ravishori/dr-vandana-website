# F4-05 CLINICAL RECORD VERSIONING, PROVENANCE & IMMUTABILITY GOVERNANCE v1.0

**Document type:** Governance specification (not implementation; not legal certification)  
**Phase:** F4-05  
**Status:** DRAFT — **NOT YET DECIDED**  
**Baseline checkpoint:** `b32e1d0`  
**Parents:** `docs/F4_GOVERNANCE_MASTER_CHARTER.md`, `docs/F4_01_CLINICAL_DATA_CLASSIFICATION.md`, `docs/F4_02_PRIVATE_SHARED_RECORD_GOVERNANCE.md`, `docs/F4_03_PATIENT_CONSENT_GOVERNANCE.md`, `docs/F4_04_CLINICAL_RBAC_RELATIONSHIP_ADMIN_ACCESS_GOVERNANCE.md`  
**Option B decisions:** `docs/PATIENT_PRACTICE_DECISIONS.md` (appointment history immutable append-only — **APPROVED**; audit append-oriented — **APPROVED**)

This document is **not** legal advice and does **not** claim regulatory compliance.  
**LEGAL / PROFESSIONAL REVIEW REQUIRED** where marked. Retention periods remain **UNSET** (**F4-09 DEPENDENCY — NOT YET DECIDED**).

---

## 1. Purpose

Define:

> How a future clinical record should change over time while preserving who created it, what changed, why it changed, who approved it, what was visible at each point in time, and what historical state must remain trustworthy.

Prefer:

```text
Original → Revision → Review → Approval → Visibility → Further revision
```

Reject:

```text
UPDATE record → old content disappears
```

## 2. Scope

**In scope:** Versioning, provenance, immutability, correction/amendment concepts, matrices, threats, invariants, open decisions.

**Out of scope / forbidden:** Clinical/version tables or columns, migrations, triggers, authz/API/UI changes, audit implementation, correction/AI workflows, Option C, Production, commits.

Option C remains **BLOCKED**.

## 3. Governing Documents

Authoritative inputs in the header. Also: F1-B isolation, F1-C sessions/MFA, F1-D appointment/notification/outbox integrity.

Conflicts → **DECISION REQUIRED**, not silent resolution.

**Continuity (aligned):** Option B already uses append-only `appointment_history` with no-update enforcement and optimistic `appointments.version`. That is an **operational** pattern — not automatic authorization of clinical EHR versioning, but a compatible precedent for “history must not be silently overwritten.”

## 4. Current Option B Boundary

| Pattern (evidence) | Nature | Clinical? |
| --- | --- | --- |
| `appointment_history` append-only; `appointment_history_no_update` trigger | Immutable operational trail | No |
| `appointments.version` optimistic concurrency | Operational conflict control | No |
| Appointment status transitions with actor/time/reason in history | Operational provenance | No |
| Security/audit events (append-oriented; no passwords/OTP/clinical notes) | Audit ≠ clinical version | No |
| Notification/outbox history | Delivery/ops events | No |

No clinical record versioning exists. Do not retrofit clinical meaning onto appointment history.

## 5. Central Governance Question

Clinical change must preserve: creator, change, reason, approver, visibility-at-time, and trustworthy historical state — via governed versions/events, not destructive overwrite.

## 6. Immutability Principle

> Once a clinical record version becomes part of the authoritative historical record, its historical content must not be silently overwritten.

Distinguish conceptually:

| Concept | Meaning |
| --- | --- |
| Immutable historical version | Preserved past content state |
| Current effective version | What is currently authoritative for care |
| Draft | Working content not yet finalized |
| Proposed amendment | Suggested change pending review |
| Correction | Response to error/dispute (new version/event) |
| Superseded version | Prior current; still historical |
| Revoked sharing | Visibility change — not content destruction |
| Archived record | Retention/access state — F4-09 |

## 7. Immutability ≠ No Changes

```text
Old version → remains historically preserved
New version → records subsequent change
```

Destructive overwrite is **not** the governance default.

## 8. Versioning Purpose

| Category | Why version? | Same rules as notes? |
| --- | --- | --- |
| Clinical notes | Reconstruct what was known when | Baseline candidate |
| Care plans / goals / recommendations | Care continuity & accountability | **DECISION REQUIRED** if lighter rules |
| Patient-shared information | What patient saw when | Visibility-bound |
| Collaborative records | Multi-author contributions | Contributor-preserving |
| Assessments | Scoring/interpretation history | F4-08; may differ |
| Safety-related records | High sensitivity / review trail | F4-06; may stricter |
| Clinical documents | Document vs record version | **DECISION REQUIRED** |

Do not assume identical rules for all classes.

## 9. Version Identity

Distinguish: **record identity** ≠ **version identity** ≠ **author identity** ≠ **approving identity** ≠ **relationship identity** ≠ **patient identity**.

A record identifier alone is insufficient provenance. Do not invent ID schemes beyond existing Option B public IDs for ops.

## 10. Provenance

Ability to establish: who created the version; creator role; patient relationship/context; creation time; source; purpose where relevant; approval state; sharing/visibility state; amendment reason where applicable.

Minimize unnecessary personal exposure in UIs/exports (need-to-know).

## 11. Provenance Sources

| Source | Examples | Authority |
| --- | --- | --- |
| Patient-generated | Check-in, journal, response, reflection | Self-report |
| Psychologist-generated | Note, recommendation, care plan, observation, formulation | Professional |
| System-generated | Timestamps, workflow transitions, ops metadata | Non-clinical content |
| Imported | External document, transferred record | As known; else unknown |
| AI-generated | Drafts/suggestions | **Non-authoritative until human review and approval** |

## 12. Authority Levels

```text
Raw patient input
  ≠ Psychologist observation
  ≠ Clinical interpretation
  ≠ AI suggestion
  ≠ Approved clinical record
```

Provenance does not imply clinical truth.

## 13. Authorship

Roles in a lifecycle may differ: creator, reviewer, approver, sharer, amender, correction requester. Do not assume one person. No role tables in this phase.

## 14. Authorship vs Approval

> Creating a clinical record does not necessarily mean the record has been clinically approved.

Conceptual states (not final enums): draft, submitted, reviewed, approved, shared, superseded, withdrawn, rejected, corrected, disputed.

## 15. Approval Authority

| Actor | May be final clinical approver? |
| --- | --- |
| Treating psychologist | CONDITIONAL — primary candidate |
| Supervising psychologist | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Patient | No (acknowledgement ≠ approval) |
| System | No (workflow only) |
| AI | **No** — never final clinical approver |

## 16. Patient Acknowledgement

Integrate F4-02. Distinguish: Viewed / Acknowledged / Agreed / Accepted / Corrected / Disputed.

Acknowledgement ≠ authorship ≠ clinical approval ≠ agreement with diagnosis/interpretation.

## 17. Patient Correction Request

```text
Patient sees shared record → requests correction → psychologist reviews
  → decision → new version / response (not silent overwrite)
```

Correction request ≠ direct overwrite of authoritative record (F4-02).

## 18. Correction vs Amendment

| Concept | Meaning |
| --- | --- |
| Correction | Factual error or patient-reported disagreement response |
| Amendment | Subsequent professional update |
| New clinical observation | New information; prior may still stand |
| Supersession | Newer version becomes current |

Legal terminology caution — **LEGAL / PROFESSIONAL REVIEW REQUIRED** where mapping to professional recordkeeping duties.

## 19. Disputed Records

Patient disagreement, psychologist disagreement, disputed interpretation, correction request, disputed assessment: represent as event/annotation/correction flow — **do not erase** underlying historical record. Patient rights mapping — **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 20. Version States

Illustrative lifecycle:

```text
DRAFT → REVIEW → APPROVED → SHARED → CURRENT → SUPERSEDED
```

Alternates: REJECTED, WITHDRAWN, CORRECTED, DISPUTED. Technical names **NOT YET DECIDED**.

## 21. Drafts

| Question | Status |
| --- | --- |
| Psychologist-private by default? | Proposed **YES** — **NOT YET DECIDED** |
| Patient-visible while draft? | Proposed **NO** — **NOT YET DECIDED** |
| Included in audit? | Create/edit events CONDITIONAL — F4-10 |
| Immutable after approval? | Proposed **YES** for approved versions — **DECISION REQUIRED** |
| Delete vs retain drafts? | **DECISION REQUIRED** / F4-09 |

## 22. Private Notes

Critical decision:

> Does every saved private note immediately become an immutable clinical record?  
> Or can working drafts remain mutable until finalized?

**DECISION REQUIRED.** Private ≠ patient-visible merely because versioned (Invariant 23).

## 23. Shared Records

Visibility classes: CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE (F4-02).

| Question | Status |
| --- | --- |
| Visibility attached to version? | Proposed **YES** — **DECISION REQUIRED** |
| Can a version change visibility? | Via governed event — **DECISION REQUIRED** |
| Does sharing create a new version? | **DECISION REQUIRED** (F4-02 open; Models A/B/C) |
| Does revocation create version or event? | Prefer **event** (+ access change); **DECISION REQUIRED** |
| Private version later shared? | CONDITIONAL intentional share — **DECISION REQUIRED** (prefer Model B transform) |

## 24. Collaborative Records

Distinguish contributors: patient contribution ≠ psychologist amendment ≠ psychologist approval ≠ system metadata. Do not collapse into one author.

## 25. Version Visibility

Patient historical visibility models: current only / selected / full history / amendment summaries — **DECISION REQUIRED**.

## 26. Private Version Visibility

Patient access must not expand merely because a later version is shared. Historical private material stays private unless intentionally governed otherwise.

## 27. Revoked Sharing

```text
PRIVATE → SHARED → REVOKED
```

Future access blocked for revoked parties; audit preserves event; historically-shared fact may remain as evidence; exported/viewed copies not claimed erased (F4-02).

## 28. Consent Withdrawal

Service / item-share / channel / AI withdrawal (F4-03): affects future processing/visibility — **not** automatic deletion of historical versions.

## 29. Versioning and Consent

Material consent change → prefer **separate consent event** (F4-03/F4-10), optionally plus visibility event. Do not collapse consent history into clinical versioning.

## 30. Versioning and Relationships

Assignment, transfer, termination, supervision, consultation, delegation (F4-04): may change **current access**; must not silently rewrite historical authorship.

## 31. Transfer of Care

```text
Psychologist A → transfer → Psychologist B
```

Historical versions retain original author, relationship context, timestamps, approval provenance. Do not change historical authorship. Access for A/B: F4-04 **DECISION REQUIRED**.

## 32. Multiple Psychologists

Multi-treating / consultant / supervisor / B amending A’s record: provenance must name actual actor; editing rights follow F4-04 — **DECISION REQUIRED** / legal for supervision.

## 33. Supervision

Supervisor review may create: version / separate review record / change authoritative version / remain private / become shared — all **LEGAL / PROFESSIONAL REVIEW REQUIRED** + **DECISION REQUIRED**.

## 34. Consultation

Consultation note ≠ amendment ≠ clinical review ≠ transfer. Keep distinct in provenance.

## 35. Delegation

Preserve: who performed the action; under whose authority (where relevant).

## 36. AI-Generated Content

```text
AI generated → Human reviewed → Human approved → Potentially authoritative
```

AI must never silently become an authoritative clinical record (F4-11).

## 37. AI Drafts

Default lean for review: private; require human review and explicit approval; versioned as AI-sourced drafts; retention/audit **DECISION REQUIRED** / F4-09/F4-10. Not implemented.

## 38. AI Provenance

If AI later approved: preserve model/service identity, generation time, source context (appropriate minimization), human reviewer, approval status. No vendor/model specified here.

## 39. Imported Records

Preserve: source, import event, imported-at, original authorship if known; otherwise mark unknown. Do not invent provenance.

## 40. Unknown / Uncertain Provenance

Incomplete provenance → conceptual **PROVENANCE UNKNOWN** (or equivalent). Do not fabricate author, timestamp, source, or approval.

## 41. System-Generated Events

Shared / viewed / acknowledged / revoked / superseded are often **events**, not new clinical content versions. Distinguish content versions from workflow events.

## 42. Audit vs Version History

```text
Version history = content state over time
Audit history = events about actions
```

Do not merge automatically. Detail F4-10.

## 43. Audit Events

Future auditable (conceptual): create; edit/amend; approve; share; revoke; view; acknowledge; correction request; correction decision; supersede; export; deletion request; AI generation; AI approval. No implementation.

## 44. Immutable Audit

Audit history must not be silently rewritten. Technical design → F4-10.

## 45. Timestamps

Conceptual needs: created, submitted, approved, shared, superseded, amended. Timezone/storage → **F4-12 DEPENDENCY** (Option B uses Asia/Kolkata for appointments — ops precedent only).

## 46. Clock Trust

Timestamps should originate from trusted server/system, not client clocks. Not implemented here.

## 47. Concurrency

Evaluate later: optimistic concurrency, conflict detection, append-only revisions, last-write-wins. Selection → **F4-12 DEPENDENCY**. Option B appointment `version` is ops precedent only.

## 48. No Last-Write-Wins for Clinical History

> A concurrent edit must not silently destroy another clinical author's historical contribution.

## 49. Version Order

Distinguish creation sequence, effective date, event time, approval time. No invented numeric scheme.

## 50. Backdated Information

Distinguish: when clinical event occurred; when information was recorded; when version was approved. Representation **DECISION REQUIRED**; legal mapping **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 51. Amendment Reason

Amendments should evaluate requiring: reason, author, timestamp, affected record, relationship, approval — **DECISION REQUIRED** which are mandatory.

## 52. Deletion

```text
Delete current access ≠ erase historical provenance
```

**LEGAL / PROFESSIONAL REVIEW REQUIRED** / F4-09. No periods invented.

## 53. Retention

**F4-09 DEPENDENCY — NOT YET DECIDED.** No years/months/statutory periods invented here.

## 54. Export

Evaluate preserving: version identity, authorship, timestamps, amendments, provenance, sharing state — **DECISION REQUIRED** / F4-09.

## 55. Document Attachments

Document version ≠ clinical-record version ≠ attachment reference ≠ replacement document. Storage not implemented.

## 56. Search

Index current / historical / private / shared? **DECISION REQUIRED**. Default must not invent open historical private search.

## 57. Analytics

Historical clinical versions for analytics: purpose limitation (F4-01) + consent (F4-03). No automatic secondary-use authorization.

## 58. Notifications

Clinical version contents must not appear in email/SMS/WhatsApp/push by default (F1-D-C). Safe operational language only unless separately approved (F4-07).

## 59. Patient Notification of Changes

Notify on shared-record change / correction / supersession / revoke? **DECISION REQUIRED** — F4-07.

## 60. Version Access After Relationship Termination

```text
Historical existence ≠ Current access permission
```

Authorship remains intact; ACL follows F4-04.

## 61. Private Notes After Relationship Termination

Continued private access / transfer / retention / supervisory / patient access — **DECISION REQUIRED** + legal / F4-04 / F4-09.

## 62. Version Access After Account Suspension

Suspension blocks current access (F1-C / F4-04); must not rewrite historical provenance.

## 63. Patient Dispute

May create event / annotation / correction request / new version — **DECISION REQUIRED** mix. Must not erase original history.

## 64. Psychologist Correction

```text
Existing Version → Correction / Amendment → New Version
```

Original remains historically attributable unless legal/professional duty requires otherwise — **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

## 65. Superseded Versions

> Superseded does not mean destroyed.

Distinguish superseded from current effective; retention/deletion → F4-09.

## 66. Revoked Versions

Revoked sharing ≠ withdrawn consent ≠ superseded content ≠ deleted access ≠ deleted record. Not interchangeable.

## 67. Record Locking

Possible policy: draft mutable; approved version immutable; amendment creates new version — **DECISION REQUIRED**. No DB locks implemented here.

## 68. Finalization

What makes a version authoritative: psychologist approval / clinical review / system submission — **DECISION REQUIRED**. Do not assume.

## 69. Provenance Completeness

Minimum conceptual fields to evaluate: record identity; version identity; actor; actor role; relationship; creation time; source; state; approval state; visibility state; amendment context. Not DB columns.

## 70. Provenance Failure

> A clinical record with missing mandatory provenance must not silently be treated as fully authoritative.

Blocking mechanics → **F4-12 DEPENDENCY** / **DECISION REQUIRED**.

## 71. Identity Binding

Client-provided author/psychologist/patient/version IDs or approval state must never prove provenance (F4-04). Server-side binding required eventually.

## 72. Role Change

Later role change / admin / suspension / leave: historical authorship stays historical; current authorization changes independently.

## 73. Patient Identity Change

Profile updates must not rewrite historical clinical authorship/provenance — **DECISION REQUIRED** for display name linkage vs immutable snapshot.

## 74. Data Migration

Migration must not fabricate provenance. Distinguish original source, migration actor, migration event. No migrations in this phase.

## 75. Backups

> Backup restoration must not silently alter clinical provenance or version history.

Ops detail later.

## 76. Disaster Recovery

Recovered records should preserve version sequence, timestamps, provenance, audit events — conceptual. Not implemented.

## 77. Security Threat Model

| # | Threat | Governance control | Future technical control | Dependency |
| --- | --- | --- | --- | --- |
| 1 | Destructive UPDATE | No silent overwrite | Append-only versions / triggers | F4-12 |
| 2 | Version overwrite | Immutability of historical versions | Immutable storage | F4-05/12 |
| 3 | Forged author | Server identity binding | Session principal | F4-04 |
| 4 | Forged approval | Approval authority rules | Authz + audit | F4-04/10 |
| 5 | Forged patient | Patient isolation | Ownership checks | F1-B |
| 6 | Forged psychologist | Relationship authz | ACL | F4-04 |
| 7 | Client-controlled version ID | IDs ≠ provenance | Server-issued IDs | F4-04 |
| 8 | Cross-patient version access | Isolation | Authz tests | F1-B/F4-04 |
| 9 | Cross-psychologist version access | Relationship rules | Authz | F4-04 |
| 10 | Hidden historical version | Completeness / audit | Integrity checks | F4-10 |
| 11 | Deleted historical version | Retain vs erase policy | Soft flags + F4-09 | F4-09 |
| 12 | AI auto-publish | Human approval required | No auto-share | F4-11 |
| 13 | Unauthorized amendment | Action authz | ACL | F4-04 |
| 14 | Stale relationship | Status checks | ACL recompute | F4-04 |
| 15 | Revoked-share bypass | Visibility events | Enforce current visibility | F4-02 |
| 16 | Export provenance loss | Export must carry provenance | Export schema | F4-09 |
| 17 | Migration provenance loss | No fabrication | Import events | F4-05/12 |
| 18 | Timestamp manipulation | Server clock trust | Reject client times | F4-12 |
| 19 | Concurrent edit collision | No LWW for history | Optimistic + append | F4-12 |
| 20 | Audit/version mismatch | Distinct but reconcilable | Dual logging design | F4-10 |

## 78. Binding Governance Invariants

1. Clinical history must not be silently overwritten.  
2. A new clinical change should normally be represented as a new historical version or governed amendment.  
3. Historical authorship must remain attributable.  
4. Current authorization does not rewrite historical provenance.  
5. Patient acknowledgement does not equal clinical approval.  
6. AI generation does not equal clinical authorship or approval.  
7. System events do not automatically constitute clinical content.  
8. Version history and audit history are distinct concepts.  
9. Visibility is not equivalent to authorship.  
10. Sharing revocation does not mean historical destruction.  
11. Consent withdrawal does not automatically mean historical deletion.  
12. Correction does not silently overwrite the disputed/original history.  
13. Client-controlled identifiers cannot establish provenance.  
14. Cross-patient provenance must remain isolated.  
15. Cross-psychologist access must follow F4-04 governance.  
16. Relationship termination changes current access, not historical authorship.  
17. Approved authoritative records require trustworthy provenance.  
18. Missing mandatory provenance must not silently become authoritative.  
19. Clinical exports should preserve relevant provenance.  
20. Retention/deletion policy must come from F4-09, not this domain.  
21. AI-generated drafts require human governance before becoming authoritative.  
22. Concurrent edits must not silently destroy another author’s contribution.  
23. Private clinical working material must not become patient-visible merely because it has versions.  
24. Version state and visibility state must remain conceptually distinct.  
25. Immutability must preserve historical truth without preventing legitimate future amendments.

## 79. Access / Version Matrix

| Actor | Record State | Version | Action | Result |
| --- | --- | --- | --- | --- |
| Patient | SHARED current | Shared | View | CONDITIONAL |
| Patient | SHARED historical | Shared history | View history | **DECISION REQUIRED** |
| Patient | CLINICAL_ONLY | Any | View | DENY |
| Patient | SHARED | Any | Direct amend | DENY (correction request only) |
| Treating psychologist | Own patient draft | Draft | Edit | CONDITIONAL |
| Treating psychologist | Approved | Historical | Overwrite | DENY; amend → new version |
| Consultant | Scoped | Authorized | View | CONDITIONAL / **NOT YET DECIDED** |
| Supervisor | Scoped | Authorized | Review | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Former psychologist | Ended relationship | Historical | Ongoing access | DENY default; historical **DECISION REQUIRED** |
| SUPER_ADMIN | Any clinical | Any | View body | DENY by default |
| Operational staff | Clinical version | Any | View body | DENY |
| Service worker | Clinical version | Any | Read body | DENY default |
| AI | Clinical version | Any | Process | **NOT YET DECIDED** / F4-11; ≠ approval |
| Unauthorized | Any | Any | Any | DENY |

## 80. Version Lifecycle Matrix

| Stage | Editable? | Patient Visible? | Authoritative? | Audit Event? |
| --- | --- | --- | --- | --- |
| Draft | CONDITIONAL | Proposed NO — **NOT YET DECIDED** | No | CONDITIONAL |
| Review | Limited | Proposed NO | No | Yes |
| Approved | No (immutable content) | Not automatically | Yes (clinical) | Yes |
| Shared | No overwrite; amend → new | Yes if shared | Yes if current shared | Yes |
| Current | Via new version only | Per visibility | Yes | Yes |
| Superseded | No | **DECISION REQUIRED** | No (historical) | Yes |
| Disputed | No silent overwrite | CONDITIONAL | Contested — **DECISION REQUIRED** | Yes |
| Corrected | Via new version | Per decision | New current if approved | Yes |
| Revoked (sharing) | N/A content | Future DENY | Content may still exist | Yes (event) |

## 81. Provenance Matrix

| Source | Authority | Human Review | Patient Visibility | Versioning |
| --- | --- | --- | --- | --- |
| Patient | Self-report | N/A / psych review CONDITIONAL | Own contributions CONDITIONAL | Yes recommended |
| Psychologist | Professional | Self / peer CONDITIONAL | Only if shared | Yes |
| Supervisor | Supervisory | **LEGAL REVIEW** | Usually private — **DECISION REQUIRED** | Review record/version **DECISION REQUIRED** |
| Consultant | Consultative | Treating psych CONDITIONAL | Usually not auto-shared | Yes if clinical content |
| System | Operational | N/A | Rarely clinical body | Event, not content version |
| Imported | As known / unknown | Required before treat as authoritative | Per share rules | Import event + versions |
| AI | Non-authoritative | Required | DENY until human approve+share | Draft versions |

## 82. Governance Decision Matrix

| Decision | Options | Recommendation for review | Status | Dependency |
| --- | --- | --- | --- | --- |
| No silent overwrite | Adopt / reject | Adopt | Aligns charter + Option B history precedent; clinical policy **NOT YET DECIDED** | F4-A / Option B |
| Draft mutable until finalize | Mutable / immediate immutable | Mutable drafts; lock on approve | **DECISION REQUIRED** | F4-05 |
| Sharing creates version | Version / event / Model B artifact | Prefer event + share artifact (Model B lean) | **DECISION REQUIRED** | F4-02 |
| Revocation = event | Event / version | Event | **DECISION REQUIRED** | F4-02 |
| Patient sees history | None / selected / full | — | **DECISION REQUIRED** | F4-02/05 |
| AI never final approver | Adopt | Adopt | Aligns charter AI principle | F4-11 |
| Consent ≠ clinical version | Separate events | Adopt | Aligns F4-03 | F4-03 |
| Retention periods | — | Defer | **F4-09 DEPENDENCY — NOT YET DECIDED** | F4-09 |
| Concurrent LWW | Forbid for history | Forbid | **NOT YET DECIDED** formal | F4-12 |
| Supervisor as approver | Allow / deny / scoped | — | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-04 |

## 83. Outstanding Decisions

1. What constitutes a clinical record version? → Content state snapshot after governed create/amend/approve — formal definition **NOT YET DECIDED**.  
2. Which classes require versioning? → Notes/plans/shared/collaborative/assessments/safety/docs may differ — **DECISION REQUIRED**.  
3. Are drafts versioned? → **DECISION REQUIRED** (autosave vs explicit versions).  
4. When immutable? → Proposed on approval — **DECISION REQUIRED**.  
5. Final approval? → **DECISION REQUIRED**.  
6. Who may approve? → Psychologist primary; others legal/decision.  
7. Patient direct amend shared? → **DENY**; correction request only (aligns F4-02).  
8. Correction requests? → Event + review + possible new version.  
9. Disputed records? → Event/annotation; no erase — **DECISION REQUIRED** form.  
10. Patient historical versions? → **DECISION REQUIRED**.  
11. Sharing creates version? → **DECISION REQUIRED**.  
12. Revocation version or event? → Prefer event — **DECISION REQUIRED**.  
13. Consent withdrawal? → Separate consent event — not clinical version collapse.  
14. Transfer vs provenance? → Authorship preserved; ACL changes F4-04.  
15. Supervision provenance? → **LEGAL / PROFESSIONAL REVIEW REQUIRED**.  
16. Consultation provenance? → Distinct consult note/event.  
17. Delegation provenance? → Actor + authority.  
18. AI drafts? → Private, reviewed, approved before authoritative.  
19. Minimum provenance? → §69 list — mandatory set **DECISION REQUIRED**.  
20. Missing provenance? → Not silently authoritative.  
21. Imported records? → Source + import event; unknown if unknown.  
22. Backdated information? → Separate event-occurred vs recorded — **DECISION REQUIRED**.  
23. Concurrent edits? → No LWW for history; mechanism **F4-12 DEPENDENCY**.  
24. Exports? → Preserve provenance — **DECISION REQUIRED** / F4-09.  
25. Retention/deletion vs history? → F4-09 + legal.  
26. Who views private historical? → Authorized clinical roles per F4-04 — **DECISION REQUIRED**.  
27. Who views shared historical? → Patient CONDITIONAL; treating CONDITIONAL — **DECISION REQUIRED**.  
28. SUPER_ADMIN clinical versions? → DENY body by default.  
29. Former psychologists? → Ongoing DENY default; historical **DECISION REQUIRED**.  
30. Service workers? → DENY clinical body default.  
31. AI access versions? → **NOT YET DECIDED** / F4-11.  
32. After relationship termination? → Access≠authorship (F4-04).  
33. After suspension? → Block access; keep provenance.  
34. Backups? → Must not alter provenance.  
35. Legal/professional review? → §84.

## 84. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** clinical correction/amendment duties; patient access to historical versions; disputed records; minors/guardians; supervision; consultation; transfer; retention; deletion; export; emergency access; historical preservation obligations; AI-generated records.

Do not claim compliance with any specific law or professional standard unless authoritative project documentation establishes it.

## 85. Implementation Restrictions

No clinical/version schema, migrations, triggers, APIs, UI, audit implementation, correction/AI workflows, Option C, or Production. Requires governance approval + separate implementation authorization. Architecture details → F4-12.

## 86. F4-05 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-05 | Draft clinical versioning / provenance / immutability governance |

**Recommended next domain:** **F4-06 — Safety, Crisis & Escalation Governance** (do not start without authorization).

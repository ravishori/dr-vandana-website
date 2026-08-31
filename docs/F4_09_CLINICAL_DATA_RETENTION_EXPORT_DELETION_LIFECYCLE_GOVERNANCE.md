# F4-09 CLINICAL DATA RETENTION, EXPORT, DELETION & LIFECYCLE GOVERNANCE v1.0

## 1. Executive Summary

This document defines governance for **what should happen to every category of data throughout its lifecycle** — retention, archival, export, access restriction, deletion/erasure where permitted, disposal, backup expiry, and audit preservation.

**Facts:** Option B stores identity, appointments, history, notifications, and security/audit data. Retention periods are **UNSET** (`docs/DECISION_DATA_RETENTION.md` — OPEN / LEGAL REVIEW REQUIRED). Deletion workflows are **not implemented**. Production accounts remain **BLOCKED** until retention/deletion policy is set. No clinical retention engine exists. RPO/RTO/backup retention also **UNSET**.

**Binding stance:** Retention ≠ authorization ≠ deletion. Consent withdrawal ≠ automatic deletion. Share revocation ≠ deletion. Export ≠ view. Application deletion ≠ backup expiry ≠ provider-copy deletion. Periods must not be invented.

**Document status:** **NOT YET DECIDED**

---

## 2. Purpose

Answer:

> What should happen to every category of data throughout its lifecycle?

Provide a decision framework for practice owner + legal/professional review — not legal advice, not compliance certification, not implementation.

---

## 3. Scope

**In scope:** Lifecycle model; retention triggers; export/deletion concepts; soft/hard delete analysis; audit preservation vs clinical shadow copies; backup/provider distinctions; matrices; threats; invariants; open decisions.

**Out of scope / forbidden:** Clinical/ops retention workers; export/deletion endpoints; archival jobs; clinical schema; migrations; UI; AI; Production changes; invented statutory periods; legal research not authorized by this task.

---

## 4. Non-Scope

Does **not** implement Option C. Does **not** redesign Option B. Does **not** conclude GDPR/DPDP/HIPAA applicability. Does **not** invent India-specific statutory periods from geography alone. Does **not** claim provider deletion guarantees.

---

## 5. Current Option B Evidence

**Status source:** `docs/DECISION_DATA_RETENTION.md` (OPEN / LEGAL REVIEW REQUIRED); O10 in `PATIENT_PRACTICE_DECISIONS.md`; `docs/DECISION_BACKUP_RPO_RTO.md` (HUMAN DECISION REQUIRED).

| Area | CURRENTLY IMPLEMENTED | Retention policy | Deletion |
| --- | --- | --- | --- |
| Users / patient_profiles / psychologist contact | Yes | **UNSET** | Account closure workflow **UNSET**; not implemented |
| Sessions / OTP / email & phone verification / password reset | Yes; TTLs exist in schema (`expires_at`) | Session TTL in **code**; **policy lock UNSET** | Revoke exists; bulk policy **UNSET** |
| MFA credentials / recovery codes | Yes | **UNSET** | **UNSET** (O12) |
| Appointments | Yes | **UNSET** | **UNSET** |
| `appointment_history` | Append-only; no-update trigger | **UNSET** | Erasure vs integrity — **LEGAL REVIEW** |
| Outbox / deliveries / attempts | Yes (EMAIL, WHATSAPP) | **UNSET** | **UNSET**; SENT ≠ delivery receipt |
| Audit logs / security events | Yes | **UNSET** | **UNSET** |
| Booking idempotency | `expires_at` column | Policy **UNSET** | **UNSET** |
| WhatsApp consent flags | Yes | **UNSET** | Opt-out consistency — **LEGAL REVIEW** |
| Soft-delete clinical fields | **Not found** | N/A | N/A |
| Clinical export / deletion endpoints | **Not found** | N/A | N/A |
| Retention/archival workers | **Not found** | N/A | N/A |
| Production backups | Framework only; **NOT CONFIGURED** | Backup retention **UNSET** | Restore drill **NOT EXECUTED** |
| Q&A / crisis resource stores | Separate stacks | Not PMS clinical records | Separate |

Timestamps alone do **not** constitute a retention policy.

---

## 6. Future Option C Boundary

**GOVERNANCE PROPOSAL — NOT IMPLEMENTED / BLOCKED:**

Clinical-private/shared/collaborative records; assessments (responses/scores/interpretations); safety records; clinical documents; clinical communication; AI drafts/provenance; clinical export packages; clinical deletion workflows; legal holds; lifecycle workers.

Listing ≠ authorization to build.

---

## 7. Data Lifecycle Model

Conceptual stages (not every category uses every stage):

```text
CREATE → ACTIVE USE → SHARING / ACCESS → AMENDMENT
  → RETENTION → ARCHIVAL (where applicable) → EXPORT
  → ACCESS RESTRICTION → DELETION / ERASURE (where permitted)
  → DISPOSAL → BACKUP EXPIRY → AUDIT PRESERVATION
```

---

## 8. Retention Governance Principles

1. Purpose-bound retention (why keep?).  
2. Minimum necessary retention (duration **UNSET** until decided).  
3. Retention ≠ access (F4-04).  
4. Retention ≠ deletion.  
5. Classification-driven (F4-01).  
6. Visibility-preserving (F4-02) — retention must not silently change share state.  
7. Provenance-preserving (F4-05) — no silent history destruction.  
8. Do not invent periods.  
9. Legal/professional requirements must be **verified** before becoming policy.  
10. Automation cannot override governance.

---

## 9. Retention Triggers

| Trigger | Status |
| --- | --- |
| Record creation | Conceptual baseline — **NOT YET DECIDED** as clock start |
| Last modification | **NOT YET DECIDED** |
| Treatment / relationship termination | **NOT YET DECIDED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Account closure | **NOT YET DECIDED** / legal |
| Consent withdrawal | Forward-looking processing change ≠ auto delete — **LEGAL REVIEW** |
| Appointment completion | Ops — **NOT YET DECIDED** |
| Assessment completion | Future — **NOT YET DECIDED** |
| Safety event closure | Future — **LEGAL REVIEW** |
| Document supersession | Future — **NOT YET DECIDED** (F4-05) |
| Export completion | Package TTL — **NOT YET DECIDED** |
| Legal hold release | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Statutory/professional trigger | **LEGAL / PROFESSIONAL REVIEW REQUIRED** — verify later; do not invent |

---

## 10. Retention Period Governance

For every category, period status is one of:

- Existing/verified (none for clinical; session TTLs are **technical** not policy lock)  
- Not applicable  
- Event-based / relationship-based / purpose-based — **NOT YET DECIDED** which apply  
- Indefinite pending decision  
- **LEGAL / PROFESSIONAL REVIEW REQUIRED**  
- **NOT YET DECIDED** / **UNSET**

Do not convert “should be retained” into days/months/years.

Option B inventory periods remain **UNSET** per `DECISION_DATA_RETENTION.md`.

---

## 11. Archival Governance

Archive ≠ delete. Archive may mean restricted access / cold storage conceptually.

Who archives; what; when; whether searchable; whether patient-visible — **NOT YET DECIDED** / **TECHNICAL DECISION REQUIRED**. No archival workers.

---

## 12. Export Governance

### 12.1 Export ≠ access

```text
view ≠ download ≠ export ≠ print ≠ share ≠ external disclosure
≠ provider transmission ≠ patient copy ≠ third-party copy
```

Authorization to view does **not** automatically imply authorization to export.

### 12.2 Open questions (all unresolved)

| Question | Status |
| --- | --- |
| Who may request? | Patient / psych / admin — **NOT YET DECIDED** / legal |
| Who may approve? | **NOT YET DECIDED** |
| What categories included/excluded/redacted? | Per F4-01/02 — **NOT YET DECIDED** |
| Private notes in patient export? | Default lean **EXCLUDE** — **NOT YET DECIDED** / legal |
| Shared records? | CONDITIONAL — **NOT YET DECIDED** |
| Audit records? | Metadata vs bodies — **NOT YET DECIDED** |
| AI drafts? | Default lean **EXCLUDE** unless approved — **NOT YET DECIDED** |
| Safety-sensitive? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Third-party data? | **LEGAL REVIEW** |
| Identity / authz / relationship verification? | Server-side required — mechanics **TECHNICAL DECISION REQUIRED** |
| Logging / package protection / package TTL? | **NOT YET DECIDED** |
| Revoke after delivery? | Limited (external copies) — **NOT YET DECIDED** |
| Export after relationship termination? | **NOT YET DECIDED** / legal |

No export endpoints implemented.

---

## 13. Deletion Governance

Conceptual scenarios (do not decide legal erasure rights):

user-requested deletion; correction; account closure; relationship termination; consent withdrawal; retention expiry; duplicate/erroneous/test/imported data; clinical history; audit/security history; backups; provider copies; exported copies.

**LEGAL / PROFESSIONAL REVIEW REQUIRED** for patient erasure vs professional recordkeeping duties.

```text
withdraw consent ≠ delete record
revoke sharing ≠ delete record
account closure ≠ automatically delete clinical history
relationship termination ≠ automatically delete historical clinical records
export ≠ deletion
archive ≠ deletion
```

---

## 14. Soft vs Hard Delete

| Concept | Meaning | Status |
| --- | --- | --- |
| Soft delete | Hidden from normal access; retained for governance/audit | **NOT YET DECIDED** if used |
| Hard delete | Removal from primary datastore | **NOT YET DECIDED** / legal |

Also consider: backups; replicas; caches; search indexes; object storage; provider systems; exported files.

Do not claim either is legally required. Do not implement.

---

## 15. Audit Preservation

Integrate F4-10 dependency.

Deletion of a clinical object must not automatically erase evidence that: it existed; was amended; shared; revoked; exported; deletion requested/approved/rejected/occurred.

**Critical distinction:**

```text
Audit metadata (who/what/when/outcome)
  ≠
Hidden full copy of clinical content
```

Audit must not become a clinical-content shadow copy. Exact audit retention: **UNSET** / **LEGAL REVIEW**.

---

## 16. Legal / Professional Hold

Conceptual `LEGAL_HOLD` / `PRESERVATION_HOLD` — **not implemented**.

Who places/releases; categories affected; deletion suspended; audit; patient notification — all **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 17. Backup / Disaster Recovery

| Item | Status |
| --- | --- |
| Production backups configured | **NOT CONFIGURED** (framework) |
| RPO / RTO | **UNSET** |
| Backup retention | **UNSET** (O10) |
| Restore drill | **NOT EXECUTED** |

```text
APPLICATION DELETION ≠ BACKUP EXPIRY
```

A deleted application record may temporarily remain in backup media depending on eventual approved architecture/policy. Do not invent backup periods.

---

## 18. Provider / Third-Party Copies

SMTP, OTP, Twilio/WhatsApp, hosting DB, email inboxes may retain copies independently.

Do **not** claim provider deletion merely because the application record is deleted unless verified by contract/process. Processor inventory/residency: O18 **OPEN**.

---

## 19. Consent Dependency

Integrate F4-03. Distinguish: withdrawal; expiry; supersession; item-share revocation; channel withdrawal; AI consent withdrawal; assessment consent withdrawal; service termination.

Withdrawal ≠ immediate deletion **and** ≠ indefinite preservation by assumption. Effects on future processing vs historical records — **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 20. RBAC / Relationship Dependency

Integrate F4-04.

```text
AUTHENTICATION ≠ AUTHORIZATION ≠ RETENTION
```

Retained records may remain preserved while current access is restricted. Former psychologist / transferred patient / supervisor / admin / worker / AI — access rules separate from retention. SUPER_ADMIN clinical blindness remains binding.

---

## 21. Private / Shared Dependency

Integrate F4-02. CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE.

Analyze without resolving: revoke share; relationship ends; psychologist changes; patient deletion request; patient exports shared record; private→shared; shared superseded; collaborative contributor leaves.

Retention/deletion must not accidentally change visibility semantics.

---

## 22. Versioning Dependency

Integrate F4-05. Current / superseded / amended / disputed / correction history / audit evidence / deletion event.

Whether deleting “current” affects historical versions — **NOT YET DECIDED**. No silent destruction of provenance.

---

## 23. Safety Dependency

Integrate F4-06. Safety events; crisis records; emergency communications; break-glass records; escalation history; safety plans; emergency contacts; referrals.

Preservation/deletion of safety-related records — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No invented mandatory periods. No safety workflows implemented here.

---

## 24. Assessment Dependency

Integrate F4-08. Separate lifecycle for: raw responses; scores; interpretations; formulation; metadata; instrument/version; AI suggestions.

Do not assume identical retention. Instrument licensing remains a dependency. Periods **UNSET**.

---

## 25. Communication Dependency

Integrate F4-07 and F1-D-C. Distinguish: message body; notification event; delivery record; provider record; clinical vs transactional.

```text
SENT ≠ DELIVERED ≠ RECEIVED ≠ READ ≠ ACTED UPON
```

Application deletion ≠ provider copy deletion.

---

## 26. AI Dependency

Integrate F4-11. Distinguish: AI input; draft; output; human-approved; rejected; provenance; model/version metadata; temporary artifacts.

AI data must not automatically become authoritative clinical record. Separate retention/deletion. AI must not autonomously decide clinical deletion. No AI implementation.

---

## 27. Patient Rights

Conceptual actions: view; acknowledge; correct; request correction; export; request deletion; withdraw consent; revoke sharing.

Do not claim all are legally guaranteed. Status: **NOT YET DECIDED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 28. Minors / Dependents

Minors; guardian/representative; dependent patients; transition to independent access — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No invented age thresholds or guardian powers.

---

## 29. Former Patient / Psychologist

After relationship end, leave, transfer, suspension, account deletion: **retention and access treated separately**. Ongoing clinical ACL DENY default (F4-04); historical preservation **NOT YET DECIDED** / legal.

---

## 30. Data Minimization

Ask: Why retain? Who needs it? Purpose? How long (**UNSET**)? Minimum necessary? Can derived replace raw? Separate operational from clinical? Do not answer with invented periods.

---

## 31. Purpose Limitation

Retention for clinical care does **not** authorize: analytics; research; marketing; AI training; product improvement; publication; benchmarking. Each secondary purpose needs separate governance/basis.

---

## 32. Classification Matrix

| Data Category | Current/Future | Class | Purpose | Retention trigger | Retention status | Access after relationship ends | Exportability | Deletion concept | Audit | Backup | Legal review | F4 dep | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public content | Current | Public | Site | N/A | N/A / CMS | N/A | Public | N/A | Low | Ops | N/A | — | Ops |
| Account/identity | Current | Ops | Account | Closure / purpose | **UNSET** | Account rules | CONDITIONAL | **UNSET** | Yes | Yes | Yes | O10 | **NOT YET DECIDED** |
| Sessions/MFA/OTP | Current | Security | Auth | Expiry (code TTL) | Policy **UNSET** | N/A | DENY secrets | Revoke exists | Yes | CONDITIONAL | Security | F1-C | **NOT YET DECIDED** |
| Appointments | Current | Ops | Scheduling | **NOT YET DECIDED** | **UNSET** | CONDITIONAL | CONDITIONAL | **UNSET** | Yes | Yes | Yes | O10 | **NOT YET DECIDED** |
| Appointment history | Current | Ops immutable | Trail | **NOT YET DECIDED** | **UNSET** | CONDITIONAL | CONDITIONAL | Erasure vs integrity | Yes | Yes | **LEGAL REVIEW** | O10 | **LEGAL REVIEW** |
| Outbox/deliveries | Current | Ops | Notify | **NOT YET DECIDED** | **UNSET** | N/A | Metadata CONDITIONAL | **UNSET** | Yes | Yes | Processor | F1-D-C | **NOT YET DECIDED** |
| Consent (WhatsApp etc.) | Current | Consent | Channel | Withdrawal event | **UNSET** | N/A | CONDITIONAL | ≠ erase evidence lean | Yes | Yes | Yes | F4-03 | **LEGAL REVIEW** |
| Clinical-private | Future | CLINICAL_ONLY | Care | Rel. end? | **UNSET** | DENY default ACL | Prefer EXCLUDE patient | **LEGAL REVIEW** | Yes | Yes | Yes | F4-02/05 | **BLOCKED** impl |
| Clinical-shared | Future | SHARED_READ | Care | Rel. end? | **UNSET** | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | Yes | Yes | Yes | F4-02 | **BLOCKED** impl |
| Collaborative | Future | SHARED_COLLAB | Care | Contributor leave | **UNSET** | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | Yes | Yes | Yes | F4-02 | **BLOCKED** impl |
| Assessment responses/scores/interp. | Future | Assess | Care | Complete? | **UNSET** | CONDITIONAL | CONDITIONAL | May differ | Yes | Yes | Yes + license | F4-08 | **BLOCKED** impl |
| Safety-sensitive | Future | Safety | Safety | Closure? | **UNSET** | CONDITIONAL | **LEGAL REVIEW** | **LEGAL REVIEW** | Yes | Yes | Yes | F4-06 | **BLOCKED** impl |
| Clinical documents | Future | Docs | Care | Supersede? | **UNSET** | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | Yes | Yes | Yes | F4-05 | **BLOCKED** impl |
| Wellness self-report | Future | Wellness | Support | Purpose | **UNSET** | CONDITIONAL | CONDITIONAL | **NOT YET DECIDED** | CONDITIONAL | Yes | CONDITIONAL | F4-01 | **NOT YET DECIDED** |
| Clinical communication | Future | Comm | Care | **NOT YET DECIDED** | **UNSET** | CONDITIONAL | CONDITIONAL | Provider copies | Yes | Yes | Yes | F4-07 | **BLOCKED** impl |
| Audit/security | Current | Audit | Accountability | **NOT YET DECIDED** | **UNSET** | Admin CONDITIONAL | Metadata CONDITIONAL | Erasure vs integrity | Self | Yes | **LEGAL REVIEW** | F4-10 | **LEGAL REVIEW** |
| AI drafts / provenance | Future | AI | Assist | Reject/approve | **UNSET** | DENY ACL draft | Prefer EXCLUDE draft | Separate | Yes | CONDITIONAL | Yes | F4-11 | **BLOCKED** impl |
| Export packages | Future | Export | Portability | Package TTL | **UNSET** | Requester | Self | Expire package | Yes | CONDITIONAL | Yes | F4-09 | **NOT YET DECIDED** |
| Deletion records | Future | Audit | Accountability | Hold | Prefer preserve | Restricted | Metadata | Meta only | Yes | Yes | Yes | F4-10 | **NOT YET DECIDED** |
| Legal holds | Future | Hold | Preservation | Release | Hold supersedes delete | Restricted | CONDITIONAL | Suspended | Yes | Yes | **LEGAL REVIEW** | F4-09 | **LEGAL REVIEW** |
| Imported clinical | Future | Import | Care | Provenance | **UNSET** | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | Yes | Yes | Yes | F4-05 | **BLOCKED** impl |

---

## 33. Retention Decision Register

| ID | Decision | Status |
| --- | --- | --- |
| R01 | Account data retention | **UNSET** / **LEGAL REVIEW** / O10 |
| R02 | Appointment retention | **UNSET** / O10 |
| R03 | Appointment history | **UNSET** / **LEGAL REVIEW** (immutability vs erasure) |
| R04 | Notification/outbox retention | **UNSET** / O10 |
| R05 | Audit/security retention | **UNSET** / **LEGAL REVIEW** |
| R06 | Consent history | Prefer append-only evidence — periods **UNSET** / legal |
| R07 | Clinical-private records | **UNSET** / **LEGAL REVIEW** — impl **BLOCKED** |
| R08 | Clinical-shared records | **UNSET** / **LEGAL REVIEW** — impl **BLOCKED** |
| R09 | Collaborative records | **UNSET** — impl **BLOCKED** |
| R10 | Assessment responses | **UNSET** — F4-08 — **BLOCKED** |
| R11 | Assessment scores | **UNSET** — may differ from raw — **BLOCKED** |
| R12 | Assessment interpretations | **UNSET** — **BLOCKED** |
| R13 | Safety records | **LEGAL / PROFESSIONAL REVIEW REQUIRED** — **BLOCKED** |
| R14 | Clinical documents | **UNSET** — **BLOCKED** |
| R15 | Clinical communication | **UNSET** + provider copies — **BLOCKED** |
| R16 | AI drafts | Separate; prefer short — **UNSET** — **BLOCKED** |
| R17 | AI provenance | Prefer preserve — **UNSET** — **BLOCKED** |
| R18 | Export packages | Package TTL **UNSET** |
| R19 | Deletion records | Prefer preserve metadata — **NOT YET DECIDED** |
| R20 | Backups | Retention **UNSET**; backups **NOT CONFIGURED** |
| R21 | Provider-side copies | Not assumed deleted with app — O18 **OPEN** |
| R22 | Imported records | **UNSET** / provenance — **BLOCKED** |
| R23 | Legal/professional holds | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| R24 | Deleted-record metadata | Prefer preserve — **NOT YET DECIDED** |
| R25 | Former patient records | Access≠retention — **NOT YET DECIDED** / legal |
| R26 | Former psychologist access | DENY ongoing ACL lean; retention separate — **NOT YET DECIDED** |

---

## 34. Threat Model

| Threat | Impact | Governance control | Future technical control | Dependency | Status |
| --- | --- | --- | --- | --- | --- |
| Premature deletion | Loss of required history | Legal/professional review before delete | Soft delete / hold | F4-09 | **LEGAL REVIEW** |
| Indefinite retention | Breach blast radius | Purpose-bound retention | Review jobs later | F4-01 | **NOT YET DECIDED** |
| Unauthorized export | Over-disclosure | Export ≠ view; authz | Export ACL | F4-04 | **NOT YET DECIDED** |
| Export of private notes | Confidentiality breach | Exclude CLINICAL_ONLY lean | Redaction rules | F4-02 | **NOT YET DECIDED** |
| Stale access after termination | Unauthorized view | Access≠retention | ACL recompute | F4-04 | Aligns F4-04 |
| Cross-patient export | Isolation breach | Isolation | Authz tests | F1-B | Binding |
| Cross-psychologist export | Isolation breach | Relationship ACL | Authz | F4-04 | Binding |
| Deletion bypass | Integrity failure | Authz + audit | Dual control later | F4-10 | **NOT YET DECIDED** |
| Audit deletion | Accountability loss | Protect audit | Append-only audit | F4-10 | **LEGAL REVIEW** |
| Backup resurrection | “Deleted” reappears | Backup expiry separate | Backup lifecycle | Ops | **UNSET** |
| Orphaned clinical data | Unowned records | Relationship lifecycle | Reassignment rules | F4-04 | **NOT YET DECIDED** |
| Provider-side persistence | Residual copies | Processor agreements | Contractual delete | O18 | **OPEN** |
| Forgotten AI artifacts | Leak / wrong reuse | AI lifecycle | Purge drafts | F4-11 | **NOT YET DECIDED** |
| Cached export packages | Stale disclosure | Package TTL | Expire storage | F4-09 | **NOT YET DECIDED** |
| Accidental bulk deletion | Mass loss | Dual control / hold | Confirmations | F4-09 | **NOT YET DECIDED** |
| Malicious deletion | Sabotage | Authz + MFA step-up | Audit | F1-C/F4-04 | **NOT YET DECIDED** |
| Retention worker bug | Wrong delete/keep | No autonomous clinical delete | Human gate | F4-12 | **BLOCKED** now |
| Legal hold bypass | Spoliation risk | Hold supersedes delete | Enforce hold | Legal | **LEGAL REVIEW** |
| Consent withdrawal mishandling | Wrong keep/delete | Withdraw ≠ auto delete | Purpose flags | F4-03 | **LEGAL REVIEW** |
| Version-history destruction | Evidence loss | F4-05 immutability | Append-only | F4-05 | Binding |
| Safety-record deletion | Missed history | Safety review | Restrict delete | F4-06 | **LEGAL REVIEW** |
| Minor/dependent access errors | Wrong party | Legal review | Role model later | F4-03 | **LEGAL REVIEW** |
| Administrator overreach | Clinical browse | Admin blindness | Deny bodies | F4-04 | Binding |

---

## 35. Binding Governance Invariants

1. Retention ≠ authorization.  
2. Retention ≠ deletion.  
3. Consent withdrawal ≠ automatic deletion.  
4. Share revocation ≠ deletion.  
5. Export ≠ ordinary view access.  
6. Historical provenance must not be silently destroyed.  
7. Audit evidence must not become a clinical-content shadow copy.  
8. SUPER_ADMIN clinical blindness remains intact.  
9. Patient isolation applies to exports and deletion operations.  
10. Relationship termination affects access, not automatically preservation.  
11. Backup copies are governed separately from application deletion.  
12. Provider copies are not assumed deleted merely because the application record is deleted.  
13. AI drafts are not automatically authoritative clinical records.  
14. AI data lifecycle requires separate governance.  
15. Clinical deletion must never be an autonomous AI decision.  
16. Retention periods must not be invented.  
17. Legal/professional requirements must be verified before becoming policy.  
18. Export must be explicitly authorized.  
19. Deletion actions require provenance and auditability.  
20. Lifecycle automation cannot override governance.  
21. Appointment history immutability vs erasure requires legal review (Option B OPEN).  
22. Session/code TTLs ≠ locked retention policy.  
23. SENT ≠ DELIVERED ≠ READ ≠ ACTED UPON for communications.  
24. Purpose limitation: care retention ≠ research/analytics/AI training.  
25. No Option C lifecycle implementation before governance approval + F4-12 + explicit engineering authorization.

---

## 36. Cross-Domain Dependencies

| Domain | Dependency |
| --- | --- |
| F4-01 | What is retained (classification) |
| F4-02 | Visibility during retain/export/delete |
| F4-03 | Withdrawal vs deletion |
| F4-04 | Access while retained |
| F4-05 | Version history preservation |
| F4-06 | Safety record special handling |
| F4-07 | Communication bodies vs delivery metadata |
| F4-08 | Assessment component-specific lifecycle |
| F4-10 | Audit retention vs clinical shadow copy |
| F4-11 | AI artifact lifecycle |
| F4-12 | Workers/architecture after approval |
| `DECISION_DATA_RETENTION.md` | Option B UNSET inventory |
| `DECISION_BACKUP_RPO_RTO.md` | Backup UNSET |

Upstream unresolved decisions remain unresolved here.

---

## 37. Legal / Professional Review Register

**LEGAL / PROFESSIONAL REVIEW REQUIRED:**

- Option B account/appointment/history/audit retention & deletion (O10)  
- Appointment history immutability vs erasure rights  
- Audit retention vs erasure  
- Patient export/deletion/correction rights mapping  
- Clinical record preservation duties (future Option C)  
- Consent withdrawal effects on historical data  
- Safety/crisis/break-glass record preservation  
- Minors/dependents lifecycle  
- Legal/professional holds  
- Processor/provider deletion capabilities  
- Assessment licensing vs storage duration  
- Secondary use (research/analytics)  
- Cross-border processor retention (O18)  

Do not invent jurisdiction-specific rules. Do not provide legal advice.

---

## 38. Outstanding Decisions

All R01–R26 periods; export requester/approver/redaction catalogue; soft vs hard delete strategy; package TTL; hold actors; backup RPO/RTO/retention; former patient/psychologist preservation; assessment component differentials; AI draft purge; whether retention clock starts at creation vs relationship end; Production unblocking after O10 close.

---

## 39. Implementation Restrictions

Cursor **MUST NOT** create: retention/archival/deletion/export workers; clinical export/deletion endpoints; clinical schemas; migrations; soft-delete clinical fields as “future-ready”; AI lifecycle jobs; Production backup config from this task; commits.

Expected application code diff: **ZERO**.

F4-09 approval does **not** authorize implementation. Requires: domain approvals; legal/professional review where marked; F4-12; explicit engineering authorization; tests; independent review; checkpoint; Production gate.

---

## 40. Governance Status

**NOT YET DECIDED**

Option B retention (`DECISION_DATA_RETENTION.md`): remains **OPEN** / **LEGAL REVIEW REQUIRED** / periods **UNSET**.

---

## 41. Recommendation for F4-10

Next: **F4-10 — Clinical Audit, Accountability & Observability Governance**.  
Do **not** begin F4-10 without explicit authorization.

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-09 | Draft retention / export / deletion / lifecycle governance |

**Consistency:** Aligns F4-A–F4-08 “periods UNSET / F4-09 dependency”; does not invent periods; preserves Option B OPEN retention gate.

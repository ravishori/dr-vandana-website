# F4 FINAL GOVERNANCE DECISION REGISTER v1.0

**Document type:** Consolidated decision register (governance checkpoint)  
**Status:** READY FOR HUMAN GOVERNANCE APPROVAL — clinical policy itself is **NOT approved** by this register  
**Baseline:** `b32e1d0` (`security: verify notification and outbox controls`)  
**Sources:** F4-A…F4-12; `PATIENT_PRACTICE_DECISIONS.md`; `DECISION_DATA_RETENTION.md`

This register does **not** invent approvals. Where human approval is absent, status remains open.  
This register does **not** authorize Option C implementation.

---

## Status vocabulary

| Status | Meaning |
| --- | --- |
| **APPROVED** | Explicit approval exists in authoritative Option B decisions (or equivalent) |
| **APPROVED WITH CONDITIONS** | Approved subject to stated conditions |
| **REQUIRES REVISION** | Documented conflict needing human resolution |
| **LEGAL / PROFESSIONAL REVIEW** | Counsel or licensed professional input required |
| **TECHNICAL DECISION REQUIRED** | Architecture/engineering choice pending |
| **BLOCKED** | Explicitly forbidden until separate authorization |
| **NOT YET DECIDED** | Proposed in F4 drafts; no human approval recorded |

Decision authority = **NOT YET ASSIGNED** unless Option B already names practice-owner / counsel ownership.

---

## A. Authoritative Option B decisions (carry-forward)

These are **not** Option C approvals. They constrain any future clinical work.

| ID | Domain | Decision statement | Current proposal / evidence | Authoritative source | Status | Decision authority | Legal review | Technical dependency | Affected F4 | Implementation consequence | Blocks Option C? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OB-01 | Scope | First production product scope is Option B (accounts + appointments) | Implemented | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner (recorded) | — | — | All | Option B ops allowed under separate Production gates | No (defines baseline) |
| OB-02 | Scope | Option C clinical PMS deferred / not approved for implementation | Charts, notes, assessments, clinical docs deferred | PATIENT_PRACTICE_DECISIONS | **BLOCKED** / DEFERRED | Practice owner | Before Option C | — | All | No clinical eng | **Yes** |
| OB-03 | RBAC | SUPER_ADMIN ≠ automatic clinical access | Architectural role; `/super-admin/*` UI deferred | PATIENT_PRACTICE_DECISIONS §2.10 | **APPROVED** (architecture) | Practice owner | — | Admin UI deferred | F4-04, F4-12 | Admin clinical blindness | Soft block if violated |
| OB-04 | Auth | Client-side authorization forbidden | Server-side sessions + authz | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | — | F4-04, F4-12 | No client authz trust | Soft block if violated |
| OB-05 | Appointments | Do not auto-create clinical consultation row from appointments | Forbidden in Option B | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | — | F4-01, F4-04 | Appointment ≠ clinical record | Soft block if violated |
| OB-06 | Appointments | Appointment history immutable append-only | Implemented | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | Erasure tension → LPR-01 | — | F4-05, F4-09 | Ops integrity | Soft |
| OB-07 | Notifications | No diagnosis/notes/condition/assessment/sensitive detail in email/WhatsApp | Implemented templates | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | Providers | F4-07, F4-03 | Ordinary notify hygiene | Soft |
| OB-08 | Notifications | Appointment may commit even if SMTP/WhatsApp fails | Outbox pattern | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | Worker | F4-07, F4-12 | Delivery ≠ commit | Soft |
| OB-09 | Audit | Audit must not store passwords, OTP, private clinical notes, unnecessary sensitive payloads | stripSecrets / Option B audit | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | — | F4-10 | Lean audit | Soft |
| OB-10 | Minors | Child registration deferred / blocked for V1 | DEFERRED | PATIENT_PRACTICE_DECISIONS | **BLOCKED** (V1) | Practice owner | Required before minors | — | F4-03, F4-06 | No child clinical model | Soft for adult-only C |
| OB-11 | Retention | Account/appointment retention periods | UNSET; deletion not implemented | DECISION_DATA_RETENTION O10 | **LEGAL / PROFESSIONAL REVIEW** | Counsel + owner — **NOT YET ASSIGNED** formally beyond O10 | **Required** | Deletion jobs | F4-09 | Production accounts BLOCKED on policy | Soft for Option B Prod; **Yes** for clinical retain |
| OB-12 | Privacy copy | Privacy/terms vs Option B accounts | O11 OPEN; Production BLOCKED | PATIENT_PRACTICE_DECISIONS | **REQUIRES REVISION** / OPEN | Practice owner + counsel | **Required** | Legal pages | F4-03 | Option B Production BLOCKED | Soft |
| OB-13 | Roles | PATIENT / PSYCHOLOGIST / SUPER_ADMIN / reserved STAFF | Implemented constants | PATIENT_PRACTICE_DECISIONS | **APPROVED** | Practice owner | — | — | F4-04 | Role model baseline | Soft |

---

## B. Package-level / architecture decisions

| ID | Domain | Decision statement | Current proposal | Authoritative decision | Status | Decision authority | Legal review | Technical dependency | Affected F4 | Implementation consequence | Blocks Option C? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PKG-01 | Gate | Authorize Option C clinical engineering now? | Keep blocked until gates | PATIENT_PRACTICE_DECISIONS + F4-12 | **BLOCKED** | Practice owner | Before C | All | All | No clinical eng | **Yes** |
| PKG-02 | Package | F4-A…F4-12 drafts ready for human review? | Yes — draft package | This checkpoint | Ready for review (not clinical APPROVED) | Practice owner | Per domain | — | All | Review only | No |
| PKG-03 | Readiness | Architecturally ready for Option C? | NOT READY | F4-12 | **NOT YET DECIDED** as approval; assessment = NOT READY | Practice owner + architect | Many | Many | F4-12 | No build | **Yes** |

---

## C. Domain decisions (F4-01 … F4-12)

| ID | Domain | Decision statement | Current proposal | Authoritative decision | Status | Decision authority | Legal review | Technical dependency | Affected F4 | Implementation consequence | Blocks Option C? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01-01 | Classification | Adopt Layer A (Option B) vs Layer B (future clinical) taxonomy | F4-01 taxonomy | None for Layer B | **NOT YET DECIDED** | NOT YET ASSIGNED | Mapping special-category data | Schema | F4-01→all | Classification required before clinical store | **Yes** |
| D02-01 | Private/Shared | Default clinical working content private unless intentionally shared | Private-by-default | Charter principle (binding constraint, not jurisdiction policy) | **NOT YET DECIDED** as practice policy | NOT YET ASSIGNED | Patient expectations | Notes model | F4-02,04,05 | Visibility model | **Yes** |
| D02-02 | Private/Shared | Share transform Model A / B / C | Prefer Model B for review | None | **NOT YET DECIDED** | NOT YET ASSIGNED | Provenance vs access rights | Versioning | F4-02,05,09 | Schema shape | **Yes** |
| D02-03 | Private/Shared | Publish / acknowledge / comment / revoke / collaborative rights | Catalogue of open questions | None | **NOT YET DECIDED** | NOT YET ASSIGNED | Yes | F4-04/05 | F4-02–05,07 | Sharing UX/API | **Yes** |
| D03-01 | Consent | LOGIN ≠ CONSENT; BOOKING ≠ CLINICAL CONSENT; WA opt-in ≠ clinical disclosure | Adopt as invariants | Channel≠body aligns OB-07 | **NOT YET DECIDED** formal clinical consent policy | NOT YET ASSIGNED | **Required** | Consent store | F4-03,07,11 | Consent catalogue | **Yes** |
| D03-02 | Consent | Purpose / channel / item-share / AI / assessment / third-party separation | Multi-layer consent | None | **NOT YET DECIDED** | NOT YET ASSIGNED | **Required** | Consent store | F4-03+ | Authz dependency | **Yes** |
| D03-03 | Consent | Minors / guardian / assent / age thresholds | Deferred; do not invent ages | OB-10 | **LEGAL / PROFESSIONAL REVIEW** | Counsel + owner | **Required** | Accounts | F4-03,06 | Blocks minor clinical | Soft if adult-only |
| D04-01 | RBAC | Role alone insufficient; relationship + classification + purpose required | Authz chain F4-04/12 | Aligns OB-03/04 spirit | **NOT YET DECIDED** as clinical ACL policy | NOT YET ASSIGNED | Break-glass legal | ACL engine | F4-04,12 | Clinical authz | **Yes** |
| D04-02 | RBAC | Appointment ≠ permanent clinical relationship | Conceptual separation | OB-05 related | **NOT YET DECIDED** exact lifecycle | NOT YET ASSIGNED | Transfer/supervision | Relationship store | F4-04,05,09 | Access on terminate | **Yes** |
| D04-03 | RBAC | Break-glass / temporary / supervision / consultation access | Conceptual only | None | **LEGAL / PROFESSIONAL REVIEW** + **NOT YET DECIDED** | NOT YET ASSIGNED | **Required** | Break-glass design | F4-04,06,10 | No impl now | **Yes** if included |
| D05-01 | Versioning | No silent overwrite of authoritative clinical history | F4-05 | None for clinical | **NOT YET DECIDED** | NOT YET ASSIGNED | Possibly | Version store | F4-05,10,11 | Version tables later | **Yes** |
| D05-02 | Provenance | VERSION HISTORY ≠ AUDIT HISTORY; no fabricated provenance | F4-05/12 | None | **NOT YET DECIDED** | NOT YET ASSIGNED | — | Append-only design | F4-05,10,11 | Dual trails | **Yes** |
| D06-01 | Safety | Automation ≠ clinical authority; AI must not auto-escalate / diagnose / contact emergency services | F4-06/11 | Crisis resources ≠ clinical escalation (Option B evidence) | **NOT YET DECIDED** as full SOP | NOT YET ASSIGNED | **Required** | Safety workflows | F4-06,07,08,11 | Safety module | **Yes** if safety in scope |
| D06-02 | Safety | After-hours / emergency disclosure / caregivers | Deferred | None | **LEGAL / PROFESSIONAL REVIEW** | Counsel + owner | **Required** | Comms | F4-06,03,07 | SOP | Soft/Yes if in scope |
| D07-01 | Communication | Clinical messaging (in-app / email / WA / SMS / push) | Prefer secure in-app; ordinary notify no clinical-private bodies | OB-07 for ordinary | Clinical messaging **BLOCKED** | NOT YET ASSIGNED | Channel legality | Messaging stack | F4-07,03,06,11 | No clinical msg | **Yes** if messaging in scope |
| D08-01 | Assessment | Response ≠ score ≠ interpretation ≠ formulation ≠ diagnosis | F4-08 | None | Assessment engine **BLOCKED** | NOT YET ASSIGNED | Licensing **Required** | Instruments | F4-08+ | No scoring engine | **Yes** if assessments in scope |
| D08-02 | Assessment | Instrument catalogue / licensing / patient visibility | Open models A–D | None | **LEGAL / PROFESSIONAL REVIEW** + **NOT YET DECIDED** | NOT YET ASSIGNED | **Required** | Scoring versions | F4-08,01,03,05,09,11 | Catalogue | Soft if assessments out of first C |
| D09-01 | Retention | Clinical retention periods | Must not invent; leave UNSET | O10 UNSET | **LEGAL / PROFESSIONAL REVIEW** | Counsel + owner | **Required** | Jobs | F4-09 → all | Blocks clinical Prod | **Yes** |
| D09-02 | Export | Export ≠ view; package rules | Conceptual | None | **NOT YET DECIDED** | NOT YET ASSIGNED | **Required** | Export service | F4-09,10 | Export APIs | Soft/Yes for Prod C |
| D09-03 | Deletion | Withdraw/revoke ≠ delete; soft vs hard; backups/providers | Conceptual | O10 UNSET | **LEGAL / PROFESSIONAL REVIEW** + **NOT YET DECIDED** | Counsel + owner | **Required** | Deletion workers | F4-09 | Deletion workflows | Soft/Yes for Prod C |
| D10-01 | Audit | Audit ≠ clinical record; no clinical bodies in ordinary metadata | Aligns OB-09 | OB-09 for Option B | Clinical catalogue **NOT YET DECIDED** | NOT YET ASSIGNED | Audit retention | Event catalogue | F4-10 → all | Clinical audit events | **Yes** |
| D10-02 | Audit | Fail-closed vs queue on audit write failure | Lean fail-closed for critical clinical writes | None | **NOT YET DECIDED** / **TECHNICAL DECISION REQUIRED** | NOT YET ASSIGNED | — | Txn design | F4-10,12 | Write paths | Soft/Yes |
| D11-01 | AI | Clinical AI expansion | Keep blocked; educational Ask remains educational | F4-11; Ask docs | Clinical AI **BLOCKED** | Practice owner | Vendor/processors | AI adapters | F4-11 → all | No clinical AI | **Yes** if AI in clinical scope |
| D11-02 | AI | Educational Ask must not become Option C by stealth | Preserve boundary | F4-11/12 invariants | **NOT YET DECIDED** as formal policy text (invariant proposed) | NOT YET ASSIGNED | — | Routing/kill switch | F4-11,12 | Keep edu isolated | Soft |
| D12-01 | Architecture | Clinical DB co-location vs separate schema/service/DB | Separate schema lean | None | **TECHNICAL DECISION REQUIRED** | Architect — NOT YET ASSIGNED | — | Migrations later | F4-12,01,09 | DB strategy | Soft/Yes before schema |
| D12-02 | Architecture | Clinical object storage | None today | None | **TECHNICAL DECISION REQUIRED** | Architect — NOT YET ASSIGNED | Processor residency | Object store | F4-12,09 | Vault design | Soft if no docs |
| D12-03 | Architecture | Multi-practice tenant model | Single-practice today | None | **NOT YET DECIDED** / **TECHNICAL DECISION REQUIRED** | NOT YET ASSIGNED | Ownership law | Tenancy | F4-12,04 | Tenant isolation | Soft if single practice |
| D12-04 | Architecture | Unify Q&A auth with practice auth | Defer; keep separate | OB HMAC keep | **NOT YET DECIDED** | Architect | — | Auth stacks | F4-12 | Debt remains | No (not clinical) |
| D12-05 | Architecture | Worker / machine identity ≠ human clinical authority | Binding lean | Notify worker exists | **NOT YET DECIDED** as formal clinical worker policy | Architect | — | Worker IAM | F4-12,04,10 | Separate machine creds | Soft/Yes for clinical workers |

---

## D. Cross-cutting tensions (do not silently resolve)

| ID | Issue | Sources | Status | Blocks Option C? |
| --- | --- | --- | --- | --- |
| X-01 | Privacy copy denies patient DB/portal vs Option B accounts | O11 vs implemented accounts | **REQUIRES REVISION** / Production **BLOCKED** | Soft (Option B Prod); clinical copy also needed before C |
| X-02 | Appointment history immutability vs erasure rights | OB-06 vs F4-09 | **LEGAL / PROFESSIONAL REVIEW** | Soft/Yes for deletion design |
| X-03 | Share Model A vs B vs C | F4-02 | **NOT YET DECIDED** | **Yes** |
| X-04 | Clinical read-audit all vs sample | F4-10 / Charter | **NOT YET DECIDED** | Soft |
| X-05 | Educational Ask vs future clinical AI under unified surfaces | F4-11 / F4-A | **NOT YET DECIDED** | Soft |

---

## E. Summary counts (approximate)

| Status | Count (material master rows) |
| --- | --- |
| APPROVED (Option B carry-forward) | 10 (OB-01,03–09,13) |
| BLOCKED / DEFERRED | OB-02, OB-10, PKG-01, D07-01, D08-01, D11-01 (+ clinical domains) |
| LEGAL / PROFESSIONAL REVIEW | OB-11, D03-03, D04-03, D06-02, D08-02, D09-01, D09-03, X-02 |
| TECHNICAL DECISION REQUIRED | D10-02, D12-01, D12-02, D12-03, D12-05 |
| REQUIRES REVISION / OPEN | OB-12, X-01 |
| NOT YET DECIDED | Majority of D01–D12 clinical proposals |

**Option C engineering:** remains **BLOCKED** (PKG-01 / OB-02).

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | F4 final package checkpoint — consolidation only |

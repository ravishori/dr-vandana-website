# F4 FINAL GOVERNANCE CROSS-DOMAIN MATRIX v1.0

**Document type:** Cross-domain consistency matrix  
**Status:** READY FOR HUMAN GOVERNANCE APPROVAL (matrix only — clinical policy **not** approved)  
**Baseline:** `b32e1d0`  
**Companion:** `docs/F4_FINAL_GOVERNANCE_DECISION_REGISTER.md`

Option C remains **BLOCKED**. This matrix consolidates dependencies; it does not resolve them.

---

## Legend

| Column | Meaning |
| --- | --- |
| Governing F4 | Primary domain doc |
| Dependent domains | Must align before implementation |
| Current decision | Best-evidence status (not invented approval) |
| Unresolved issue | Open question |
| Legal review | Required? |
| Technical review | Required? |
| Implementation status | Code/schema reality |

---

## Matrix

| Topic | Governing F4 | Dependent domains | Current decision | Unresolved issue | Legal review | Technical review | Implementation status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Data classification | F4-01 | F4-02,03,04,09,11,12 | Taxonomy **PROPOSED**; status **NOT YET DECIDED** | Layer B catalogue approval; special-category mapping | Yes (mapping) | Schema later | Option B ops classified; **no clinical schema** |
| Clinical relationship | F4-04 | F4-02,03,05,09,10,12 | Appointment ≠ clinical relationship **PROPOSED**; **NOT YET DECIDED** | Lifecycle states; transfer; supervision | Yes (transfer/supervision) | Relationship store | Appointments only; **no clinical relationship ACL** |
| Private / shared / collaborative | F4-02 | F4-01,03,04,05,07,09 | PRIVATE≠SHARED≠COLLABORATIVE **PROPOSED**; Model A/B/C **NOT YET DECIDED** | Share/publish/revoke/collab rights | Yes | Visibility + versioning | **None** (BLOCKED) |
| Consent | F4-03 | F4-02,04,06,07,08,11 | Multi-layer consent **PROPOSED**; O11 **OPEN** | Catalogue; withdrawal effects; minors | **Required** | Consent store | WA channel opt-in only; clinical consent **none** |
| RBAC | F4-04 | F4-01,02,03,05,10,12 | Role≠universal access **PROPOSED**; SUPER_ADMIN clinical blindness **APPROVED** (Option B arch) | Clinical permission matrix; break-glass | Yes for break-glass | Clinical ACL | Option B isolation tests exist; clinical RBAC **none** |
| Versioning | F4-05 | F4-02,04,09,10,11 | No silent overwrite **PROPOSED**; **NOT YET DECIDED** | Amendment/supersession rules | Possibly | Version tables | Appointment history append-only only |
| Provenance | F4-05 | F4-10,11 | Version ≠ audit **PROPOSED**; **NOT YET DECIDED** | Unknown/imported/AI provenance | — | Append-only design | **None** clinical |
| Safety | F4-06 | F4-03,04,07,08,11 | Automation≠authority **PROPOSED**; heavy legal | SOP; after-hours; emergency disclosure | **Required** | Safety workflows | Public crisis **resources** only — **not** clinical escalation EHR |
| Communication | F4-07 | F4-03,06,11 | Ordinary notify hygiene **APPROVED** (Option B); clinical messaging **BLOCKED** | In-app vs channels; Level 4–5 rules | Yes (channels) | Messaging stack | EMAIL+WHATSAPP ops only |
| Assessment | F4-08 | F4-01,03,05,06,09,11 | Score≠diagnosis **PROPOSED**; engine **BLOCKED** | Instruments; licensing; visibility | **Required** | Scoring versions | **None** |
| Retention | F4-09 | All clinical + Option B O10 | Periods **UNSET**; **LEGAL / PROFESSIONAL REVIEW** | Periods; backup retention | **Required** | Jobs | Deletion **not implemented**; Prod BLOCKED on O10 |
| Export | F4-09 | F4-01,02,10 | Export≠view **PROPOSED**; **NOT YET DECIDED** | Requester; redaction; TTL | **Required** | Export service | **None** clinical |
| Deletion | F4-09 | F4-02,05,10 | Revoke≠delete **PROPOSED**; immutability vs erasure **LEGAL REVIEW** | Soft/hard; providers; holds | **Required** | Deletion workers | **None** |
| Audit | F4-10 | All domains | Lean Option B audit **APPROVED**; clinical catalogue **NOT YET DECIDED** | Read-audit scope; fail-closed | Yes (retention) | Event design | `audit_logs` / `security_events` ops only |
| AI | F4-11 | F4-01…10,12 | Educational Ask exists; clinical AI **BLOCKED** | Vendors; kill switch; clinical categories | **Required** for clinical AI | Isolation/routing | Educational Ask + Q&A draft helper only |
| Storage | F4-12 (lean) / F4-09 | F4-01,02,05,10 | No clinical vault; design **TECHNICAL DECISION REQUIRED** | Encryption; signed URLs; ownership | Processor residency possible | Object store | **None** clinical |
| Database architecture | F4-12 | F4-01,05,09,10 | Separate schema lean; **TECHNICAL DECISION REQUIRED** | Shared DB vs separate | — | Migrations strategy | Postgres Option B only (`0001`–`0007`) |
| Worker architecture | F4-12 | F4-04,07,10,11 | Notify worker exists; machine≠human clinical authority **PROPOSED** | Clinical worker IAM | — | Worker identity | `notifications:process` only; Prod hosting OPEN |
| Tenant boundary | F4-12 | F4-04 | Single-practice evidence; multi-tenant **NOT YET DECIDED** | Legal ownership; isolation | Possible | Tenancy model | Single-practice oriented |
| Production gate | F4-12 + decisions | All | Option B Prod separately gated; Option C Prod **BLOCKED** | O10/O11/worker/backups + all F4 approvals | Yes | Deploy/DR | No clinical Production |

---

## Consistency findings (independent of approval)

| Finding | Severity | Status |
| --- | --- | --- |
| All F4 domain docs mark themselves DRAFT / NOT YET DECIDED | Expected | Consistent |
| All domain docs state Option C BLOCKED | Expected | Consistent |
| Retention periods UNSET everywhere (no invented numbers found in F4 package intent) | Required | Consistent with O10 |
| OB-07 notify hygiene aligned across F4-03/07/11 | Good | Consistent |
| SUPER_ADMIN clinical blindness aligned F4-A/04/12 with Option B APPROVED | Good | Consistent |
| Share Model A/B/C unresolved in F4-02 and carried in F4-12 | Open | **NOT YET DECIDED** — not auto-picked |
| O11 privacy copy vs accounts | Conflict | **REQUIRES REVISION** — not resolved here |
| History immutability vs erasure | Conflict | **LEGAL / PROFESSIONAL REVIEW** — not resolved here |
| Clinical AI blocked while educational Ask documented | Boundary | Consistent if stealth expansion forbidden |

No silent winner selection performed.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | F4 final package checkpoint |

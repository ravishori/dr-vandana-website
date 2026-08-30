# F4-10 CLINICAL AUDIT, ACCOUNTABILITY & OBSERVABILITY GOVERNANCE v1.0

## 1. Executive Summary

This document defines governance for future **clinical audit, accountability, provenance linkage, security events, access observability, and operational monitoring** — without implementing clinical functionality.

**Binding principles:**

```text
Auditability ≠ surveillance
Audit event ≠ clinical record
Observability ≠ permission to read clinical content
Security metadata ≠ clinical documentation
```

**Default:** Do not duplicate sensitive clinical content into ordinary audit metadata.

**Facts:** Option B already has append-oriented `audit_logs`, typed `security_events`, immutable `appointment_history`, and notification outbox/delivery trails with secret stripping. No clinical audit catalogue exists. Audit retention periods remain **UNSET** (F4-09 / O10).

**Status:** **NOT YET DECIDED**  
Option C remains **BLOCKED**.

---

## 2. Authorization / Scope

**Authorized:** F4-10 governance/documentation only.

**Forbidden:** Clinical audit schema/tables/workers; clinical UI/dashboards; clinical APIs; SIEM/WORM implementation; authn/authz/outbox redesign; Q&A unification; Production changes; commits; F4-11 start; invented retention periods or legal claims.

---

## 3. Governing Principles

1. Accountability for sensitive actions without unnecessary clinical body storage.  
2. Minimum necessary metadata.  
3. Purpose limitation (audit ≠ analytics ≠ research).  
4. Actor identity preserved; machine ≠ human clinician; AI ≠ clinical authority.  
5. No client-side trust for audit claims.  
6. SUPER_ADMIN clinical blindness extends to logs (no reconstructing clinical content via audit).  
7. Patient and cross-psychologist isolation apply to audit access.  
8. Append-only / non-silent-mutation as governance lean for audit evidence.  
9. Align with Option B APPROVED audit hygiene (no passwords/OTP/notes).  
10. Upstream F4 decisions remain unresolved until separately approved.

---

## 4. Current Option B Audit Baseline

| Capability | Status | Notes |
| --- | --- | --- |
| `audit_logs` | **CURRENTLY IMPLEMENTED** | actor, action, targetType/Id, result SUCCESS/FAILURE/DENIED, metadata, createdAt |
| `security_events` | **CURRENTLY IMPLEMENTED** | Typed events (login, MFA, OTP, session, role, etc.); optional `ipHash` |
| Secret stripping | **CURRENTLY IMPLEMENTED** | `stripSecrets` drops password/otp/token/secret/cookie/authorization/recovery; long strings >500 chars dropped |
| Appointment history | **APPROVED** immutable append-only ops trail | Operational ≠ clinical audit |
| Outbox / deliveries / attempts | **CURRENTLY IMPLEMENTED** | Delivery accountability; SENT ≠ receipt |
| WhatsApp consent audit | **CURRENTLY IMPLEMENTED** | Opt-in/out via `appendAuditLog` |
| Practice settings / patient ops audits | **CURRENTLY IMPLEMENTED** | Operational |
| Clinical read/write audit catalogue | **Not present** | Future Option C |
| Clinical audit dashboards | **Not present** | — |
| Audit retention policy | **UNSET** | F4-09 / O10 |
| Fail-closed audit on privileged clinical action | **NOT YET DECIDED** | Future |

Do **not** redesign Option B tables in this phase.

---

## 5. Existing Repository Evidence

| Area | Evidence |
| --- | --- |
| Identity | `src/lib/identity/audit.ts`, `schema.ts` (`audit_logs`, `security_events`), `SECURITY_EVENT_TYPES` |
| Authn/MFA/sessions | Calls `appendAuditLog` / `recordSecurityEvent` |
| Appointments | Lifecycle/booking audit + `appointment_history` |
| Notifications | Dispatcher audit; delivery status tables; no clinical bodies in templates (F1-D-C) |
| Q&A | Separate portal session stack — **do not unify**; Q&A security ≠ practice clinical audit |
| Decisions | Audit logging **APPROVED** Phase 1 for security/appointment events; no clinical notes in audit |

---

## 6. Audit vs Version History

| Clinical record version history (F4-05) | Audit history (F4-10) |
| --- | --- |
| What the record **was** (content state) | What someone/system **did** |
| Approved note version V2 | Event: psychologist approved version V2 |

Do not collapse these models.

---

## 7. Audit vs Security Logging

| Layer | Purpose | Clinical body? |
| --- | --- | --- |
| Security events | Authn abuse, MFA, session | No |
| Operational audit_logs | Account/appointment/config actions | No |
| Future clinical audit | Clinical access/mutation accountability | No ordinary bodies |
| Appointment history | Ops status trail | No clinical notes |
| Application diagnostics | Errors/health | No PII/clinical |
| Infrastructure / provider logs | Ops | Minimize; no clinical |
| Analytics | Separate purpose | Not automatic from audit |

---

## 8. Audit Taxonomy

| Category | Classification |
| --- | --- |
| Authentication / MFA / session | **CURRENT OPTION B** |
| Authorization DENY (ops) | Partial via audit result DENIED — catalogue expansion **NOT YET DECIDED** |
| Patient/psychologist clinical access | **FUTURE OPTION C** |
| Relationship create/change/terminate | **FUTURE OPTION C** |
| Record create/version/approve/share/revoke | **FUTURE OPTION C** |
| Acknowledgement / correction | **FUTURE OPTION C** |
| Export / deletion / hold | **FUTURE OPTION C** / F4-09 |
| Consent present/accept/withdraw | Partial WhatsApp — clinical consent **FUTURE** |
| Communication / notification | Ops **CURRENT**; clinical msg **FUTURE** |
| Assessment assign/score/interpret | **FUTURE OPTION C** |
| Safety review / escalation / break-glass | **FUTURE** / **LEGAL REVIEW** |
| Admin / config / security action | **CURRENT OPTION B** (ops) |
| AI generate/review/approve/reject | **FUTURE** / F4-11 |
| Failed authz / suspicious access | **CONDITIONAL** expansion |
| Worker execution | Ops notify **CURRENT**; clinical workers **FUTURE** |
| Continuous monitoring / surveillance | **OUT OF SCOPE** / prohibited claim |

---

## 9. Event Structure

Conceptual candidates (not schema; not final):

| Field | Class |
| --- | --- |
| event ID, timestamp (server) | Mandatory candidate |
| actor identity, actor role | Mandatory candidate |
| actor relationship/context | Mandatory for clinical where applicable |
| patient/resource identity (opaque) | Mandatory candidate |
| resource class, action, outcome | Mandatory candidate |
| purpose, authorization decision | Optional / conditional |
| visibility scope, version reference | Conditional |
| consent / relationship reference | Conditional |
| correlation / request ID | Optional candidate |
| session ID | Privacy-sensitive candidate |
| IP/device metadata | Privacy-sensitive (prefer hash as Option B `ipHash`) |
| reason (e.g. break-glass) | Conditional / legal |
| source (UI/API/worker/import/AI) | Mandatory candidate |

Final field set: **NOT YET DECIDED**.

---

## 10. Actor / Accountability Model

| Actor | Representation |
| --- | --- |
| Patient / psychologist / consultant / supervisor / admin / staff | Human roles |
| System worker / integration | Machine — not clinician |
| Imported record source | Provenance UNKNOWN if unknown |
| AI service | Non-authoritative assistant |

AI must not be represented as a human clinician. Machine actor ≠ human clinician.

---

## 11. Authorization Decision Audit

Candidate auditable decisions: ALLOW, DENY, CONDITIONAL, BREAK-GLASS, STEP-UP AUTH, CONSENT REQUIRED, RELATIONSHIP REQUIRED.

Avoid turning audit into a privacy leak (no clinical body in deny reasons). Catalogue scope: **NOT YET DECIDED**.

---

## 12. Clinical Access Accountability

Future candidates: view CLINICAL_ONLY / SHARED; modify; approve; share; revoke; correction request/response; export; admin access attempt; cross-psychologist DENY.

SUPER_ADMIN clinical-body access: **DENY BY DEFAULT**. No implementation exception in this phase.

Whether **all** clinical reads are audited: **NOT YET DECIDED** (charter key question).

---

## 13. Patient Accountability

Candidates: viewed shared; acknowledged; commented; correction request; collaborative contribution; allowed export; unauthorized attempt.

Acknowledgement ≠ clinical approval (F4-02).

---

## 14. Psychologist Accountability

Candidates: create; amend; approve; share; revoke; correction response; assessment interpretation; safety review; consultation; transfer.

Actual actor identity must remain preserved. No silent attribution changes.

---

## 15. Administrative Accountability

Audit: account admin; appointment ops; configuration; security operations.

**Administrative privilege MUST NOT imply clinical visibility** — including via logs. Do not design audit that reconstructs clinical content for admins.

---

## 16. Relationship Events

F4-04 proposals: created; activated; paused; transferred; ended; delegation granted/revoked; temporary access granted/expired; supervision/consultation grant/revoke. Governance only.

---

## 17. Consent Events

F4-03: presented; accepted; declined; withdrawn; superseded; wording version changed; item share approved/revoked; channel preference; AI consent.

Consent events ≠ clinical record versions. WhatsApp opt-in/out already audited operationally.

---

## 18. Version / Provenance Events

F4-05: draft created/edited; submitted; approved; superseded; corrected; disputed; imported; provenance unknown; shared; share revoked. No silent overwrite.

---

## 19. Safety / Crisis Events

F4-06: signal received; human review initiated/completed; escalation decision; referral; emergency disclosure; break-glass; safety plan change; closure.

No detectors; no auto escalation; no 24/7 monitoring claim; no unnecessary safety narratives in audit. **LEGAL / PROFESSIONAL REVIEW REQUIRED** for disclosure/break-glass logging.

---

## 20. Assessment Events

F4-08: assigned; started; submitted; score calculated; interpretation created/reviewed/approved; corrected; exported.

Separate raw / score / interpretation / diagnosis / AI suggestion. No score bodies in ordinary audit metadata.

---

## 21. Communication Events

F4-07: drafted; approved; sent; delivery status; viewed; replied; revoked.

```text
sent ≠ delivered ≠ viewed ≠ understood ≠ acted upon
```

No clinical message bodies in ordinary operational notification logs.

---

## 22. AI Accountability

F4-11 dependency. Distinguish: invocation; model/service identity; input classification; output generation; human review; approval; rejection; revision; share.

AI must **NOT**: diagnose autonomously; approve itself; publish itself; trigger emergency autonomously; hold human-equivalent authority. No vendors selected here.

---

## 23. Break-Glass Accountability

If later approved, candidates: actor; reason; patient/resource; scope; timestamp; auth strength; duration; outcome; subsequent review. **LEGAL / PROFESSIONAL REVIEW REQUIRED**. Do not implement.

---

## 24. Export / Deletion Accountability

F4-09: export request/approval/generation/completion; deletion request/decision/execution; retention hold/release; backup lifecycle (ops).

Periods **UNSET**. No export/delete functionality built here.

---

## 25. Audit Immutability

Threats: deletion; modification; timestamp manipulation; actor spoofing; replay; duplication; ordering ambiguity; partial transaction logging; worker duplication.

Future controls (architecture — F4-12): append-only storage, integrity checks, WORM/SIEM — **TECHNICAL DECISION REQUIRED**. Not implemented now. Governance lean: no silent audit mutation.

---

## 26. Transaction Consistency

Cases: business succeeds / audit fails; audit succeeds / business fails; worker retries; duplicate events; outbox retry.

Questions for **F4-12**: same-transaction audit for critical clinical actions; outbox for async audit; idempotency keys. Do not redesign transactions here.

---

## 27. Audit Failure Policy

Options: fail closed; fail open; retry; queue; degrade; block privileged action.

**NOT YET DECIDED** for future clinical privileged paths.

Option B: existing `appendAuditLog` is best-effort insert in calling flows — do not claim a locked fail-closed clinical policy from current ops behavior without verification per path. Exact per-path failure semantics for Option B: treat as **CURRENT OPTION B** operational practice; clinical policy separately **NOT YET DECIDED**.

---

## 28. Observability

Metrics candidates: app/DB/worker health; notification delivery health; authn/authz failure rates; queue depth; retries; latency; errors.

Operational metrics must not become a clinical-content side-channel.

---

## 29. Privacy-Preserving Logging

Prohibit unnecessary: patient names; emails; mobiles; clinical text; assessment answers; safety narratives; passwords; OTPs; tokens; provider credentials.

Prefer opaque identifiers; Option B uses `ipHash` not raw IP in security_events. Irreversible pseudonymization: **NOT YET DECIDED**.

---

## 30. Audit Access Governance

| Actor | Typical access |
| --- | --- |
| Patient | Own transparency subset — **LEGAL REVIEW** / **NOT YET DECIDED** |
| Treating psychologist | Own-patient clinical audit CONDITIONAL — **NOT YET DECIDED** |
| Consultant / supervisor | Scoped — **LEGAL REVIEW** / **NOT YET DECIDED** |
| Operational admin | Ops/security audit CONDITIONAL; clinical body DENY |
| Security administrator | Security events CONDITIONAL |
| System worker | Write events; not browse clinical |
| AI | DENY audit browse as authority |

Not every actor who can perform an action may inspect all audit records.

---

## 31. Patient Transparency

Possible future visibility: access history; sharing; consent; correction; export history.

Final patient right: **NOT YET DECIDED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 32. Retention Dependencies

F4-09: active audit; historical audit; legal hold; security investigation; backups; provider logs — periods **UNSET / NOT YET DECIDED**. Erasure vs integrity for audit: **LEGAL REVIEW**.

---

## 33. Incident Response

Future detection (governance only): cross-patient/psych access; unauthorized admin; suspicious export; repeated authz failures; consent bypass; stale relationship; AI policy violation; notification leakage.

Do not build IR system. Privilege for investigators must not become clinical browsing — **NOT YET DECIDED** / legal.

---

## 34. Threat Model

| # | Threat | Asset | Actor | Failure | Governance | Future technical | Domain | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Forged actor | Accountability | Attacker | Wrong attribution | Server identity | Session bind | F4-04 | Binding |
| 2 | Forged timestamp | Ordering | Attacker/client | Timeline lie | Server clock | Reject client time | F4-12 | Lean |
| 3 | Forged resource ID | Isolation | Attacker | Wrong patient link | Server ownership | Authz | F1-B | Binding |
| 4 | Cross-patient audit leakage | Privacy | Insider/bug | See B’s events | Isolation | Authz on audit read | F4-04 | **NOT YET DECIDED** |
| 5 | Cross-psychologist audit leakage | Privacy | Insider/bug | See other psych | Relationship ACL | Authz | F4-04 | Same |
| 6 | Admin clinical visibility via logs | Confidentiality | Admin | Reconstruct notes | No clinical bodies | Strip + deny | F4-04/10 | Binding lean |
| 7 | Audit tampering | Integrity | Insider | Rewrite history | Immutability lean | Append-only | F4-10 | **TECHNICAL DECISION** |
| 8 | Audit deletion | Accountability | Insider | Cover tracks | Protect audit | Soft-delete ban / hold | F4-09 | **LEGAL REVIEW** |
| 9 | Duplicate event | Noise | Worker | Double count | Idempotency | Keys | F1-D-C/F4-12 | **NOT YET DECIDED** |
| 10 | Missing event | Gap | Bug | Unaccountable action | Failure policy | Fail-closed CONDITIONAL | F4-10 | **NOT YET DECIDED** |
| 11 | Failed audit write | Gap | Infra | Action without trail | Failure policy | Queue/retry | F4-12 | **NOT YET DECIDED** |
| 12 | Worker retry duplication | Noise | Worker | Dup | Idempotency | Dedup | F1-D-C | Known residual |
| 13 | AI attribution confusion | Authority | Design | AI as clinician | Actor model | Separate AI actor | F4-11 | Binding |
| 14 | Imported-record confusion | Provenance | Import | Fake author | Provenance UNKNOWN | Import events | F4-05 | Lean |
| 15 | Consent/audit mismatch | Compliance | Bug | Wrong consent state | Separate consent evidence | Link refs | F4-03 | **NOT YET DECIDED** |
| 16 | Version/audit mismatch | Integrity | Bug | Event without version | Dual model | Correlate IDs | F4-05 | **NOT YET DECIDED** |
| 17 | Break-glass abuse | Over-access | Psych/admin | False emergency | Reason/review | Step-up MFA | F4-06 | **LEGAL REVIEW** |
| 18 | Export audit leakage | Privacy | Export | Bodies in audit | Metadata only | Redact | F4-09 | Lean |
| 19 | Deletion audit leakage | Privacy | Delete | Bodies retained in audit | No shadow copy | Meta only | F4-09 | Binding |
| 20 | Log aggregation leakage | Privacy | Ops | PII in SIEM | Minimize | Filter | Ops | **NOT YET DECIDED** |
| 21 | Provider log leakage | Privacy | Vendor | Residual | Processor governance | Contracts | O18 | **OPEN** |
| 22 | Analytics leakage | Purpose creep | Product | Secondary use | Purpose limitation | Separate basis | F4-01 | Binding |
| 23 | Search leakage | Privacy | Admin search | Clinical in search | No body index | Deny | F4-04 | Lean |
| 24 | Dashboard leakage | Privacy | Ops UI | Clinical tiles | Admin blindness | Aggregate only | F4-10 | Lean |
| 25 | Backup leakage | Privacy | Ops | Full DB restore exposure | Backup controls | Encrypt | F4-09 | **UNSET** |
| 26 | IR privilege escalation | Over-access | Security | Browse clinical | Scoped IR role | Just-in-time | F4-04 | **NOT YET DECIDED** |

---

## 35. Decision Register

| ID | Decision | Current proposal | Status | Rationale | Dependency | Legal review | Impl consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Audit ≠ clinical record | Adopt | **NOT YET DECIDED** formal | Charter | F4-A | N/A | Separate stores |
| A02 | No clinical bodies in ordinary audit | Adopt default | Aligns Option B APPROVED hygiene | Decisions §2.8 | F4-01 | CONDITIONAL exceptions | Strip + allow-lists |
| A03 | Clinical read auditing required? | — | **NOT YET DECIDED** | Charter question | F4-04 | Maybe | Perf/privacy tradeoff |
| A04 | Patient-visible audit | — | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | Rights | F4-09 | Yes | Transparency UI later |
| A05 | Audit retention | UNSET | **UNSET / LEGAL REVIEW** | F4-09 O10 | F4-09 | Yes | No invented periods |
| A06 | Audit failure on clinical write | Fail-closed lean | **NOT YET DECIDED** | Accountability | F4-12 | N/A | Block vs queue |
| A07 | Append-only audit | Lean yes | **TECHNICAL DECISION REQUIRED** | Tamper resistance | F4-12 | Erasure tension | Triggers/WORM later |
| A08 | SUPER_ADMIN via logs | Deny clinical reconstruct | Aligns admin blindness | F4-04 | N/A | Logging filters |
| A09 | AI as audit actor only | Adopt | Aligns AI non-authority | F4-11 | Yes | Separate actor type |
| A10 | Break-glass audit mandatory | If allowed | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-06 | Yes | Required fields |
| A11 | Unify Q&A audit with practice | Do not unify now | Aligns Option B debt | Portal stack | N/A | Keep separate |
| A12 | Clinical audit schema now | Forbidden | **BLOCKED** | Option C blocked | F4-12 | None until approved |
| A13 | Same-txn clinical audit | Prefer for critical | **TECHNICAL DECISION REQUIRED** | Consistency | F4-12 | Transaction design |
| A14 | Observability vs audit | Separate | **NOT YET DECIDED** formal | Side-channel risk | Ops | Metric allow-lists |

---

## 36. Access Matrix

| Actor | Security events | Ops audit | Clinical audit meta | Clinical bodies via audit | Aggregated health metrics |
| --- | --- | --- | --- | --- | --- |
| Patient | Own limited — **NOT YET DECIDED** | Own limited | Own transparency — **LEGAL REVIEW** | DENY | N/A |
| Treating psychologist | Own CONDITIONAL | Own-patient ops | Own-patient CONDITIONAL | DENY (use clinical ACL) | CONDITIONAL |
| Consultant | DENY default | Scoped CONDITIONAL | Scoped — **NOT YET DECIDED** | DENY | DENY |
| Supervisor | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | DENY | DENY |
| Practice staff | DENY | Ops CONDITIONAL | DENY clinical | DENY | CONDITIONAL |
| SUPER_ADMIN | CONDITIONAL security | CONDITIONAL ops | DENY clinical reconstruct | DENY | ALLOW ops |
| System worker | Write | Write | Write | DENY store bodies | Emit metrics |
| AI | DENY browse | DENY | DENY | DENY | DENY |
| Unauthorized | DENY | DENY | DENY | DENY | DENY |

---

## 37. Audit Event Matrix

| Event family | Option B today | Future clinical | Bodies in audit? |
| --- | --- | --- | --- |
| Login/MFA/OTP/session | Yes | Extend CONDITIONAL | No |
| Appointment lifecycle | Yes + history | Keep ops separate | No |
| Notification delivery | Yes | Clinical msg separate | No |
| WhatsApp consent | Yes | Broader consent catalogue | No |
| Clinical view/share/approve | No | **FUTURE** | No ordinary |
| Assessment score/interpret | No | **FUTURE** | No ordinary |
| Safety/break-glass | No | **FUTURE** / legal | No narratives |
| Export/delete | No | **FUTURE** | Metadata only |
| AI generate/approve | Educational AI ≠ clinical audit | **FUTURE** | No prompts/bodies ordinary |

---

## 38. Binding Governance Invariants

1. Audit ≠ clinical record.  
2. Audit ≠ authorization.  
3. Audit ≠ consent.  
4. Audit ≠ version history.  
5. No client-side trust for audit claims.  
6. No clinical body duplication in ordinary audit metadata.  
7. Actor identity must be preserved.  
8. Machine actor ≠ human clinician.  
9. AI ≠ clinical authority.  
10. SUPER_ADMIN clinical blindness (including via logs).  
11. Patient isolation applies to audit access.  
12. Cross-psychologist isolation applies to audit access.  
13. No silent audit mutation.  
14. No invented retention periods.  
15. Purpose limitation (audit ≠ analytics/research by default).  
16. Minimum necessary metadata.  
17. Provenance preservation.  
18. Export/delete actions require auditability.  
19. Break-glass requires accountability if ever allowed.  
20. Safety actions require accountability without narrative dump.  
21. Communication accountability without body-in-logs.  
22. Assessment accountability without answer/score dump.  
23. Operational observability separated from clinical audit.  
24. Auditability ≠ surveillance / continuous monitoring claim.  
25. Observability ≠ permission to read clinical content.  
26. Option C clinical audit implementation remains **BLOCKED** until governance + F4-12 + explicit engineering authorization.

---

## 39. Cross-Domain Dependencies

| Domain | Audit requirements arising |
| --- | --- |
| F4-01 | What resource classes to label on events |
| F4-02 | Share/revoke/ack/correction events; no body dump |
| F4-03 | Consent lifecycle events |
| F4-04 | Relationship/authz DENY/ALLOW; admin blindness |
| F4-05 | Version correlate ≠ merge with audit |
| F4-06 | Safety/break-glass events; no detectors |
| F4-07 | Comm send/view without bodies |
| F4-08 | Assessment lifecycle without raw dump |
| F4-09 | Export/delete/hold; audit retention UNSET |
| F4-11 | AI actor separation |
| F4-12 | Append-only, txn, failure policy, SIEM |

Do not treat upstream unresolved decisions as resolved.

---

## 40. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:**

- Patient-visible access/audit history rights  
- Audit retention vs erasure (O10)  
- Break-glass / emergency disclosure logging  
- Supervisor access to audit  
- Incident-response access scope  
- Cross-border processor logs  
- Whether clinical read auditing is obligatory  

Do not invent jurisdiction-specific rules. Do not provide legal advice.

---

## 41. Outstanding Decisions

Clinical read-audit scope; patient transparency catalogue; audit failure policy for clinical writes; append-only technical design; same-transaction requirements; relationship/consent event catalogue finalization; IR roles; SIEM; retention periods; Q&A audit long-term strategy (keep separate for now).

---

## 42. Implementation Restrictions

Do **not**: create clinical audit tables/enums/migrations; rename Option B audit tables; redesign security events/appointment history/outbox; unify Q&A auth; build clinical audit dashboards; implement SIEM/WORM; modify Production.

F4-10 approval ≠ implementation authorization.

---

## 43. F4-10 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-10 | Draft clinical audit / accountability / observability governance |

**Recommended next:** **F4-11 — AI Assist Governance** (do not start without authorization).

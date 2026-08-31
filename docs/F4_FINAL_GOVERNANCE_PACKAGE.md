# F4 FINAL GOVERNANCE PACKAGE v1.0

**Document type:** Executive governance package  
**Package status:** **READY FOR HUMAN GOVERNANCE APPROVAL**  
**Clinical policy status:** **NOT APPROVED** — domains remain **NOT YET DECIDED** unless Option B already APPROVED  
**Option C:** **BLOCKED**  
**Baseline:** `b32e1d0` (`security: verify notification and outbox controls`)  
**Branch checkpoint target:** `cursor/verifier-required-tables-be7a`

This package consolidates F4-A through F4-12. It is **not** legal advice, **not** professional certification, and **not** authorization to implement Option C.

---

## 1. Purpose

Establish a traceable, reviewable, controlled governance baseline so any future clinical engineering has explicit boundaries — without making the project clinically operational by documentation alone.

## 2. Scope

| In scope | Out of scope |
| --- | --- |
| F4-A…F4-12 consolidation | Clinical tables / APIs / UI |
| Decision register & matrix | Production clinical deploy |
| Implementation gate | Invented legal/retention rules |
| Option B protection confirmation | Silent conversion of open items to APPROVED |

## 3. Current Option B baseline

Hardened practice portal at `b32e1d0`:

- Authentication, sessions, MFA (privileged roles), OTP  
- Patient / psychologist accounts; architectural SUPER_ADMIN without automatic clinical access  
- Appointments, history integrity, concurrency, idempotency  
- Notification outbox (EMAIL + WHATSAPP), privacy-safe copy  
- Audit / security events (lean; no clinical bodies)  
- Educational Ask AI + public crisis **resources**  
- Separate Q&A portal session stack  

**Production Option B** remains separately gated (O10 retention UNSET, O11 privacy copy OPEN, worker hosting OPEN, backups/RPO-RTO UNSET, etc.).

## 4. Option C boundary

```text
OPTION C IS BLOCKED.
```

Deferred / not approved for implementation until gates in `docs/F4_FINAL_CLINICAL_IMPLEMENTATION_GATE.md` are satisfied and a separate engineering authorization is issued.

## 5. Twelve governance domains

| ID | Document | Domain status |
| --- | --- | --- |
| F4-A | `F4_GOVERNANCE_MASTER_CHARTER.md` | DRAFT — **NOT YET DECIDED** |
| F4-01 | Classification | DRAFT — **NOT YET DECIDED** |
| F4-02 | Private / Shared / Collaborative | DRAFT — **NOT YET DECIDED** |
| F4-03 | Consent | DRAFT — **NOT YET DECIDED** |
| F4-04 | RBAC / Relationships / Admin | DRAFT — **NOT YET DECIDED** |
| F4-05 | Versioning / Provenance | DRAFT — **NOT YET DECIDED** |
| F4-06 | Safety / Crisis | DRAFT — **NOT YET DECIDED** (+ LEGAL REVIEW) |
| F4-07 | Communication | DRAFT — clinical messaging **BLOCKED** |
| F4-08 | Assessments | DRAFT — engine **BLOCKED** |
| F4-09 | Retention / Export / Deletion | DRAFT — periods **UNSET** |
| F4-10 | Audit / Accountability | DRAFT — **NOT YET DECIDED** |
| F4-11 | AI Assist | DRAFT — clinical AI **BLOCKED** |
| F4-12 | Architecture readiness | DRAFT — Option C **NOT READY** |

Consolidation companions:

- `F4_FINAL_GOVERNANCE_DECISION_REGISTER.md`  
- `F4_FINAL_GOVERNANCE_CROSS_DOMAIN_MATRIX.md`  
- `F4_FINAL_CLINICAL_IMPLEMENTATION_GATE.md`  

## 6. Binding governance invariants (summary)

1. Authentication ≠ authorization ≠ consent ≠ channel permission ≠ sharing ≠ retention ≠ deletion  
2. Role alone never grants clinical access; relationship independently enforced  
3. Patient isolation; cross-psychologist DENY by default  
4. SUPER_ADMIN clinical-body access DENY by default  
5. Client IDs / public IDs never authoritative for authorization  
6. Private ≠ shared ≠ collaborative; no silent overwrite of clinical history  
7. Version history ≠ audit history; provenance not fabricated  
8. AI ≠ clinical authority; AI cannot expand human permissions, diagnose, auto-escalate, or disclose  
9. Ordinary notifications do not carry clinical-private bodies by default  
10. Retention periods must never be invented by engineering  
11. Workers / machine identities ≠ human clinical identities  
12. Governance decisions precede implementation; F4 docs do not authorize Option C  
13. Educational Ask must not become Option C by stealth  
14. Critical authorization failures fail closed  

Full lists: F4-A principles; F4-12 §44.

## 7. Consolidated decisions

See `docs/F4_FINAL_GOVERNANCE_DECISION_REGISTER.md`.

**APPROVED** items are primarily **Option B** carry-forwards (e.g., no auto clinical row from appointments; notify copy hygiene; SUPER_ADMIN ≠ clinical; lean audit).

**PROPOSED** clinical policies remain **NOT YET DECIDED**.

## 8. Unresolved decisions

Material open items include:

- Share Model A/B/C and collaborative rights  
- Clinical consent catalogue and withdrawal effects  
- Clinical relationship lifecycle / transfer / supervision  
- Break-glass  
- Versioning/amendment rules  
- Safety SOP / after-hours / emergency disclosure  
- Clinical messaging channel allow-list  
- Assessment instruments and licensing  
- Retention/export/deletion periods and erasure vs integrity  
- Clinical audit catalogue and fail-closed policy  
- Clinical AI categories / vendors / kill switch  
- DB separation, storage, tenancy, clinical workers  

## 9. Legal / professional review register

| Topic | Status |
| --- | --- |
| O10 retention / deletion | **LEGAL / PROFESSIONAL REVIEW** — periods **UNSET** |
| O11 privacy/terms for accounts | **OPEN** / Production **BLOCKED** |
| Minors / guardian / assent | **LEGAL / PROFESSIONAL REVIEW** — ages not invented |
| Emergency disclosure / after-hours | **LEGAL / PROFESSIONAL REVIEW** |
| Break-glass | **LEGAL / PROFESSIONAL REVIEW** |
| Assessment licensing | **LEGAL / PROFESSIONAL REVIEW** |
| AI clinical processors / vendors | **LEGAL / PROFESSIONAL REVIEW** |
| Third-party disclosure | **LEGAL / PROFESSIONAL REVIEW** |
| History immutability vs erasure | **LEGAL / PROFESSIONAL REVIEW** |

Do not invent periods, ages, mandatory reporting duties, or compliance claims.

## 10. Technical decision register

| Topic | Status |
| --- | --- |
| Clinical DB co-location vs separate schema/DB/service | **TECHNICAL DECISION REQUIRED** |
| Clinical object storage | **TECHNICAL DECISION REQUIRED** |
| Audit fail-closed / WORM design | **TECHNICAL DECISION REQUIRED** / **NOT YET DECIDED** |
| Clinical worker machine identity | **TECHNICAL DECISION REQUIRED** |
| AI isolation / kill switch | **TECHNICAL DECISION REQUIRED** |
| Multi-tenant model | **NOT YET DECIDED** / **TECHNICAL DECISION REQUIRED** |
| Q&A auth unification | **NOT YET DECIDED** (defer) |

## 11. Security invariants

- Server-side authorization only  
- Patient A ✕ Patient B  
- Cross-psychologist DENY default  
- Tampered public ID DENY  
- SUPER_ADMIN clinical blindness  
- No secrets in Git  
- Lean audit (no passwords/OTP/clinical bodies in ordinary metadata)  

## 12. Clinical authority model

Human psychologist remains clinical decision-maker. Systems assist; they do not replace professional judgment. AI is never autonomous clinical authority.

## 13. Patient privacy / isolation model

Patients access only content intended for them. Psychologist-private working content is not exposed by appointment adjacency. Cross-patient access forbidden.

## 14. Consent model

```text
LOGIN ≠ CONSENT
BOOKING ≠ CLINICAL CONSENT
WHATSAPP OPT-IN ≠ CLINICAL DISCLOSURE AUTHORIZATION
```

Purpose, channel, item-share, assessment, AI, and third-party bases remain distinct — **PROPOSED**; catalogue **NOT YET DECIDED**.

## 15. Safety model

```text
AUTOMATION ≠ CLINICAL AUTHORITY
```

Public crisis resources ≠ clinical escalation EHR. No autonomous diagnose / escalate / emergency contact / break-glass by AI or automation.

## 16. Communication model

```text
CHANNEL CONSENT ≠ CONTENT AUTHORIZATION
```

Ordinary transactional notifications must not carry clinical-private bodies by default (**APPROVED** Option B). Clinical messaging **BLOCKED**.

## 17. Assessment restrictions

```text
response ≠ score ≠ interpretation ≠ formulation ≠ diagnosis
```

No assessment engine. Licensing unresolved. **BLOCKED**.

## 18. Retention / export / deletion status

| Topic | Status |
| --- | --- |
| Periods | **UNSET** |
| Export | **NOT YET DECIDED** |
| Deletion | **NOT YET DECIDED** + legal |
| Production accounts | **BLOCKED** on O10 policy |

## 19. Audit / accountability model

```text
AUDIT ≠ CLINICAL RECORD
```

Option B lean audit **APPROVED**. Clinical event catalogue **NOT YET DECIDED**.

## 20. AI restrictions

Clinical AI **BLOCKED**. Educational Ask remains educational. AI cannot expand permissions, diagnose, auto-escalate, or disclose protected information.

## 21. Architecture readiness

F4-12 verdict: **NOT READY** for Option C implementation. Trust boundaries documented; unresolved decisions preserved.

## 22. Implementation gate

See `docs/F4_FINAL_CLINICAL_IMPLEMENTATION_GATE.md`. All checklist items currently **NO** / unsatisfied for clinical engineering.

## 23. Production gate

Clinical Production requires separate authorization after governance + legal + security + regression. Option B Production also separately gated. **No Production changes** in this checkpoint.

## 24. Change-control process

1. Propose change in F4 domain or decision register  
2. Record status explicitly (do not silently approve)  
3. Obtain legal/professional review where marked  
4. Obtain practice-owner / security / architecture approvals as required  
5. Issue separate engineering authorization for implementation  
6. Security review + regression  
7. Separate Production authorization  

F4 package edits that invent approvals or clinical schemas are forbidden.

## 25. Approval section

| Item | Status |
| --- | --- |
| Package ready for human governance review? | **YES — READY FOR HUMAN GOVERNANCE APPROVAL** |
| Clinical domains approved? | **NO — NOT YET DECIDED** |
| Option C implementation authorized? | **NO — BLOCKED** |
| Retention periods set? | **NO — UNSET** |
| Legal reviews complete? | **NO** |
| Technical architecture approved for clinical build? | **NO** |
| Human practice-owner signature | **NOT RECORDED IN REPOSITORY** |

---

## Distinguishing vocabulary (binding for readers)

| Term | Meaning in this package |
| --- | --- |
| **APPROVED** | Explicit Option B (or recorded) approval |
| **PROPOSED** | Draft recommendation awaiting decision |
| **NOT YET DECIDED** | No human approval recorded |
| **LEGAL / PROFESSIONAL REVIEW** | Counsel/professional input required |
| **TECHNICAL DECISION REQUIRED** | Engineering/architecture choice pending |
| **BLOCKED** | Must not implement until separate authorization |
| **READY FOR HUMAN GOVERNANCE APPROVAL** | Draft package complete for review — **not** clinical go-ahead |

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | F4 final governance package checkpoint |

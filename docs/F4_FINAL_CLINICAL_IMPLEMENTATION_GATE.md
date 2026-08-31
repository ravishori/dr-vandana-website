# F4 FINAL CLINICAL IMPLEMENTATION GATE v1.0

**Document type:** Implementation gate (governance checkpoint)  
**Status:** BINDING GATE — Option C **BLOCKED**  
**Baseline:** `b32e1d0`  
**Companions:**  
`docs/F4_FINAL_GOVERNANCE_PACKAGE.md`  
`docs/F4_FINAL_GOVERNANCE_DECISION_REGISTER.md`  
`docs/F4_12_CLINICAL_ARCHITECTURE_IMPLEMENTATION_READINESS_GOVERNANCE.md`  
`docs/PATIENT_PRACTICE_DECISIONS.md`

---

## 1. Absolute statement

```text
OPTION C IS BLOCKED.
```

F4 documentation — including this gate and the final package — does **not** authorize clinical engineering.

A future Cursor engineer must **not** treat existence of F4 docs as permission to:

- create clinical tables, schemas, or migrations  
- create clinical APIs, Server Actions, or UI  
- create clinical messaging, assessments, safety detectors, break-glass, or clinical AI  
- expand educational Ask AI into clinical Option C  
- modify Production for clinical features  

---

## 2. Gate checklist (must all be satisfied before clinical engineering)

| # | Gate | Evidence today | Satisfied? |
| --- | --- | --- | --- |
| 1 | F4 governance decisions are approved | Domain docs DRAFT / NOT YET DECIDED | **NO** |
| 2 | Required legal/professional reviews complete | O10 UNSET; O11 OPEN; minors/safety/instruments/AI flagged | **NO** |
| 3 | Technical architecture decisions approved | DB/storage/tenant/worker/audit-fail open | **NO** |
| 4 | Security architecture approved | Option B strong; clinical ACL unapproved | **NO** (clinical) |
| 5 | Clinical workflows approved | Not defined as approved SOPs | **NO** |
| 6 | Data classification approved | F4-01 DRAFT | **NO** |
| 7 | Consent model approved | F4-03 DRAFT; O11 OPEN | **NO** |
| 8 | RBAC/relationship model approved | F4-04 DRAFT | **NO** |
| 9 | Versioning/provenance model approved | F4-05 DRAFT | **NO** |
| 10 | Safety governance approved | F4-06 DRAFT; LEGAL REVIEW heavy | **NO** |
| 11 | Communication governance approved | Clinical messaging BLOCKED; F4-07 DRAFT | **NO** |
| 12 | Assessment governance approved if assessments included | F4-08 BLOCKED/DRAFT | **NO** / N/A until scope chosen |
| 13 | Retention/export/deletion decisions approved | Periods UNSET | **NO** |
| 14 | Audit architecture approved | Clinical catalogue NOT YET DECIDED | **NO** |
| 15 | AI scope explicitly approved, if applicable | Clinical AI BLOCKED | **NO** / N/A if AI out of scope |
| 16 | Clinical implementation scope separately authorized | No written milestone authorization in repo | **NO** |
| 17 | Implementation receives its own Cursor engineering prompt | Not issued | **NO** |
| 18 | Implementation receives independent security review | Not performed for Option C | **NO** |
| 19 | Full regression testing passes | Clinical suites undefined/unimplemented | **NO** |
| 20 | GitHub checkpoint occurs before Production | This F4 checkpoint is governance-only | N/A until eng exists |
| 21 | Production deployment receives separate authorization | Not granted | **NO** |

**Overall:** Gates **not satisfied**. Clinical engineering **must not begin**.

---

## 3. Minimum domain approvals (Charter §19 alignment)

Before Option C leaves BLOCKED, at least the following must be **APPROVED** or **APPROVED WITH CONDITIONS** (human-recorded):

- F4 Governance Master Charter review by practice owner  
- F4-01, F4-02, F4-03, F4-04, F4-09, F4-10, F4-12  
- Plus F4-05, F4-06, F4-07, F4-08, F4-11 as applicable to the authorized scope  

Existence of draft markdown ≠ approval.

---

## 4. Forbidden until gate opens

- Clinical database creation / migrations  
- Clinical UI  
- Clinical AI  
- Safety automation as clinical authority  
- Break-glass without approved policy  
- Clinical messaging carrying private clinical bodies on ordinary channels  
- Invented retention periods or “compliance complete” claims  

---

## 5. Relationship to Option B

Option B operational features may continue under their **own** Production gates (registration, O10, O11, worker hosting, backups, etc.).

This clinical gate does **not** authorize weakening:

- authentication / MFA / OTP  
- appointment authorization / integrity  
- notification recipient / outbox controls  
- Q&A separate authentication  
- educational Ask AI boundary  
- crisis resources as non-clinical resource directory  

---

## 6. How a future task may open the gate

1. Human governance approval recorded for required decisions  
2. Legal/professional reviews closed where required  
3. Technical architecture choices recorded  
4. Explicit written Option C milestone authorization  
5. Dedicated engineering prompt with security review and regression plan  
6. Separate Production authorization before clinical Production  

Until then:

```text
OPTION C IS BLOCKED.
```

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | F4 final package — clinical implementation gate |

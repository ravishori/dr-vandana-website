# Phase 2J — Clinical RBAC Matrix

**Status:** PROPOSED MATRIX. Grants **not** applied. Option C **DEFERRED**.  
**Date:** 14 August 2026  

Current roles: `SUPER_ADMIN`, `PSYCHOLOGIST`, `STAFF`, `PATIENT`.

Clinical permission codes already exist in catalog and are **not granted**:

```text
VIEW_CLINICAL_RECORDS
VIEW_PRIVATE_CLINICAL_NOTES
MANAGE_CLINICAL_NOTES
VIEW_CLINICAL_DOCUMENTS
MANAGE_CLINICAL_DOCUMENTS
```

`grantPermissionToRole` refuses clinical grants today. Keep that fail-closed behavior until Option C is explicitly approved **and** this matrix is human-approved (O20).

---

## Matrix (proposed defaults)

| Role | Patient identity / contact | Appointments | Consultations | Private notes | Patient-visible notes | Documents | Audit |
|---|---|---|---|---|---|---|---|
| **PATIENT** | Own only | Own only | Own operational summary **if approved**; never private notes | **NO** | Own **only if** `PATIENT_VISIBLE` | Own **only if** `PATIENT_VISIBLE` | **NO** (own security events limited if ever exposed) |
| **PSYCHOLOGIST** | Practice patients (relationship required) | Own calendar / practice patients | Yes with clinical perms when Option C approved | Yes with `VIEW_PRIVATE_CLINICAL_NOTES` / `MANAGE_CLINICAL_NOTES` | Yes | Yes with document perms | Operational + clinical access events (read) |
| **STAFF** | **RESERVED** — possible limited scheduling/contact only | Possible limited future | **Default NO clinical** | **NO** | **OPEN** (likely NO) | **OPEN** (likely NO) | Limited operational **OPEN** |
| **SUPER_ADMIN** | Config / user admin — **not** chart browsing by default | **NO** appointment transitions (Phase 2) | **NO** automatic | **NO** automatic | **NO** automatic | **NO** automatic | Platform/operational audit admin — **not** note bodies |

```text
SUPER_ADMIN ≠ ALL_DATA_ACCESS
```

Do not use “admin” as a substitute for clinical permission. Do not grant clinical permissions to Super Admin by default. Whether clinical permissions can **ever** attach to Super Admin is **O20 OPEN**.

---

## Access formula (target)

```text
Authenticated session
+ Role
+ Permission (for clinical resources)
+ Ownership or practice relationship
```

Forbidden sole factors:

- patient internal UUID alone
- public id alone
- URL possession alone
- client-supplied role/permission claims

---

## STAFF

Reserved. **Do not implement Staff UI** in Option C early phases. Document only:

- Possible future: schedule assistance, non-clinical messaging flags
- Must not imply clinical chart access without explicit approval

---

## Psychologist patient access

PR #9: any `PSYCHOLOGIST` sees all patients (solo-tenant assumption).

Target: psychologist + permission + practice relationship + patient relationship. Multi-psychologist tenancy remains out of V1 product scope but authorization must still be explicit.

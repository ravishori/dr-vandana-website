# Phase 2J Option C Forensic Audit Report

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase2-appointments-d73b`  
**PR #9 inspected:** https://github.com/ravishori/dr-vandana-website/pull/9 (`cursor/patient-practice-management-a302` @ `eef4613`)  

This phase is **AUDIT + BLUEPRINT ONLY**. Option C was **not** implemented. PR #9 was **not** merged or cherry-picked. Patient registration remains disabled. Production remains **BLOCKED**.

This document is **not** legal advice.

Companion artefacts:

- `docs/PHASE_2J_PR9_FORENSIC_INVENTORY.md`
- `docs/PHASE_2J_CONSULTATION_REQUIREMENTS.md`
- `docs/PHASE_2J_CLINICAL_NOTES_REQUIREMENTS.md`
- `docs/PHASE_2J_DOCUMENT_REQUIREMENTS.md`
- `docs/PHASE_2J_CLINICAL_RBAC_MATRIX.md`
- `docs/PHASE_2J_PATIENT_VISIBILITY_MODEL.md`
- `docs/PHASE_2J_DATABASE_MIGRATION_BLUEPRINT.md`
- `docs/PHASE_2J_OPTION_C_THREAT_MODEL.md`
- `docs/PHASE_2J_PR9_SECURITY_GAP_MATRIX.md`
- `docs/PHASE_2J_LEGAL_PRIVACY_GATES.md`
- `docs/PHASE_2J_OPTION_C_TARGET_ARCHITECTURE.md`
- `docs/PHASE_2J_OPTION_C_IMPLEMENTATION_ROADMAP.md`
- `docs/PHASE_2J_ROUTE_MIGRATION_MAP.md`
- `docs/PHASE_2J_SERVICE_MIGRATION_MAP.md`
- `docs/PHASE_2J_DATA_MIGRATION_STRATEGY.md`
- `docs/PHASE_2J_ENV_AND_TEST_MIGRATION.md`

---

## Executive Summary

PR #9 is a coherent **solo-practice Option C prototype** with useful product concepts (explicit PRIVATE vs PATIENT_VISIBLE notes/documents, appointment request/confirm flow, neutral notification copy, psychologist patient chart UX). Its **technical substrate is unsuitable for production**: SQLite JSON snapshot persistence, local document files, mock OTP/WhatsApp, HMAC sessions without revocation, and multiple CRITICAL/HIGH authz and secret-handling defects.

The current Phase 1–2 architecture (PostgreSQL, Drizzle, server-side sessions, RBAC, MFA, appointment transactions, notification outbox, fail-closed production gates) is **authoritative**. Option C, if ever approved, must be **reimplemented** on that stack after legal gates — not by merging PR #9.

**PR #9 MUST NOT be merged into the production architecture.**

---

## PR #9 Status

| Item | Value |
|---|---|
| Draft PR | #9 OPEN |
| Self-label | Option C “selected and implemented” (local/sqlite + mocks) |
| Own readiness | **Not PRODUCTION READY** |
| Conflict with current register | Option C is **DEFERRED / BLOCKED**; Option B is approved direction |
| Merge recommendation | **DO NOT MERGE** |

---

## Current Phase 1–2 Architecture

Authoritative capabilities already present:

- Identity: register, verify email/mobile, sessions, password reset, MFA, RBAC, audit
- Appointments: availability, booking, lifecycle, patient portal, GiST exclusion, idempotency
- Notifications: transactional outbox, SMTP, Twilio adapter (disabled)
- Clinical permission codes exist but are **ungranted**
- Super Admin ≠ clinical access; no appointment transitions for Super Admin
- No `consultations` / clinical note / clinical document tables

Production: **BLOCKED**. `PATIENT_REGISTRATION_ENABLED=false`.

---

## PR #9 Functional Inventory

See `docs/PHASE_2J_PR9_FORENSIC_INVENTORY.md`.

Headline reusable requirements: visibility model, chart UX concepts, neutral notifications, appointment confirmation workflow (already superseded by Phase 2), audit of denials.

Headline rejects: snapshot store, local files, mocks-as-success, HMAC-only sessions, OTP-by-userId, plaintext MFA secrets, tokens in notification bodies.

---

## Patient Portal Comparison

| Feature | Decision |
|---|---|
| Registration / verify / login / reset | **REPLACE** — keep Phase 1 |
| Dashboard | **EXTEND** UX concepts onto `/patient/account` + appointments |
| Appointments | **KEEP** Phase 2; discard PR #9 |
| Consultations | **REIMPLEMENT** after C0 on PostgreSQL |
| Documents | **REIMPLEMENT** with object storage |
| Profile | **EXTEND** non-clinical fields carefully; clinical fields **E** |
| OTP `devCode` UI | **REMOVE** |

---

## Psychologist PMS Comparison

| Feature | Decision |
|---|---|
| Appointment queue / lifecycle | **KEEP** Phase 2 routes/services |
| MFA | **KEEP** Phase 1 MFA; discard PR #9 security page behavior |
| Patient directory / chart | **REIMPLEMENT** (Option B gap + Option C content) |
| Calendar UI | **REIMPLEMENT** UX on Phase 2 availability (not Option C-specific) |
| Notes / documents | **REIMPLEMENT** Option C |
| Audit viewer | **REIMPLEMENT** on `audit_logs` |
| Login via `/patient/login` | **REMOVE** — keep `/psychologist/practice/login` |

Do not duplicate appointment management from PR #9.

---

## Consultation Requirements

See `docs/PHASE_2J_CONSULTATION_REQUIREMENTS.md`.

Operational header ≠ clinical body. Appointment→consultation cardinality, create triggers, and amend/close rules are **OPEN HUMAN DECISION**. Option B must not auto-create consultations.

---

## Clinical Notes

See `docs/PHASE_2J_CLINICAL_NOTES_REQUIREMENTS.md`.

Explicit PRIVATE / PATIENT_VISIBLE; default PRIVATE. Bodies never in email/WhatsApp/SMS/audit/URLs. Versioning **OPEN**.

---

## Documents

See `docs/PHASE_2J_DOCUMENT_REQUIREMENTS.md`.

PR #9 local disk streaming is rejected. Target: private object storage + short-lived signed URLs + server authz.

---

## Object Storage

Vendor **OPEN (O6)**. Required capabilities: private container, encryption at rest, signed URLs, short expiry, content-type + size validation, safe keys, audit, malware scanning consideration. Never Git/SQLite/JSON/public folders.

---

## Patient Visibility

See `docs/PHASE_2J_PATIENT_VISIBILITY_MODEL.md`.

INTERNAL vs PATIENT_VISIBLE. Nothing patient-visible by mere existence.

---

## Clinical RBAC

See `docs/PHASE_2J_CLINICAL_RBAC_MATRIX.md`.

Super Admin does not automatically receive clinical permissions. STAFF reserved without UI. Grants remain unapproved (O20).

---

## Audit Requirements

Future clinical actions to audit (metadata only): patient viewed, consultation viewed/created/updated, note created/updated/visibility changed, document uploaded/viewed/downloaded/deleted.

Never: note body, document bytes, passwords, OTP, session tokens, MFA secrets.

Target append-only; optional PostgreSQL deny-update triggers later.

---

## Notification Requirements

Reuse Phase 2F outbox/dispatcher. No second architecture. Clinical events → generic copy only. Hard rule: no diagnosis/symptoms/therapy details/assessment/notes/sensitive titles in Email/WhatsApp/SMS unless a future explicit approved policy says otherwise (default: never).

---

## Database Blueprint

See `docs/PHASE_2J_DATABASE_MIGRATION_BLUEPRINT.md`.

Proposed: `consultations`, `clinical_notes`, `clinical_note_versions`, `clinical_documents`, `clinical_document_versions`, optional `clinical_document_access`. All **PROPOSED**. None created in Phase 2J.

---

## Security Threat Model

See `docs/PHASE_2J_OPTION_C_THREAT_MODEL.md`.

---

## PR #9 Security Gaps

See `docs/PHASE_2J_PR9_SECURITY_GAP_MATRIX.md`.

Critical: OTP-by-userId; tokens in notification bodies; plaintext MFA secrets. High: unverified login; MFA gaps; mocks; snapshot PHI; local files; client MIME trust.

---

## UX Reuse

| Concept | Class |
|---|---|
| Patient consultation history (shared only) | KEEP UX / REIMPLEMENT |
| Patient document list (shared only) | KEEP UX / REIMPLEMENT |
| Psychologist patient list + chart | KEEP UX / REIMPLEMENT |
| Note editor with visibility select | KEEP UX / REIMPLEMENT |
| Calendar availability admin | KEEP UX / REIMPLEMENT (Option B) |
| Stats dashboard cards | REDESIGN on Phase 2 data |
| OTP debug code display | REMOVE |
| Psychologist login via patient login | REMOVE |

---

## Route Migration

See `docs/PHASE_2J_ROUTE_MIGRATION_MAP.md`.

---

## Service Migration

See `docs/PHASE_2J_SERVICE_MIGRATION_MAP.md`.

---

## Test Migration

See `docs/PHASE_2J_ENV_AND_TEST_MIGRATION.md`.

Keep visibility and double-book **requirements**; discard HMAC session tests; add document IDOR / signed-URL / notification non-leakage security tests in C10.

PR #9 tests: **not executed** as production evidence in this phase (isolated inspection only).

---

## Data Migration Strategy

See `docs/PHASE_2J_DATA_MIGRATION_STRATEGY.md`.

**Default: NO PROTOTYPE DATA MIGRATION UNTIL EXPLICITLY APPROVED.**

---

## Legal / Privacy Gates

See `docs/PHASE_2J_LEGAL_PRIVACY_GATES.md`.

Option C blocked until counsel/BRD/privacy/retention/residency approvals. Do not treat PR #9 legal.ts edits as approval.

---

## Target Architecture

See `docs/PHASE_2J_OPTION_C_TARGET_ARCHITECTURE.md`.

---

## Future Implementation Roadmap

See `docs/PHASE_2J_OPTION_C_IMPLEMENTATION_ROADMAP.md` (C0–C13).

---

## Dependencies

```text
Legal approval
 → Clinical schema
 → RBAC
 → Consultations
 → Notes
 → Documents
 → Patient visibility
 → Audit
 → Testing
 → Staging
 → Production
```

---

## Production Gates

Option C must not be production-ready until legal, privacy, retention, residency, clinical RBAC approval, MFA recovery, PostgreSQL production, object storage, backups, restore, monitoring, security review, and staging validation are complete — in addition to Option B blockers.

---

## Remaining Risks

- Treating PR #9 “tests pass” as security clearance  
- Merging PR #9 and destroying Phase 2 concurrency/outbox/gates  
- Shipping clinical records before legal rewrite  
- Super Admin curiosity access  
- Notification or audit leakage of note bodies  
- Public or misconfigured object storage  
- Migrating dirty prototype PHI into production  

---

## Performance / scalability (PR #9)

| Issue | PR #9 | Future |
|---|---|---|
| Full snapshot rewrite | Every mutation | Normalized PostgreSQL row updates |
| N+1 / no pagination | Arrays in memory | Indexed queries + pagination |
| Concurrent writes | Snapshot races | Transactions + constraints |
| File storage | Local disk | Object storage |
| Listing | Load-all patterns | Keyset/offset pagination |

---

## Patient profile separation

| Category | Store |
|---|---|
| IDENTITY | `users` (authoritative) |
| CONTACT | `users` email/mobile |
| PRACTICE PROFILE | `patient_profiles` non-clinical |
| CLINICAL DATA | Future clinical tables only — not duplicated into identity |

PR #9 emergency contact / DOB / gender / address fields require **LEGAL REVIEW** before any extension of `patient_profiles`.

---

## Executive conclusions (required answers)

1. **Useful functionality in PR #9?** Visibility model, chart UX, patient shared history/docs UX, appointment confirm concepts (already in Phase 2), neutral notifications, audit of access denials, honest “not prod ready” labeling.  
2. **Retain as requirements?** Yes — visibility, authz-before-download, generic notifications, consultation-as-header, explicit share.  
3. **Must NOT reuse technically?** SQLite/JSON store, local files, mock providers, HMAC sessions, OTP-by-userId, plaintext MFA, tokens in notify bodies, status model with durable `RESCHEDULED`, PR #9 auth/middleware.  
4. **Must be redesigned?** Consultation lifecycle policies, note versioning, document signed URLs, patient directory on Phase 2 authz, public ids, psychologist login routes.  
5. **Likely new tables?** `consultations`, `clinical_notes`, `clinical_note_versions`, `clinical_documents`, `clinical_document_versions` (+ optional access).  
6. **Object storage?** Private bucket, encryption, signed URLs, validation, audit; vendor OPEN.  
7. **Clinical permissions?** Existing five clinical permission codes; grant only to psychologist (as approved); never automatic Super Admin.  
8. **Legal/privacy blockers?** Clinical records on website DB, notes/docs, retention, processors, residency, consents, BRD rewrite.  
9. **Implementation sequence?** C0→C13 per roadmap.  
10. **Can PR #9 be merged?** **No.**

```text
PR #9 MUST NOT be merged into the production architecture.
Its functional requirements and UX concepts may be used as
reference material for a future secure Option C implementation.
```

---

## Test Results (current application)

Recorded in this Phase 2J agent environment on 14 August 2026. Documentation-only changes; no Option C code.

| Command | Result |
|---|---|
| `npm test` | **267/267** pass |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm run production:gates` | **OVERALL BLOCKED**; registration flag PASS (false) |
| PR #9 prototype tests | Inspected in source only — **not** used as production security evidence |

---

## Git Status

Documentation commits on `cursor/patient-practice-phase2-appointments-d73b` only. Working tree clean after push. `main` not merged. PR #9 not merged.

---

## Hard stop

After Phase 2J: **STOP.**

Do not implement consultations, clinical notes, clinical documents, clinical DB, object storage, clinical RBAC grants, clinical portal, or Super Admin clinical access. Do not merge PR #9. Do not enable registration. Do not deploy.

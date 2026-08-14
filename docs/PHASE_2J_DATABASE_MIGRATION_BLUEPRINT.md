# Phase 2J — Database Migration Blueprint

**Status:** PROPOSED ONLY. Do not create migrations in this phase.  
**Date:** 14 August 2026  

Principles: UUID internal ids, unguessable public ids, PostgreSQL, Drizzle, FKs, transactions, indexes, append-only history/audit where required. **No SQLite / JSON snapshots / in-memory production stores.**

Identity + appointment tables remain authoritative. Do not duplicate `users` / `patient_profiles`.

---

## Proposed tables

### `consultations` — PROPOSED

| Item | Proposal |
|---|---|
| Purpose | Operational clinical chart header linked to a patient (and optionally an appointment) |
| Fields | `id` UUID PK; `public_id` unique; `patient_user_id` FK; `psychologist_user_id` FK; `appointment_id` FK nullable unique **OPEN**; `appointment_type_id` or consultation type FK; `starts_at` timestamptz; `duration_minutes`; `status`; `follow_up_at` nullable; `created_by`; `updated_by`; `created_at`; `updated_at` |
| Relationships | Patient, psychologist, optional appointment |
| Indexes | `(patient_user_id, starts_at desc)`; `(psychologist_user_id, starts_at)`; unique `public_id`; unique `appointment_id` if policy requires |
| Ownership | Patient owns own row for filtered reads; psychologist via practice relationship |
| Audit | create/update/view |
| Retention | **OPEN (legal)** |
| Visibility | Header operational fields ≠ clinical body |

### `clinical_notes` — PROPOSED

| Item | Proposal |
|---|---|
| Purpose | Note bodies with explicit visibility |
| Fields | `id`; `consultation_id` FK; `visibility` enum; `body` or ciphertext ref; `created_by`; `updated_by`; timestamps; optional `published_to_patient_at` |
| Indexes | `(consultation_id, visibility)` |
| Ownership | Via consultation |
| Audit | create/update/visibility change/view — **no body** |
| Retention | **OPEN** |
| Versioning | See below |

### `clinical_note_versions` — PROPOSED (alternative to overwrite)

| Item | Proposal |
|---|---|
| Purpose | Immutable revisions of note content |
| Fields | `id`; `note_id`; `version`; `body`/ciphertext; `edited_by`; `created_at`; `visibility_at_version` **OPEN** |
| Recommendation | Prefer append-only versions if counsel expects clinical integrity; final decision **OPEN** |

### `clinical_documents` — PROPOSED

| Item | Proposal |
|---|---|
| Purpose | Metadata only; bytes in object storage |
| Fields | `id`; `public_id`; `patient_user_id`; `consultation_id` nullable; `uploaded_by`; `title`; `document_type`; `visibility`; `storage_key`; `mime_type`; `size_bytes`; `checksum` **OPEN**; `version`; `replaced_by` nullable; `deleted_at` nullable; timestamps |
| Indexes | `(patient_user_id, created_at)`; `(consultation_id)`; unique `storage_key` |
| Ownership | Patient / psychologist via relationship + visibility |
| Audit | upload/view/download/delete/visibility |
| Retention | **OPEN** |

### `clinical_document_access` — PROPOSED (optional)

| Item | Proposal |
|---|---|
| Purpose | Fine-grained access events or grants beyond audit_logs |
| Fields | actor, document_id, action, result, at, ip_hash |
| Note | May fold into `audit_logs` with `resource_type=clinical_document` — **OPEN** |

### `clinical_document_versions` — PROPOSED

| Item | Proposal |
|---|---|
| Purpose | Original upload + replacements |
| Fields | document_id, version, storage_key, uploaded_by, created_at, size, mime, checksum |

---

## Note versioning recommendation

| Approach | Pros | Cons |
|---|---|---|
| Overwrite in place | Simple | Loses clinical edit trail |
| Revision table | Integrity, auditability | More complex |
| Append-only notes only | Simple integrity | Poor UX for typos |

**Technical recommendation:** plan for `clinical_note_versions` (or immutable note rows) before production Option C. **Final decision OPEN** if clinical/legal implications exist.

---

## Document versioning

PR #9: none. Future requirement: original upload, replacement, version, author, timestamp, soft-delete status. Do not implement now.

---

## Triggers (future)

| Trigger | Purpose |
|---|---|
| Prevent `UPDATE`/`DELETE` on clinical audit subset | Append-only |
| Optional: prevent silent note overwrite if versions required | Integrity |

Do not implement in Phase 2J.

---

## Explicit non-tables for Option B

Do not add `consultations` / `clinical_notes` / `clinical_documents` to production Option B migrations until C1 is approved after legal gates.

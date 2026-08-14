# Phase 2J — Consultation Requirements

**Status:** REQUIREMENTS EXTRACTION ONLY. Option C remains **DEFERRED / BLOCKED**.  
**Date:** 14 August 2026  
**Source:** PR #9 clinical prototype + Phase 0 architecture + Phase 1–2 appointment engine  

Do **not** implement. Do **not** auto-create consultation rows from Option B booking (already **APPROVED forbidden**).

---

## What a consultation means (extracted)

In PR #9, a consultation is an operational clinical chart header created from a completed appointment. It is **not** the appointment itself and is **not** a note or document.

### OPERATIONAL DATA (non-clinical metadata)

| Field (conceptual) | PR #9 | Target architecture note |
|---|---|---|
| Internal id (UUID) | `id` | Keep UUID |
| Public id | `CON-` + short UUID slice | Prefer unguessable CSPRNG alphabet like `APT-` / `PAT-` (**REDESIGN**) |
| Patient reference | `patientId` | FK to `patient_profiles` / `users` |
| Appointment reference | `appointmentId` nullable | FK to `appointments`; uniqueness **OPEN** |
| Type | `consultationTypeId` | Align with `appointment_types` or separate catalog — **OPEN** |
| Starts at | `startsAt` | From appointment |
| Duration minutes | `durationMinutes` | From type / appointment |
| Status | `SCHEDULED` \| `COMPLETED` \| `CANCELLED` | PR #9 always creates as `COMPLETED` |
| Follow-up at | `followUpAt` | Always null in PR #9; policy **OPEN** |
| Created/updated by + timestamps | yes | Keep |

### CLINICAL DATA (not operational)

| Content | Where it lives |
|---|---|
| Private notes | Separate note entities |
| Patient-visible notes | Separate note entities |
| Documents | Separate document entities |
| Assessments | Architecture mentions; **not** in PR #9 tables as first-class assessments |

Do **not** invent clinical fields (diagnosis codes, ICD, therapy modality charts, etc.) in this phase.

---

## Appointment → consultation relationship

Extracted from PR #9 `createConsultationFromAppointment`:

| Question | PR #9 behavior | Target decision |
|---|---|---|
| Every completed appointment creates a consultation? | Created when psychologist marks complete (service call) | **OPEN HUMAN DECISION** — must not auto-create in Option B; Option C create trigger TBD |
| One appointment → one consultation? | Creates a new row; no unique constraint enforced in snapshot store | **OPEN HUMAN DECISION** — architecture preferred unique `appointment_id` |
| Consultation without appointment? | `appointmentId` nullable in type; create path always sets it | **OPEN HUMAN DECISION** |
| Consultation amendable? | `updateConsultation` in repo; no UI | **OPEN HUMAN DECISION** |
| Consultation closeable? | Status enum includes `CANCELLED` / `SCHEDULED`; create always `COMPLETED` | **OPEN HUMAN DECISION** — redesign status lifecycle |

Phase 2 appointment statuses (authoritative): `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `REJECTED` (plus history `REQUESTED` / `RESCHEDULED`).

**Recommendation (technical only):** If Option C is approved later, create consultations explicitly after attendance (`COMPLETED` or a reviewed ceremony), with a unique FK to `appointments` when linked. Do not invent the policy here.

---

## Patient-visible consultation history

PR #9 patient `/patient/consultations` shows consultations for the patient and only `PATIENT_VISIBLE` notes.

| Field / content | Classification |
|---|---|
| Consultation public id / date / type name / duration | **OPEN DECISION** (likely PATIENT_VISIBLE operational) |
| Appointment linkage | **OPEN DECISION** |
| Private notes | **PSYCHOLOGIST_ONLY** |
| Patient-visible notes | **PATIENT_VISIBLE** when explicitly marked |
| Documents (private) | **PSYCHOLOGIST_ONLY** |
| Documents (patient-visible) | **PATIENT_VISIBLE** when explicitly marked |
| Follow-up dates | **OPEN DECISION** |
| Internal audit of chart opens | **PSYCHOLOGIST_ONLY** |

No clinical information becomes visible merely because a row exists.

---

## Out of scope for Option B

Phase 2 must continue to forbid:

- `consultations` table creation in production Option B migrations
- Auto-create on confirm/complete
- Clinical UI routes

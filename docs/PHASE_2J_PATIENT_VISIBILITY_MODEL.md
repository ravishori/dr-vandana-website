# Phase 2J — Patient Visibility Model

**Status:** CONCEPTUAL. Not implemented.  
**Date:** 14 August 2026  

---

## Principle

```text
No clinical information becomes patient-visible
merely because it exists in the database.
```

Visibility is an **explicit** property, defaulting to internal.

---

## Levels

| Level | Alias | Meaning |
|---|---|---|
| **INTERNAL** | `PRIVATE` / `PRIVATE_CLINICAL` | Psychologist working material; never shown to patients |
| **PATIENT_VISIBLE** | shared | Explicitly marked for the owning patient |

PR #9: explicit enum on notes and documents; UI defaults PRIVATE. **Keep as requirement.** Incomplete: note visibility change after create; follow-ups unused.

---

## Field classification guide

| Content | Default level |
|---|---|
| Private clinical note body | INTERNAL |
| Shared care instruction note | PATIENT_VISIBLE only after explicit mark |
| Clinical document bytes | INTERNAL until explicit mark |
| Consultation date/type (operational) | **OPEN DECISION** |
| Diagnosis / assessment | INTERNAL; patient sharing **OPEN + LEGAL** |
| Appointment status (Option B) | Already patient-visible operationally |
| Psychologist internal cancel notes | INTERNAL / operational practice — **OPEN** |

---

## Unsafe patterns (reject)

| Pattern | Class |
|---|---|
| Implicit “if logged in, show all chart fields” | D |
| Default PATIENT_VISIBLE | D |
| Clinical body in email/WhatsApp “for convenience” | F |
| Public document URLs | F |
| Super Admin chart dump | F |

---

## Notifications

Default future clinical notification copy remains generic, e.g.:

> Your consultation record has been updated. Sign in to your secure portal to view shared information.

Not: diagnosis, symptoms, therapy details, assessment, note excerpts, sensitive document titles.

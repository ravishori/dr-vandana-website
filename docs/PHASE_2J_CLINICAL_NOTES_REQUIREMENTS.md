# Phase 2J — Clinical Notes Requirements

**Status:** REQUIREMENTS ONLY. Option C **DEFERRED / BLOCKED**.  
**Date:** 14 August 2026  

---

## Extracted from PR #9

| Aspect | PR #9 behavior |
|---|---|
| Entity | `ConsultationNote` |
| Visibility enum | `PRIVATE` \| `PATIENT_VISIBLE` |
| UI default on create | **PRIVATE** |
| Author | `createdByUserId` / `updatedByUserId` |
| Timestamps | `createdAt` / `updatedAt` |
| Body | Plaintext string, truncated to 8_000 chars |
| Editing | Repository `updateNote` exists; **no edit UI** |
| Deletion | Not implemented as a product flow |
| Publication | Visibility set at create; document has separate toggle |
| Patient access | Filtered to `PATIENT_VISIBLE` + ownership |
| Psychologist access | All notes on consultation |

---

## Mandatory boundary

```text
PRIVATE CLINICAL NOTES MUST NEVER BECOME PATIENT-VISIBLE BY DEFAULT.
```

No clinical note **content** may appear in:

- email
- WhatsApp
- SMS
- notification logs / outbox payloads
- audit log bodies
- URLs / query strings
- public API responses
- `NEXT_PUBLIC_*` anything

Audit may record: actor, action, note id, visibility label, result — **never** the body.

---

## Visibility model (conceptual)

| Visibility | Meaning | Default |
|---|---|---|
| `PRIVATE` (or `PRIVATE_CLINICAL`) | Psychologist-only clinical working notes | **Required default** |
| `PATIENT_VISIBLE` | Explicitly shared summary / instruction for the patient | Opt-in only |

PR #9 uses explicit visibility (good concept). Defaults are PRIVATE in the add-note UI (good). Changing visibility after create for notes is incomplete in PR #9 (documents have toggle; notes do not) — future design **OPEN**.

If any future code defaults to patient-visible: **SECURITY REWORK REQUIRED**.

---

## Target requirements (not implemented)

1. Notes belong to a consultation (and therefore a patient).  
2. Create/update requires `MANAGE_CLINICAL_NOTES` + psychologist practice relationship.  
3. Patient read requires ownership + `PATIENT_VISIBLE`.  
4. Visibility changes are audited.  
5. Versioning: **OPEN** (see migration blueprint) — do not assume silent overwrite is clinically/legally acceptable.  
6. Encryption at rest for note bodies: **OPEN HUMAN + LEGAL** (architecture mentioned ciphertext; PR #9 stores plaintext in JSON).  

---

## Classification

| Item | Class |
|---|---|
| PRIVATE vs PATIENT_VISIBLE | A + B |
| Default PRIVATE | A |
| Plaintext JSON storage | F |
| Missing version history | D / OPEN |
| Note bodies in any notification | F (forbidden) |

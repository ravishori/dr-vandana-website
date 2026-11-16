# Continuity Loop - Increment 1 (journey shell, preparation, agenda)

Source: Continuity Loop PRD v1.0 (2026-11-16). **The PRD does not override any unresolved approval or the binding F4 clinical gate** (`docs/F4_FINAL_CLINICAL_IMPLEMENTATION_GATE.md`, still BLOCKED: gates 1-15, 18-19, 21 unsatisfied; the owner's written chat authorisation covers only gates 16-17). Everything here is a disabled, in-memory domain layer with synthetic fixtures.

## Scope delivered
`src/lib/continuity/*`: care journey contract and state machine; journey cycle state machine; preparation item model; agenda topic model; patient-ownership and psychologist-access contracts enforced through the central clinical access guard (PR #34); content-free journey events; an in-memory repository whose content methods require the guard's `AccessGrant`; synthetic fixtures; lifecycle, access, preparation, agenda and static-safety tests. Master flag `CONTINUITY_LOOP_ENABLED` (default off; nothing works while off).

## Deliberately not included
Goals, practice activities/assignments/entries, reflections, review records, patient-approved summaries, notifications, reminders, routes, UI, persistence, migrations, instruments. Their dependencies are unreviewed.

## PRD mapping
PRD 4.1 CareJourney, 4.2 JourneyCycle, 4.3 PreparationItem, 4.4 AgendaTopic, 4.11 JourneyEvent (subset); 5.1 PREP-01..PREP-15 (except patient topic carry-forward selection and any correction workflow); 5.2 DISC-01, DISC-04, DISC-05; 6.1 and 6.2 lifecycles; 11.1-11.3 and 11.8 tests (the parts that apply).

## Security contracts implemented
- Every protected operation runs inside `guard.run`: authentication, mandatory MFA, role permission, patient ownership, active care relationship (resolved server side, re-checked on every call), fail-closed access logging with opaque identifiers.
- Repository content methods verify an unforgeable, resource-bound, auto-revoked grant; metadata `peek*` methods return no content and are not exported.
- Preparation items are private by default; the `privateToPatient` flag is derived from stored visibility, never from the caller; the psychologist's list method loads only submitted, shared items, so private items are never read; a private item looks "not found" to everyone but its author. Patient B receives "not found" for patient A's resources (no existence oracle), and each denied attempt is logged.
- A shared item's wording is immutable (service rule plus a repository invariant); events are append-only and carry only enumerated tokens.
- STAFF and SUPER_ADMIN are denied all of it. A patient cannot run any psychologist workflow, and the psychologist cannot write on a patient's behalf.
- No text analysis anywhere: no scoring, keywords, sentiment, risk, priority or AI (static test).

## PRD inconsistencies and gaps found (not silently decided)
1. PRD 4.2's cycle status list omits `review_incomplete`, which PRD 6.2 uses; it is included and flagged.
2. PRD does not say what moves a cycle to `review_due`; implemented as an explicit psychologist action, never automatic. `reviewed` cannot be reached in this increment (needs ReviewRecord, a later increment).
3. Reopening a closed journey: PRD says "follow approved policy"; closed is terminal here.
4. One open journey per patient is enforced (PRD does not say); flagged.
5. Withdrawing an item after sharing: refused (`withdrawal_after_sharing_policy_undecided`), PRD open question 1.
6. Patient visibility of the agenda is undecided; the patient sees only topics they proposed.
7. Who selects carry-forward: psychologist-only here; the PRD also lets patients pick topics, which is left unimplemented.
8. Cycle creation from an appointment is a link only; no automatic creation, matching the PRD's separation of booked/attended/consulted.

## Dependencies and blockers
Database schema, encryption and key management (OD-C3), hosting region (OD-C4), care-relationship model (F4-04) and its persistence, access-log persistence, step-up implementation (threat model in PR #34), legal review of sharing/withdrawal/retention, patient-facing notice wording, emergency wording (OD-G7/H6), doctor-absence arrangements (OD-H3..H8), clinical approval of any content. None is decided here.

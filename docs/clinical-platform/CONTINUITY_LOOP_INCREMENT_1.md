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

---

# Review and reconciliation (2026-11-16)

Feature remains **disabled, synthetic and in-memory**. No goals, practice assignments, reflections, review records, UI, routes, migrations or persistent storage were added. PRD = Continuity Loop PRD v1.0.

## 1. CI evidence for the pre-review head `2e8fe14` (PR #38)
| Run | Event | Result |
|---|---|---|
| 43917559435 | pull_request | **success**: `verify` (install, `npm test`, lint, typecheck, `npm run build` all success; 4m09s) and `appointment-pg-concurrency` (success; 1m17s) |
| 43917505231 | push | `appointment-pg-concurrency` success; `verify` was still in progress when queried |

Vercel preview success is reported separately and is **not** counted as CI. The Postgres job runs only four database test files (`booking.pg`, `lifecycle.pg`, `dispatcher.pg`, `schema.pg`); the continuity module is in-memory and is covered by `npm test` in `verify`. CI for the review commit is recorded in the PR comment.

## 2. OD-K1 to OD-K8 reconciled against the PRD
Approvers: **O** owner, **P** psychologist (Dr. Vandana), **L** legal counsel, **S** security reviewer.

| ID | PRD section and wording | Current behaviour | Risk / ambiguity | Recommended resolution | Approval |
|---|---|---|---|---|---|
| K1 | 4.2: status `preparation / consultation / practice / review_due / reviewed / cancelled`. 6.2: "consultation → review_incomplete", "practice → review_incomplete", "review_incomplete → reviewed" | `review_incomplete` added as a 7th status | PRD enum and lifecycle disagree; a reader of 4.2 alone would reject the code | Amend PRD 4.2 to include `review_incomplete` | O, P |
| K2 | 6.2: "Suggested flow: preparation → consultation → practice → review_due → reviewed"; "A cycle cannot be reviewed without an explicit psychologist review action." Silent on what triggers `review_due` | Only an explicit psychologist action moves a cycle (`advanceCycle`); never automatic; `reviewed` unreachable | A time-based trigger would be automation; none is authorised | Keep explicit; confirm "practice ends by psychologist action only" | P, O |
| K3 | 4.1: "Reopening a journey must create an auditable event and follow approved policy." 6.1: "Reopening requires explicit authorised action and audit event." The lifecycle lists only active → paused → active and active → closed | `closed` is terminal; reopening rejected; a new journey for the same patient is allowed | Either policy risks losing continuity or breaking history | Decide reopen vs "start a new journey"; if reopen, define who, reason, step-up | O, P, L |
| K4 | 4.1: "Do not create duplicate patient identities to represent separate cycles." 4.2: "Only one active cycle per journey should normally exist; any exception must be explicitly modelled and tested." No rule on journeys per patient | At most one non-closed journey per patient; one open cycle per journey | The PRD authorises the cycle rule only; the journey rule is an assumption | Confirm one open journey per patient, or specify concurrent journeys | O, P |
| K5 | 4.3: "Withdrawal affects future access according to approved retention and record-access policy; it must not silently rewrite an already legally retained clinical record." 3.1: patient may "withdraw sharing for future access, subject to record-retention and legal obligations". 13: open question | Draft withdrawal allowed; withdrawal after sharing refused (`withdrawal_after_sharing_policy_undecided`) | Patients may expect to withdraw; legal retention duties unknown | Legal opinion on retention and withdrawal; patient-facing wording that sharing is not reversible meanwhile | L, O, P |
| K6 | 3.1: patient may "Add topics to the next consultation agenda". 4.4: "Patient topics can be proposed by the patient. Psychologist can accept, reorder, defer or add topics." 8: screen "My Questions and Topics". Silent on whether the patient sees psychologist-added or accepted topics | Patient sees only topics they proposed (filtered inside the repository) | Patient may not see what was accepted or added | Decide: patient sees the status of their own topics only, or the full agenda | O, P |
| K7 | 4.4: "Deferred topics may be carried forward with patient/psychologist visibility as appropriate." PREP-06: "Patient can choose which carried-forward items to include." REV-12: "Patient can select topics to carry forward." 3.2: psychologist can "Carry forward selected goals or topics" | Psychologist-only, explicit, one deferred topic at a time; creates a `proposed` topic in a later preparation-stage cycle of the same journey; idempotent | Patient agency (PREP-06, REV-12) not implemented | Define a two-step flow: psychologist offers, patient selects | O, P |
| K8 | 6.2: "A cycle can be created from a scheduled appointment or explicitly by an authorised psychologist. Appointment booked, attended, cancelled and consultation completed are distinct concepts." "A missed appointment does not automatically create a clinical interpretation." "Do not automatically start a new cycle if the previous one has not reached an allowed terminal/review state unless the workflow explicitly supports it." 13: "Exact cycle creation/closure rules for cancelled, missed or rescheduled appointments." | Cycles are created only by explicit psychologist action; the appointment is a stored link; nothing reacts to appointment events; the link cannot be changed (no reschedule); a new cycle needs the previous one terminal (reviewed or cancelled) | A cycle can stall in `consultation` or `practice` (cannot be cancelled there) until the review increment exists | Define handling of cancelled, missed and rescheduled appointments, relinking, and a way to close a stalled cycle without a review | O, P |

### New findings from this review (OD-K9 to OD-K17, none decided)
| ID | Finding | Behaviour today (pinned by a test) | Recommended resolution | Approval |
|---|---|---|---|---|
| K9 | A journey can be closed while a cycle is still open | allowed; the cycle stays workable and patients can still prepare | Block closure while a cycle is open, or close/cancel it together | P, O |
| K10 | Preparation and agenda while a journey is `paused` | allowed | Decide whether paused means "no new patient input" | P |
| K11 | `careRelationshipId` is stored but not validated against a care-relationship model (access depends on the resolver for the patient) | any string accepted | Validate once the relationship model exists | S, O |
| K12 | Rescheduled appointment: the link cannot be changed | no API | Add controlled relinking with an event | O |
| K13 | Topics can be added only while the cycle is in `preparation` | the psychologist cannot add a topic once the consultation has started | Decide whether the psychologist may add topics during the consultation | P |
| K14 | A withdrawn draft's text is retained | content stays in the store | Retention or erasure rule for unshared drafts (data minimisation) | L, O |
| K15 | Role-only refusals (for example a patient calling a psychologist operation) are not written to the access log | no log row | Log them, or accept | S |
| K16 | Existence of private-draft activity: fixed here (section 5) | no journey event for draft create/edit/withdraw; the security access log (admin or auditor, category C) still holds opaque ids and timestamps | Decide whether auditors may see that a patient wrote a draft | S, O |
| K17 | Field limits (item 4,000 characters, title 200, description 2,000) are placeholders | enforced | Owner or psychologist sets the limits | P |

## 3. Implementation assumptions not authorised by the PRD or an owner decision
These are **not policy**. Each is pinned by a test or listed in section 2.
1. One open journey per patient (K4).
2. `review_incomplete` as a cycle status (K1).
3. Every cycle step, including `review_due`, set by explicit psychologist action; `preparation → consultation` stamps `consultationAt` with the action time.
4. Closing a journey from `paused`; pause and resume at any time.
5. Journey and cycle metadata classified Category B; preparation items and agenda topics Category A (Doc 10 is still DRAFT).
6. Sharing only while the cycle is in `preparation`; items cannot be created, edited or shared later (K13).
7. Psychologist-added topics start `accepted`; topics made from a shared item start `accepted`; patient proposals start `proposed`.
8. The topic transition table (for example `deferred → accepted`) and "discussed / partially discussed only once the consultation stage has begun".
9. Carry-forward only from `deferred` topics into a later `preparation` cycle of the same journey, as a `proposed` topic, once (K7).
10. Patient sees only own proposed topics (K6).
11. Withdrawal only for drafts; withdrawn text retained (K5, K14).
12. Shared item wording immutable; the patient cannot unshare.
13. Events readable by the psychologist only; metadata allow-list; no events for private draft activity (K16).
14. Field limits (K17).
15. `careRelationshipId` not validated (K11).
16. Appointment link fixed at cycle creation (K12).
17. No automatic action of any kind on time, inactivity or missed appointments.
18. Care relationship checked on every call through the resolver, not cached.
19. No idempotency keys; idempotency comes from version checks and state rules.
20. Role checks (patient needs a profile id; psychologist role) enforced in the service in addition to the guard.
21. `purpose` values in access requests are descriptive only.

## 4. Dependency on PR #34 and gates before integration
PR #38 imports `@/lib/clinical-access` (guard, `AccessGrant`, request flags). It cannot be merged before PR #34, and PR #34's `patientAuthored` / `privateToPatient` policy rules (commit `f99797d`) are what keep private drafts away from clinicians. **Neither PR is merged; neither is approved.** Before integration:
- **Security gates:** independent security review of the access guard and policy (F4 gate 18); a step-up flow, rate limiting and session column (threat model in PR #34); database roles and row-level security so the guard cannot be bypassed by a direct connection; an approved care-relationship model and its persistence; durable, fail-closed access-log storage and monitoring; encryption and key management (OD-C3); hosting region (OD-C4); backup, recovery and retention (OD-B6, OD-D2); a decision on the legacy question portal (OD-J2).
- **Clinical and legal gates:** the F4 final clinical implementation gate (21 conditions; gates 1-15, 18, 19, 21 unmet; 16-17 covered only by the owner's chat authorisation); approved patient-facing notice and consent wording; withdrawal and retention policy (K5, K14); verified emergency wording (OD-G7, OD-H6, OD-D8); doctor-absence arrangements (OD-H3 to H8); clinical approval of any content; the owner's written release approval.
- **Technical gates:** CI green on the stacked branches, an approved schema and migration plan, no routes enabled, and `CONTINUITY_LOOP_ENABLED` off in every environment until release.

## 5. Findings fixed in this review commit
1. **Private-draft activity leaked into the psychologist-readable event stream** (existence, type and timing of an unshared draft). Draft create, edit and withdraw no longer write journey events; only the share event is written. Test: draft activity leaves no trace, and a secret phrase never appears in any psychologist surface or the access log.
2. **The patient agenda loaded the psychologist's topics before filtering.** The filter now lives in the repository (`listTopicsCreatedBy`), so other authors' topics are never loaded for a patient.
3. **Carry-forward was not idempotent** (5 parallel calls made 5 copies). A topic can now be carried forward once (`already_carried_forward`).

## 6. Verification matrix (96 continuity tests; 32 added in this review)
- **Private vs shared:** private by default; the psychologist list never reads private items; a direct fetch of a private item reads as "not found" and is logged as denied (`private_to_patient`); sharing exposes only the chosen item; shared wording immutable (service rule and repository invariant); withdrawn drafts never listed; shared items unreadable once the care relationship ends.
- **Ownership:** patient B gets "not found" for every patient A resource and for missing ids alike; denials are logged.
- **Psychologist access:** MFA, permission and care relationship enforced on every call; revocation rechecked between two parallel reads; staff and super-admin denied everywhere.
- **Access logging:** allowed access logged before it acts; log failure fails closed with no change; event and log contents contain only opaque ids and enumerated tokens.
- **Grant lifecycle:** forged, missing, mismatched, read-used-as-write, revoked-after-use and revoked-after-throw grants all rejected; 6 parallel operations get 6 distinct grants, all revoked afterwards.
- **Concurrency:** 8 parallel `createJourney` (1 journey), 8 `startCycle` (1 cycle), 8 same-version `advanceCycle` (1 change, 1 event), 8 `share` (1 event), share-vs-edit race (wording cannot change after sharing; 10 rounds), 10 parallel proposals (unique, gapless order), 5 parallel carry-forwards (1 copy).
- **State machine:** all 49 cycle transitions match the PRD flow; every disallowed move is rejected through the service; `reviewed` is never reachable; cancelled is terminal; duplicate journeys blocked; closed journeys cannot reopen.

## 7. Unresolved decisions (consolidated)
K1 to K17 (section 2), plus OD-J1 (step-up), OD-J2 (legacy portal), OD-J3 (Lineage B), OD-C3/C4, OD-G7/H6, OD-H3 to H8, OD-D1 to D8, and the database and care-relationship model approvals.

## 8. Recommended next increment
Do not start goals, assignments, reflections or review records yet. Suggested order: (1) the owner and Dr. Vandana decide K1 to K8 (ideally K9 and K13 too); (2) independent security review of PR #34; (3) finish PRD Increment 2 (the patient-selected carry-forward contract and the patient agenda view) once K6 and K7 are decided; (4) a documentation-only logical schema and ERD for the continuity tables, for approval, before any migration; (5) only then PRD Increment 3 (goals), which also needs clinically approved wording.

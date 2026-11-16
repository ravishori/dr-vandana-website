# Questionnaire Engine - Implementation Notes (domain layer, disabled)

Scope: `src/lib/intake/*`. Pure TypeScript with an in-memory store and a transaction abstraction. No database objects, routes, UI, environment variables or notifications. The engine is not reachable from any page or API and no feature flag enables it. Stacked on PR #35 (it uses `computeIntakeReviewDue`, whose targets are PROPOSED).

## Content status
No question wording is approved (register OD-G1). The only content is `fixtures/synthetic-adult-intake.ts`, labelled `SYNTHETIC_FIXTURE`; the registry refuses it unless `allowSyntheticContent` is set (tests and local development only). Real content must be published as a new version with an approval record (content hash) and `contentStatus: "CLINICALLY_APPROVED"`. PHQ-9, GAD-7, suicide/self-harm/harm-to-others items and the text of unapproved instruments are rejected by an authoring-time guard (owner decision IN-3, OD-G2/G3); the guard reads definitions written by the practice, never patient text.

## Model
- Definition: versioned, hash-approved, adult/English only (locale and audience are hooks, closed in V1), sections, questions of seven kinds, rules that may reference only earlier **choice** questions (never free text).
- Six response states: answered, prefer_not_to_answer, skipped, discuss_in_person, not_reached, not_applicable. Patients choose only the first four; the system assigns not_reached (visible, untouched) and not_applicable (hidden by a rule, value dropped). Only consent/contact basics may be required.
- Draft: pinned to the definition version it started on; optimistic concurrency (`draftVersion`); server-side only (no browser storage).
- Submission: immutable snapshot with content hash and snapshot hash; the store refuses to commit any change to submissions, clarifications or annotations.
- Provenance kept apart: `patient_reported` answers, `patient_clarification` additions, `clinician_entered` annotations (separate rows).
- Standard review task created in the same transaction as the submission, containing only references, dates and workflow state. Due time from the calendar calculator; identical for every submission regardless of content. `reviewed` can only be set by an MFA-completed psychologist; patients are only ever shown "received".
- Duplicates: one submission per draft; repeat calls and concurrent calls return the original and create no second task; idempotency keys cannot be reused across drafts.

## Open decisions touched
OD-G1 (question content), OD-H1/H1a/H1b/H1c (review targets, PROPOSED), OD-I2 (clarification raises a task: configurable, default on), OD-H9 (whether patients see "read"; engine returns "received" only).

## Not included
Persistence, access guard wiring (PR #34), notifications, UI, pre-consultation brief (next PR), instruments, any scoring, classification, prioritisation or AI.

## OD-I2 - patient clarification (PROPOSED; owner supports, not yet formally recorded)
A clarification is a separate, timestamped record with its own provenance (`patient_clarification`), linked to the original immutable submission. It never overwrites an original answer and never reopens or alters a completed review: it raises its own new review task (default on, configurable via `clarificationRaisesReviewTask`). Tests: `OD-I2` suite in `service.test.ts`. Remains a proposed owner decision until recorded in the register.


# Security Review - Clinical Access Foundation (PR #34)

Scope: `src/lib/clinical-access/*` and the existing code paths that touch patient data on Lineage B tip `9a87deb`. Method: code reading plus tests. This is an engineering review, not an independent security assessment (gate 18 of the F4 clinical gate still requires one).

## Changes made in response to this review
| # | Finding | Fix in this PR |
|---|---|---|
| 1 | Callers could pass `stepUpSatisfied` and `careRelationshipActive` themselves | Facts are resolved inside the guard from an injected `AccessFactsResolver`; callers cannot assert them |
| 2 | Step-up was a boolean with no age | Step-up is a timestamp; valid for 10 minutes by default (proposed, owner to confirm); future, invalid and stale timestamps are rejected |
| 3 | Raw policy was exported and could be used ad hoc, skipping the log | Index no longer exports `evaluateClinicalAccess`; static test fails if code outside the module imports the policy or guard internals |
| 4 | Nothing tied an approval to the data actually touched | `AccessGrant` capability: only the guard can issue it (module-private token + WeakSet), it is bound to principal/resource/action/patient, revoked when the operation ends; `requireGrant` rejects forged, mismatched or reused grants |
| 5 | Unexpected exceptions (resolver down, malformed principal) | Caught: deny with `internal_error`, never allow |
| 6 | Operation could throw after "allowed" was logged | A `failed` event is logged best-effort, the error is rethrown, the grant is revoked |
| 7 | MFA flag was tested with truthiness | Strict `=== true` for MFA-required roles |
| 8 | Principal ids were not validated for the log | Non-opaque principal ids are denied |

## Answers to the five review questions
**1. Can every future clinical-data access path be forced through the guard?** Not by the guard alone. What now exists: data-access functions can (and must) take an `AccessGrant` as their first parameter and call `requireGrant`, so a missing call is a compile error and a forged or reused grant fails at runtime. What does not exist yet: nothing prevents someone from writing a repository that ignores the grant, and a database connection can read any table. Needed before real clinical tables: (a) a static test that every exported function under future clinical repositories takes a grant and calls `requireGrant`; (b) separate database roles and row-level security so only the repository role can read Category A tables (needs an approved migration); (c) a lint rule limiting imports of clinical table definitions to repositories. Status: **residual risk until those exist.**

**2. Alternate routes that bypass the guard.** Today there are no Category A tables, so no clinical content is reachable. Existing paths outside the guard: (i) practice patient pages (`src/lib/practice/patients.ts`, `psychologist/practice/patients/*`) read Category B profile data and authorise through `loadAuthorizedPracticeSession` (DB session, MFA completion, role, permission). That check is sound but separate; it should move behind the guard before clinical data is attached to those pages. (ii) The legacy question portal (`src/lib/question-portal`, `/psychologist/questions`, `/ask-a-question`) stores visitor free text with its own credential/cookie scheme (not the identity system, no MFA) and SQLite/Upstash storage. Visitors may type sensitive information into it. It must not be used as a clinical channel; owner decision needed on retiring or isolating it. (iii) The notification worker has no user-facing retrieval API (documented in the F1-B test). (iv) Scripts under `scripts/` use database credentials directly; they must never run against a database holding real patient data without separate approval.

**3. Fail-closed behaviour.** Logging failure: allowed access is refused (`audit_unavailable`), operation never runs; denials stand even if their log write fails. Unexpected exceptions while deciding: denied (`internal_error`). Operation exceptions: logged as `failed`, rethrown, grant revoked. Concurrency: no shared mutable state between calls; a 50-call parallel test checks per-call isolation of decisions and grants, and a burst with intermittently failing log writes checks that exactly the calls whose write failed are denied. Not covered: durability and ordering guarantees of a real database-backed sink (no sink exists yet) and a process crash between the log write and the operation (the log would show "allowed" with no completion event; acceptable and conservative for audit).

**4. Patient ownership, care relationship, step-up.** Patient access is limited to the principal's own `patientProfileId`; another patient's resource is denied (`not_owner`); restricted items and unreleased items are never readable by patients. The doctor needs a clinical permission, an active care relationship (resolved server-side) and, for sign/export/release, a fresh step-up. Gaps: there is no stored care-relationship model yet (F4-04 is DRAFT), and the session schema has `mfa_completed_at` but no dedicated step-up timestamp. Until a migration adds one, a resolver can derive step-up freshness from `mfa_completed_at`, which is conservative but not a true re-verification flow. Guardian and representative access is not implemented and is therefore denied.

**5. Mandatory TOTP MFA, no exemption.** `MFA_REQUIRED_ROLES` contains PSYCHOLOGIST and SUPER_ADMIN; the policy denies MFA-incomplete principals before any other check; the check is strict. Static tests fail the build if an MFA exemption mechanism (identifiers, migration, bypass names) appears in application source or SQL. Lineage B tip contains no exemption (PR #29, which adds one, is not included and must not be merged into this line). Not verified here: the live login flow end to end against a real TOTP device (covered by the existing F1-C authentication tests in this repo).

## Open items (not fixed by this PR)
- Care-relationship storage and step-up timestamp need approved migrations.
- Row-level security and database roles for Category A tables.
- Static enforcement for future repositories (rule in question 1).
- Move practice patient pages behind the guard; decide the fate of the legacy question portal.
- Independent security review (gate 18) before any real data.

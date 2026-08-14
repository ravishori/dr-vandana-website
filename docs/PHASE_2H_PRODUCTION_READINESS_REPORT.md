# Phase 2H Production Readiness Report

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase2-appointments-d73b`  
**Checkpoint:** Phase 2G complete; this milestone prepares gates. It is **not** a deployment. Successor decision pack: `docs/PHASE_2I_PRODUCTION_GATE_CLOSURE_REPORT.md`.

This document is **not** legal advice and does **not** claim DPDP, HIPAA, EHR, or medical compliance.

---

## Executive Summary

Phase 2H rechecked Phase 2G findings, fixed two remaining genuine code defects (psychologist read existence oracle aligned with established safe-ID mutations; notification outbox rollup no longer overwrites `SENT` with `DEAD`), and added fail-closed schema verification so a production database without `btree_gist` / `appointments_blocking_occupied_excl` cannot be treated as migrated-successfully.

Runbooks, a legal-review list, a data inventory, and a production gate matrix were added. Human, legal, provider, and infrastructure decisions remain **OPEN**. Patient registration remains disabled.

---

## Overall Status

**PRODUCTION BLOCKED**

Not PRODUCTION READY. Not PRODUCTION CONDITIONALLY READY.

`PATIENT_REGISTRATION_ENABLED` remains false. Operator snapshot `npm run production:gates` prints **OVERALL BLOCKED**. `npm run db:verify-production` in this environment: **NOT CONFIGURED** (`DATABASE_URL` not a postgres URL here). PostgreSQL concurrency / schema integration: **NOT CONFIGURED** (`APPOINTMENT_PG_URL` unset). CI remains the intended runner for those jobs.

---

## Phase 2G Findings Rechecked

| Finding | Class | 2H outcome |
|---|---|---|
| Psychologist read existence oracle | CODE DEFECT (inconsistent with mutations) | **Fixed.** Missing and other-owner both `NOT_FOUND` / “That appointment could not be found.” Patient-facing 403 vs 404 remains **O17 OPEN**. |
| Token query-string hygiene | ACCEPTED residual | GET still does not consume; POST consumes. Added `referrerpolicy="no-referrer"` on email HTML links, page `referrer: no-referrer` on verify/reset, strip token from the URL after successful verify. Tokens still appear in emailed URLs (needed for the flow). |
| CSRF | O14 HUMAN DECISION | SameSite=Lax + Server Actions + HttpOnly retained. **Not** switched to Strict (email/reset GET landings). No custom CSRF token. |
| scrypt vs Argon2id | O13 HUMAN DECISION | scrypt remains. No migration. |
| MFA recovery | O12 HUMAN DECISION | Offline recovery codes only. **No email MFA bypass** added. |
| btree_gist / exclusion fail-open in 0003 | INFRASTRUCTURE | Historical 0003 **not rewritten** (PGlite). `db:migrate` now **fails closed** if verification fails. `db:verify-production` added. |
| SMTP provider idempotency | PROVIDER residual | Nodemailer has no Twilio-style idempotency header. **Not invented.** Documented. |
| Notification rollup race | CODE DEFECT | **Fixed.** Outbox `SENT` cannot be overwritten by `DEAD`; active rollup cannot clobber `SENT`/`DEAD`. |
| PostgreSQL / backups / restore / monitoring / worker / secrets | INFRASTRUCTURE / HUMAN | Runbooks added. Status remains BLOCKED / NOT CONFIGURED. |
| Legal copy | LEGAL | `docs/LEGAL_REVIEW_REQUIRED.md`. Copy **not** rewritten as approved. |

2G regression tests retained: duplicate registration, disabled session, OTP rate-limit ordering, MFA completed-state rejection, calendar lock failure, occupancy contention mapping, notification delivery CAS.

---

## Code Fixes

1. **Psychologist appointment detail** — other-owner uses the same `NOT_FOUND` as a missing id (matches psychologist mutations). Regression in `lifecycle.test.ts`.
2. **Outbox rollup CAS** — status predicates prevent SENT↔DEAD races. Regression in `dispatcher.test.ts`.
3. **Email token hygiene** — no-referrer on links and verify/reset pages; history replace after verify. Residual URL tokens documented.
4. **Schema verification** — read-only checks for tables, `btree_gist`, exclusion constraint, uniqueness indexes, history immutability trigger.
5. **Migrate fail-closed** — after apply, verification must PASS or the CLI exits 1.
6. **Operator commands** — `npm run production:gates`, `npm run db:verify-production`.

---

## PostgreSQL Verification

This agent environment: `APPOINTMENT_PG_URL` **unset** → PostgreSQL concurrency and schema.pg tests **NOT CONFIGURED** (skipped, not fabricated).

CI job `appointment-pg-concurrency` now also runs `src/lib/identity/schema.pg.test.ts` against Postgres 16 when the job’s URL is set.

---

## Migration Verification

| File | Ordering | Notes |
|---|---|---|
| 0001 | First | Identity tables |
| 0002 | Additive | MFA replay column |
| 0003 | Additive | Appointments; exclusion inside `EXCEPTION WHEN OTHERS` (unchanged) |
| 0004 | Additive | Booking idempotency unique index |
| 0005 | Additive | Notification deliveries unique `(outbox_id, channel, recipient_role)` |

Idempotent apply: files are executed in sorted order by `applyIdentityMigrationSql`. Production migrate refuses without `APPLY_IDENTITY_MIGRATION=true`, then verifies schema.

---

## Appointment Constraint Verification

Expected blocking statuses: `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`.  
Non-blocking: `CANCELLED`, `REJECTED`, `COMPLETED`, `NO_SHOW`.  
Range: `tstzrange(..., '[)')`.

Production without this constraint is **not** ready. Verification command and migrate post-check enforce that on a real Postgres target.

---

## Identity

Registration default false; only exact `"true"` enables. No query/cookie/localStorage bypass found. Production provision refused. Password hashing: scrypt (O13 OPEN). Sessions: HMAC, idle/absolute, revoke on reset, disabled users ignored.

---

## MFA

Password alone does not complete PSYCHOLOGIST / SUPER_ADMIN authentication. Recovery codes hashed, single-use. No “Forgot MFA” email path.

---

## RBAC

`SUPER_ADMIN ≠ ALL_DATA_ACCESS`. No automatic clinical permissions. Super Admin dashboard not implemented. No Phase 3 clinical tables.

---

## Appointment Engine

Server-derived duration, buffers, psychologist, status. Advisory lock fail-closed. Occupancy-changing reschedule locks calendar before row lock.

---

## Patient Portal

Ownership + uniform inaccessible message for other patients. Unchanged.

---

## Psychologist Portal

Reads now match mutations for missing vs other-owner. Patients redirected. Super Admin denied appointment role.

---

## Notifications

Outbox after commit. Worker CLI production-refused. Rollup race fixed. SMTP idempotency residual remains.

---

## Email

Server-side SMTP. Test/mock forbidden in production. Appointment succeeds if SMTP is down.

---

## Twilio

Disabled by default. Test/sandbox forbidden in production. Data residency **OPEN**.

---

## Security

See 2G + this report. CSRF adequate for Server Actions + Lax. Headers unchanged (not weakened).

---

## Privacy

Notification templates remain operational. Legal public copy still informational — **REQUIRES LEGAL REVIEW**.

---

## Data Inventory

`docs/PRODUCTION_DATA_INVENTORY.md`

---

## Data Flow

Patient / psychologist → Next.js → PostgreSQL → outbox → SMTP/Twilio → recipient.

---

## Backups

`docs/PRODUCTION_DATABASE_RUNBOOK.md` — requirement documented. RPO/RTO **OPEN HUMAN DECISION**. No production backups created.

---

## Restore

Procedure documented. Status: **NOT EXECUTED**.

---

## Monitoring

`docs/PRODUCTION_MONITORING_CHECKLIST.md` — no provider selected. Thresholds OPEN.

---

## Worker

`docs/NOTIFICATION_WORKER_RUNBOOK.md` — O15 OPEN. CLI not production.

---

## CI

`.github/workflows/ci.yml`: test, lint, typecheck, build; PG job includes booking, lifecycle, dispatcher, and schema verification tests.

---

## Deployment

`docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` / `docs/PRODUCTION_ROLLBACK_RUNBOOK.md` — not executed.

---

## Legal Review

`docs/LEGAL_REVIEW_REQUIRED.md`

---

## Human Decisions

Still OPEN: O1, O2, O4, O5 (activation), O10, O11, O12, O13, O14, O15, O17 (patient 403 vs 404), O18, O19, cancellation/reschedule policy values, RPO/RTO, operating hours.

---

## Production Gate Matrix

`docs/PHASE_2H_PRODUCTION_GATE_MATRIX.md`

---

## Remaining Risks

No backups; no OTP vendor; legal mismatch if registration were enabled; MFA lost-device policy unset; worker unhosted; exclusion constraint must be verified on the **target** database; SMTP duplicate-mail residual; token-in-URL residual.

---

## Test Results

| Command | Result |
|---|---|
| `npm test` | **265/265 pass** (0 fail) |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` | 4 moderate, **dev-only** esbuild via drizzle-kit — not force-upgraded |
| `APPOINTMENT_PG_URL` | **NOT CONFIGURED** |
| `npm run db:verify-production` | **NOT CONFIGURED** |
| `npm run production:gates` | **OVERALL BLOCKED** (registration flag PASS; external gates BLOCKED / NOT CONFIGURED) |

Baseline before 2H: 259/259.

---

## Git

See closing operator report for branch, commits, push, and working tree after this milestone’s commits.

---

## Production recommendation

**PRODUCTION BLOCKED.**

Do not enable patient registration. Do not deploy identity/appointment traffic. Do not merge `main`. Do not start Phase 3.

Wait for explicit approval after humans complete provider, legal, backup, monitoring, and worker gates in the **target** environment.

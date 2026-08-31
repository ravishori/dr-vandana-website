# O-B-05E-S2 Non-Public Synthetic Patient Provisioning Report

**Document type:** Staging-only non-public synthetic PATIENT provisioning  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05E-S2 FINAL STATUS = PASS WITH CONDITIONS
PROVISIONING MECHANISM = IMPLEMENTED (CLI)
SYNTHETIC PATIENT = READY
PATIENT ROLE = PATIENT
EMAIL IDENTITY = READY (Gmail plus-address to designated mailbox)
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED (false)
DATABASE TARGET = STAGING
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
GITHUB PUSH = NONE
```

**Secret values, passwords, and password hashes are never recorded in this document.**

---

## 1. Executive Summary

O-B-05E-S2 resolved the remaining synthetic-patient blocker with a **CLI-only, staging-guarded** provisioner that does **not** enable public registration.

| Item | Result |
| --- | --- |
| Provisioning mechanism | **IMPLEMENTED** — `npm run db:provision-synthetic-patient` |
| Synthetic patient | **READY** — `PAT-TKBMVXZK` / `O-B-05E Synthetic Patient` |
| Role | **PATIENT** only |
| Staging DB target | **PASS** (`pg-dr-vandana-staging` / `dr_vandana_db_staging`) |
| Public registration | **Remains false** (Preview verified) |
| Email identity | **READY** via plus-address (bare designated mailbox already SUPER_ADMIN) |
| Appointments / outbox / worker / SMTP AUTH / email send | **NOT CREATED / NOT RUN / NOT SENT** |
| Production | **UNTOUCHED** |

**Final status: PASS WITH CONDITIONS** (plus-address email binding; operator must retain staging password out-of-band as `[GENERATED — VALUE REDACTED]`).

---

## 2. Authorization / Scope

Staging-only non-public synthetic PATIENT provisioning for later O-B-05E-R. No appointment E2E, no worker, no SMTP AUTH, no Production mutation, no registration enablement, no commit/push.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Unexpected tracked app changes at start | Pre-existing governance/doc/env edits + untracked JPEG preserved |
| This task commits | **NONE** |

---

## 4. Previous O-B-05E-S Finding

| Prior finding | This task |
| --- | --- |
| SYNTHETIC PSYCHOLOGIST READY | **Preserved** (not modified) |
| SYNTHETIC MAILBOX DESIGNATED (`ravishori@gmail.com`) | **Preserved** |
| SYNTHETIC PATIENT BLOCKED | **READY** via new non-public path |

---

## 5. Existing Registration Path

Traced:

`patient/register` → `registerPatient` (requires `registrationEnabled`) → `users` (`PENDING_VERIFICATION`) → `patient_profiles` → `user_roles` (PATIENT) → `email_verifications` → `email.send` → security/audit events.

Minimum entities for a bookable PATIENT (from `authorizeBookablePatient` / `loadBookablePatient`):

- `users` row: `ACTIVE`, `emailVerifiedAt`, `mobileVerifiedAt`, password hash, unique email/mobile
- `patient_profiles` row (display name; clinical fields nullable)
- `user_roles` → `PATIENT` only

**Public registration was not used and remains disabled.**

---

## 6. Existing `db:provision` Analysis

| Question | Finding |
| --- | --- |
| Identities | PSYCHOLOGIST / SUPER_ADMIN / STAFF only (`provisionPrivilegedUser`) |
| PATIENT support | **None** |
| Staging support | Refuses `NODE_ENV=production`; uses `IDENTITY_PROVISION_ENABLED` |
| Safe to extend in-place | Possible, but would widen a privileged-role tool |
| Decision | **Do not modify `db:provision`**. Add a dedicated synthetic-patient CLI with stricter fixed-identity + staging-host guards. |

---

## 7. Existing Seed/Fixture Analysis

| Mechanism | Staging-safe operator path? | Used |
| --- | --- | --- |
| PGlite `createIdentityTestWorld` / `activateTestPatient` | Test-only | Unit tests only |
| Direct SQL inserts | Not an approved product path | Not used as the mechanism |
| Existing `db:provision` | Privileged roles only | Not used for PATIENT |
| New CLI + library | Yes | **USED** |

No duplicate architecture beyond one dedicated staging CLI mirroring `provision-identity-user.ts` patterns.

---

## 8. Provisioning Design

| Aspect | Choice |
| --- | --- |
| Form | Operator CLI: `npm run db:provision-synthetic-patient` |
| Library | `provisionSyntheticStagingPatient` |
| Identity control | Fixed constants only (no arbitrary email/role/DB from caller input beyond password env + DATABASE_URL) |
| Email send | Memory email service in CLI; library never calls `sendMail` |
| Public route | **None** |

---

## 9. Environment Guard

Fails closed unless:

1. `NODE_ENV !== production`
2. `SYNTHETIC_PATIENT_PROVISION_ENABLED=true`
3. `PATIENT_REGISTRATION_ENABLED` is not `true`
4. `assertStagingMigrateTarget(DATABASE_URL)` passes

Negative CLI checks (exit 1): missing opt-in, registration true, `NODE_ENV=production`.

**ENVIRONMENT GUARD: PASS**

---

## 10. Database Target Guard

Uses existing `assertStagingMigrateTarget` requiring host `pg-dr-vandana-staging` and database `dr_vandana_db_staging`.

Pre-write verification this run:

- `TARGET_HOST=pg-dr-vandana-staging.postgres.database.azure.com`
- `TARGET_DB=dr_vandana_db_staging`

`DATABASE_URL` value **not printed**.

**DATABASE TARGET: STAGING**

---

## 11. Synthetic Patient

| Field | Value |
| --- | --- |
| Display name | `O-B-05E Synthetic Patient` |
| Public id | `PAT-TKBMVXZK` |
| Status | `ACTIVE` |
| Email verified | true (staging synthetic verified state) |
| Mobile verified | true |
| Clinical profile fields | null / WhatsApp disabled |
| Password | **[GENERATED — VALUE REDACTED]** (env only; never printed/committed) |

**SYNTHETIC PATIENT: READY**

---

## 12. Patient Role

Verified join: roles = `PATIENT` only (single role).

**PATIENT ROLE: PATIENT**

---

## 13. Patient Profile

Minimum fields only: `displayName`. `dateOfBirth`, `gender`, `emergencyContact` null. WhatsApp notifications disabled. No clinical tables touched.

**PATIENT PROFILE: READY**

---

## 14. Email Identity

| Finding | Detail |
| --- | --- |
| Designated mailbox | `ravishori@gmail.com` |
| Conflict | Already bound to staging **SUPER_ADMIN** (`ADM-78X3PCW9`) — cannot reuse as PATIENT |
| Resolution | Fixed plus-address `ravishori+ob05e-synthetic-patient@gmail.com` |
| App support | `normalizeEmail` does **not** collapse plus-tags → uniqueness preserved |
| Mailbox support | Gmail delivers plus-aliases to the parent inbox (confirmed workflow assumption) |
| Bare mailbox as patient | **Rejected** (would collide / mis-attribute SUPER_ADMIN) |

**EMAIL IDENTITY: READY** (plus-address condition documented)

---

## 15. Credential Safety

- Password via `SYNTHETIC_PATIENT_PASSWORD` env only (not CLI argv)
- Never printed by script beyond generic success metadata
- Not placed in Git/report
- Report uses `[GENERATED — VALUE REDACTED]`

**SECRET VALUE: NOT EXPOSED**

---

## 16. Verification State

Staging-only ACTIVE with both email and mobile verification timestamps set so booking authorization can succeed later. Does **not** change Production verification rules or create a general auth bypass. No verification email sent.

---

## 17. Idempotency

Second CLI run: `Reused synthetic PATIENT publicId=PAT-TKBMVXZK`. Post-count labeled profiles = **1**.

**IDEMPOTENCY: PASS**

---

## 18. Audit/Security Events

Audit action `SYNTHETIC_PATIENT_PROVISIONED` with metadata: role PATIENT, synthetic true, purpose O-B-05E-S2, staging host/db labels. Actor `null` (CLI operator path — not attributed to psychologist). Sensitive bodies not dumped.

---

## 19. Registration Safety

| Check | Result |
| --- | --- |
| Preview `PATIENT_REGISTRATION_ENABLED` | `"false"` (pulled Config; file deleted) |
| Provision refuses when flag true | Verified |
| Flag not modified | Confirmed |

**REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED**

---

## 20. SMTP Boundary

SMTP config untouched. No `transporter.verify()`, no `sendMail()`.

**SMTP: UNCHANGED / SMTP AUTH: NOT RUN / EMAIL: NOT SENT**

---

## 21. Worker Boundary

Worker not executed. No notification processor run.

**WORKER: NOT EXECUTED**

---

## 22. WhatsApp Safety

Preview `TWILIO_WHATSAPP_ENABLED="false"`. Twilio not configured in this task.

**WHATSAPP: DISABLED**

---

## 23. Option C Safety

No clinical notes, assessments, safety records, or clinical messaging introduced.

**OPTION C: BLOCKED**

---

## 24. Production Isolation

No Production DB, Key Vault, Vercel Production project (`drvandana-psychology`), or Production secrets accessed for mutation. Staging KV used only to obtain staging `DATABASE_URL` for guarded writes.

**PRODUCTION: UNTOUCHED**

---

## 25. Security Review

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S2-1 | HIGH (mitigated) | Bare designated mailbox already SUPER_ADMIN | Plus-address used; bare address refused |
| S2-2 | MEDIUM (accepted) | Staging verification timestamps set without email/OTP flow | Documented staging-only synthetic verified state |
| S2-3 | LOW | Local `.vercel` still links Production project name | Staging ops use `--project dr-vandana-website` |
| S2-4 | INFORMATIONAL | First `npm run build` failed under polluted `NODE_ENV=production` from negative tests | Re-ran clean → PASS; not an app defect |

No CRITICAL findings. No public backdoor. No registration bypass. No Production target path.

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 26. Automated Tests

| Suite | Result |
| --- | --- |
| `provision-synthetic-patient.test.ts` | **8/8 PASS** |
| Full `npm test` | **365 pass / 1 fail** |
| Known baseline failure | `upstash-credentials.test.ts` when `APPOINTMENT_RATE_LIMIT_STORE=upstash` — **not** an O-B-05E-S2 regression (prior baseline 357/1; net +8 synthetic tests) |

**TESTS: 365 PASS / 1 KNOWN UPSTASH FAIL (NON-REGRESSION)**

---

## 27. Typecheck

`npm run typecheck` → **PASS**

---

## 28. Lint

`npm run lint` → **PASS** (0 errors; 2 pre-existing warnings unrelated)

---

## 29. Build

`npm run build` with clean env → **PASS**  
(First attempt under leftover `NODE_ENV=production` failed prerender; cleaned and re-ran successfully.)

---

## 30. Findings

1. Safe non-public PATIENT provision path now exists and was executed on staging.  
2. Designated mailbox cannot be the patient `users.email` because it is SUPER_ADMIN — plus-address resolves delivery + uniqueness.  
3. Registration remains disabled.  
4. No schema migration required.

---

## 31. Remaining Blockers

| Item | Status |
| --- | --- |
| O-B-05E-P-R re-verify (AUTH/runtime prerequisites) | **Still recommended before O-B-05E-R** |
| O15 worker hosting | **NOT ADDRESSED** |
| Preview AUTH/SMTP runtime parity | Outside this task (unchanged) |

Synthetic patient blocker for O-B-05E-S: **cleared**.

---

## 32. Independent Review

Verified checklist:

1. Staging only — **PASS**  
2. Production untouched — **PASS**  
3. Registration disabled — **PASS**  
4. No public provisioning endpoint — **PASS**  
5. No hidden backdoor — **PASS**  
6. Clearly synthetic identity — **PASS**  
7. PATIENT role only — **PASS**  
8. No clinical data — **PASS**  
9. No real patient data — **PASS**  
10–11. Credentials/hashes not exposed — **PASS**  
12. Idempotent — **PASS**  
13. Staging DB target — **PASS**  
14. No schema migration — **PASS**  
15–18. No appointment/notification/outbox/worker — **PASS**  
19–20. No SMTP AUTH / no email — **PASS**  
21. WhatsApp disabled — **PASS**  
22. Option C blocked — **PASS**  
23. Tests accurately reported — **PASS**  
24. Intended app changes only — **PASS**  
25. Can support later O-B-05E-R booking identity — **PASS** (plus-address delivery condition)

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 33. Readiness Decision

**PASS WITH CONDITIONS**

Conditions:

1. Patient email is plus-addressed to the designated mailbox (not the bare SUPER_ADMIN address).  
2. Operator retains staging password out-of-band (`[GENERATED — VALUE REDACTED]`).  
3. Proceed to O-B-05E-P-R before O-B-05E-R.

---

## 34. Recommendation for O-B-05E-P-R

**NEXT CONTROLLED TASK:**  
`O-B-05E-P-R — Staging Runtime Prerequisite Reverification`

Then, only if P-R passes:  
`O-B-05E-R — Staging Worker & Appointment Outbox E2E Verification`

**DO NOT START AUTOMATICALLY.**

---

## 35. Files Created

- `src/lib/identity/provision-synthetic-patient.ts`
- `src/lib/identity/provision-synthetic-patient.test.ts`
- `scripts/provision-synthetic-patient.ts`
- `docs/O_B_05E_S2_NON_PUBLIC_SYNTHETIC_PATIENT_PROVISIONING_REPORT.md`

---

## 36. Files Modified

- `package.json` — script `db:provision-synthetic-patient`
- `.env.example` — `SYNTHETIC_PATIENT_PROVISION_ENABLED=false` + password placeholder comment

---

## 37. Database Changes

Staging only:

- Inserted synthetic `users` + `patient_profiles` + `user_roles` (PATIENT) for `O-B-05E Synthetic Patient` (`PAT-TKBMVXZK`)
- Audit log `SYNTHETIC_PATIENT_PROVISIONED`
- No schema migration
- Appointments total count observed `0`; recent outbox (5 min) `0`

---

## 38. Production Changes

**NONE**

---

## 39. Git Status

HEAD remains `7974175`. Intended uncommitted changes listed above. Prior untracked governance docs / JPEG preserved. No commit performed.

---

## 40. Git Commit

**NONE**

---

## 41. GitHub Push

**NONE**

---

## 42. Final Status

```text
O-B-05E-S2 COMPLETE
PROVISIONING MECHANISM: IMPLEMENTED
SYNTHETIC PATIENT: READY
PATIENT ROLE: PATIENT
PATIENT PROFILE: READY
EMAIL IDENTITY: READY
DATABASE TARGET: STAGING
ENVIRONMENT GUARD: PASS
IDEMPOTENCY: PASS
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
SMTP: UNCHANGED
SMTP AUTH: NOT RUN
EMAIL: NOT SENT
APPOINTMENT: NOT CREATED
NOTIFICATION: NOT CREATED
OUTBOX: NOT CREATED / NOT PROCESSED
WORKER: NOT EXECUTED
WORKER HOST: NOT ADDRESSED — O15 SEPARATE
WHATSAPP: DISABLED
OPTION C: BLOCKED
PATIENT DATA: SYNTHETIC ONLY
PRODUCTION: UNTOUCHED
SECRET VALUE: NOT EXPOSED
SECRET LEAKAGE: NONE DETECTED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
TESTS: 365 PASS / 1 KNOWN UPSTASH FAIL (NON-REGRESSION)
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
APPLICATION CHANGES: provision-synthetic-patient lib/test/CLI; package.json script; .env.example flags
DATABASE CHANGES: staging synthetic PATIENT user/profile/role + audit only
PRODUCTION CHANGES: NONE
REPORT: docs/O_B_05E_S2_NON_PUBLIC_SYNTHETIC_PATIENT_PROVISIONING_REPORT.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
NEXT CONTROLLED TASK: O-B-05E-P-R — Staging Runtime Prerequisite Reverification
THEN: O-B-05E-R — Staging Worker & Appointment Outbox E2E Verification
DO NOT START THE NEXT TASK AUTOMATICALLY.
STOP.
```

---

## O15 Relationship

**O15 WORKER HOSTING: NOT ADDRESSED**

# O-B-05E-S Synthetic Staging Identity & Mailbox Readiness Report

**Document type:** Staging-only synthetic identity + mailbox readiness  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05E-S FINAL STATUS = BLOCKED
SYNTHETIC PSYCHOLOGIST = READY
SYNTHETIC PATIENT = BLOCKED — SAFE NON-PUBLIC STAGING PATH REQUIRED
SYNTHETIC MAILBOX = DESIGNATED (ravishori@gmail.com)
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED (false)
APPOINTMENT / NOTIFICATION / OUTBOX / WORKER / EMAIL = NOT CREATED / NOT RUN
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
```

**Secret values and password hashes are never recorded in this document.**

---

## 1. Executive Summary

O-B-05E-S prepared what can safely be prepared for O-B-05E-R without enabling public registration, sending mail, or running the worker.

| Item | Result |
| --- | --- |
| Staging DB target | **PASS** (`pg-dr-vandana-staging` / `dr_vandana_db_staging`) |
| Synthetic psychologist | **READY** — provisioned via existing `npm run db:provision` |
| Synthetic patient | **BLOCKED** — only `registerPatient` creates PATIENT + profile; requires `registrationEnabled`; public registration must stay `false` |
| Synthetic mailbox | **DESIGNATED** — `ravishori@gmail.com` (staging test recipient only; no mail sent) |
| Application code changes | **NONE** |
| Schema changes | **NONE** |

**Final status: BLOCKED** (patient path still missing for E2E). Psychologist + mailbox progress is real but insufficient alone for O-B-05E-R.

---

## 2. Authorization / Scope

Staging-only identity/mailbox readiness. No E2E, no SMTP AUTH, no worker, no Production, no registration enablement, no commit/push.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Unexpected tracked app changes | **NONE** |

---

## 4. Previous O-B-05E-P Blockers

| Prior blocker | This task |
| --- | --- |
| Synthetic psychologist NOT READY | **READY** |
| Synthetic patient BLOCKED | **Still BLOCKED** (architecture limitation confirmed) |
| Synthetic mailbox REQUIRED | **DESIGNATED** |

AUTH_SESSION_SECRET KV presence (from O-B-05E-P-R) was used only to boot the existing provision CLI — value **not exposed**.

---

## 5. Identity Architecture Findings

| Actor | Creation path |
| --- | --- |
| PSYCHOLOGIST / SUPER_ADMIN / STAFF | `provisionPrivilegedUser` + `scripts/provision-identity-user.ts` (`npm run db:provision`) when `IDENTITY_PROVISION_ENABLED=true` and `NODE_ENV≠production` |
| PATIENT | `registerPatient` only — gated by `ctx.config.registrationEnabled` ← `PATIENT_REGISTRATION_ENABLED=true` |
| Test fixtures | PGlite worlds call `registerPatient` / direct inserts — **not** approved staging production-path tooling |

No clinical tables involved.

---

## 6. Existing Provisioning Mechanisms

| Mechanism | Staging-safe? | Used |
| --- | --- | --- |
| `npm run db:provision` | **YES** (refuses production NODE_ENV) | **YES** for psychologist |
| `registerPatient` | Requires registration enabled | **NOT USED** (forbidden) |
| Improvised SQL inserts | Not authorized as first choice | **NOT USED** |
| New patient provision API | Would be new mechanism | **NOT CREATED** |

---

## 7. Synthetic Psychologist

| Field | Value |
| --- | --- |
| Display name | `O-B-05E Synthetic Psychologist` |
| Role | `PSYCHOLOGIST` |
| Email | `ob05e-synthetic-psychologist@example.test` (synthetic; not operator mailbox) |
| Status | `ACTIVE` (verified by join count) |
| Public id (non-secret) | `PSY-29QFCPKD` |
| Password | **[GENERATED — VALUE REDACTED]** — never printed/committed |
| Duplicate check | Pre-count **0**; post-count **1** |
| **SYNTHETIC PSYCHOLOGIST** | **READY** |

---

## 8. Synthetic Patient

| Finding | Detail |
| --- | --- |
| Preferred display name | `O-B-05E Synthetic Patient` |
| Existing labeled count | **0** |
| Safe non-public create path | **NONE** in repository |
| Public registration | Must remain `false` |
| **SYNTHETIC PATIENT PROVISIONING** | **BLOCKED — SAFE NON-PUBLIC STAGING PATH REQUIRED** |

Delivery note for future E2E: notification recipients come from `users.email`. Using the designated mailbox as the patient account email would require a clearly labeled synthetic patient row — only after a separately authorized non-public staging seed/provision path exists. Operator mailbox was **not** written into any patient row in this task.

---

## 9. Identity Relationship Requirements

Appointment booking requires an authenticated **PATIENT** principal (role + verified email/mobile) and practice configuration. No clinical relationship model was created or altered. No appointment was created.

---

## 10. Synthetic Mailbox

| Field | Value |
| --- | --- |
| Designation | Staging synthetic test recipient only |
| Address | `ravishori@gmail.com` |
| Not | patient clinical correspondence / Production recipient |
| Mail sent | **NO** |
| Mailbox credentials stored | **NO** |
| **SYNTHETIC MAILBOX** | **DESIGNATED** |

---

## 11. Credential Safety

| Item | Handling |
| --- | --- |
| Provision password | Generated into process env → cleared after run |
| AUTH / DATABASE_URL from KV | Loaded into process env → cleared; never printed |
| Report / Git | No secrets |

---

## 12. Database Target

| Check | Result |
| --- | --- |
| Host fingerprint | `pg-dr-vandana-staging.postgres.database.azure.com` |
| Database | `dr_vandana_db_staging` |
| **STAGING DATABASE** | **PASS** |
| `DATABASE_URL` | **[PRESENT — VALUE REDACTED]** |

---

## 13. Registration Safety

| Check | Result |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` during provision | `false` |
| Preview flag (prior re-verify) | `false` |
| Public registration used | **NO** |
| **REGISTRATION** | **IMPLEMENTED BUT SAFELY DISABLED** |

---

## 14. SMTP Boundary

**SMTP: UNCHANGED**  
**SMTP AUTH: NOT RUN**  
**EMAIL: NOT SENT**

---

## 15. Worker Boundary

**WORKER: NOT EXECUTED**  
**WORKER HOST: NOT ADDRESSED — O15 SEPARATE**  
**APPOINTMENT: NOT CREATED**  
**NOTIFICATION: NOT CREATED**  
**OUTBOX: NOT PROCESSED**

---

## 16. WhatsApp Safety

Not modified. Expected Preview `TWILIO_WHATSAPP_ENABLED=false` preserved by process (not re-enabled).

**WHATSAPP: DISABLED**

---

## 17. Option C Safety

No clinical functionality.

**OPTION C: BLOCKED**

---

## 18. Production Isolation

Provision CLI refused production `NODE_ENV`. Staging DB only. Production untouched.

**PRODUCTION: UNTOUCHED**

---

## 19. Duplicate / Idempotency Assessment

Pre-check for exact display name avoided duplicate psychologist. Re-running the same provision with same email would fail closed (“could not be provisioned”) — acceptable.

---

## 20. Audit / Observability

`USER_PROVISIONED` audit expected from `provisionPrivilegedUser` with role metadata only (no password). No clinical records.

---

## 21. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| S1 | PASS | Psychologist created via approved staging provision path |
| S2 | HIGH (ops) | Patient still blocked without registration or new authorized seed |
| S3 | INFORMATIONAL | Mailbox designated; not bound to a patient row yet |
| S4 | PASS | No secret leakage in outputs; registration left false |
| S5 | MEDIUM | Existing users table may contain other non-labeled accounts (count previously 2) — not used as O-B-05E synthetics |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 22. Tests

No application source changes. Full suite **NOT RE-RUN**. Data-only staging provision.

**TESTS: NOT RUN** (no code changes)

---

## 23–25. Typecheck / Lint / Build

**NOT RUN** — no application code changes.

---

## 26. Findings

1. Synthetic psychologist **READY**.  
2. Synthetic patient still **BLOCKED** by registration gate vs missing non-public provision path.  
3. Mailbox **DESIGNATED**.  
4. O-B-05E-R must not start until patient path is authorized/implemented separately.

---

## 27. Remaining Blockers

1. **Authorized staging-only PATIENT seed/provision** (without enabling public registration) — separate controlled implementation task.  
2. Bind synthetic patient email to designated mailbox **only** when that path exists and labels are clear.  
3. Preview AUTH parity / practice config seed may still be needed for E2E-R (out of this task’s identity scope).  
4. O15 worker hosting remains separate.

---

## 28. Operator Actions

| # | Action | Status |
| --- | --- | --- |
| 1 | Designate synthetic mailbox | **DONE** (`ravishori@gmail.com`) |
| 2 | Create labeled synthetic psychologist | **DONE** |
| 3 | Authorize non-public synthetic patient provision path | **REQUIRED** (next implementation task) |
| 4 | Do not enable `PATIENT_REGISTRATION_ENABLED` | **CONFIRMED** |

---

## 29. Independent Review

| Check | Result |
| --- | --- |
| Staging only / Production untouched | **YES** |
| No real patient data | **YES** |
| Psychologist clearly synthetic / min role | **YES** |
| Patient not created as real person | **YES** (not created) |
| Registration disabled | **YES** |
| No clinical / appointment / email / worker | **YES** |
| Secrets not exposed | **YES** |
| O-B-05E-R ready? | **NO** (patient blocked) |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 30. Readiness Decision

**BLOCKED** for full identity readiness (patient missing). Psychologist + mailbox are ready.

---

## 31. Recommendation for O-B-05E-P-R

After a separately authorized **synthetic patient non-public staging provision** capability exists and is executed:

1. Re-run **O-B-05E-P-R** (or O-B-05E-S verify) to confirm PATIENT **READY**.  
2. Only then start **O-B-05E-R**.

Suggested next controlled task name:  
**O-B-05E-S2 — Staging Non-Public Synthetic Patient Provision Capability** (implementation; explicit authorization required).

Do **not** start O-B-05E-R automatically.

---

## 32. Files Created

- `docs/O_B_05E_S_SYNTHETIC_STAGING_IDENTITY_MAILBOX_READINESS_REPORT.md`

## 33. Files Modified

**NONE** (application)

## 34. Database Changes

Staging data only:

- Inserted **1** synthetic psychologist user + profile + role via existing provision CLI  
- **No** schema/migration changes  
- **No** patient row created

## 35. Production Changes

**NONE**

## 36. Git Status

- HEAD `7974175`
- Report untracked
- No secrets staged

## 37. Git Commit

**NONE**

## 38. GitHub Push

**NONE**

## 39. Final Status

**BLOCKED**

---

## Machine-readable footer

```text
O-B-05E-S COMPLETE
SYNTHETIC PSYCHOLOGIST: READY
SYNTHETIC PATIENT: BLOCKED
SYNTHETIC MAILBOX: DESIGNATED
MAILBOX: ravishori@gmail.com
STAGING DATABASE: PASS
DATABASE CHANGES: 1 synthetic psychologist via existing provision CLI (no schema change)
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
SMTP: UNCHANGED
SMTP AUTH: NOT RUN
EMAIL: NOT SENT
APPOINTMENT: NOT CREATED
NOTIFICATION: NOT CREATED
OUTBOX: NOT PROCESSED
WORKER: NOT EXECUTED
WORKER HOST: NOT ADDRESSED — O15 SEPARATE
OPTION C: BLOCKED
PATIENT DATA: NOT USED
PRODUCTION: UNTOUCHED
SECRET VALUE: NOT EXPOSED
SECRET LEAKAGE: NONE DETECTED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
TESTS: NOT RUN
TYPECHECK: NOT RUN
LINT: NOT RUN
BUILD: NOT RUN
APPLICATION CHANGES: NONE
REPORT: docs/O_B_05E_S_SYNTHETIC_STAGING_IDENTITY_MAILBOX_READINESS_REPORT.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
NEXT CONTROLLED TASK: O-B-05E-S2 (non-public synthetic patient provision) then O-B-05E-P-R re-verify; then O-B-05E-R — do not start automatically
DO NOT START THE NEXT TASK AUTOMATICALLY.
STOP.
```

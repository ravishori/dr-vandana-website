# O-B-05 Staging Secrets, Vercel Environment Wiring & Synthetic Application Smoke Report

**Document type:** Controlled staging-only implementation / verification report  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05 RESULT = PARTIAL / BLOCKED (runtime smoke)
SECRET MANAGER PRODUCT DECISION REQUIRED
STAGING SMTP CREDENTIALS REQUIRED (dedicated staging mailbox not verified)
STAGING TWILIO CREDENTIALS REQUIRED
Vercel staging project: NOT CONFIGURED / NOT VERIFIED
REGISTRATION GATE VERIFIED — DISABLED
Production: UNTOUCHED
Option C: BLOCKED
```

---

## 1. Executive Summary

O-B-05 inspected the repository, inventoried staging configuration (names only), re-verified Azure staging PostgreSQL schema, confirmed registration remains disabled, and ran application quality gates.

**Could not complete** full Vercel wiring, secret-manager population, SMTP delivery proof, Twilio OTP smoke, or live authentication/appointment synthetic smoke because required staging credentials / Vercel project access / secret-manager product decision are missing. No credentials were invented. No Production resources were touched. No worker vendor was selected. WhatsApp left disabled.

**Application code was not modified.** Documentation added: this report + staging configuration inventory.

---

## 2. Authorization

CONTROLLED STAGING-ONLY. Production access/mutation forbidden. Registration enablement forbidden. Option C forbidden. Automatic commit/push forbidden.

---

## 3. Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| Prior O-B-04 | Staging PG SCHEMA PASS; FW rule `ob04-operator-202608301911` present |
| F4 package | Not modified |

---

## 4. Repository Inspection

| Area | Finding |
| --- | --- |
| `.env.example` | Canonical variable list; `PATIENT_REGISTRATION_ENABLED=false`; forbids `NEXT_PUBLIC_` secrets |
| `.gitignore` | `.env*` ignored |
| Local `.env` | Gitignored; points at staging host/db markers only (no prod host) |
| `vercel.json` | **Not present** |
| Vercel CLI | **Not available** in this environment |
| `next.config.ts` | Security headers; no env embedding of secrets |
| Package scripts | `test`, `typecheck`, `lint`, `build`, `db:verify-production`, `production:gates` |
| Secret manager in Azure | Key Vault count **0** — no established SM product in subscription evidence |
| Governance | O-B-03A-H: unified secret manager product **DECISION REQUIRED** |

---

## 5. Environment Inventory

See `docs/O_B_05_STAGING_CONFIGURATION_INVENTORY.md`.

Summary of local presence (values never recorded):

| Critical staging item | Local presence | Staging host (Vercel) |
| --- | --- | --- |
| `DATABASE_URL` → staging | YES | **NOT CONFIGURED** |
| `AUTH_SESSION_SECRET` | NO | **NOT CONFIGURED** |
| `MFA_ENCRYPTION_KEY` | NO | **NOT CONFIGURED** |
| SMTP password + user/host aliases | Partial | Dedicated staging **NOT VERIFIED** |
| Twilio SMS OTP vars | NO | **NOT CONFIGURED** |
| `PATIENT_REGISTRATION_ENABLED` | Absent (= disabled) | Must set `false` explicitly on host |
| Upstash REST pair | YES | **NOT VERIFIED** on Vercel |
| `APPOINTMENT_RATE_LIMIT_STORE=upstash` | YES | Causes one unit-test assertion flake when defaulting from env |

---

## 6. Secret Inventory — names only

| Logical name | App variable | Status |
| --- | --- | --- |
| `staging/app/database-url` | `DATABASE_URL` | Value exists locally (gitignored); **not** in SM / Vercel |
| `staging/app/auth-session-secret` | `AUTH_SESSION_SECRET` | `<STAGING_SECRET_REQUIRED>` |
| `staging/app/mfa-encryption-key` | `MFA_ENCRYPTION_KEY` | `<STAGING_SECRET_REQUIRED>` |
| `staging/app/smtp-password` | `SMTP_PASSWORD` | Local present — staging-dedicated **NOT VERIFIED** |
| `staging/app/twilio-auth-token` | `TWILIO_AUTH_TOKEN` | `<STAGING_SECRET_REQUIRED>` |
| `staging/app/patient-registration-enabled` | `PATIENT_REGISTRATION_ENABLED` | Must be `false` |

```text
SECRET MANAGER PRODUCT DECISION REQUIRED
```

No secret values created, printed, or committed.

---

## 7. Vercel Findings

| Item | Status |
| --- | --- |
| Approved app host | Vercel (prior decision) |
| Staging project | **NOT CONFIGURED** / **NOT VERIFIED** |
| Preview vs staging branch strategy | **DECISION REQUIRED** |
| Env var injection | **NOT CONFIGURED** |
| Staging hostname / HTTPS | **DECISION REQUIRED** |
| Production Vercel mutation | **NO** |

**Required configuration (document only):** separate Vercel project or explicit Staging environment; map `staging/app/*` → server env; set `PATIENT_REGISTRATION_ENABLED=false`; staging-only `DATABASE_URL`; unique session/MFA secrets; no Production URLs/credentials; WhatsApp disabled.

---

## 8. Azure Staging DB Findings

| Item | Status |
| --- | --- |
| Target | `pg-dr-vandana-staging` / `dr_vandana_db_staging` |
| Connectivity | **PASS** (this task re-check) |
| `db:verify-production` | **PASS** — `SCHEMA PASS` |
| TLS | **VERIFIED** via successful Azure require_secure_transport + connect |
| Prod host in URL | **NO** |
| Firewall rules present | Historical client IPs + `ob04-operator-202608301911` — **CONFIGURED**; permanence **DECISION REQUIRED** (do not assume permanent) |
| Migrations re-run | **NOT RUN** (schema already PASS) |
| Patient profiles | Count **0** |
| Production DB | **NOT ACCESSED** |

---

## 9. SMTP Findings

| Item | Status |
| --- | --- |
| Nodemailer architecture | **IMPLEMENTED** in repo |
| Dedicated staging mailbox proof | **NOT VERIFIED** |
| Controlled test send | **NOT RUN** |
| Production SMTP modified | **NO** |

```text
STAGING SMTP CREDENTIALS REQUIRED
```

(Local SMTP fragments exist but cannot be attested as staging-only / safe test mailbox without operator confirmation — values not inspected beyond presence flags.)

---

## 10. OTP Findings

| Item | Status |
| --- | --- |
| Twilio SMS adapter | **IMPLEMENTED** in repo |
| Staging Twilio credentials | **NOT CONFIGURED** |
| Synthetic OTP test | **NOT RUN** |
| WhatsApp | Disabled (default / absent flag) — left disabled |
| Production Twilio modified | **NO** |

```text
STAGING TWILIO CREDENTIALS REQUIRED
```

---

## 11. Authentication Smoke

| Flow | Status |
| --- | --- |
| Login / logout / session / MFA live | **NOT RUN** — blocked: missing `AUTH_SESSION_SECRET` / MFA key / Vercel runtime |
| Invalid credentials | **NOT RUN** (live) |
| Role boundary live | **NOT RUN** |
| Unit/integration auth coverage | Exercised via `npm test` suite (see §17) |

---

## 12. Appointment Smoke

| Flow | Status |
| --- | --- |
| Live staging appointment CRUD | **NOT RUN** — blocked on auth/session secrets + app host |
| Isolation / IDOR live | **NOT RUN** |
| Repository appointment tests | Included in unit suite |

---

## 13. Notification Smoke

| Flow | Status |
| --- | --- |
| Live staging email send | **NOT RUN** |
| Outbox live | **NOT RUN** |
| WhatsApp | **NOT RUN** / disabled |
| Repository notification tests | Included in unit suite |

Semantics retained: SENT ≠ DELIVERED ≠ READ ≠ ACTED.

---

## 14. Registration Safety

| Check | Result |
| --- | --- |
| Flag forced `false` | `REG_ENABLED=false` |
| Runtime allowed | `REG_RUNTIME_ALLOWED=false` |
| `production:gates` | `PASS PATIENT_REGISTRATION_ENABLED` / `PASS registration_runtime_allowed` |
| Flag flipped to true | **NOT PERFORMED** |
| Patient profiles created | **NO** (count 0) |

```text
REGISTRATION GATE VERIFIED — DISABLED
```

---

## 15. Synthetic Data

| Item | Status |
| --- | --- |
| New synthetic accounts created this task | **NONE** |
| Real patient data used | **NO** |
| Residual DB users | 2 users / 0 patients / 1 psychologist profile / 1 SUPER_ADMIN role (pre-existing; human attestation still required that these are non-patient/test) |
| Cleanup destructive SQL | **NOT PERFORMED** (uncertain / not required) |

---

## 16. Security Review

| Check | Result |
| --- | --- |
| Secrets committed | **NO** |
| Secrets in this report | **NO** |
| Client-side secret env | Forbidden by architecture; no PMS secrets as `NEXT_PUBLIC_*` |
| Staging DB ≠ Prod host | **VERIFIED** for local `.env` markers |
| Registration disabled | **VERIFIED** |
| Production endpoints in Vercel staging | **NOT APPLICABLE** — Vercel not configured |
| Notification recipient derivation | Unchanged (code not modified) |
| Debug / source maps leaking secrets | No app change; build succeeded |
| Finding: unit test pollution from `APPOINTMENT_RATE_LIMIT_STORE` | **INFORMATIONAL** / environment-related |

No broad security refactors performed.

---

## 17. Test Results

| Suite | Result | Notes |
| --- | --- | --- |
| `npm test` | **FAIL** (1) / 347 pass / 348 tests / 79 suites | Failure: `upstash-credentials.test.ts` — `resolveAppointmentRateLimitStoreMode("production", undefined)` picks up env default `APPOINTMENT_RATE_LIMIT_STORE=upstash` → returns `upstash` instead of expected `misconfigured`. **Environment-related / pre-existing test fragility** when local `.env` sets that var. **Not caused by O-B-05 code changes** (no app source modified). |
| `npm run typecheck` | **PASS** | exit 0 |
| `npm run lint` | **PASS** (0 errors, 2 pre-existing warnings) | unused `redirect`; unused `STRONG_PASSWORD` |
| `npm run build` | **PASS** | exit 0 |
| Staging schema verify | **PASS** | `SCHEMA PASS` |
| `production:gates` | Runs; overall **BLOCKED** (expected) | Registration PASS; many external blockers remain |
| Live auth/appointment/SMTP/OTP smoke | **NOT RUN** | Blocked on secrets/Vercel |

---

## 18. Verification Matrix

| ID | Item | STATUS | EVIDENCE | REASON | FOLLOW-UP |
| --- | --- | --- | --- | --- | --- |
| OB05-001 | Repository baseline | **PASS** | HEAD `7974175` | Match | — |
| OB05-002 | Environment separation | **PASS** / conditions | Separate Azure resources; local URL staging-only | Vercel map missing | O-B-05B |
| OB05-003 | Staging DB connectivity | **PASS** | Connect OK | — | Keep FW reviewed |
| OB05-004 | TLS | **PASS** | Azure + connect | — | — |
| OB05-005 | Schema verification | **PASS** | SCHEMA PASS | — | — |
| OB05-006 | Secrets protection | **PASS** / conditions | No values in Git/docs | SM product undecided | O-B-05A |
| OB05-007 | Vercel configuration | **BLOCKED** | No CLI / no project config | Access + project needed | O-B-05B |
| OB05-008 | SMTP | **BLOCKED** | Dedicated staging not verified | Credentials | O-B-05C |
| OB05-009 | OTP | **BLOCKED** | Twilio absent | Credentials | O-B-05D |
| OB05-010 | Login | **NOT RUN** | — | Missing session secret / host | O-B-05E |
| OB05-011 | Session | **NOT RUN** | — | Same | O-B-05E |
| OB05-012 | MFA | **NOT RUN** | — | Missing MFA key | O-B-05E |
| OB05-013 | Authorization | **NOT RUN** (live) | Unit tests covered in suite | Live blocked | O-B-05E |
| OB05-014 | Patient isolation | **NOT RUN** (live) | — | Live blocked | O-B-05E |
| OB05-015 | Appointment smoke | **NOT RUN** | — | Live blocked | O-B-05E |
| OB05-016 | Notification safety | **NOT RUN** (live) | Repo tests PASS in suite | Live blocked | O-B-05C/E |
| OB05-017 | Registration disabled | **PASS** | Gates + flag checks | Keep false | — |
| OB05-018 | Synthetic data only | **PASS** | No new patients; no real patient use | Attest existing users | Human |
| OB05-019 | Production isolation | **PASS** | No prod access/mutation | — | — |
| OB05-020 | Build | **PASS** | `npm run build` | — | — |
| OB05-021 | Typecheck | **PASS** | `tsc --noEmit` | — | — |
| OB05-022 | Lint | **PASS** | 0 errors | Warnings pre-existing | Optional cleanup later |
| OB05-023 | Security review | **PASS WITH CONDITIONS** | §16 | SM/Vercel open | O-B-05A/B |

---

## 19. Rollback

| Change | Rollback |
| --- | --- |
| Documentation (`O_B_05_*.md`) | Delete docs if rejected |
| Application / DB / Azure / Vercel / secrets | **No mutations performed** this task |
| O-B-04 FW rule | Unchanged this task; delete rule if operator IP no longer needed (staging only) |
| Production | N/A |

---

## 20. Remaining Blockers

1. **SECRET MANAGER PRODUCT DECISION REQUIRED** (+ populate `staging/app/*`)  
2. `AUTH_SESSION_SECRET` / `MFA_ENCRYPTION_KEY` staging values  
3. Vercel staging project + env wiring + hostname  
4. **STAGING SMTP CREDENTIALS REQUIRED** (dedicated mailbox attestation + test send)  
5. **STAGING TWILIO CREDENTIALS REQUIRED** + synthetic OTP  
6. Worker vendor still **DECISION REQUIRED** (out of scope to select here)  
7. Live synthetic auth/appointment smoke  
8. O10/O11 legal gates (unchanged)  
9. Confirm permanence of staging firewall allowlist entries  

---

## 21. Production Safety Confirmation

| Question | Answer |
| --- | --- |
| Production accessed | **NO** |
| Production modified | **NO** |
| Production database queried | **NO** |
| Production secrets accessed | **NO** |
| Production deployment | **NO** |
| Registration enabled | **NO** |
| Real patient data used | **NO** |
| Option C implemented | **NO** |
| Clinical database created | **NO** |
| Clinical AI implemented | **NO** |

---

## 22. Option C Confirmation

```text
Option C: BLOCKED
F4 governance: NOT MODIFIED
Clinical implementation: NONE
```

---

## 23. Git Status

Untracked: O-B-05 inventory + this report (plus prior O-B/F4 docs from earlier tasks).  
Modified (pre-existing from earlier O-B docs work): `.env.example` comments, legal/retention/production checklist/runbook.  
HEAD: `7974175`. JPEG untracked. No secrets staged.

---

## 24. Commit Status

**NONE** (not performed)

---

## 25. GitHub Push Status

**NONE** (not performed)

---

## 26. Independent Review

| Question | Answer |
| --- | --- |
| Production touched? | **NO** |
| Production secret exposed? | **NO** |
| Staging referenced Production DB? | **NO** (local URL check) |
| Registration enabled? | **NO** |
| Real patient data used? | **NO** |
| Clinical functionality? | **NO** |
| F4 weakened? | **NO** |
| Secrets in Git? | **NO** |
| Client env secrets? | **NO** |
| Notification privacy weakened? | **NO** |
| Synthetic accounts cleaned? | N/A — none created |
| Test claims evidence-backed? | **YES** — including 1 env-related unit failure disclosed |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

Conditions: staging runtime smoke incomplete; SM/Vercel/SMTP/Twilio blocked; one unit test fails under local Upstash store env defaulting.

---

## 27. Final Decision

```text
O-B-05 = PARTIAL / BLOCKED
Staging DB foundation = VERIFIED
Secrets wiring = NOT READY
Vercel staging = NOT READY
Synthetic live smoke = NOT RUN
Registration = IMPLEMENTED BUT SAFELY DISABLED
Production = UNTOUCHED
Checkpoint = RECOMMENDED (documentation only; no secrets)
```

Do **not** treat this as Production readiness.

---

## 28. Recommended Next Task

```text
O-B-05A — Staging Secret Manager Configuration
```

Smallest controlled next step: human selects secret-manager product, then create **names only** → inject staging values (no Production, registration stays false). Then O-B-05B (Vercel), O-B-05C (SMTP), O-B-05D (Twilio), O-B-05E (synthetic smoke) in series.

Do **not** start automatically.

---

## 29. STOP

```text
O-B-05 COMPLETE AS PARTIAL/BLOCKED — INVENTORY AND GATES DOCUMENTED.
NO PRODUCTION ACCESS. NO REGISTRATION ENABLEMENT. NO OPTION C.
NO SECRET VALUES COMMITTED. NO VERCEL STAGING PROJECT CONFIGURED.
NO WORKER VENDOR SELECTED. NO GIT COMMIT. NO GITHUB PUSH.
STOP.
```

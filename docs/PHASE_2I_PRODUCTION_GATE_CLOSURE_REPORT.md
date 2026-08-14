# Phase 2I Production Gate Closure Report

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase2-appointments-d73b`  
**Checkpoint:** Phase 2H complete; this milestone prepares remaining production decisions. It is **not** a deployment.

This document is **not** legal advice and does **not** claim DPDP, HIPAA, EHR, or medical compliance.

Authoritative decision pack: `docs/PHASE_2I_PRODUCTION_DECISION_REGISTER.md`.

---

## Executive Summary

Phase 2I re-audited Phase 2H, classified remaining work into CODE / CONFIGURATION / PROVIDER / LEGAL / INFRASTRUCTURE / HUMAN DECISION gates, and produced decision packs so the project owner can approve production activation later.

Production remains **fail-closed**. Patient registration remains disabled. No production credentials, DNS changes, or infrastructure were created. Open business and legal items were **not** converted to PASS.

Operator snapshot `npm run production:gates` now distinguishes **PASS**, **BLOCKED**, **NOT CONFIGURED**, **HUMAN DECISION**, and **LEGAL REVIEW**. Environment variable presence is still not treated as SMTP, OTP, Twilio, backup, or monitoring readiness.

---

## Overall Status

**PRODUCTION BLOCKED**

Not PRODUCTION READY. Not PRODUCTION CONDITIONALLY READY.

`PATIENT_REGISTRATION_ENABLED` remains **false**. There is no alternate activation mechanism.

---

## Phase 2H Revalidation

| 2H item | 2I result |
|---|---|
| Psychologist read IDOR aligned to `NOT_FOUND` | Still in force |
| Outbox rollup cannot overwrite `SENT` with `DEAD` | Still in force |
| Email referrer hygiene | Still in force; tokens still in emailed URLs (accepted residual) |
| `db:migrate` fail-closed without `btree_gist` / exclusion | Still in force |
| Historical `drizzle/0003` not rewritten | Still in force |
| `db:verify-production` | Still `NOT CONFIGURED` in this agent environment |
| Runbooks | Retained; staging + go-live + vendor packs added |
| O1–O19 and legal copy | Remain **OPEN** / **LEGAL REVIEW** |
| Registration flag | Remains false |

No 2H in-code defect was reopened.

---

## Human Decisions

See Priority 1–5 in `docs/PHASE_2I_PRODUCTION_DECISION_REGISTER.md`. None selected in this phase.

Highest-urgency human choices: PostgreSQL vendor/region, OTP vendor, SMTP sender, MFA recovery (O12), worker hosting (O15), RPO/RTO, Super Admin bootstrap (O19), cancellation/hours/duration values.

---

## Provider Decisions

| Provider | Status |
|---|---|
| PostgreSQL | OPEN (O1) |
| OTP / SMS | OPEN (O4); adapter unimplemented; fail-closed |
| SMTP | OPEN; Nodemailer remains |
| Twilio WhatsApp | Direction APPROVED; activation OPEN; flag false |
| Monitoring | OPEN |
| Backup vendor | OPEN (usually follows PostgreSQL) |

---

## Infrastructure Decisions

| Item | Status |
|---|---|
| Production database | NOT CONFIGURED |
| Staging database | NOT CONFIGURED |
| Worker host | OPEN (O15) |
| Connection pooling | OPEN (follows O1) |
| DNS | Not modified |
| Vercel/production deploy | Not performed |

---

## Legal Decisions

| Item | Status |
|---|---|
| Privacy / Terms / Disclaimer | LEGAL REVIEW (`docs/LEGAL_REVIEW_REQUIRED.md`) |
| WhatsApp consent wording | LEGAL REVIEW |
| Retention periods | LEGAL REVIEW (O10) — not invented |
| Residency / processors | LEGAL REVIEW (O18) — not claimed compliant |
| Clinical Option C | DEFERRED / BLOCKED |

Public copy in `src/data/legal.ts` was **not** rewritten as approved.

---

## PostgreSQL

Comparison: `docs/DECISION_POSTGRESQL.md`. Checklist: `docs/POSTGRESQL_PRODUCTION_CHECKLIST.md`.

Technical notes only:

- Neon’s published AWS region list on 14 August 2026 did **not** include India/Mumbai; nearest listed APAC: Singapore and Sydney. **Re-verify.**
- Supabase public region list includes Mumbai `ap-south-1`. Using Supabase **database only** (not Auth) remains the architecture constraint.
- RDS / Cloud SQL / Azure have India-region offerings — confirm PostgreSQL 16+ at purchase.
- Pricing: REQUIRES VERIFICATION.
- Final choice: **HUMAN DECISION**.

This environment: `APPOINTMENT_PG_URL` unset → PostgreSQL integration tests **NOT CONFIGURED** (not fabricated).

---

## OTP

`docs/DECISION_OTP_PROVIDER.md`. Production remains fail-closed. No adapter. No credentials. DLT/sender **HUMAN DECISION**.

---

## SMTP

`docs/DECISION_SMTP_PROVIDER.md`. Nodemailer stays. SPF/DKIM/DMARC not configured from this phase. Idempotency residual documented.

---

## Twilio WhatsApp

`docs/TWILIO_WHATSAPP_PRODUCTION_CHECKLIST.md`. Preferred provider **not switched**. `TWILIO_WHATSAPP_ENABLED=false`. No production sender.

---

## MFA Recovery

`docs/DECISION_MFA_RECOVERY.md`. Options A–D documented. **EMAIL-ONLY MFA BYPASS IS FORBIDDEN.** Not implemented.

---

## Backup / RPO / RTO

`docs/DECISION_BACKUP_RPO_RTO.md`. Values **UNSET**. Restore **NOT EXECUTED**.

---

## Data Retention

`docs/DECISION_DATA_RETENTION.md`. Categories inventoried. Periods **not invented**.

---

## Data Residency

`docs/DECISION_DATA_RESIDENCY.md`. Processor map only. No compliance claim.

---

## Staging

`docs/STAGING_ENVIRONMENT_RUNBOOK.md`. Separate database and secrets required. Registration not auto-enabled.

---

## Security

Revalidated in code/tests (Phase 1B/2G/2H plus this milestone’s gate tests):

| Control | Result |
|---|---|
| IDOR (psychologist reads/mutations) | `NOT_FOUND` for missing and other-owner |
| Patient 403 vs 404 | O17 OPEN |
| RBAC | Role + ownership + permission |
| MFA | Mandatory TOTP for privileged roles; backup codes; no email bypass |
| Sessions | Server-side; disabled/suspended rejected |
| Registration | Disabled; duplicate registration non-enumerating |
| OTP | Production test provider refused; verify rate-limit before lookup |
| Password reset | Token in URL residual; POST consumes; no password in email |
| Booking concurrency | Exclusion + advisory lock fail-closed (PG tests in CI) |
| Reschedule / cancel | State machine; patient reschedule is proposal |
| Notification authorization | Outbox after commit; non-clinical copy |
| Patient ownership | Own appointments only |
| Psychologist ownership | Own calendar only |
| Super Admin boundary | No appointment transitions; no clinical permissions |
| Clinical tables | Not in schema verification required list |

Deployed-environment security review: **BLOCKED** (not performed).

---

## Identity

Register → verify email → OTP → session remains implemented and production-gated. Privileged provision refused in production.

---

## Appointments

Option B scheduling only. Timezone Asia/Kolkata. Availability advisory. Database authoritative.

---

## Patient Portal

`/patient/appointments` implemented; not publicly activated.

---

## Psychologist Portal

Practice appointments implemented. HMAC question portal still separate (unification DEFERRED).

---

## Notifications

Outbox + dispatcher implemented. Worker hosting OPEN. Production CLI refused.

---

## Super Admin Boundary

`SUPER_ADMIN ≠ ALL_DATA_ACCESS` holds in catalog grants and appointment state machine. Clinical permissions exist as flags and are **not granted**. Dashboard **DEFERRED**. Option C **DEFERRED**.

---

## Production Secrets

Repository scan this phase:

- `.env.example` contains empty placeholders and `PATIENT_REGISTRATION_ENABLED=false`
- No committed `.env` production file
- No `NEXT_PUBLIC_` identity/Twilio/SMTP/database secrets in `src/`
- CI PostgreSQL URL is a local GitHub Actions fixture (`postgres://postgres:postgres@localhost`), not a production secret
- Gate formatters do not print URLs or credential values

Suspicious live production credentials: **none found**. If any appear later: STOP, do not commit.

---

## Monitoring

Checklist exists. Provider **OPEN**. Logs ≠ monitoring.

---

## Worker

`docs/NOTIFICATION_WORKER_RUNBOOK.md`. O15 OPEN. CLI must not be used in production.

---

## CI

GitHub Actions: `npm test`, lint, typecheck, build, and PostgreSQL 16 concurrency + schema job. Formal CI lock (O16) still OPEN. Not a production deploy pipeline.

---

## Go-Live Checklist

`docs/PRODUCTION_GO_LIVE_CHECKLIST.md` — unsigned. Activation sequence ends with a **manual** `PATIENT_REGISTRATION_ENABLED=true` only after steps 1–21.

---

## Remaining Blockers

1. PostgreSQL vendor, region, production instance, schema verification  
2. OTP vendor + adapter + DLT  
3. SMTP production identity  
4. Legal copy (privacy/terms/consent)  
5. MFA recovery policy  
6. Backups + restore drill + RPO/RTO  
7. Retention policy  
8. Data residency / processor map  
9. Worker hosting  
10. Monitoring  
11. Staging proof  
12. Deployed security review  
13. Twilio activation **if** WhatsApp will be used (may remain disabled)  
14. Registration flag must stay false until all of the above that are mandatory for Option B are genuinely green  

---

## Recommended Next Human Actions

1. Read `docs/PHASE_2I_PRODUCTION_DECISION_REGISTER.md` Priority 1.  
2. Choose PostgreSQL vendor/region with counsel on residency (`docs/DECISION_POSTGRESQL.md`).  
3. Commission counsel review of `src/data/legal.ts` using `docs/LEGAL_REVIEW_REQUIRED.md`.  
4. Choose OTP vendor; do not enable registration to “try SMS”.  
5. Choose SMTP sender; plan SPF/DKIM/DMARC without using this agent to change live DNS.  
6. Choose MFA recovery option A–D.  
7. Set RPO/RTO and backup SKU.  
8. Create an isolated **staging** project (`docs/STAGING_ENVIRONMENT_RUNBOOK.md`).  
9. Do **not** merge `main`, deploy production, or set `PATIENT_REGISTRATION_ENABLED=true`.  

---

## Documentation consistency

| Statement | Classification | Notes |
|---|---|---|
| “does not create a patient database” (`src/data/legal.ts`) | **LEGAL DOCUMENTATION** / **REQUIRES LEGAL REVIEW** | True for public enquiry submissions; false for Option B accounts once registration is enabled. Not rewritten as approved. |
| “no patient portal” / informational site | **LEGAL DOCUMENTATION** / **REQUIRES LEGAL REVIEW** | Code implements `/patient/*`; flag keeps it off in production. |
| “no patient accounts” in architecture coexistence note | **TECHNICAL DOCUMENTATION** | Describes **live production today** while HMAC portal remains and registration is false. |
| “no appointment records” | **LEGAL / REQUIRES LEGAL REVIEW** if still implied for the public site after launch | Code has `appointments` tables; production unused until registration and DB exist. |
| Architecture ERD mentioning consultations | **TECHNICAL DOCUMENTATION** | Option C DEFERRED; not implemented. |
| Phase 0.5 “NO PMS implemented by this document” | **TECHNICAL DOCUMENTATION** (historical) | Later phases implemented Option B in code. |

Do not treat technical implementation docs as approved legal copy.

---

## Performance review

No new caching added.

| Path | Indexes / pattern |
|---|---|
| Patient listing | `appointments_patient_user_id_idx` |
| Psychologist listing | `appointments_psychologist_starts_idx`, `appointments_status_idx` |
| Public id lookup | `appointments_public_id_uidx` |
| Availability / occupancy | Occupied `tstzrange` + exclusion constraint; advisory lock |
| Booking | Transaction + `FOR UPDATE` + exclusion; idempotency unique index |
| History | `appointment_history_appointment_id_idx` |
| Dispatcher | Outbox/delivery dispatch indexes; `SKIP LOCKED` |

Production query plans were **not** measured against a live database (**NOT CONFIGURED**).

---

## Test Results

Recorded in this Phase 2I agent environment on 14 August 2026. Results are not fabricated.

| Command | Result |
|---|---|
| `npm test` | **267/267 pass** (0 fail, 0 skipped). Baseline before 2I was 265/265; +2 tests (gate honesty + clinical-table boundary) |
| `npm run lint` | **PASS** (eslint, exit 0) |
| `npm run typecheck` | **PASS** (`tsc --noEmit`, exit 0) |
| `npm run build` | **PASS** (Next.js 16.3.0). Existing middleware-to-proxy deprecation warning only; not changed |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (including dev) | **4 moderate**, **dev-only** `esbuild` via `drizzle-kit`. Do **not** `npm audit fix --force` (would install a breaking drizzle-kit) |
| PostgreSQL tests (`APPOINTMENT_PG_URL`) | **NOT CONFIGURED** (unset). Not fabricated. CI job `appointment-pg-concurrency` remains the intended runner |
| `npm run production:gates` | **OVERALL BLOCKED**. Counts in this process: PASS 5, BLOCKED 4, NOT CONFIGURED 6, HUMAN DECISION 12, LEGAL REVIEW 3, FAIL 0. Registration flag PASS (false). OTP/SMTP/Twilio not PASS |
| `npm run db:verify-production` | **NOT CONFIGURED** (no postgres `DATABASE_URL`) |

---

## Git Status

Branch: `cursor/patient-practice-phase2-appointments-d73b`  
Do not merge `main`. Do not force-push. Working tree must be clean after commits.

---

## Hard stop

After Phase 2I: **STOP.**

Do not enable registration, deploy, merge main, create production infrastructure, add production secrets, implement clinical records, or start Phase 3.

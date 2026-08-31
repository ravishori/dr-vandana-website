# O-B-02 Production External Dependency Checklist

**Status:** Operator preparation checklist — **not** a deployment  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Companion report:** `docs/O_B_02_PRODUCTION_INFRASTRUCTURE_EXTERNAL_DEPENDENCY_READINESS.md`

Do **not** set `PATIENT_REGISTRATION_ENABLED=true` from this checklist.  
Do **not** store secret values in this file.  
Production environment: **NOT ACCESSED** by O-B-02.

Statuses: `OPEN` | `DONE` | `N/A` | `LEGAL` | `PROD VERIFY`

---

## A. Human / vendor decisions (before secrets)

| # | Item | Status | Evidence / next action |
| --- | --- | --- | --- |
| A1 | PostgreSQL vendor (O1) | OPEN | `docs/DECISION_POSTGRESQL.md` |
| A2 | PostgreSQL region / residency (O2 / O18) | OPEN | India preference; legal if non-India |
| A3 | SMTP sender / mailbox vendor | OPEN | `docs/DECISION_SMTP_PROVIDER.md` |
| A4 | OTP SMS path (Twilio SMS recommended in code) | OPEN | Staging docs; fail-closed until configured |
| A5 | Notification worker hosting (O15) | OPEN | `docs/NOTIFICATION_WORKER_RUNBOOK.md` |
| A6 | MFA recovery policy (O12) | OPEN | `docs/DECISION_MFA_RECOVERY.md` |
| A7 | Monitoring provider | OPEN | `docs/PRODUCTION_MONITORING_CHECKLIST.md` |
| A8 | RPO / RTO values | OPEN | `docs/DECISION_BACKUP_RPO_RTO.md` — do not invent |
| A9 | Privileged bootstrap ceremony (O19) | OPEN | Do not use `db:provision` in production |

---

## B. Legal / governance (registration blocked until closed)

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| B1 | O11 privacy/terms/consent for Option B accounts | LEGAL | `docs/LEGAL_REVIEW_REQUIRED.md` |
| B2 | O10 retention / deletion periods | LEGAL | **UNSET** — `docs/DECISION_DATA_RETENTION.md` |
| B3 | WhatsApp opt-in wording (if enabling WA) | LEGAL | Keep WA disabled until approved |
| B4 | Processor / residency map (O18) | LEGAL | Map host, DB, SMTP, OTP, Twilio |

---

## C. Infrastructure (Production actions — separate authorization)

| # | Item | Status | Verification |
| --- | --- | --- | --- |
| C1 | Provision Postgres 16+ with TLS | OPEN | Vendor console |
| C2 | Enable `btree_gist` | OPEN | `npm run db:verify-production` on **target** |
| C3 | Apply migrations deliberately | OPEN | `APPLY_IDENTITY_MIGRATION=true npm run db:migrate` after backup |
| C4 | Confirm exclusion constraint | OPEN | Same verify script |
| C5 | Host secret manager populated (names only here) | OPEN | See §E |
| C6 | SMTP configured + TLS | OPEN | Send test in staging — not from O-B-02 |
| C7 | OTP Twilio SMS configured | OPEN | Staging lifecycle scripts exist |
| C8 | Worker production entrypoint (not `notifications:process`) | OPEN | O15 decision required |
| C9 | Automated encrypted backups | OPEN | Vendor |
| C10 | Restore drill on non-prod copy | OPEN | Document evidence |
| C11 | SPF / DKIM / DMARC | OPEN | DNS — PRODUCTION ACTION REQUIRED |
| C12 | HTTPS cert / domain | OPEN | PROD VERIFY |
| C13 | Monitoring + alerts | OPEN | Provider selection |
| C14 | Deployed-environment security review | OPEN | Not a code audit |
| C15 | Staging smoke (registration still false) | OPEN | Runbook |

---

## D. Registration enablement (final — do not execute in O-B-02)

Only after A–C and legal B1–B2 (and B3 if WA) are genuinely green:

| # | Gate | Required |
| --- | --- | --- |
| D1 | `PATIENT_REGISTRATION_ENABLED` still false until explicit owner decision | YES |
| D2 | `npm run production:gates` no longer OVERALL BLOCKED for required rows | YES |
| D3 | Explicit written go-live authorization | YES |

```text
PATIENT_REGISTRATION_ENABLED: DO NOT CHANGE in O-B-02
```

---

## E. Secret names (never values)

| Name | Purpose | Secret? | Client-safe? |
| --- | --- | --- | --- |
| `DATABASE_URL` | Postgres | YES | NO |
| `AUTH_SESSION_SECRET` | Practice sessions | YES | NO |
| `MFA_ENCRYPTION_KEY` | TOTP secret encryption | YES | NO |
| `SMTP_PASSWORD` / SMTP auth | Mail | YES | NO |
| `TWILIO_AUTH_TOKEN` | OTP/WA | YES | NO |
| `OTP_API_KEY` | Alternate OTP | YES | NO |
| `AI_API_KEY` | Educational Ask | YES | NO |
| `SESSION_SECRET` | Q&A portal | YES | NO |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limit | YES | NO |
| `PATIENT_REGISTRATION_ENABLED` | Feature flag | NO (boolean) | NO (server env) |
| `TWILIO_WHATSAPP_ENABLED` | WA switch | NO | NO |

No `NEXT_PUBLIC_*` identity/SMTP/DB/Twilio/AI secrets in repository design.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | O-B-02 checklist — docs only |

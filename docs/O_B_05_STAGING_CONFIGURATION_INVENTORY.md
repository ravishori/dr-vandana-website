# O-B-05 Staging Configuration Inventory

**Document type:** Staging configuration inventory (names / statuses only — **no secret values**)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Companion:** `docs/O_B_05_STAGING_SECRETS_VERCEL_ENV_SMOKE_REPORT.md`  
**Naming ceremony:** `docs/O_B_03_STAGING_SECRET_MANAGER_NAMING_CEREMONY.md`

```text
SECRET MANAGER PRODUCT DECISION REQUIRED
Do not invent secret values. Placeholders only: <STAGING_SECRET_REQUIRED>
PATIENT_REGISTRATION_ENABLED must remain false
```

---

## Classification legend

| Tag | Meaning |
| --- | --- |
| SECRET | Credential / signing material — never Git, never client, never docs values |
| SENSITIVE | Hostnames, mailboxes, account IDs — treat carefully |
| NON-SECRET | Flags, timeouts, public URLs |
| SERVER | Server-only (never `NEXT_PUBLIC_*`) |
| CLIENT | Must not hold secrets (repo avoids client secrets for PMS) |

---

## Inventory

| Variable | Purpose | Class | Server/Client | Staging required? | Prod required? | Source of value | Local workspace status (presence) | Staging host status | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Postgres connection | SECRET | SERVER | YES — staging host/db only | YES — prod only | Secret manager / host env | Present → `pg-dr-vandana-staging` / `dr_vandana_db_staging` | Not in Vercel | Connect + `db:verify-production` |
| `AUTH_SESSION_SECRET` | Practice session HMAC | SECRET | SERVER | YES | YES | `<STAGING_SECRET_REQUIRED>` unique ≠ Prod | **Absent** | **NOT CONFIGURED** | Length ≥ 32; gates |
| `MFA_ENCRYPTION_KEY` | MFA secret encryption | SECRET | SERVER | YES if MFA tested | YES | `<STAGING_SECRET_REQUIRED>` | **Absent** | **NOT CONFIGURED** | Usable key checks |
| `PATIENT_REGISTRATION_ENABLED` | Registration kill-switch | NON-SECRET | SERVER | **Must be `false`** | **Must be `false` until gates** | Explicit false | Absent (= not `"true"`) | Must set `false` on host | Gates + register NOT_ENABLED |
| `IDENTITY_PROVISION_ENABLED` | Operator provision CLI | NON-SECRET | SERVER | Prefer `false` | Prefer `false` | Host env | Absent | Prefer false | Provision refuse tests |
| `EMAIL_PROVIDER` | Email adapter mode | NON-SECRET | SERVER | `smtp` | `smtp` | Host env | Absent | **NOT CONFIGURED** | Gates |
| `SMTP_SERVER` / `SMTP_HOST` | SMTP host | SENSITIVE | SERVER | YES for mail smoke | YES | Staging mailbox provider | Alias present locally; dedicated staging **NOT VERIFIED** | **NOT VERIFIED** | Controlled test send |
| `SMTP_PORT` | SMTP port | NON-SECRET | SERVER | YES | YES | Usually 587 | Present | **NOT VERIFIED** on Vercel | TLS submission |
| `SMTP_EMAIL` / `SMTP_USER` | SMTP username | SENSITIVE | SERVER | YES | YES | Staging mailbox | User present; email key absent | **NOT VERIFIED** | Auth |
| `SMTP_PASSWORD` | SMTP password | SECRET | SERVER | YES | YES | `<STAGING_SECRET_REQUIRED>` staging mailbox only | Present locally — **must not be Prod** | **NOT VERIFIED** as staging-dedicated | Send test |
| `SMTP_FROM_*` | From identity | SENSITIVE/NON-SECRET | SERVER | OPTIONAL | OPTIONAL | Staging identity | Unknown | OPTIONAL | Headers |
| `APPOINTMENT_TO_EMAIL` | Enquiry inbox | SENSITIVE | SERVER | OPTIONAL | YES for enquiry | Operator staging inbox | Unknown | OPTIONAL | Enquiry path |
| `OTP_PROVIDER` | OTP adapter | NON-SECRET | SERVER | `twilio` for OTP smoke | `twilio` | Host env | **Absent** | **NOT CONFIGURED** | Adapter select |
| `OTP_API_KEY` | Non-Twilio OTP | SECRET | SERVER | CONDITIONAL | CONDITIONAL | `<STAGING_SECRET_REQUIRED>` | Absent | N/A if Twilio | — |
| `TWILIO_ACCOUNT_SID` | Twilio account | SENSITIVE | SERVER | YES for OTP smoke | YES | Staging/test Twilio | **Absent** | **NOT CONFIGURED** | Provider account |
| `TWILIO_AUTH_TOKEN` | Twilio auth | SECRET | SERVER | YES for OTP smoke | YES | `<STAGING_SECRET_REQUIRED>` | **Absent** | **NOT CONFIGURED** | Synthetic OTP |
| `TWILIO_FROM_NUMBER` | SMS from | SENSITIVE | SERVER | YES for OTP smoke | YES | Test sender | **Absent** | **NOT CONFIGURED** | E.164 |
| `TWILIO_WHATSAPP_ENABLED` | WA channel | NON-SECRET | SERVER | Prefer `false` | Prefer `false` | Explicit | Absent (= disabled) | Keep false | Gates |
| `TWILIO_WHATSAPP_FROM` / templates | WA send | SENSITIVE | SERVER | NO if WA off | CONDITIONAL | Leave empty | Absent | Leave empty | — |
| `APP_BASE_URL` | Absolute links | PUBLIC/SENSITIVE | SERVER | YES staging HTTPS URL | YES prod URL | Staging hostname | Absent (defaults localhost) | **DECISION REQUIRED** hostname | Link generation |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limit store | SENSITIVE/SECRET | SERVER | RECOMMENDED | YES in prod | Staging Redis | Present locally | **NOT VERIFIED** on Vercel | Rate-limit mode |
| `APPOINTMENT_RATE_LIMIT_STORE` | Store mode | NON-SECRET | SERVER | Prefer `upstash` when Redis ready | Must be `upstash` | Host env | Present=`upstash` (pollutes one unit test if unset arg) | Configure deliberately | Gates / tests |
| `SESSION_SECRET` | Q&A portal session | SECRET | SERVER | If Q&A tested | If Q&A live | Distinct staging | Absent | OPTIONAL | — |
| `PSYCHOLOGIST_*` / `QUESTION_*` | Q&A portal | SECRET/SENSITIVE | SERVER | If Q&A tested | If Q&A live | Staging only | Absent | OPTIONAL | — |
| `AI_API_KEY` / AI_* | Ask AI | SECRET/NON-SECRET | SERVER | OPTIONAL | OPTIONAL | Staging key or empty | Absent | OPTIONAL | Educational only |
| `ERROR_NOTIFY_EMAIL` | Ops alerts | SENSITIVE | SERVER | OPTIONAL | OPTIONAL | Operator | Present locally | OPTIONAL | — |
| `NODE_ENV` / `APP_ENV` | Runtime mode | NON-SECRET | SERVER | Host-controlled | `production` on Prod | Host | Absent locally | Vercel sets | Fail-closed rules |
| `APPLY_IDENTITY_MIGRATION` | Migrate arm | NON-SECRET | SERVER | Ephemeral true only for deliberate migrate | Never casual | Operator CLI | Not for Vercel runtime | N/A | Staging target guard |
| `NEXT_PUBLIC_*` secrets | — | FORBIDDEN | CLIENT | NEVER | NEVER | — | Comments forbid | NEVER | Bundle audit |

Logical secret names (when SM selected): `staging/app/<kebab-purpose>` per O-B-03 ceremony.

---

## Forbidden

- Secret **values** in Git, docs, chat, CI logs, client bundles  
- Production hostnames/credentials in staging env  
- Enabling `PATIENT_REGISTRATION_ENABLED=true` in this phase  

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | O-B-05 inventory — no values |

# O-B-P01 Production Environment Variable Inventory

**Document type:** Names / classification / sources only — **no secret values**  
**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Vault:** `kv-dr-vandana-prod`  
**Authority:** Repository (`process.env` / `.env.example` / config modules) + staging naming ceremony  

```text
SECRET VALUES = NOT SHOWN
STAGING VALUES = NOT REUSED
```

---

## Legend

| Column | Meaning |
| --- | --- |
| Secret? | SECRET / SENSITIVE / NON-SECRET / FEATURE FLAG / SYSTEM |
| Required? | YES / NO / CONDITIONAL |
| Consumer | Vercel / Worker / Both / Ops CLI / Test-only |
| KV name | Physical Azure name or `—` if Vercel/system only |
| Status | INVENTORIED / VALUE REQUIRED — OPERATOR MUST ENTER / PRESENT ON VERCEL (name) / N/A |

---

## A. Core Option B identity & database

| Variable | Secret? | Required? | Consumer | Source | How to obtain | Key Vault name | Vercel? | Worker? | Status | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | SECRET | YES | Both + Ops CLI | Azure PG Prod | Connection string for **`pg-dr-vandana-prod` / intended Prod DB**; TLS; never staging host | `production-app-database-url` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER | On credential rotate |
| `AUTH_SESSION_SECRET` | SECRET | YES | Both | Generated | Cryptographic random **≥ 32 chars**; ≠ staging | `production-app-auth-session-secret` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER | On exposure |
| `MFA_ENCRYPTION_KEY` | SECRET | YES if MFA | Vercel (web) | Generated | 32-byte key usable by `isMfaKeyUsable`; ≠ staging | `production-app-mfa-encryption-key` | YES | NO | VALUE REQUIRED — OPERATOR MUST ENTER | Re-encrypt MFA material if rotated |
| `APP_BASE_URL` | URL / NON-SECRET | YES | Vercel (links) | Operator | Verified Production HTTPS origin (repo default `https://drvandana.trinetra.net`) | `production-app-app-base-url` (optional mirror) | YES | NO | OPERATOR VERIFICATION REQUIRED | With domain change |
| `PATIENT_REGISTRATION_ENABLED` | FEATURE FLAG | YES = `false` | Both | Vercel config | Literal `false` until separate auth | optional KV mirror | YES | YES | MUST BE false | Never true without gate |
| `IDENTITY_PROVISION_ENABLED` | FEATURE FLAG | Prefer `false` | Vercel / Ops | Vercel | Literal `false` in Production | optional | YES | NO | Prefer false | — |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED` | FEATURE FLAG | Must be `false` | Ops CLI only | Never Prod | Do not enable | — | NO | NO | Must stay false / absent | — |
| `OTP_PROVIDER` | NON-SECRET | YES for SMS OTP | Vercel | Operator | e.g. `twilio` when OTP live; unset until ready | `production-app-otp-provider` | YES | NO | CONDITIONAL | — |
| `OTP_API_KEY` | SECRET | CONDITIONAL | Vercel | Provider | Non-Twilio OTP path only | `production-app-otp-api-key` | CONDITIONAL | NO | VALUE REQUIRED if used | On exposure |
| `OTP_EXPIRY_SECONDS` | NON-SECRET | OPTIONAL | Vercel | Config | Operational TTL (not O10) | optional | OPTIONAL | NO | Default 300 OK | — |
| `OTP_MAX_ATTEMPTS` | NON-SECRET | OPTIONAL | Vercel | Config | Operational | optional | OPTIONAL | NO | Default OK | — |
| `EMAIL_PROVIDER` | NON-SECRET | YES | Both | Config | `smtp` | optional | YES | YES | Set `smtp` | — |

---

## B. SMTP (repository: `appointment-email.ts`)

Canonical: `SMTP_SERVER`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD`. Aliases: `SMTP_HOST`, `SMTP_USER`. Optional: `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`.

| Variable | Secret? | Required? | Consumer | Source | How to obtain | Key Vault name | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SMTP_PASSWORD` | SECRET | YES for mail | Both | SMTP provider | Production App Password / API secret — ≠ staging | `production-app-smtp-password` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER |
| `SMTP_SERVER` / `SMTP_HOST` | SENSITIVE | YES | Both | Provider | Production host | `production-app-smtp-server` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER |
| `SMTP_PORT` | NON-SECRET | YES | Both | Provider | Usually 587/465 | `production-app-smtp-port` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER |
| `SMTP_EMAIL` / `SMTP_USER` | SENSITIVE | YES | Both | Provider | Production mailbox user | `production-app-smtp-username` | YES | YES | VALUE REQUIRED — OPERATOR MUST ENTER |
| `SMTP_FROM_EMAIL` | SENSITIVE | OPTIONAL | Both | Operator | From override | `production-app-smtp-from-email` | OPTIONAL | OPTIONAL | OPTIONAL |
| `SMTP_FROM_NAME` | NON-SECRET | OPTIONAL | Both | Operator | Display name | `production-app-smtp-from-name` | OPTIONAL | OPTIONAL | OPTIONAL |
| `APPOINTMENT_TO_EMAIL` | SENSITIVE | YES for enquiry form | Vercel | Operator | Practice enquiry inbox | `production-app-appointment-enquiry-to` | YES | NO | Name may already exist on Vercel Production |

**Note:** Vercel Production currently lists SMTP_* names (values Hidden). Treat as **present names ≠ Production verification**. Still store SoT copies in KV for worker/ops.

---

## C. Twilio SMS OTP (repository: `twilio-sms-config.ts`)

| Variable | Secret? | Required? | Consumer | Source | How to obtain | Key Vault name | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | SENSITIVE | YES for SMS OTP | Vercel | Twilio Prod console | Production account SID | `production-app-twilio-account-sid` | YES when OTP | NO | VALUE REQUIRED when OTP enabled |
| `TWILIO_AUTH_TOKEN` | SECRET | YES for SMS OTP | Vercel | Twilio Prod console | Production auth token ≠ staging | `production-app-twilio-auth-token` | YES when OTP | NO | VALUE REQUIRED when OTP enabled |
| `TWILIO_FROM_NUMBER` | SENSITIVE | YES for SMS OTP | Vercel | Twilio | E.164 sender (canonical) | `production-app-twilio-sms-from` | YES when OTP | NO | VALUE REQUIRED when OTP enabled |
| `TWILIO_PHONE_NUMBER` | SENSITIVE | Alias | Vercel | Twilio | Alias of from number | Prefer canonical only | OPTIONAL | NO | Prefer unset if `FROM_NUMBER` set |

---

## D. WhatsApp (must remain disabled)

| Variable | Secret? | Required? | Consumer | Source | Key Vault | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TWILIO_WHATSAPP_ENABLED` | FEATURE FLAG | YES = `false` | Both | Vercel | optional | YES | YES | MUST be `false` |
| `WHATSAPP_PROVIDER` | NON-SECRET | Prefer unset | Both | — | — | OPTIONAL | OPTIONAL | Leave unset/disabled |
| `TWILIO_WHATSAPP_FROM` | SENSITIVE | NO while WA off | — | — | — | NO until WA | NO | N/A |
| `TWILIO_WHATSAPP_SANDBOX` | NON-SECRET | NO | — | — | — | NO | NO | Do not use as Production |
| `TWILIO_TEMPLATE_*` | SENSITIVE | NO while WA off | — | Twilio Content SIDs | — | NO until WA | NO | N/A |

Shared Twilio SID/token may later serve WA — still Production-only credentials; WA stays off.

---

## E. Rate limit / Upstash

| Variable | Secret? | Required? | Consumer | Source | Key Vault name | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `APPOINTMENT_RATE_LIMIT_STORE` | NON-SECRET | Prefer `upstash` in Prod | Vercel | Config | — | YES | NO | Name may exist on Vercel |
| `UPSTASH_REDIS_REST_URL` | SENSITIVE | RECOMMENDED | Vercel | Upstash | `production-app-upstash-redis-url` | YES | NO | Name may exist on Vercel |
| `UPSTASH_REDIS_REST_TOKEN` | SECRET | RECOMMENDED | Vercel | Upstash | `production-app-upstash-redis-token` | YES | NO | VALUE REQUIRED — confirm Prod DB |
| `UPSTASH_REDIS_REST_KV_REST_API_URL` / `_TOKEN` | SECRET/SENSITIVE | Alias | Vercel | Upstash | optional | OPTIONAL | NO | Alias path |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | SECRET/SENSITIVE | Legacy alias | Vercel | — | — | OPTIONAL | NO | Prefer canonical Upstash names |

---

## F. Question portal (legacy psychologist Q&A — distinct from PMS sessions)

| Variable | Secret? | Required? | Consumer | Source | Key Vault name | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SESSION_SECRET` | SECRET | If Q&A live | Vercel | Generated | `production-app-qa-session-secret` | CONDITIONAL | NO | VALUE REQUIRED if Q&A live |
| `PSYCHOLOGIST_LOGIN_EMAIL` | SENSITIVE | If Q&A | Vercel | Operator | `production-app-qa-psychologist-login-email` | CONDITIONAL | NO | CONDITIONAL |
| `PSYCHOLOGIST_PASSWORD_HASH` | SECRET | If Q&A | Vercel | `hash-psychologist-password` script | `production-app-qa-psychologist-password-hash` | CONDITIONAL | NO | CONDITIONAL |
| `QUESTION_NOTIFICATION_EMAIL` | SENSITIVE | OPTIONAL | Vercel | Operator | `production-app-qa-notification-email` | OPTIONAL | NO | OPTIONAL |
| `QUESTION_STORE` / `QUESTION_DATABASE_PATH` / `QUESTION_MAX_LENGTH` | NON-SECRET | OPTIONAL | Vercel | Config | — | OPTIONAL | NO | Prefer Upstash in Prod |

---

## G. Ask AI / crisis / error reporting

| Variable | Secret? | Required? | Consumer | Source | Key Vault name | Vercel? | Worker? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AI_API_KEY` | SECRET | CONDITIONAL | Vercel | AI vendor | `production-app-ai-api-key` | CONDITIONAL | NO | OPTIONAL if fallback OK |
| `AI_PROVIDER` / `AI_MODEL` / `AI_API_BASE_URL` / `EMBEDDING_MODEL` / limits | NON-SECRET | OPTIONAL | Vercel | Config | — | OPTIONAL | NO | OPTIONAL |
| `VECTOR_DATABASE_URL` | SECRET | CONDITIONAL | Vercel | Vector store | `production-app-vector-database-url` | CONDITIONAL | NO | OPTIONAL |
| `CRISIS_STORE` / `CRISIS_DATABASE_PATH` | NON-SECRET | OPTIONAL | Vercel | Config | — | OPTIONAL | NO | Uses Upstash when available |
| `ERROR_NOTIFY_EMAIL` | SENSITIVE | OPTIONAL | Vercel | Operator | optional | OPTIONAL | NO | Name may exist on Vercel |
| `ERROR_EMAIL_ENABLED` / `ERROR_EMAIL_MIN_SEVERITY` / `ERROR_EMAIL_COOLDOWN_SECONDS` | NON-SECRET | OPTIONAL | Vercel | Config | — | OPTIONAL | NO | Names may exist |
| `TEST_ERROR_REPORTING` | NON-SECRET | Must be off in Prod | — | — | — | NO | NO | Do not set true |

---

## H. Notification dispatcher tunables

From `src/lib/notifications/config.ts` / `.env.example` — NON-SECRET operational:

`NOTIFICATION_MAX_ATTEMPTS`, `NOTIFICATION_LEASE_MS`, `NOTIFICATION_BATCH_SIZE`, `NOTIFICATION_PROVIDER_TIMEOUT_MS`, `NOTIFICATION_BACKOFF_MS`, `NOTIFICATION_EXPAND_BATCH_SIZE`, `NOTIFICATION_COMPLETED_EMAIL`, `NOTIFICATION_NO_SHOW_EMAIL`

| Required? | Consumer | KV? | Status |
| --- | --- | --- | --- |
| OPTIONAL (defaults exist) | Both if overridden | Prefer Vercel/Job env, not KV | Defaults OK until tuned |

---

## I. System / platform (do not store as vault secrets)

| Variable | Secret? | Source | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | SYSTEM | Host | `production` on Vercel Production |
| `VERCEL_ENV` | SYSTEM | Vercel | Automatic — do not duplicate in KV |
| `NEXT_RUNTIME` | SYSTEM | Next | Automatic |
| `APP_ENV` | NON-SECRET | Optional override | Observability helper |

---

## J. Test / local only (not Production KV)

| Variable | Notes |
| --- | --- |
| `APPOINTMENT_PG_URL` | PG integration tests only |
| `PROVISION_*` / `SYNTHETIC_PATIENT_PASSWORD` / `APPLY_IDENTITY_MIGRATION` | Ops CLI — never Production app env |
| Staging-only SMTP verify routes / secrets | Must not be Production |

---

## K. Webhooks

Repository search: **no** payment/OTP webhook verification secrets found for Option B Production path. None invented.

---

## L. Current Vercel Production env names (inspection)

Observed names only (values Hidden / not retrieved):

`APPOINTMENT_TO_EMAIL`, `ERROR_*`, `SMTP_*` (incl. `SMTP_USER`/`SMTP_HOST`), `UPSTASH_REDIS_REST_*`, `APPOINTMENT_RATE_LIMIT_STORE`

**Absent on Production env list (critical for Option B PMS):**  
`DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `APP_BASE_URL`, `PATIENT_REGISTRATION_ENABLED`, `TWILIO_WHATSAPP_ENABLED`, Twilio OTP vars, `EMAIL_PROVIDER`

**O-B-P01 did not insert Vercel values.**

---

## M. Minimum Production KV secret set (operator entry)

Create these secret **values** in `kv-dr-vandana-prod` via Portal (recommended first wave):

1. `production-app-database-url`  
2. `production-app-auth-session-secret`  
3. `production-app-mfa-encryption-key`  
4. `production-app-smtp-password`  
5. `production-app-smtp-server`  
6. `production-app-smtp-port`  
7. `production-app-smtp-username`  
8. `production-app-smtp-from-email` (if used)  
9. `production-app-smtp-from-name` (if used)  
10. `production-app-upstash-redis-url` / `production-app-upstash-redis-token` (if Upstash Prod)  
11. Twilio OTP trio when OTP authorized  

O-B-P01 did **not** populate values (no placeholders that could be mistaken for credentials).

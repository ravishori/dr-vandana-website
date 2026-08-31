# O-B-P03 Production Vercel Environment Inventory

**Document type:** Production Vercel env inventory (names / status — **no secret values**)  
**Date:** 2026-08-31  
**Project:** `drvandana-psychology`  
**Environment:** Production  
**Baseline:** `7974175`

```text
APP_BASE_URL (operator-confirmed) = https://drvandana.trinetralab.net
SECRET VALUES = NOT SHOWN
```

---

## Inventory

| Variable | Type | Required? | Consumer | Key Vault Name | Vercel Env | Status | Source | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `APP_BASE_URL` | URL / Config | YES | Web | optional mirror | Production | **CONFIGURED** | Operator-confirmed | `https://drvandana.trinetralab.net` |
| `PATIENT_REGISTRATION_ENABLED` | Feature flag | YES=`false` | Web (+ future worker) | — | Production | **CONFIGURED** `false` | O-B-P03 | Must stay false |
| `TWILIO_WHATSAPP_ENABLED` | Feature flag | YES=`false` | Web (+ future worker) | — | Production | **CONFIGURED** `false` | O-B-P03 | Must stay false |
| `IDENTITY_PROVISION_ENABLED` | Feature flag | Prefer `false` | Web / Ops | — | Production | **CONFIGURED** `false` | O-B-P03 | |
| `EMAIL_PROVIDER` | Config | YES | Web (+ worker) | — | Production | **CONFIGURED** `smtp` | O-B-P03 | Canonical |
| `DATABASE_URL` | Secret | YES | Web + Worker | `production-app-database-url` | Production | **MISSING** | Operator | Target `pg-dr-vandana-prod` / `dr_vandana_db` |
| `AUTH_SESSION_SECRET` | Secret | YES | Web + Worker | `production-app-auth-session-secret` | Production | **MISSING** | Operator | ≠ staging |
| `MFA_ENCRYPTION_KEY` | Secret | YES if MFA | Web | `production-app-mfa-encryption-key` | Production | **MISSING** | Operator | |
| `SMTP_PASSWORD` | Secret | YES for mail | Web + Worker | `production-app-smtp-password` | Production | **PRESENT (name) — NOT VERIFIED** | Existing | `[SECRET — NOT SHOWN]` |
| `SMTP_HOST` | Sensitive | Alias | Web + Worker | prefer `production-app-smtp-server` | Production | **PRESENT (legacy alias)** | Existing | Prefer add `SMTP_SERVER` |
| `SMTP_USER` | Sensitive | Alias | Web + Worker | prefer `production-app-smtp-username` | Production | **PRESENT (legacy alias)** | Existing | Prefer add `SMTP_EMAIL` |
| `SMTP_PORT` | Non-secret | YES | Web + Worker | `production-app-smtp-port` | Production | **PRESENT — NOT VERIFIED** | Existing | |
| `SMTP_FROM_EMAIL` | Sensitive | OPTIONAL | Web + Worker | `production-app-smtp-from-email` | Production | **PRESENT — NOT VERIFIED** | Existing | |
| `SMTP_FROM_NAME` | Non-secret | OPTIONAL | Web + Worker | `production-app-smtp-from-name` | Production | **PRESENT — NOT VERIFIED** | Existing | |
| `SMTP_SERVER` | Sensitive | Canonical | Web + Worker | `production-app-smtp-server` | Production | **MISSING** | Operator | Canonical host |
| `SMTP_EMAIL` | Sensitive | Canonical | Web + Worker | `production-app-smtp-username` | Production | **MISSING** | Operator | Canonical user |
| `APPOINTMENT_TO_EMAIL` | Sensitive | Enquiry | Web | optional | Production | **PRESENT — NOT VERIFIED** | Existing | |
| `APPOINTMENT_RATE_LIMIT_STORE` | Config | RECOMMENDED | Web | — | Production | **PRESENT** | Existing | Prefer `upstash` |
| `UPSTASH_REDIS_REST_URL` | Sensitive | RECOMMENDED | Web | `production-app-upstash-redis-url` | Production | **PRESENT — NOT VERIFIED** | Existing | Confirm Prod DB |
| `UPSTASH_REDIS_REST_TOKEN` | Secret | RECOMMENDED | Web | `production-app-upstash-redis-token` | Production | **PRESENT — NOT VERIFIED** | Existing | `[SECRET — NOT SHOWN]` |
| `ERROR_NOTIFY_EMAIL` / `ERROR_EMAIL_*` | Mixed | OPTIONAL | Web | — | Production | **PRESENT — NOT VERIFIED** | Existing | Observability |
| `OTP_PROVIDER` | Config | CONDITIONAL | Web | optional | Production | **MISSING** | Operator when OTP | |
| `TWILIO_ACCOUNT_SID` | Sensitive | CONDITIONAL | Web | `production-app-twilio-account-sid` | Production | **MISSING** | Operator when OTP | |
| `TWILIO_AUTH_TOKEN` | Secret | CONDITIONAL | Web | `production-app-twilio-auth-token` | Production | **MISSING** | Operator when OTP | |
| `TWILIO_FROM_NUMBER` | Sensitive | CONDITIONAL | Web | `production-app-twilio-sms-from` | Production | **MISSING** | Operator when OTP | |
| `VERCEL_ENV` | System | — | Web | — | — | **Vercel system-provided** | Platform | Do not store in KV |
| `NODE_ENV` | System | — | Web | — | — | Platform | — | |

---

## Gap lists

### A. Successfully configured (O-B-P03)

- `APP_BASE_URL` → `https://drvandana.trinetralab.net`
- `PATIENT_REGISTRATION_ENABLED=false`
- `TWILIO_WHATSAPP_ENABLED=false`
- `IDENTITY_PROVISION_ENABLED=false`
- `EMAIL_PROVIDER=smtp`

### B. Still missing (critical / conditional)

- `DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`
- Canonical `SMTP_SERVER`, `SMTP_EMAIL`
- OTP/Twilio set (conditional)

### C. Present but unverified

- Legacy SMTP aliases + password name, From_*, Upstash, ERROR_*, `APPOINTMENT_TO_EMAIL`

### D. Deliberately not copied from staging

- Staging `DATABASE_URL` / session / MFA / Twilio **values**
- Staging Preview-only Upstash alias sprawl
- Synthetic provision flags / test URLs as Prod secrets
- WhatsApp templates / sandbox

### E. Legacy not copied as new duplicates

- Did **not** add second copies of `SMTP_HOST`/`SMTP_USER`
- Did **not** delete existing legacy aliases (cutover later)

### F. Operator action required

1. Enter Prod `DATABASE_URL` in KV + Vercel Secret (host `pg-dr-vandana-prod`, db `dr_vandana_db`)  
2. Generate unique `AUTH_SESSION_SECRET` / `MFA_ENCRYPTION_KEY` → KV + Vercel  
3. Confirm SMTP is Production mailbox; add canonical `SMTP_SERVER`/`SMTP_EMAIL` or document alias reliance  
4. Align DNS: `drvandana.trinetralab.net` vs project Latest URL `drvandana.trinetra.net`  
5. OTP credentials when authorized  
6. Populate `kv-dr-vandana-prod` secret values (no fake placeholders)

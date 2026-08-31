# O-B-P03A Production Environment Variable Inventory

**Document type:** Names / classification / status — **no secret values**  
**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Project:** `drvandana-psychology` / **Environment:** Production  
**Key Vault:** `kv-dr-vandana-prod`

```text
SECRET VALUES = [SECRET — NOT SHOWN]
STAGING VALUES = NOT REUSED
```

---

## Inventory

| Variable | Type | Required | Consumer | Key Vault | Vercel Environment | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | SECRET | YES | BOTH | `production-app-database-url` | Production | **MISSING** — OPERATOR ACTION |
| `AUTH_SESSION_SECRET` | SECRET | YES | BOTH | `production-app-auth-session-secret` | Production | **CONFIGURED** (KV + Vercel) value `[SECRET — NOT SHOWN]` |
| `MFA_ENCRYPTION_KEY` | SECRET | YES if MFA | WEB | `production-app-mfa-encryption-key` | Production | **CONFIGURED** (KV + Vercel) 32-byte hex `[SECRET — NOT SHOWN]` |
| `EMAIL_PROVIDER` | CONFIG | YES | BOTH | — | Production | **CONFIGURED** `smtp` |
| `APP_BASE_URL` | URL | YES | WEB | optional | Production | **CONFIGURED** `https://drvandana.trinetralab.net` — **domain attachment unresolved** |
| `PATIENT_REGISTRATION_ENABLED` | FEATURE FLAG | YES=`false` | BOTH | — | Production | **CONFIGURED** `false` |
| `TWILIO_WHATSAPP_ENABLED` | FEATURE FLAG | YES=`false` | BOTH | — | Production | **CONFIGURED** `false` |
| `IDENTITY_PROVISION_ENABLED` | FEATURE FLAG | Prefer `false` | WEB | — | Production | **CONFIGURED** `false` |
| `SMTP_PASSWORD` | SECRET | YES for mail | BOTH | `production-app-smtp-password` | Production | **PRESENT (Vercel name)** — KV **ABSENT**; Prod-specific **NOT VERIFIED** |
| `SMTP_HOST` | SENSITIVE / LEGACY | Alias OK | BOTH | prefer server name | Production | **PRESENT** (legacy alias) |
| `SMTP_USER` | SENSITIVE / LEGACY | Alias OK | BOTH | prefer username | Production | **PRESENT** (legacy alias) |
| `SMTP_PORT` | CONFIG | YES for mail | BOTH | `production-app-smtp-port` | Production | **PRESENT** — KV **ABSENT** |
| `SMTP_FROM_EMAIL` | SENSITIVE | OPTIONAL | BOTH | `production-app-smtp-from-email` | Production | **PRESENT** — NOT VERIFIED |
| `SMTP_FROM_NAME` | CONFIG | OPTIONAL | BOTH | `production-app-smtp-from-name` | Production | **PRESENT** — NOT VERIFIED |
| `SMTP_SERVER` | SENSITIVE | Canonical | BOTH | `production-app-smtp-server` | Production | **MISSING** (alias `SMTP_HOST` in use) |
| `SMTP_EMAIL` | SENSITIVE | Canonical | BOTH | `production-app-smtp-username` | Production | **MISSING** (alias `SMTP_USER` in use) |
| `OTP_PROVIDER` | CONFIG | CONDITIONAL | WEB | optional | Production | **NOT CONFIGURED** (not required while registration false) |
| `OTP_API_KEY` | SECRET | CONDITIONAL | WEB | future | Production | **NOT CONFIGURED** |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SECRET/SENSITIVE | CONDITIONAL | WEB | `production-app-twilio-*` | Production | **NOT CONFIGURED** |
| `APPOINTMENT_TO_EMAIL` | SENSITIVE | Enquiry | WEB | optional | Production | **PRESENT — NOT VERIFIED** |
| `APPOINTMENT_RATE_LIMIT_STORE` | CONFIG | RECOMMENDED | WEB | — | Production | **PRESENT — NOT VERIFIED** |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | SENSITIVE/SECRET | RECOMMENDED | WEB | `production-app-upstash-*` | Production | **PRESENT — NOT VERIFIED**; KV absent |
| `ERROR_*` / `ERROR_NOTIFY_EMAIL` | MIXED | OPTIONAL | WEB | — | Production | **PRESENT — NOT VERIFIED** |
| `VERCEL_ENV` / `NODE_ENV` | SYSTEM | — | WEB | — | Platform | System-provided |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED` | STAGING ONLY | NO | Ops | — | — | **NOT COPIED** |

---

## Worker inventory (O-B-P04 later — **NOT PROVISIONED**)

| Variable | Worker need | Notes |
| --- | --- | --- |
| `DATABASE_URL` | YES | Same Prod PG; not set yet |
| `AUTH_SESSION_SECRET` | YES | Identity context bootstrap |
| `EMAIL_PROVIDER` / SMTP_* | YES | Outbox email |
| `PATIENT_REGISTRATION_ENABLED` / `TWILIO_WHATSAPP_ENABLED` | YES | Must remain false |
| `MFA_ENCRYPTION_KEY` | NO | Web only |
| OTP / Twilio SMS | NO | Web only |
| `APP_BASE_URL` | NO (unless proven) | Web |

---

## Gap lists

### A. CONFIGURED SUCCESSFULLY

- `AUTH_SESSION_SECRET` → KV + Vercel Production (unique vs staging hash)  
- `MFA_ENCRYPTION_KEY` → KV + Vercel Production (32-byte hex format validated; staging MFA KV absent)  
- `EMAIL_PROVIDER=smtp`  
- `PATIENT_REGISTRATION_ENABLED=false`  
- `TWILIO_WHATSAPP_ENABLED=false`  
- `IDENTITY_PROVISION_ENABLED=false`  
- `APP_BASE_URL` value set (domain attachment still open — see domain report)

### B. MISSING

- `DATABASE_URL` / `production-app-database-url`  
- Canonical `SMTP_SERVER` / `SMTP_EMAIL` on Vercel  
- All Production SMTP names in KV  
- OTP/Twilio (conditional)

### C. OPERATOR ACTION REQUIRED

1. Enter Production `DATABASE_URL` (host `pg-dr-vandana-prod.postgres.database.azure.com`, DB `dr_vandana_db`, TLS) into Azure Portal → `production-app-database-url`, then Vercel Production Secret — **never paste into Cursor**  
2. Resolve domain attachment (domain report)  
3. Confirm Production SMTP mailbox; optionally add canonical names + mirror into Prod KV  
4. OTP only when registration enablement is separately authorized  

### D. PRESENT BUT UNVERIFIED

- Legacy SMTP aliases + password name on Vercel  
- Upstash / ERROR_* / `APPOINTMENT_TO_EMAIL`

### E. LEGACY VARIABLES NOT COPIED

- Did **not** add duplicate legacy SMTP pairs  
- Did **not** delete working `SMTP_HOST` / `SMTP_USER`

### F. STAGING VARIABLES NOT COPIED

- No staging `DATABASE_URL`, session, MFA, or SMTP **values** copied into Production  
- Staging KV / Preview project not modified  

### G. DOMAIN ISSUES

See `docs/O_B_P03A_PRODUCTION_DOMAIN_ALIGNMENT_REPORT.md`

### H. DATABASE DEPENDENCIES

- Server Ready; DB `dr_vandana_db` exists (O-B-P02)  
- Schema migrate 0001–0007 still **separate** task  
- No `DATABASE_URL` → migrate/worker blocked  

### I. WORKER DEPENDENCIES

Inventoried only — **NOT PROVISIONED**

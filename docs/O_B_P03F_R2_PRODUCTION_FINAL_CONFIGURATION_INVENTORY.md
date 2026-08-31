# O-B-P03F-R2 Production Final Configuration Inventory

**Date:** 2026-08-31  
**Variable names only — no values**

---

## dr-vandana-website (AUTHORITATIVE PUBLIC DEPLOY)

**Project ID:** `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c`  
**Latest Production deploy:** Ready (~2026-08-31 10:09 IST) — pre-existing operator deploy, not triggered by P03F-R2

| Variable | Status | Classification |
| --- | --- | --- |
| `DATABASE_URL` | **PRESENT** (Secret) | Required — target **NOT VERIFIED** |
| `AUTH_SESSION_SECRET` | **PRESENT** (Secret) | Required |
| `APP_BASE_URL` | **PRESENT** (Secret) | Required — value **NOT VERIFIED** (site live on correct host) |
| `UPSTASH_REDIS_REST_TOKEN` | **PRESENT** (Secret) | Present — URL counterpart missing |
| `APPOINTMENT_TO_EMAIL` | **PRESENT** (Secret) | Enquiry mail |
| `MFA_ENCRYPTION_KEY` | **MISSING** | Condition before MFA routes |
| `EMAIL_PROVIDER` | **MISSING** | Condition before SMTP mail |
| `SMTP_SERVER` | **MISSING** | Condition before mail |
| `SMTP_EMAIL` | **MISSING** | Condition before mail |
| `SMTP_PORT` | **MISSING** | Condition before mail |
| `SMTP_USER` | **MISSING** | Legacy alias absent |
| `SMTP_PASSWORD` | **MISSING** | Condition before mail |
| `SMTP_FROM_EMAIL` | **MISSING** | Optional until mail |
| `SMTP_FROM_NAME` | **MISSING** | Optional until mail |
| `PATIENT_REGISTRATION_ENABLED` | **MISSING** | Defaults **false** in code |
| `TWILIO_WHATSAPP_ENABLED` | **MISSING** | Defaults **false** in code |
| `UPSTASH_REDIS_REST_URL` | **MISSING** | Condition if rate-limit used |

---

## drvandana-psychology (PARALLEL — NOT PUBLIC)

**Project ID:** `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV`

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | **MISSING** (not required until this project deploys) |
| `MFA_ENCRYPTION_KEY` | PRESENT |
| `AUTH_SESSION_SECRET` | PRESENT |
| `APP_BASE_URL` | PRESENT (Config) |
| `EMAIL_PROVIDER` | PRESENT (Config) |
| `PATIENT_REGISTRATION_ENABLED` | PRESENT (Config) — false |
| `TWILIO_WHATSAPP_ENABLED` | PRESENT (Config) — false |
| SMTP legacy names | PRESENT |

---

## Key Vault `kv-dr-vandana-prod`

| Secret | Status |
| --- | --- |
| `production-app-database-url` | **PRESENT**, enabled, updated 2026-08-31T04:37:23 |
| `production-app-auth-session-secret` | PRESENT |
| `production-app-mfa-encryption-key` | PRESENT |

---

## Split assessment

Public deploy **requires** `DATABASE_URL` + `AUTH_SESSION_SECRET` names — **both PRESENT**. SMTP/MFA on psychology project are **not duplicated** to public project (correct — only add when runtime paths active).

---

## Infrastructure (read-only)

| Item | Value |
| --- | --- |
| Backup retention | 7 days |
| PITR | Available |
| Restore drill | NOT VERIFIED |
| Firewall | Single IP; no 0.0.0.0/0 |
| Worker | NOT PROVISIONED |

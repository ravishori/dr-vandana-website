# O-B-P03 Production Secrets & Vercel Configuration

**Status:** PARTIAL — non-secret Production flags/URL configured; secret values remain operator-owned  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Vercel project:** `drvandana-psychology`  
**Key Vault:** `kv-dr-vandana-prod`  
**PostgreSQL target (conceptual):** `pg-dr-vandana-prod` / `dr_vandana_db`

```text
SECRET VALUES = NEVER IN THIS DOCUMENT
REGISTRATION = false
WHATSAPP = false
OPTION C = BLOCKED
```

---

## 1. Production URL (operator-confirmed)

| Item | Value |
| --- | --- |
| **Authoritative Production `APP_BASE_URL`** | `https://drvandana.trinetralab.net` |
| Configured on | Vercel Production env of `drvandana-psychology` |
| Not used | Staging-only assumptions from older docs that treated lab as Preview-only |

### Domain / project metadata note

Vercel CLI project list still shows:

| Project | Latest Production URL (Vercel metadata) |
| --- | --- |
| `drvandana-psychology` | `https://drvandana.trinetra.net` |
| `dr-vandana-website` | `https://drvandana.trinetralab.net` |

**Operator override for this task:** Production application base URL is **`https://drvandana.trinetralab.net`**.  
DNS/custom-domain alignment between projects remains an **operator follow-up** (do not auto-migrate domains in O-B-P03).

---

## 2. Canonical SMTP (repository)

From `src/config/appointment-email.ts`:

| Precedence | Variables |
| --- | --- |
| Host | `SMTP_SERVER` → fallback `SMTP_HOST` |
| User | `SMTP_EMAIL` → fallback `SMTP_USER` |
| Password | `SMTP_PASSWORD` (no alias) |
| From | `SMTP_FROM_EMAIL` → `SMTP_EMAIL` → `SMTP_USER` |
| Port | `SMTP_PORT` |
| Provider flag | `EMAIL_PROVIDER=smtp` |

**Policy:** Prefer canonical names in Key Vault / future wiring. Legacy `SMTP_HOST` / `SMTP_USER` already on Production may continue to work via fallback — **do not delete** without a controlled cutover. **Do not copy** staging SMTP values.

---

## 3. Cursor vs operator

| Cursor configured (this task) | Operator must supply (Portal / KV / Vercel Secret UI) |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED=false` | `DATABASE_URL` → Prod PG only |
| `TWILIO_WHATSAPP_ENABLED=false` | `AUTH_SESSION_SECRET` (unique ≠ staging) |
| `IDENTITY_PROVISION_ENABLED=false` | `MFA_ENCRYPTION_KEY` |
| `EMAIL_PROVIDER=smtp` | `SMTP_PASSWORD` (+ prefer `SMTP_SERVER` / `SMTP_EMAIL`) |
| `APP_BASE_URL=https://drvandana.trinetralab.net` | Twilio OTP trio when OTP authorized |
| | Confirm Upstash Prod vs shared |

---

## 4. Key Vault mapping (O-B-P01 names)

| Env variable | KV secret name | Status |
| --- | --- | --- |
| `DATABASE_URL` | `production-app-database-url` | VALUE REQUIRED — OPERATOR ACTION |
| `AUTH_SESSION_SECRET` | `production-app-auth-session-secret` | VALUE REQUIRED — OPERATOR ACTION |
| `MFA_ENCRYPTION_KEY` | `production-app-mfa-encryption-key` | VALUE REQUIRED — OPERATOR ACTION |
| `SMTP_PASSWORD` | `production-app-smtp-password` | VALUE REQUIRED — OPERATOR ACTION (Vercel name may exist — MUST VERIFY Prod-specific) |
| `SMTP_SERVER` | `production-app-smtp-server` | VALUE REQUIRED — OPERATOR ACTION |
| `SMTP_PORT` | `production-app-smtp-port` | VALUE REQUIRED — OPERATOR ACTION |
| `SMTP_EMAIL` | `production-app-smtp-username` | VALUE REQUIRED — OPERATOR ACTION |
| `SMTP_FROM_EMAIL` | `production-app-smtp-from-email` | OPTIONAL / VERIFY |
| `SMTP_FROM_NAME` | `production-app-smtp-from-name` | OPTIONAL / VERIFY |
| Twilio OTP | `production-app-twilio-*` | CONDITIONAL |
| Upstash | `production-app-upstash-*` | CONDITIONAL / VERIFY existing Vercel |

`kv-dr-vandana-prod`: RBAC + soft delete + purge protection verified. Secret **values** not populated by Cursor (no fake placeholders).

---

## 5. Worker boundary (not provisioned)

Future ACA Job needs (BOTH / worker): `DATABASE_URL`, `AUTH_SESSION_SECRET`, SMTP set, `EMAIL_PROVIDER`, flags `false`.  
Web-only: MFA, OTP Twilio SMS, Q&A secrets, Upstash, `APP_BASE_URL`.  
**Not created this task.**

---

## 6. Explicit non-actions

- No Production migration  
- No email/OTP/WhatsApp send  
- No staging changes  
- No firewall / extension changes  
- No Production deployment triggered  
- No Git commit/push  

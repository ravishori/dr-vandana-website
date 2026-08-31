# O-B-P03F-R Production Project Environment Alignment

**Date:** 2026-08-31  
**Names only — no secret values**

---

## Project A — dr-vandana-website (AUTHORITATIVE PUBLIC DEPLOY)

| Field | Value |
| --- | --- |
| Project ID | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Production URL | `https://drvandana.trinetralab.net` |
| Custom domain | `drvandana.trinetralab.net` (verified via `vercel inspect`) |
| Framework | Next.js 24.x |
| Latest Production deploy | Ready (~1h before verification) |

### Production environment variables

| Variable | Status | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **PRESENT** (Secret) | Created ~2d ago; value not readable |
| `AUTH_SESSION_SECRET` | **PRESENT** (Secret) | |
| `APP_BASE_URL` | **PRESENT** (Secret) | Live site on correct host |
| `UPSTASH_REDIS_REST_TOKEN` | **PRESENT** (Secret) | |
| `APPOINTMENT_TO_EMAIL` | **PRESENT** (Secret) | |
| `MFA_ENCRYPTION_KEY` | **MISSING** | Needed when MFA routes active |
| `EMAIL_PROVIDER` | **MISSING** | Needed for SMTP mail paths |
| `SMTP_*` / `SMTP_SERVER` / `SMTP_EMAIL` | **MISSING** | Needed for outbound mail from this deploy |
| `PATIENT_REGISTRATION_ENABLED` | **MISSING** | Code defaults **false** |
| `TWILIO_WHATSAPP_ENABLED` | **MISSING** | Code defaults **false** |
| `UPSTASH_REDIS_REST_URL` | **MISSING** | Token present; URL absent |

---

## Project B — drvandana-psychology (PARALLEL PMS / INFRA)

| Field | Value |
| --- | --- |
| Project ID | `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV` |
| Default Production URL | `https://drvandana.trinetra.net` (not Option B public host) |
| Serves `trinetralab.net` | **NO** |

### Production environment variables

| Variable | Status | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **MISSING** | Not required until this project deploys publicly |
| `AUTH_SESSION_SECRET` | **PRESENT** | |
| `MFA_ENCRYPTION_KEY` | **PRESENT** | |
| `APP_BASE_URL` | **PRESENT** (Config) | Value set to trinetralab.net in P03A |
| `EMAIL_PROVIDER` | **PRESENT** (Config) | `smtp` |
| `PATIENT_REGISTRATION_ENABLED` | **PRESENT** (Config) | false |
| `TWILIO_WHATSAPP_ENABLED` | **PRESENT** (Config) | false |
| `SMTP_HOST` / `SMTP_USER` / etc. | **PRESENT** (legacy) | Canonical `SMTP_SERVER`/`SMTP_EMAIL` absent |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | **PRESENT** | |

---

## Split assessment

| Question | Answer |
| --- | --- |
| Which project is deployed publicly? | **`dr-vandana-website`** |
| Which holds most PMS secrets? | **`drvandana-psychology`** |
| Does public deploy need DB URL? | **YES** — name **PRESENT** |
| Does public deploy need psychology SMTP/MFA now? | **CONDITIONAL** — not for static pages; required before mail/MFA features |
| Duplicate all psychology secrets to website? | **NO** — only runtime-required vars on deploy project |

---

## Key Vault (Production)

| Secret | Status |
| --- | --- |
| `production-app-database-url` | **PRESENT**, enabled, updated 2026-08-31 |
| `production-app-auth-session-secret` | PRESENT |
| `production-app-mfa-encryption-key` | PRESENT |

**Architecture:** Manual operator sync KV → Vercel (no repo automation).

---

## Alignment gaps

1. Vercel `DATABASE_URL` on public project — **present but target/sslmode not verified**; KV updated after Vercel env age suggests **sync needed**.  
2. `sslmode=require` — **not confirmed** on KV URL metadata.  
3. SMTP/MFA/flags — **partial on public project**; acceptable for current registration-off scope with documented conditions.

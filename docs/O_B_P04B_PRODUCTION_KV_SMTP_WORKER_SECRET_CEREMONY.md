# O-B-P04B Production KV SMTP + Worker Secret Ceremony

**Document type:** Controlled secret ceremony plan  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Key Vault:** `kv-dr-vandana-prod`

```text
SECRET VALUES = NEVER IN THIS DOCUMENT
STAGING SECRETS = NOT COPIED
WORKER EXECUTION = NOT PERFORMED
SMTP AUTH = NOT RUN
```

---

## 1. Purpose

Complete the Production Key Vault configuration required for the O-B-P04A Production notification worker entrypoint (`npm run notifications:process:production`) **without** provisioning Azure Container Apps infrastructure (O-B-P04C) and **without** executing the worker or sending email.

---

## 2. Prior controlled evidence

| Document | Relevant finding |
| --- | --- |
| O-B-P04A | Dedicated Production entrypoint PASS; requires SMTP readiness via `isSmtpReadyForIdentity()` |
| O-B-P04 | Production SMTP secrets **ABSENT** from KV |
| O-B-P03F-R2 | `production-app-database-url` updated with **`sslmode=require`** |
| O15-S | Staging worker KV pattern: `staging-app-smtp-*` (reference only — **not copied**) |

---

## 3. Repository-authoritative worker variables

Derived from `scripts/process-notifications-production.ts`, `production-worker-guard.ts`, `getSmtpTransportConfig()`, and `resolveEmailProviderMode()`.

| Variable | Required | Secret | Purpose | Production source |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | YES | NO | Must be `production` | ACA Job container env |
| `NOTIFICATION_WORKER_EXECUTION_PROFILE` | YES | NO | Fixed value `production-hosted-v1` | ACA Job container env (**not KV**) |
| `DATABASE_URL` | YES | YES | PostgreSQL outbox/deliveries | KV `production-app-database-url` |
| `AUTH_SESSION_SECRET` | YES | YES | `createAppIdentityContext` bootstrap | KV `production-app-auth-session-secret` |
| `EMAIL_PROVIDER` | YES | NO | Must resolve to `smtp` in Production | ACA non-secret env (`smtp`) |
| `SMTP_SERVER` | YES | SENSITIVE | SMTP host (canonical) | KV `production-app-smtp-server` |
| `SMTP_HOST` | Alias | SENSITIVE | Legacy fallback only | Prefer canonical — **do not duplicate in KV** |
| `SMTP_PORT` | YES | NO | SMTP port (typically 587) | KV `production-app-smtp-port` |
| `SMTP_EMAIL` | YES | SENSITIVE | SMTP auth user (canonical) | KV `production-app-smtp-username` |
| `SMTP_USER` | Alias | SENSITIVE | Legacy fallback only | Prefer canonical |
| `SMTP_PASSWORD` | YES | SECRET | SMTP authentication | KV `production-app-smtp-password` |
| `SMTP_FROM_EMAIL` | YES | SENSITIVE | From address (required by transport config) | KV `production-app-smtp-from-email` |
| `SMTP_FROM_NAME` | OPTIONAL | NO | From display name | KV `production-app-smtp-from-name` or code default |
| `PATIENT_REGISTRATION_ENABLED` | YES | NO | Must be `false` | ACA non-secret env |
| `TWILIO_WHATSAPP_ENABLED` | YES | NO | Must be `false` | ACA non-secret env |
| `MFA_ENCRYPTION_KEY` | NO | YES | Web MFA only — **not worker-critical** | KV exists; worker does not require |
| `APP_BASE_URL` | NO | NO | Web runtime | Vercel — **not worker** |
| OTP / Twilio SMS | NO | — | Web registration path | Not required while registration false |

### SMTP transport contract (`src/config/appointment-email.ts`)

Precedence:

- Host: `SMTP_SERVER` → `SMTP_HOST`
- User: `SMTP_EMAIL` → `SMTP_USER`
- Password: `SMTP_PASSWORD` (no alias)
- From: `SMTP_FROM_EMAIL` → `SMTP_EMAIL` → `SMTP_USER`
- Port: `SMTP_PORT`

`isSmtpReadyForIdentity()` returns true only when all required SMTP fields resolve.

---

## 4. Canonical Production Key Vault naming

Aligned with O-B-P01 / O-B-P03 repository architecture (staging uses `staging-app-smtp-*`; Production uses `production-app-smtp-*`):

| Env variable | KV secret name | Create in O-B-P04B? |
| --- | --- | --- |
| `DATABASE_URL` | `production-app-database-url` | **NO** — already present; not rotated |
| `AUTH_SESSION_SECRET` | `production-app-auth-session-secret` | **NO** — already present; not rotated |
| `MFA_ENCRYPTION_KEY` | `production-app-mfa-encryption-key` | **NO** — already present; not rotated |
| `SMTP_SERVER` | `production-app-smtp-server` | **OPERATOR INPUT REQUIRED** |
| `SMTP_PORT` | `production-app-smtp-port` | **OPERATOR INPUT REQUIRED** |
| `SMTP_EMAIL` | `production-app-smtp-username` | **OPERATOR INPUT REQUIRED** |
| `SMTP_PASSWORD` | `production-app-smtp-password` | **OPERATOR INPUT REQUIRED** |
| `SMTP_FROM_EMAIL` | `production-app-smtp-from-email` | **OPERATOR INPUT REQUIRED** |
| `SMTP_FROM_NAME` | `production-app-smtp-from-name` | **OPERATOR INPUT REQUIRED** (recommended) |

**Note:** Repository maps `SMTP_EMAIL` → `production-app-smtp-username` (not `production-app-smtp-email`). Do not create duplicate alias secrets unless a future controlled task explicitly requires them.

---

## 5. Worker execution profile (non-secret)

| Item | Value | Storage |
| --- | --- | --- |
| `NOTIFICATION_WORKER_EXECUTION_PROFILE` | `production-hosted-v1` | ACA Job container **plain env** (O-B-P04C) |

**Do not** store in Key Vault. **Do not** create `ALLOW_PRODUCTION=true` or equivalent bypass flags. O-B-P04A authorization boundary remains intact.

---

## 6. SMTP provider

| Item | Finding |
| --- | --- |
| Application provider mode | `EMAIL_PROVIDER=smtp` (Gmail-style SMTP used on staging reference stack) |
| Production mailbox | **OPERATOR-OWNED** — separate Production account/credentials |
| Staging credentials | **MUST NOT** be copied to Production KV |
| Cursor/agent | **MUST NOT** invent host, username, password, or API keys |

---

## 7. Operator ceremony procedure (when credentials available)

Perform **only** through Azure Portal or approved operator UI. **Never** paste secret values into Cursor, Git, docs, or shell arguments.

### Step A — Obtain Production SMTP credentials

1. Create or designate a **Production-specific** SMTP account (separate from staging Gmail App Password).
2. Record host, port, username, password, and from-address **offline** (operator secure store).

### Step B — Create Production KV secrets (metadata names only)

In Azure Portal → `kv-dr-vandana-prod` → Secrets → Generate/Import:

1. `production-app-smtp-server`
2. `production-app-smtp-port`
3. `production-app-smtp-username`
4. `production-app-smtp-password`
5. `production-app-smtp-from-email`
6. `production-app-smtp-from-name` (optional but recommended)

Each creation produces a **new secret version**. Do not purge prior versions.

### Step C — Do **not** modify (unless separately authorized)

- `production-app-database-url` — already correct with `sslmode=require`
- `production-app-auth-session-secret`
- `production-app-mfa-encryption-key`

### Step D — Vercel boundary

Worker secrets are consumed by **ACA Job + Managed Identity** (O-B-P04C). **Do not** duplicate worker-only SMTP secrets into Vercel unless a separate web-runtime task requires it. Public project `dr-vandana-website` SMTP parity is a separate concern from worker KV ceremony.

### Step E — Verification (post-operator entry)

After operator creates secrets, a follow-up read-only task should:

- List KV secret names (metadata only)
- Confirm enabled status
- **Not** run SMTP AUTH or send mail until O-B-P04C/P04D

---

## 8. O-B-P04B ceremony outcome (this task)

| Action | Result |
| --- | --- |
| Production SMTP KV secrets created | **NOT PERFORMED** — operator credentials not supplied |
| Existing Production secrets rotated | **NO** |
| Staging secrets copied | **NO** |
| Worker executed | **NO** |
| Email sent | **NO** |
| ACA / MI / ACR provisioned | **NO** |

---

## 9. Future worker identity (O-B-P04C)

| Item | Status |
| --- | --- |
| `id-dr-vandana-prod-worker` | **NOT PROVISIONED** |
| RBAC Key Vault Secrets User | **NOT ASSIGNED** (identity does not exist) |
| Staging MI reuse | **FORBIDDEN** |

Least-privilege RBAC assignment belongs to O-B-P04C after MI creation.

---

## 10. Rollback

1. Disable/delete individual `production-app-smtp-*` secrets in KV (soft-delete preserves versions).
2. Do not rotate database or session secrets unless separately authorized.
3. No ACA, DNS, Vercel, database, registration, or WhatsApp changes required.

---

## 11. Decision reference

```text
O-B-P04B DECISION = PASS WITH CONDITIONS
OPERATOR SECRET INPUT REQUIRED for Production SMTP KV secrets
```

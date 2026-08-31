# O-B-P04B Production SMTP Configuration Matrix

**Document type:** SMTP configuration status matrix  
**Date:** 2026-08-31  
**Scope:** Production worker + shared SMTP transport  
**No secret values in this document**

---

## 1. Provider classification

| Item | Status |
| --- | --- |
| Application email provider | `EMAIL_PROVIDER=smtp` |
| Transport implementation | Nodemailer SMTP via `getSmtpTransportConfig()` |
| Staging reference provider | Gmail SMTP (staging KV metadata — host/port pattern verified on staging; **not copied**) |
| Production SMTP account | **OPERATOR INPUT REQUIRED** — Production-specific credentials |
| Provider invented by Cursor | **NO** |

---

## 2. Configuration matrix

| Variable | Type | Worker required | Web required (mail) | KV secret | KV status | Runtime status | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EMAIL_PROVIDER` | CONFIG | YES | YES | — | N/A | Not in KV | Set `smtp` on ACA (O-B-P04C) |
| `SMTP_SERVER` | SENSITIVE | YES | YES | `production-app-smtp-server` | **MISSING** | Not configured | **OPERATOR INPUT REQUIRED** |
| `SMTP_HOST` | LEGACY ALIAS | Fallback | Fallback | — | N/A | Not canonical | Prefer `SMTP_SERVER` |
| `SMTP_PORT` | CONFIG | YES | YES | `production-app-smtp-port` | **MISSING** | Not configured | **OPERATOR INPUT REQUIRED** |
| `SMTP_EMAIL` | SENSITIVE | YES | YES | `production-app-smtp-username` | **MISSING** | Not configured | **OPERATOR INPUT REQUIRED** |
| `SMTP_USER` | LEGACY ALIAS | Fallback | Fallback | — | N/A | Not canonical | Prefer `SMTP_EMAIL` |
| `SMTP_PASSWORD` | SECRET | YES | YES | `production-app-smtp-password` | **MISSING** | Not configured | **OPERATOR INPUT REQUIRED** |
| `SMTP_FROM_EMAIL` | SENSITIVE | YES | YES | `production-app-smtp-from-email` | **MISSING** | Not configured | **OPERATOR INPUT REQUIRED** |
| `SMTP_FROM_NAME` | CONFIG | OPTIONAL | OPTIONAL | `production-app-smtp-from-name` | **MISSING** | Code default available | **OPERATOR INPUT REQUIRED** (recommended) |

---

## 3. Worker readiness gate (`isSmtpReadyForIdentity`)

The Production entrypoint (`process-notifications-production.ts`) calls `isSmtpReadyForIdentity()` before processing. Current Production KV state:

| Check | Result |
| --- | --- |
| Host present | **FAIL** (KV secret missing) |
| Port present | **FAIL** |
| User present | **FAIL** |
| Password present | **FAIL** |
| From email present | **FAIL** |
| SMTP ready | **NO** |

Worker would exit non-zero with sanitized message: *"Production notification worker SMTP configuration is not ready."*

---

## 4. SMTP authentication and email

| Activity | O-B-P04B status |
| --- | --- |
| SMTP AUTH | **NOT RUN** |
| Test email | **NOT SENT** |
| OTP email | **NOT SENT** |
| Notification outbox processing | **NOT EXECUTED** |

Runtime SMTP verification deferred to **O-B-P04C** (infrastructure dry run) and **O-B-P04D** (synthetic E2E).

---

## 5. Configuration boundaries

| Runtime | SMTP secret source | Duplicate into Vercel? |
| --- | --- | --- |
| Public web (`dr-vandana-website` on Vercel) | Vercel env / optional future KV sync | Separate task if needed |
| Production ACA worker | KV via Managed Identity (O-B-P04C) | **NO** — avoid unnecessary duplication |

Prior inventory (O-B-P03F-R2) noted SMTP names may exist on some Vercel projects with values **NOT VERIFIED**. O-B-P04B did **not** modify Vercel.

---

## 6. Staging isolation

| Rule | Status |
| --- | --- |
| Staging SMTP values copied to Production | **NO** |
| Staging secret names used as Production values | **NO** |
| Production-specific mailbox required | **YES** |

---

## 7. Operator completion checklist (post-ceremony)

When operator enters Production SMTP secrets into `kv-dr-vandana-prod`:

- [ ] `production-app-smtp-server` — PRESENT / ENABLED
- [ ] `production-app-smtp-port` — PRESENT / ENABLED
- [ ] `production-app-smtp-username` — PRESENT / ENABLED
- [ ] `production-app-smtp-password` — PRESENT / ENABLED
- [ ] `production-app-smtp-from-email` — PRESENT / ENABLED
- [ ] `production-app-smtp-from-name` — PRESENT / ENABLED (recommended)
- [ ] Confirm **distinct** from staging credentials (operator attestation)
- [ ] Do **not** run worker until O-B-P04C provisions ACA + MI

---

## 8. Summary

```text
PRODUCTION SMTP KV SECRETS = MISSING (6 names identified, 0 created)
SMTP AUTH = NOT RUN
EMAIL = NOT SENT
WORKER SMTP READINESS = NOT READY (expected until operator input + O-B-P04C)
```

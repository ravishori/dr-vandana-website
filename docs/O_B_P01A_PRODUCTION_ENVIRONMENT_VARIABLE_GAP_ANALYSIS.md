# O-B-P01A Production Environment Variable Gap Analysis

**Document type:** Inspection-only Dev / Staging / Production env-name comparison  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Companion report:** `docs/O_B_P01A_PRODUCTION_ENVIRONMENT_VARIABLE_GAP_ANALYSIS_REPORT.md`  
**Prior inventory:** `docs/O_B_P01_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md`

```text
SECRET VALUES = NEVER SHOWN
PRODUCTION / STAGING / DATABASE / KEY VAULT / VERCEL = UNCHANGED BY THIS TASK
```

---

## 1. Evidence sources (names only)

| Environment | Sources inspected |
| --- | --- |
| **Development** | `.env.example`; repository `process.env` / config modules (expected local `.env*` gitignored — values not read) |
| **Staging** | Vercel project `dr-vandana-website` **Preview** env **names**; `kv-dr-vandana-staging` secret **names**; ACA Job `caj-drv-notif-stg` env **names**; prior O-B-05B / O15-S docs |
| **Production** | Vercel project `drvandana-psychology` **Production** env **names**; `kv-dr-vandana-prod` secret list (**empty**) |

Presence means **name exists**. It does **not** mean value verified, parity verified, or target host verified unless noted.

---

## 2. Legend

| Cell | Meaning |
| --- | --- |
| YES | Name present / expected in that environment’s config surface |
| NO | Name absent from inspected Production/Staging surface or not expected in Dev example |
| UNKNOWN | Cannot determine without unsafe access |

**Production Action:** `ALREADY PRESENT` · `MUST ADD` · `MUST VERIFY` · `NOT REQUIRED` · `DEV/STAGING ONLY` · `CONDITIONAL`

---

## 3. Master comparison table (authoritative runtime variables)

| Variable | Dev | Staging | Production | Secret? | Consumer | Production Action |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | YES | YES | NO | SECRET | Web + Worker | MUST ADD |
| `AUTH_SESSION_SECRET` | YES | YES | NO | SECRET | Web + Worker | MUST ADD |
| `MFA_ENCRYPTION_KEY` | YES | YES | NO | SECRET | Web | MUST ADD |
| `APP_BASE_URL` | YES | YES | NO | NON-SECRET | Web | MUST ADD |
| `PATIENT_REGISTRATION_ENABLED` | YES (`false`) | YES | NO | FEATURE FLAG | Web + Worker | MUST ADD (`false`) |
| `IDENTITY_PROVISION_ENABLED` | YES (`false`) | YES | NO | FEATURE FLAG | Web / Ops | MUST ADD (`false`) |
| `TWILIO_WHATSAPP_ENABLED` | YES (`false`) | YES | NO | FEATURE FLAG | Web + Worker | MUST ADD (`false`) |
| `EMAIL_PROVIDER` | YES | YES | NO | NON-SECRET | Web + Worker | MUST ADD (`smtp`) |
| `SMTP_PASSWORD` | YES | YES | YES | SECRET | Web + Worker | MUST VERIFY |
| `SMTP_SERVER` | YES | YES | NO | SENSITIVE | Web + Worker | MUST ADD (or rely on `SMTP_HOST`) |
| `SMTP_HOST` | YES (alias) | NO* | YES | SENSITIVE | Web + Worker | ALREADY PRESENT (alias) / MUST VERIFY |
| `SMTP_PORT` | YES | YES | YES | NON-SECRET | Web + Worker | MUST VERIFY |
| `SMTP_EMAIL` | YES | YES | NO | SENSITIVE | Web + Worker | MUST ADD (or rely on `SMTP_USER`) |
| `SMTP_USER` | YES (alias) | NO* | YES | SENSITIVE | Web + Worker | ALREADY PRESENT (alias) / MUST VERIFY |
| `SMTP_FROM_EMAIL` | OPTIONAL | YES (KV + worker) | YES | SENSITIVE | Web + Worker | MUST VERIFY |
| `SMTP_FROM_NAME` | OPTIONAL | YES (KV + worker) | YES | NON-SECRET | Web + Worker | MUST VERIFY |
| `APPOINTMENT_TO_EMAIL` | YES | YES | YES | SENSITIVE | Web | MUST VERIFY |
| `OTP_PROVIDER` | YES | YES | NO | NON-SECRET | Web | CONDITIONAL |
| `OTP_EXPIRY_SECONDS` | YES | YES | NO | NON-SECRET | Web | CONDITIONAL |
| `OTP_MAX_ATTEMPTS` | YES | YES | NO | NON-SECRET | Web | CONDITIONAL |
| `OTP_API_KEY` | YES | NO | NO | SECRET | Web | CONDITIONAL / NOT REQUIRED if Twilio path |
| `TWILIO_ACCOUNT_SID` | YES | YES | NO | SENSITIVE | Web | CONDITIONAL |
| `TWILIO_AUTH_TOKEN` | YES | YES | NO | SECRET | Web | CONDITIONAL |
| `TWILIO_FROM_NUMBER` | YES | YES | NO | SENSITIVE | Web | CONDITIONAL |
| `TWILIO_PHONE_NUMBER` | YES (alias) | YES | NO | SENSITIVE | Web | CONDITIONAL |
| `APPOINTMENT_RATE_LIMIT_STORE` | YES | YES | YES | NON-SECRET | Web | MUST VERIFY |
| `UPSTASH_REDIS_REST_URL` | YES | YES | YES | SENSITIVE | Web | MUST VERIFY |
| `UPSTASH_REDIS_REST_TOKEN` | YES | YES | YES | SECRET | Web | MUST VERIFY |
| `UPSTASH_REDIS_REST_KV_REST_API_URL` | YES (alias) | YES | NO | SENSITIVE | Web | NOT REQUIRED if canonical set |
| `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` | YES (alias) | YES | NO | SECRET | Web | NOT REQUIRED if canonical set |
| `UPSTASH_REDIS_REST_KV_URL` | — | YES | NO | SENSITIVE | Web | DEV/STAGING ONLY / NOT REQUIRED |
| `UPSTASH_REDIS_REST_REDIS_URL` | — | YES | NO | SENSITIVE | Web | DEV/STAGING ONLY / NOT REQUIRED |
| `UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN` | — | YES | NO | SECRET | Web | DEV/STAGING ONLY / NOT REQUIRED |
| `ERROR_NOTIFY_EMAIL` | OPTIONAL | NO* | YES | SENSITIVE | Web | ALREADY PRESENT / MUST VERIFY |
| `ERROR_EMAIL_ENABLED` | OPTIONAL | NO* | YES | NON-SECRET | Web | ALREADY PRESENT / MUST VERIFY |
| `ERROR_EMAIL_MIN_SEVERITY` | OPTIONAL | NO* | YES | NON-SECRET | Web | ALREADY PRESENT / MUST VERIFY |
| `ERROR_EMAIL_COOLDOWN_SECONDS` | OPTIONAL | NO* | YES | NON-SECRET | Web | ALREADY PRESENT / MUST VERIFY |
| `SESSION_SECRET` | YES (Q&A) | NO* | NO | SECRET | Web (Q&A) | CONDITIONAL |
| `PSYCHOLOGIST_LOGIN_EMAIL` | YES (Q&A) | NO* | NO | SENSITIVE | Web (Q&A) | CONDITIONAL |
| `PSYCHOLOGIST_PASSWORD_HASH` | YES (Q&A) | NO* | NO | SECRET | Web (Q&A) | CONDITIONAL |
| `QUESTION_NOTIFICATION_EMAIL` | OPTIONAL | NO* | NO | SENSITIVE | Web (Q&A) | CONDITIONAL |
| `AI_API_KEY` | OPTIONAL | NO* | NO | SECRET | Web | CONDITIONAL |
| `WHATSAPP_PROVIDER` | OPTIONAL | NO | NO | NON-SECRET | Web + Worker | NOT REQUIRED while WA off |
| `TWILIO_WHATSAPP_FROM` | OPTIONAL | NO | NO | SENSITIVE | Web + Worker | NOT REQUIRED while WA off |
| `TWILIO_TEMPLATE_*` | OPTIONAL | NO | NO | SENSITIVE | Web + Worker | NOT REQUIRED while WA off |
| `NOTIFICATION_*` tunables | OPTIONAL | NO | NO | NON-SECRET | Web + Worker | NOT REQUIRED (defaults) |
| `NODE_ENV` | SYSTEM | YES (worker literal) | SYSTEM | SYSTEM | Both | NOT REQUIRED to store |
| `VERCEL_ENV` | N/A | SYSTEM | SYSTEM | SYSTEM | Web | NOT REQUIRED to store |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED` | YES (`false`) | NO* | NO | FEATURE FLAG | Ops CLI | DEV/STAGING ONLY |
| `APPOINTMENT_PG_URL` | TEST ONLY | NO | NO | SECRET | Tests | DEV/STAGING ONLY |
| `CRISIS_STORE` / `CRISIS_DATABASE_PATH` | OPTIONAL | NO* | NO | NON-SECRET | Web | CONDITIONAL |
| `QUESTION_STORE` / paths / limits | OPTIONAL | NO* | NO | NON-SECRET | Web | CONDITIONAL |

\*Staging “NO*” = not observed on Preview env list and/or staging KV list in this inspection (may still exist only in local operator env).

---

## 4. Safe non-secret reference values (repository only)

| Variable | Safe documented expectation |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` (`.env.example`; must remain false in Production) |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |
| `EMAIL_PROVIDER` | `smtp` |
| `SMTP_PORT` (example) | `587` (`.env.example`; Production value MUST VERIFY) |
| `APP_BASE_URL` (repo site default) | `https://drvandana.trinetra.net` (`src/config/site.ts`) |
| Staging lab URL (prior docs) | `https://drvandana.trinetralab.net` (Preview `APP_BASE_URL` intent) |

Secret cells elsewhere: **`[SECRET — VALUE NOT SHOWN]`**

---

## 5. Special checks

### 5.1 `DATABASE_URL`

| Env | Name present? | Target |
| --- | --- | --- |
| Development | Expected in local `.env` (not inspected) | TARGET NOT VERIFIED |
| Staging | YES (Preview + KV `staging-app-database-url` + worker) | TARGET VERIFIED (prior O-B-05E / O15-S → `pg-dr-vandana-staging`) — **value not shown** |
| Production | NO (Vercel Production + Prod KV empty) | VALUE NOT ACCESSIBLE |

### 5.2 `AUTH_SESSION_SECRET`

| Env | Name present? |
| --- | --- |
| Staging | YES (Preview + KV `staging-app-auth-session-secret` + worker) |
| Production | NO |

Values **not** compared. Staging and Production **must not** share the same secret when Production is populated.

### 5.3 SMTP

| Variable | Dev | Staging | Production |
| --- | --- | --- | --- |
| Password | EXPECTED | PRESENT | PRESENT (name) |
| Host canonical `SMTP_SERVER` | EXPECTED | PRESENT | ABSENT |
| Host alias `SMTP_HOST` | EXPECTED | ABSENT* | PRESENT |
| User canonical `SMTP_EMAIL` | EXPECTED | PRESENT | ABSENT |
| User alias `SMTP_USER` | EXPECTED | ABSENT* | PRESENT |
| Port | EXPECTED | PRESENT | PRESENT |
| From email/name | OPTIONAL | PRESENT (KV/worker) | PRESENT (Vercel names) |

Credentials: **`[SECRET — VALUE NOT SHOWN]`**. Production SMTP = **PRESENT BUT NOT VERIFIED**.

### 5.4 OTP / Twilio SMS

| Variable | Dev | Staging | Production |
| --- | --- | --- | --- |
| `OTP_PROVIDER` | EXPECTED | PRESENT | ABSENT |
| `TWILIO_ACCOUNT_SID` | EXPECTED | PRESENT | ABSENT |
| `TWILIO_AUTH_TOKEN` | EXPECTED | PRESENT | ABSENT |
| `TWILIO_FROM_NUMBER` | EXPECTED | PRESENT | ABSENT |

### 5.5 MFA

| Variable | Dev | Staging | Production |
| --- | --- | --- | --- |
| `MFA_ENCRYPTION_KEY` | EXPECTED | PRESENT (Preview) | ABSENT |
| Staging KV MFA secret | — | ABSENT on KV name list | — |

### 5.6 Feature flags

| Flag | Production required initial | Production name status |
| --- | --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` | ABSENT — MUST ADD |
| `TWILIO_WHATSAPP_ENABLED` | `false` | ABSENT — MUST ADD |

**This task did not change flags.**

---

## 6. Worker vs web

| Variable | Web App | Worker | Dev | Staging | Production | Secret? |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | YES | YES | YES | YES | NO | SECRET |
| `AUTH_SESSION_SECRET` | YES | YES | YES | YES | NO | SECRET |
| `SMTP_PASSWORD` | YES | YES | YES | YES | YES (name) | SECRET |
| `SMTP_SERVER` / `SMTP_HOST` | YES | YES | YES | YES | HOST alias only | SENSITIVE |
| `SMTP_PORT` | YES | YES | YES | YES | YES | NON-SECRET |
| `SMTP_EMAIL` / `SMTP_USER` | YES | YES | YES | YES | USER alias only | SENSITIVE |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | YES | YES | OPT | YES | YES | mixed |
| `EMAIL_PROVIDER` | YES | YES | YES | YES | NO | NON-SECRET |
| `PATIENT_REGISTRATION_ENABLED` | YES | YES | YES | YES | NO | FLAG |
| `TWILIO_WHATSAPP_ENABLED` | YES | YES | YES | YES | NO | FLAG |
| `MFA_ENCRYPTION_KEY` | YES | NO | YES | YES | NO | SECRET |
| Twilio OTP trio | YES | NO | YES | YES | NO | mixed |
| `APP_BASE_URL` | YES | NO | YES | YES | NO | NON-SECRET |
| Upstash | YES | NO | YES | YES | YES (names) | mixed |

**Production worker:** not provisioned — all worker-required variables remain **missing as a Production worker surface** (even where Vercel has SMTP aliases).

---

## 7. Production Key Vault mapping (required secrets)

| Variable | Production Key Vault Secret Name | Status |
| --- | --- | --- |
| `DATABASE_URL` | `production-app-database-url` | ABSENT (vault empty) |
| `AUTH_SESSION_SECRET` | `production-app-auth-session-secret` | ABSENT |
| `MFA_ENCRYPTION_KEY` | `production-app-mfa-encryption-key` | ABSENT |
| `SMTP_PASSWORD` | `production-app-smtp-password` | ABSENT |
| `SMTP_SERVER` | `production-app-smtp-server` | ABSENT |
| `SMTP_PORT` | `production-app-smtp-port` | ABSENT |
| `SMTP_EMAIL` / username | `production-app-smtp-username` | ABSENT |
| `SMTP_FROM_EMAIL` | `production-app-smtp-from-email` | ABSENT |
| `SMTP_FROM_NAME` | `production-app-smtp-from-name` | ABSENT |
| `UPSTASH_REDIS_REST_TOKEN` | `production-app-upstash-redis-token` | ABSENT |
| `UPSTASH_REDIS_REST_URL` | `production-app-upstash-redis-url` | ABSENT |
| `TWILIO_AUTH_TOKEN` | `production-app-twilio-auth-token` | ABSENT (when OTP) |
| `TWILIO_ACCOUNT_SID` | `production-app-twilio-account-sid` | ABSENT (when OTP) |
| `TWILIO_FROM_NUMBER` | `production-app-twilio-sms-from` | ABSENT (when OTP) |

Staging KV names remain `staging-app-*` — **do not copy values into Production**.

---

## 8. Vercel Production mapping

| Variable | Vercel Production Required? | Current Status |
| --- | --- | --- |
| `DATABASE_URL` | YES | ABSENT |
| `AUTH_SESSION_SECRET` | YES | ABSENT |
| `MFA_ENCRYPTION_KEY` | YES (if MFA) | ABSENT |
| `APP_BASE_URL` | YES | ABSENT |
| `PATIENT_REGISTRATION_ENABLED` | YES (`false`) | ABSENT |
| `TWILIO_WHATSAPP_ENABLED` | YES (`false`) | ABSENT |
| `EMAIL_PROVIDER` | YES | ABSENT |
| `SMTP_PASSWORD` | YES | PRESENT (name) — NOT VERIFIED |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PORT` / From_* | YES | PRESENT (names) — NOT VERIFIED |
| `SMTP_SERVER` / `SMTP_EMAIL` | Prefer canonical | ABSENT (aliases present) |
| Twilio OTP | CONDITIONAL | ABSENT |
| Upstash URL/token | RECOMMENDED | PRESENT (names) — NOT VERIFIED |
| `APPOINTMENT_TO_EMAIL` | YES (enquiry) | PRESENT (name) — NOT VERIFIED |
| `ERROR_*` | OPTIONAL | PRESENT (names) |

---

## 9. Gap summary lists

### A. DEV/STAGING VARIABLES MISSING FROM PRODUCTION (must care)

1. `DATABASE_URL`  
2. `AUTH_SESSION_SECRET`  
3. `MFA_ENCRYPTION_KEY`  
4. `APP_BASE_URL`  
5. `PATIENT_REGISTRATION_ENABLED`  
6. `IDENTITY_PROVISION_ENABLED`  
7. `TWILIO_WHATSAPP_ENABLED`  
8. `EMAIL_PROVIDER`  
9. `SMTP_SERVER` (canonical; alias `SMTP_HOST` exists)  
10. `SMTP_EMAIL` (canonical; alias `SMTP_USER` exists)  
11. `OTP_PROVIDER` / `OTP_EXPIRY_SECONDS` / `OTP_MAX_ATTEMPTS` (conditional)  
12. `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` (conditional)  

### B. PRODUCTION VARIABLES PRESENT (names)

`APPOINTMENT_TO_EMAIL`, `APPOINTMENT_RATE_LIMIT_STORE`, `ERROR_EMAIL_*`, `ERROR_NOTIFY_EMAIL`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SMTP_PASSWORD`, `SMTP_USER`, `SMTP_PORT`, `SMTP_HOST`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`

### C. PRODUCTION VARIABLES PRESENT BUT NOT VERIFIED

All of list B (values Hidden; no Production SMTP/OTP/DB smoke in this task). Alias vs canonical SMTP naming also unverified for worker parity.

### D. DEV/STAGING VARIABLES THAT SHOULD NOT BE COPIED TO PRODUCTION

| Item | Reason |
| --- | --- |
| Any `staging-app-*` secret **value** | Environment isolation |
| Staging `APP_BASE_URL` / lab host | Wrong origin |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED=true` / synthetic passwords | Staging/ops only |
| `APPOINTMENT_PG_URL` | Test harness |
| `PROVISION_*` CLI vars | Ops only |
| `TEST_ERROR_REPORTING=true` | Non-prod |
| Extra Upstash alias sprawl | Prefer canonical pair only |
| WhatsApp templates / sandbox flags | WA disabled |
| Staging ACA `NODE_ENV=development` workaround | Prod worker needs separate approved entrypoint design |

---

## 10. Security check

| Check | Result |
| --- | --- |
| Staging secrets reused into Prod | NOT PERFORMED |
| Secret values in this document | NONE |
| DATABASE_URL / SMTP password / session / Twilio printed | NONE |
| Git / terminal secret dump | NONE DETECTED |
| Production mutated | NO |

---

## 11. Counts (this inspection)

| Set | Count |
| --- | --- |
| Authoritative comparison rows (table §3 primary runtime set) | **48** variable rows |
| Dev-expected (from `.env.example` + code) | **~55** named (incl. optional/aliases/WA templates) |
| Staging Preview names observed | **28** |
| Staging KV secret names | **8** |
| Staging worker env names | **12** |
| Production Vercel names | **14** |
| Production KV secrets | **0** |
| Missing from Production (list A core) | **12** groups / items |
| Production present (list B) | **14** |
| Present but not verified (list C) | **14** |

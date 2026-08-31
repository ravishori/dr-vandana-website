# O-B-P03A Production Configuration Gap Closure

**Document type:** Architecture / procedure for Production env & secret gap closure  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Companions:**  
- `docs/O_B_P03A_PRODUCTION_CONFIGURATION_GAP_CLOSURE_REPORT.md`  
- `docs/O_B_P03A_PRODUCTION_DOMAIN_ALIGNMENT_REPORT.md`  
- `docs/O_B_P03A_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md`

```text
SECRET VALUES = NEVER
PRODUCTION DEPLOY = FORBIDDEN IN THIS TASK
PRODUCTION MIGRATE = FORBIDDEN
PRODUCTION WORKER = NOT IN SCOPE
```

---

## 1. Purpose

Close remaining Option B Production configuration gaps from O-B-P03 / O-B-P01A:

1. Required Production environment variables  
2. Production Key Vault secret population (where authorized)  
3. Matching Vercel Production variables  
4. Production / Staging separation  
5. Domain / `APP_BASE_URL` alignment decision  
6. Keep registration and WhatsApp disabled  

---

## 2. Authoritative targets

| Item | Value |
| --- | --- |
| Vercel Production project (task SoT) | `drvandana-psychology` |
| Staging / lab Vercel project | `dr-vandana-website` (Preview) |
| Production Key Vault | `kv-dr-vandana-prod` |
| Staging Key Vault | `kv-dr-vandana-staging` (untouched) |
| Production PostgreSQL | `pg-dr-vandana-prod` / DB `dr_vandana_db` |
| Region | India South Central |
| Baseline | `7974175` |

---

## 3. Repository-authoritative consumers

| Variable | Code authority | Classification |
| --- | --- | --- |
| `DATABASE_URL` | `src/lib/identity/config.ts` | REQUIRED SECRET — BOTH (web + future worker) |
| `AUTH_SESSION_SECRET` | `config.ts`, sessions, MFA recovery HMAC, OTP hashes | REQUIRED SECRET — BOTH |
| `MFA_ENCRYPTION_KEY` | `crypto.ts` / `mfa.ts` AES-256-GCM | REQUIRED SECRET if MFA — WEB |
| `EMAIL_PROVIDER` | `src/lib/notifications/config.ts` — accepts `smtp` | REQUIRED CONFIG |
| `SMTP_SERVER` / `SMTP_HOST` | `appointment-email.ts` (canonical → alias) | REQUIRED for mail (alias OK) |
| `SMTP_EMAIL` / `SMTP_USER` | same | REQUIRED for mail (alias OK) |
| `SMTP_PASSWORD` | same (no alias) | REQUIRED SECRET for mail |
| `SMTP_PORT` | same | REQUIRED CONFIG |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | optional override | OPTIONAL |
| `APP_BASE_URL` | identity config + site fallback | REQUIRED URL |
| `PATIENT_REGISTRATION_ENABLED` | identity + gates | FEATURE FLAG — must `false` |
| `TWILIO_WHATSAPP_ENABLED` | notifications config | FEATURE FLAG — must `false` |
| `IDENTITY_PROVISION_ENABLED` | identity config | Prefer `false` |
| `OTP_PROVIDER` / Twilio SMS | OTP path | CONDITIONAL — only when registration/OTP authorized |
| Upstash / ERROR_* / Q&A `SESSION_SECRET` | enquiry / portal | OPTIONAL / LEGACY for Option B core |

OTP is **NOT REQUIRED** while `PATIENT_REGISTRATION_ENABLED=false`.

---

## 4. Key Vault naming (O-B-P01)

| Env var | KV physical name |
| --- | --- |
| `DATABASE_URL` | `production-app-database-url` |
| `AUTH_SESSION_SECRET` | `production-app-auth-session-secret` |
| `MFA_ENCRYPTION_KEY` | `production-app-mfa-encryption-key` |
| `SMTP_PASSWORD` | `production-app-smtp-password` |
| `SMTP_SERVER` | `production-app-smtp-server` |
| `SMTP_EMAIL` | `production-app-smtp-username` |
| `SMTP_PORT` | `production-app-smtp-port` |
| `SMTP_FROM_*` | `production-app-smtp-from-*` |

Never reuse `staging-app-*` names or values.

---

## 5. Generation rules (no values in docs)

| Secret | Rule |
| --- | --- |
| `AUTH_SESSION_SECRET` | CSPRNG; usable length **≥ 32** characters |
| `MFA_ENCRYPTION_KEY` | Exactly **32** random bytes; **64 lowercase hex** or base64→32 bytes |
| `DATABASE_URL` | Operator-built TLS URL to `pg-dr-vandana-prod` / `dr_vandana_db` only |
| Per-user TOTP / recovery | **Never** provisioned here — application enrollment only |

**MFA rotation:** After Production MFA enrollment, rotating `MFA_ENCRYPTION_KEY` without re-encrypting `mfa_credentials.secret_ciphertext` breaks authenticator login. Do not rotate casually (O12 recovery still OPEN).

---

## 6. Domain policy (see domain report)

Do **not** guess between `drvandana.trinetralab.net` and `drvandana.trinetra.net`.  
Attach the approved hostname to `drvandana-psychology` before treating domain alignment as PASS.

---

## 7. Explicit non-goals

- Production deploy / migrate / worker  
- Email / OTP / WhatsApp send  
- Patient / appointment / notification data  
- Staging changes  
- Git commit / push  
- Option C / registration enablement  

---

## 8. Next controlled task

**O-B-P04 — Production worker provisioning & verification** — only after remaining conditions close. Do not start automatically.

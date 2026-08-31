# O-B-03 Staging Secret-Manager Naming Ceremony

**Document type:** Naming contract (names only — no secret values)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Rule:** Never commit, log, or paste secret **values**. Names and purposes only.

```text
CREATE → STORE → INJECT → VERIFY → ROTATE → REVOKE → REPLACE
```

---

## 1. Namespace convention

Canonical pattern (logical; map to Azure Key Vault / AWS SM / Vercel env / etc. when selected):

```text
{environment}/app/{kebab-purpose}
```

| Environment | Prefix |
| --- | --- |
| STAGING | `staging/app/` |
| PRODUCTION | `production/app/` (names only here; **do not create Prod secrets in O-B-03**) |
| LOCAL | Not in secret manager — `.env.local` gitignored |

**DECISION REQUIRED:** which physical secret manager product hosts these names.

---

## 2. Classification legend

| Class | Meaning |
| --- | --- |
| SECRET | Credential / signing material |
| SENSITIVE | Identifiers / internal hosts |
| NON-SECRET | Flags, timeouts, public URLs |
| PUBLIC | Intentionally public |

---

## 3. Ceremony map (repository variables → staging names)

Mapped from `.env.example` and identity/notification config. **Do not invent app variables.**

| Application variable | Secret name (staging) | Class | Required for staging PMS smoke? | Staging needs real value? | Placeholder OK? | Consumer | Owner | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | `staging/app/database-url` | SECRET | YES | YES (staging DB only) | NO for smoke | App, migrate, verify, worker | Ops | After exposure / **NOT YET DECIDED** period |
| `AUTH_SESSION_SECRET` | `staging/app/auth-session-secret` | SECRET | YES | YES (unique ≠ Prod) | NO | Identity sessions | Security | On exposure; period **NOT YET DECIDED** |
| `MFA_ENCRYPTION_KEY` | `staging/app/mfa-encryption-key` | SECRET | YES if testing MFA | YES unique | NO if MFA tested | MFA crypto | Security | Careful re-encrypt; **NOT YET DECIDED** |
| `SMTP_PASSWORD` | `staging/app/smtp-password` | SECRET | YES | YES (test mailbox) | NO | EmailService | Ops | Provider rotation support varies |
| `SMTP_EMAIL` / `SMTP_USER` | `staging/app/smtp-username` | SENSITIVE | YES | YES | — | EmailService | Ops | With mailbox |
| `SMTP_SERVER` | `staging/app/smtp-server` | SENSITIVE | YES | YES | — | EmailService | Ops | Rare |
| `SMTP_PORT` | `staging/app/smtp-port` | NON-SECRET | YES | YES | — | EmailService | Ops | — |
| `SMTP_FROM_EMAIL` | `staging/app/smtp-from-email` | SENSITIVE | OPTIONAL | OPTIONAL | YES | EmailService | Ops | — |
| `SMTP_FROM_NAME` | `staging/app/smtp-from-name` | NON-SECRET | OPTIONAL | OPTIONAL | YES | EmailService | Ops | — |
| `APPOINTMENT_TO_EMAIL` | `staging/app/appointment-enquiry-to` | SENSITIVE | OPTIONAL | Operator inbox | — | Enquiry mail | Ops | — |
| `OTP_PROVIDER` | `staging/app/otp-provider` | NON-SECRET | YES for OTP tests | e.g. `twilio` | — | Identity OTP | Ops | — |
| `OTP_API_KEY` | `staging/app/otp-api-key` | SECRET | CONDITIONAL | If non-Twilio path | — | OTP | Ops | On exposure |
| `TWILIO_ACCOUNT_SID` | `staging/app/twilio-account-sid` | SENSITIVE | YES for SMS OTP | Staging/test account | — | Twilio SMS/WA | Ops | Account-level |
| `TWILIO_AUTH_TOKEN` | `staging/app/twilio-auth-token` | SECRET | YES for SMS OTP | YES | NO | Twilio | Ops | Rotate on exposure |
| `TWILIO_FROM_NUMBER` | `staging/app/twilio-sms-from` | SENSITIVE | YES for SMS OTP | Test sender | — | Twilio SMS | Ops | — |
| `TWILIO_WHATSAPP_ENABLED` | `staging/app/twilio-whatsapp-enabled` | NON-SECRET | Prefer `false` | Prefer false | — | Notifications | Ops | — |
| `TWILIO_WHATSAPP_FROM` | `staging/app/twilio-whatsapp-from` | SENSITIVE | NO if WA off | N/A | — | WA adapter | Ops | — |
| `TWILIO_TEMPLATE_*` | `staging/app/twilio-template-<event>` | SENSITIVE | NO if WA off | N/A | — | WA adapter | Ops | With template publish |
| `WHATSAPP_PROVIDER` | `staging/app/whatsapp-provider` | NON-SECRET | OPTIONAL | Prefer unset/disabled | YES | Notifications | Ops | — |
| `PATIENT_REGISTRATION_ENABLED` | `staging/app/patient-registration-enabled` | NON-SECRET | **Must be `false`** | **false** | NO (must be explicit false) | Identity | Practice Owner | Never “true” without gate |
| `IDENTITY_PROVISION_ENABLED` | `staging/app/identity-provision-enabled` | NON-SECRET | Prefer `false` | false | — | Provision CLI | Ops | — |
| `EMAIL_PROVIDER` | `staging/app/email-provider` | NON-SECRET | `smtp` | YES | — | Email | Ops | — |
| `APP_BASE_URL` | `staging/app/app-base-url` | PUBLIC/SENSITIVE | YES | Staging HTTPS URL | — | Email links, app | Ops | With hostname |
| `AI_API_KEY` | `staging/app/ai-api-key` | SECRET | OPTIONAL | OPTIONAL | YES if AI unused | Ask AI | Ops | On exposure |
| `AI_PROVIDER` / `AI_MODEL` / `AI_API_BASE_URL` | `staging/app/ai-*` | NON-SECRET / SENSITIVE | OPTIONAL | OPTIONAL | YES | Ask AI | Ops | — |
| `VECTOR_DATABASE_URL` | `staging/app/vector-database-url` | SECRET | OPTIONAL | OPTIONAL | YES | Embeddings | Ops | — |
| `SESSION_SECRET` | `staging/app/qa-session-secret` | SECRET | If Q&A tested | Distinct | — | Q&A portal | Ops | On exposure |
| `PSYCHOLOGIST_PASSWORD_HASH` | `staging/app/qa-psychologist-password-hash` | SECRET | If Q&A tested | Staging only | — | Q&A | Ops | On password change |
| `PSYCHOLOGIST_LOGIN_EMAIL` | `staging/app/qa-psychologist-login-email` | SENSITIVE | If Q&A | Staging mailbox | — | Q&A | Ops | — |
| `QUESTION_NOTIFICATION_EMAIL` | `staging/app/qa-notification-email` | SENSITIVE | OPTIONAL | Operator | — | Q&A | Ops | — |
| `UPSTASH_REDIS_REST_URL` | `staging/app/upstash-redis-url` | SENSITIVE | RECOMMENDED | Staging Redis | YES if memory store OK | Rate limit | Ops | — |
| `UPSTASH_REDIS_REST_TOKEN` | `staging/app/upstash-redis-token` | SECRET | RECOMMENDED | YES | — | Rate limit | Ops | On exposure |
| `ERROR_NOTIFY_EMAIL` | `staging/app/error-notify-email` | SENSITIVE | OPTIONAL | Operator | YES | Error mailer | Ops | — |
| `NOTIFICATION_*` tunables | `staging/app/notification-<name>` | NON-SECRET | OPTIONAL | Defaults OK | YES | Worker/dispatcher | Ops | — |
| `APPLY_IDENTITY_MIGRATION` | Operator CLI only | NON-SECRET | Set true only for deliberate migrate | Ephemeral | — | Migrate script | Ops | Never leave true casually |
| `PROVISION_*` | Do not store Prod; staging only if needed | SECRET/SENSITIVE | Prefer false provision | — | — | Provision CLI | Ops | Refuse in Prod |

Aliases documented in `.env.example` (`SMTP_HOST`, `SMTP_USER`, `TWILIO_PHONE_NUMBER`) map to the same staging secrets as canonical names — do not create duplicate live credentials.

---

## 4. Forbidden placements

Secrets must **never** appear in:

- Git / `.env.example` values  
- docs (including this file)  
- CI logs  
- client bundles / `NEXT_PUBLIC_*`  
- error messages / screenshots  
- chat transcripts  

---

## 5. Lifecycle

| Step | Action |
| --- | --- |
| CREATE | Generate high-entropy secret offline |
| STORE | Write to staging secret manager under canonical name |
| INJECT | Host injects into runtime env at deploy |
| VERIFY | App boots; gates/scripts pass without printing values |
| ROTATE | Generate new value; update manager; redeploy; confirm sessions/MFA implications |
| REVOKE | Invalidate old credential at provider |
| REPLACE | Confirm consumers use new value only |

**Rotation cadence:** **NOT YET DECIDED** (policy). Minimum: rotate immediately on suspected exposure.

**Owners:** Operations Owner + Security Reviewer (role-based; names **NOT YET ASSIGNED**).

---

## 6. Production isolation

Creating `production/app/*` names is **NOT AUTHORIZED** in O-B-03.  
Staging values must never be copied into Production namespaces.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Names only — no values created |

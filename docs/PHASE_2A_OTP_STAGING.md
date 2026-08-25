# Phase 2A — Secure OTP Infrastructure & Staging Plan

**Branch workstream:** Phase 2A OTP providers (Gmail SMTP email OTP + Twilio SMS)  
**Base Phase 2 tip:** `cursor/patient-practice-phase2-appointments-d73b`  
**Production website:** UNCHANGED — do not deploy this to `https://drvandana.trinetralab.net`  
**Patient registration:** remains `PATIENT_REGISTRATION_ENABLED=false`

This is not legal advice and does not claim DPDP/HIPAA compliance.

---

## Authentication mechanisms (do not confuse)

| Role | Flow | Notes |
|---|---|---|
| PATIENT | Email + password → email link verify → **SMS OTP** phone verify → ACTIVE → session | Email OTP infrastructure also available (`EMAIL_VERIFY`); registration gated off |
| PSYCHOLOGIST (practice) | Email + password → **TOTP MFA** → session | SMS/email OTP must **not** replace TOTP |
| SUPER_ADMIN | Email + password → **TOTP MFA** → session | Same MFA rules |
| LEGACY QUESTION PORTAL | `/psychologist/login` env hash + HMAC cookie | Separate from practice identity — do not merge in Phase 2A |

---

## Provider configuration (host secrets only)

### Gmail SMTP (email OTP + identity mail)

| Variable | Example / notes |
|---|---|
| `SMTP_SERVER` or `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` (STARTTLS / `requireTLS`) |
| `SMTP_EMAIL` or `SMTP_USER` | sender mailbox |
| `SMTP_PASSWORD` | **Gmail App Password only** — never the normal account password |
| `SMTP_FROM_EMAIL` | optional; defaults to `SMTP_EMAIL` |

Status helper: `SMTP CONFIGURED` / `SMTP NOT CONFIGURED` (never prints password).

### Twilio SMS (phone OTP)

| Variable | Notes |
|---|---|
| `TWILIO_ACCOUNT_SID` | secret |
| `TWILIO_AUTH_TOKEN` | secret |
| `TWILIO_FROM_NUMBER` | **canonical** Messaging From (E.164) |
| `TWILIO_PHONE_NUMBER` | alias for `TWILIO_FROM_NUMBER` |
| `OTP_PROVIDER` | `twilio` |

Status helper: `TWILIO CONFIGURED` / `TWILIO NOT CONFIGURED`.

WhatsApp uses `TWILIO_WHATSAPP_FROM` / `TWILIO_WHATSAPP_ENABLED` separately — do not mix.

### Other required staging secrets

`DATABASE_URL`, `AUTH_SESSION_SECRET` (≥32 chars), `MFA_ENCRYPTION_KEY`, Upstash rate-limit credentials for staging/production.

Non-secret knobs: `OTP_EXPIRY_SECONDS=300`, `OTP_MAX_ATTEMPTS=5`.

---

## Database migration (staging only)

```bash
# Against staging Postgres only — never production website DB without an explicit later go-live plan
APPLY_IDENTITY_MIGRATION=true npm run db:migrate
npm run db:verify-production
```

New migration: `drizzle/0006_otp_delivery_metadata.sql`  
Adds destination / purpose / channel / delivery_status / last_sent_at on `phone_verifications`.

---

## Staging provider account restriction (Twilio trial)

If the Twilio account is still in **trial** mode:

- Only **verified** destination numbers can receive SMS.
- An unverified destination rejection is **STAGING PROVIDER ACCOUNT RESTRICTION**, not an application bug.
- Use Twilio console–verified numbers for manual SMS OTP tests.

---

## Manual staging test plan

### Email OTP

1. Configure Gmail App Password in staging env (not git).
2. Request email OTP for a synthetic account.
3. Confirm delivery in the inbox (code present; no password/session token).
4. Submit correct code → success; challenge `CONSUMED`.
5. Reuse same code → fail.
6. Wrong code → fail; after `OTP_MAX_ATTEMPTS` → blocked.
7. Wait past `OTP_EXPIRY_SECONDS` → expired.

### SMS OTP

1. Configure Twilio SID/token/from in staging env.
2. Use a **verified** trial destination (if trial).
3. Request phone verification OTP.
4. Confirm SMS; submit correct code → success; consume once.
5. Replay → fail.
6. Unverified destination on trial → expect provider failure; document as trial restriction.

### Rate limit

Repeated OTP requests from same IP/destination/account must eventually return the generic rate-limited message.

---

## Operator gates

```bash
npm run identity:gates
npm run production:gates
```

Expect **OVERALL BLOCKED** until human/legal/infra decisions close — even when adapters exist.  
`PATIENT_REGISTRATION_ENABLED` must remain **false** for staging until explicitly approved.

---

## MFA recovery (unchanged policy)

Email/SMS OTP **must not** bypass TOTP MFA.  
Recovery remains offline backup codes + future Super Admin / out-of-band options (`docs/DECISION_MFA_RECOVERY.md`). **EMAIL-ONLY MFA BYPASS IS FORBIDDEN.**

---

## Production safety

- Public production branch `feature/dr-vandana-production-5d` stays untouched by this Phase 2A work.
- Do not merge Phase 2A into production until a later approved go-live.
- Fail closed when SMTP or Twilio SMS credentials are missing.

# Phase 2A — Secure OTP Infrastructure & Staging Plan

**Branch:** `cursor/phase2a-secure-otp-infrastructure-be7a` (PR #16)  
**Base:** `cursor/patient-practice-phase2-appointments-d73b`  
**Production website:** UNCHANGED — never deploy this to `https://drvandana.trinetralab.net`  
**Patient registration:** remains `PATIENT_REGISTRATION_ENABLED=false`

This is not legal advice and does not claim DPDP/HIPAA compliance.

---

## Verification status (agent run)

| Check | Result |
|---|---|
| Unit / typecheck / lint / build | PASS (283 tests) |
| Local staging Postgres migrate `0006` | PASS (`SCHEMA PASS`) |
| Real-Postgres OTP lifecycle (test providers) | PASS (hash, consume, replay, fail-closed, audit events) |
| E.164 India / Australia | PASS |
| Config check (`npx tsx scripts/staging-otp-config-check.ts`) | **CONFIGURATION REQUIRED** — SMTP/Twilio secrets not present in agent env |
| Live Gmail delivery | **NOT EXECUTED** — `SMTP_PASSWORD` (Gmail App Password) not supplied |
| Live Twilio SMS delivery | **NOT EXECUTED** — `TWILIO_*` secrets not supplied |
| Upstash rate-limit in staging host | **NOT CONFIGURED** in agent env |
| Production site safety | Confirmed live @ `drvandana.trinetralab.net` (email + WhatsApp intact) |

**Final gate for “STAGING VERIFIED”:** live Gmail + live Twilio OTP delivery/verify/replay must succeed in a dedicated staging host after secrets are injected. Until then Phase 2A remains **blocked on provider credentials**.

---

## Authentication mechanisms (do not confuse)

| Role | Flow | Notes |
|---|---|---|
| PATIENT | Email + password → email link verify → **SMS OTP** phone verify → ACTIVE → session | Registration gated off |
| PSYCHOLOGIST (practice) | Email + password → **TOTP MFA** → session | SMS/email OTP must **not** replace TOTP |
| SUPER_ADMIN | Email + password → **TOTP MFA** → session | Same MFA rules |
| LEGACY QUESTION PORTAL | `/psychologist/login` env hash + HMAC cookie | Separate — do not merge in Phase 2A |

---

## Required staging variables (host secret store only)

### Gmail SMTP

| Variable | Notes |
|---|---|
| `SMTP_SERVER` or `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_EMAIL` or `SMTP_USER` | sender mailbox |
| `SMTP_PASSWORD` | **Gmail App Password only** — never the normal Gmail password |
| `SMTP_FROM_EMAIL` | optional; defaults to `SMTP_EMAIL` |

Never commit `SMTP_PASSWORD`. Never put it in `.env.example`, README, logs, or screenshots.

### Twilio SMS

| Variable | Notes |
|---|---|
| `TWILIO_ACCOUNT_SID` | secret |
| `TWILIO_AUTH_TOKEN` | secret |
| `TWILIO_FROM_NUMBER` | **canonical** Messaging From (E.164) |
| `TWILIO_PHONE_NUMBER` | optional alias for `TWILIO_FROM_NUMBER` |
| `OTP_PROVIDER` | `twilio` |

### Identity / rate limit

`DATABASE_URL` (staging Postgres only), `AUTH_SESSION_SECRET` (≥32), `MFA_ENCRYPTION_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `APPOINTMENT_RATE_LIMIT_STORE=upstash`

Non-secret: `OTP_EXPIRY_SECONDS=300`, `OTP_MAX_ATTEMPTS=5`, `PATIENT_REGISTRATION_ENABLED=false`, `APP_ENV=staging`

---

## Operator commands

```bash
# Configuration presence only (exit 2 = CONFIGURATION REQUIRED)
npx tsx scripts/staging-otp-config-check.ts

# Staging DB migrate + schema verify (NEVER production website DB)
APPLY_IDENTITY_MIGRATION=true npm run db:migrate
npm run db:verify-production

# Synthetic OTP lifecycle against staging Postgres (TEST providers — no live SMS/email)
npx tsx scripts/staging-otp-db-lifecycle.ts

npm run identity:gates
npm run production:gates   # expected OVERALL BLOCKED until prod legal/infra close
```

Migration file: `drizzle/0006_otp_delivery_metadata.sql`  
Extends `phone_verifications` with destination / purpose / channel / delivery_status / last_sent_at. No duplicate OTP table.

---

## Twilio trial restriction

If the Twilio account is still in **trial** mode:

- **TWILIO TRIAL ACCOUNT**
- **VERIFIED DESTINATION REQUIRED**
- Unverified destination rejection = **STAGING PROVIDER ACCOUNT RESTRICTION**, not an application bug

---

## E.164 normalization

| Input | Default country | Canonical |
|---|---|---|
| `9876543210` | IN (default) | `+919876543210` |
| `0412345678` | AU | `+61412345678` |

Canonical E.164 is stored on the OTP challenge and sent to Twilio.

---

## Manual live test procedure (after secrets are set)

Use **synthetic** staging recipients only — never real patients.

### Email OTP (Gmail)

1. Confirm `npx tsx scripts/staging-otp-config-check.ts` prints `SMTP CONFIGURED`.
2. Request email OTP for a staging test mailbox.
3. Confirm inbox receives code + expiry wording; no password/session token.
4. Correct OTP → success; challenge `CONSUMED`.
5. Reuse same OTP → fail.
6. Wrong OTP × `OTP_MAX_ATTEMPTS` → blocked.
7. Expiry after `OTP_EXPIRY_SECONDS` → fail.

### SMS OTP (Twilio)

1. Confirm `TWILIO CONFIGURED`.
2. Use a **verified** trial destination if trial.
3. Request phone OTP → SMS arrives → verify → consume → replay fails.
4. Unverified destination on trial → expect provider failure (document as trial restriction).

### Failure tests

- Temporarily unset `SMTP_PASSWORD` or use invalid Twilio auth → delivery `DELIVERY_FAILED`, no auth bypass, no plaintext OTP in logs, generic user error.
- Restore valid staging secrets afterward.

### Security checks

Expiry, attempts, purpose binding, destination binding, enumeration-safe responses, rate limits (IP/account/destination), concurrent verify race (≤1 success), session HttpOnly + hashed token, psychologist TOTP MFA not bypassed by email/SMS OTP.

---

## Rollback / disable Phase 2A OTP safely

Prefer **disable forward**, not destructive DB rollback, unless staging data is disposable.

1. Keep / set `PATIENT_REGISTRATION_ENABLED=false`.
2. Unset or set `OTP_PROVIDER=` empty → delivery fail-closed.
3. Revoke staging Gmail App Password and Twilio tokens in provider consoles.
4. Redeploy previous Phase 2 tip without PR #16 if the staging app was deployed.
5. Database: leave `0006` columns in place (forward-compatible). Only use `drizzle/0006_otp_delivery_metadata.down.sql` on disposable staging DBs after backup — do not assume rollback is safe on shared data.

---

## Production safety

- Do **not** merge PR #16 into `feature/dr-vandana-production-5d` as part of Phase 2A staging.
- Do **not** change production DNS / Vercel production / production database.
- Public site remains the verified production deployment.

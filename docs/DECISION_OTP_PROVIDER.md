# OTP Provider Decision Pack

**Status:** Phase 2A adapter implemented (Twilio SMS) — staging configuration still required  
**PRODUCTION OTP:** still **BLOCKED** until host credentials, India DLT/legal review, and registration gates close  
**Date:** updated 25 August 2026  

`OTP_VENDOR_ADAPTER_IMPLEMENTED=true` (Twilio SMS + SMTP email OTP providers in code).  
Production/staging must remain **fail-closed** when `OTP_PROVIDER` / Twilio / SMTP secrets are missing.  
**Never commit** `TWILIO_AUTH_TOKEN`, `SMTP_PASSWORD`, or other secrets.

`OTP_*` / `TWILIO_*` environment variable **presence alone is not production readiness**.

This is not legal advice.

---

## Current code behaviour

```text
OTP_PROVIDER=twilio + Twilio SMS configured + SMTP configured (for email OTP)
  → composite provider (SMS via Twilio, EMAIL via SMTP/Gmail)
Missing credentials / test|mock in production
  → fail closed (UNCONFIGURED)
```

- Test OTP is refused when `NODE_ENV=production`
- No hard-coded OTP
- No email-as-OTP MFA bypass
- Hashes stored; plaintext OTP is not retained in application tables
- Destination + purpose binding; atomic consume; delivery status tracked
- IP / account / destination rate limits on send; IP rate limit on verify

---

## Chosen technical adapter (Phase 2A)

| Channel | Provider | Env |
|---|---|---|
| SMS phone OTP | Twilio Messaging API | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (alias `TWILIO_PHONE_NUMBER`) |
| Email OTP | Gmail SMTP (App Password) via existing nodemailer path | `SMTP_SERVER`/`SMTP_HOST`, `SMTP_EMAIL`/`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_PORT=587` |

Canonical SMS sender variable: **`TWILIO_FROM_NUMBER`**.  
`TWILIO_PHONE_NUMBER` is accepted as an alias.  
WhatsApp remains separate (`TWILIO_WHATSAPP_*`).

---

## Still OPEN before production registration

| Requirement | Status |
|---|---|
| India DLT / sender registration as applicable | HUMAN DECISION + LEGAL |
| Twilio account upgraded past trial for real patients | HUMAN DECISION |
| Processor / residency review (O18) | LEGAL REVIEW |
| Retention (O10) | LEGAL REVIEW |
| Staging delivery verification with synthetic numbers only | OPERATOR |
| `PATIENT_REGISTRATION_ENABLED=true` | Must stay false until gates green |

See `docs/PHASE_2A_OTP_STAGING.md`.

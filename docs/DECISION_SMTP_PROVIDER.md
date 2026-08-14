# SMTP Provider Decision Pack

**Status:** HUMAN DECISION REQUIRED  
**Date:** 14 August 2026  
**PRODUCTION SMTP: NOT CONFIGURED**

The application already wraps **Nodemailer SMTP** behind `EmailService`. That abstraction remains. This document does **not** automatically select a provider and does **not** add credentials.

Env var presence is **not** delivery readiness.

---

## Current code behaviour

| Topic | Behaviour |
|---|---|
| Transport | Nodemailer SMTP |
| Port 465 | Implicit TLS |
| Port 587 | STARTTLS |
| Missing SMTP | Send fails closed; appointment still commits (outbox) |
| Production test/mock | Refused |
| Idempotency | **No** SMTP provider idempotency header (residual duplicate mail possible) |
| Content | No passwords, OTP values, or clinical text |

Identity mail: verification and password reset. Appointment mail: outbox templates (non-clinical).

---

## Options (not selected)

| Option | Notes |
|---|---|
| Existing generic SMTP mailbox (practice host / Google Workspace / Microsoft 365 SMTP) | Uses current Nodemailer settings; mailbox rate limits and spam reputation vary |
| Transactional SMTP relay (vendor SMTP endpoint) | Still Nodemailer; typically better bounce handling |
| Transactional HTTP API | Would require a new adapter; **not** required if SMTP remains |

**Technical recommendation:** Keep Nodemailer. Prefer a transactional sender that supports TLS, SPF/DKIM/DMARC, and bounce visibility. **Do not select the vendor here.**

Pricing: **REQUIRES VERIFICATION**.

---

## Decision checklist

| Item | Requirement | STATUS |
|---|---|---|
| SMTP vs API | SMTP remains the implemented path | HUMAN DECISION for vendor only |
| Authentication | `SMTP_USER` / `SMTP_PASSWORD` in secret manager | NOT CONFIGURED |
| TLS | 465 or 587 as above; no plaintext production SMTP | OPEN |
| Sender identity | `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | OPEN |
| Reply-to | Not a dedicated identity setting today | HUMAN DECISION |
| SPF | DNS for the sending domain | NOT CHANGED in this phase |
| DKIM | Provider/DNS | NOT CHANGED |
| DMARC | Domain policy | HUMAN DECISION |
| Bounce handling | How bounces are received and acted on | HUMAN DECISION |
| Delivery monitoring | Provider dashboard + app dead-letter | OPEN |
| Provider reliability | SLA / reputation | HUMAN DECISION |
| Data processing | Where message content and addresses are processed | LEGAL REVIEW (O18) |
| Idempotency limitations | Accept residual duplicate email or add a later provider feature | OPEN — do not invent headers |

Do not modify production DNS from this milestone.

Names only (no values): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`.

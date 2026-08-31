# Data Retention Decision

**Status:** OPEN (O10) — LEGAL REVIEW REQUIRED  
**Date:** 14 August 2026  

This inventory describes **implemented Option B** data. It does **not** invent retention periods. It is **not** legal advice and does **not** claim DPDP compliance.

Clinical notes, diagnoses, assessments, and medical documents are **not** in scope (Option C DEFERRED).

Deletion workflows are **not implemented**. Until counsel sets periods and deletion rules, production accounts remain **BLOCKED**.

---

## How to read the table

| Column | Meaning |
|---|---|
| Purpose | Why the application stores it |
| Retention requirement | What must be decided — currently **UNSET** |
| Deletion requirement | What must be decided — currently **UNSET** |
| Legal dependency | Counsel / policy input needed |

Do not copy example periods from other products into this file.

---

## Inventory

| Category | Tables / stores | Purpose | Retention requirement | Deletion requirement | Legal dependency |
|---|---|---|---|---|---|
| Patient identity | `users` (email, mobile, password hash, status), `patient_profiles` | Account, portal, booking identity | UNSET | UNSET — account closure vs suppression | O11 privacy; professional duties |
| Contact data | Verified email/mobile on `users`; psychologist email | Notifications and operational contact | UNSET | UNSET — including processor copies (SMTP/OTP/Twilio) | O18 processors |
| Appointment data | `appointments`, `appointment_types` usage, occupancy range | Scheduling; collision prevention | UNSET | UNSET — cancelled vs historical | Patient-facing policy; O9 |
| Appointment history | `appointment_history` (append-only trigger) | Immutable operational trail | UNSET | UNSET — immutability vs erasure rights | LEGAL REVIEW (erasure vs integrity) |
| Audit logs | `audit_logs` | Accountability; no secrets/OTP/notes | UNSET | UNSET | Security vs erasure |
| Security events | `security_events`, `otp_attempts` (outcomes, not codes) | Abuse investigation, rate limits | UNSET | UNSET | Security vs erasure |
| Notification delivery records | `appointment_notification_deliveries` | Dispatch status | UNSET | UNSET | Processor logs |
| Notification attempts | `appointment_notification_attempts` | Retry / dead-letter | UNSET | UNSET | Ops |
| Notification outbox | `appointment_notification_outbox` | Durable events after appointment commit | UNSET | UNSET | Ops |
| Verification records | `email_verifications`, `phone_verifications` | Email/mobile activation (hashes) | UNSET | UNSET — typically short-lived | Purpose limitation |
| Sessions | `sessions` (token hashes) | Authentication | Session TTL exists in code; **policy lock UNSET** | Session revoke exists; bulk deletion policy UNSET | Security |
| Password reset records | `password_reset_tokens` (hashes) | Reset handshake | UNSET | UNSET — typically short-lived | Purpose limitation |
| MFA material | `mfa_credentials`, `mfa_recovery_codes` | Privileged login | UNSET | UNSET — device loss (O12) | Security |
| Booking idempotency | `booking_idempotency` | Replay safety | UNSET (`expires_at` exists; policy UNSET) | UNSET | Ops |
| WhatsApp consent | `patient_profiles` opt-in flags/timestamps | Channel consent | UNSET | UNSET — must remain consistent with opt-out | LEGAL REVIEW (P4-WA-COPY) |
| Public enquiry email | Not stored in PMS tables (SMTP to practice inbox) | Fallback `/book-appointment` | Email provider retention UNSET | Inbox handling UNSET | Existing legal pages |

---

## Explicit non-actions

- Do not encode invented TTLs as “compliance”
- Do not delete production-like data from this phase
- Do not rewrite legal documents here

---

## Technical TTL ≠ retention policy (O-B-01)

The following **exist in code** as operational security/reliability controls. They are **not** a governance retention policy and must **not** be treated as satisfying O10:

| Technical control | Examples | Governance status |
|---|---|---|
| Session cookie / server session lifetime | Session TTL in identity config | **Policy lock UNSET** |
| OTP expiry | `OTP_EXPIRY_SECONDS` (example default in `.env.example`) | Operational only — **not** O10 |
| Email/phone verification token expiry | Verification row TTLs | Operational only — **not** O10 |
| Password-reset token expiry | Reset token TTLs | Operational only — **not** O10 |
| Booking idempotency `expires_at` | Replay safety | Operational only — **policy UNSET** |
| Notification retry / lease windows | Dispatcher backoff / lease | Operational only — **not** O10 |

```text
RETENTION POLICY NOT YET DECIDED
```

Until counsel sets periods and deletion rules: production patient accounts remain **BLOCKED** on O10 (see `docs/OPTION_B_PRODUCTION_RELEASE_READINESS_AUDIT.md` RB-002).

---

## Option B vs Option C (retention)

| Scope | In this inventory? | Status |
|---|---|---|
| Option B identity, appointments, notifications, audit/security, channel opt-in | **Yes** | Periods **UNSET** — LEGAL REVIEW REQUIRED |
| Option C clinical notes, assessments, clinical documents, clinical messaging | **No** — out of scope / DEFERRED | Do not invent clinical retention here (F4-09) |

---

## O-B-01 remediation note

O-B-01 (2026-08-30) **does not** invent retention or deletion periods, **does not** implement deletion workers, and **does not** close O10. Status remains:

**LEGAL / PROFESSIONAL REVIEW REQUIRED** / **NOT YET DECIDED**

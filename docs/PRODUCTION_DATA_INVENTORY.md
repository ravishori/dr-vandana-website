# Production Data Inventory

**Status:** Inventory of **implemented** Option B data. Clinical records are **not** included.  
Retention: **OPEN** (O10) wherever undefined.  
This is not a compliance attestation.

## Data flow

```text
Patient
  → Next.js Server Actions
  → PostgreSQL
  → Notification outbox
  → SMTP / Twilio (after commit)
  → Patient (email / WhatsApp if opted in)

Psychologist
  → Practice portal
  → Appointment operations (confirm, cancel, reschedule, …)
  → Same PostgreSQL + outbox path
```

External boundaries: SMTP provider, OTP/SMS vendor (when chosen), Twilio, Meta/WhatsApp, application host logs, future backup storage.

---

## IDENTITY DATA

| Item | Source | Table | Purpose | Recipient | Retention | Sensitivity |
|---|---|---|---|---|---|---|
| Email, mobile, password hash, status | Registration / provision | `users` | Account | App DB; email/OTP processors | OPEN | High |
| Display name | Registration | `patient_profiles` | Portal greeting | App DB | OPEN | Medium |
| Roles | Catalog / provision | `user_roles` | AuthZ | App DB | OPEN | Medium |
| Email verify / reset token hashes | Email flows | `email_verifications`, `password_reset_tokens` | Verify / reset | App DB (hash only) | OPEN | High |
| Phone OTP hashes | OTP flow | `phone_verifications` | Activation | OTP vendor (code in transit) | OPEN | High |
| TOTP secret (encrypted), recovery hashes | MFA enroll | `mfa_credentials`, `mfa_recovery_codes` | Privileged login | App DB | OPEN | High |
| Session token hashes | Login | `sessions` | AuthN | Browser cookie (opaque) | Session TTL | High |

## CONTACT DATA

| Item | Source | Table | Purpose | Recipient | Retention | Sensitivity |
|---|---|---|---|---|---|---|
| Patient email (verified) | `users` | notifications | Appointment email | SMTP | OPEN | High |
| Patient mobile (verified) | `users` | WhatsApp if opted in | Appointment WhatsApp | Twilio / Meta | OPEN | High |
| Psychologist email | `users` | notifications | Practice email | SMTP | OPEN | Medium |
| Public enquiry fields | `/book-appointment` | none (email only) | Enquiry | Practice inbox | Email provider | Medium |

## APPOINTMENT DATA

| Item | Source | Table | Purpose | Recipient | Retention | Sensitivity |
|---|---|---|---|---|---|---|
| Times, type, status, public id | Booking / lifecycle | `appointments` | Scheduling | Patient + psychologist portals | OPEN | Medium |
| Occupied range / buffers | Server-derived | `appointments` | Collision prevention | DB only | OPEN | Low |
| History | Mutations | `appointment_history` | Immutable trail | Psychologist detail (allow-listed) | OPEN | Medium |
| Operational cancel note | Psychologist cancel | `appointments.cancel_note` | Scheduling reason | Practice | OPEN | Low |
| Idempotency hashes | Booking | `booking_idempotency` | Replay safety | DB | OPEN | Low |

No diagnosis, clinical notes, assessments, treatment plans, or clinical documents.

## AUDIT DATA

| Item | Table | Purpose | Retention | Sensitivity |
|---|---|---|---|---|
| Actor, action, target, result, stripped metadata | `audit_logs` | Accountability | OPEN | Medium |

## SECURITY DATA

| Item | Table | Purpose | Retention | Sensitivity |
|---|---|---|---|---|
| Event type, hashed IP/UA, safe metadata | `security_events` | Abuse investigation | OPEN | Medium |
| OTP attempt outcomes (not codes) | `otp_attempts` | Rate / forensics | OPEN | Medium |

## NOTIFICATION DATA

| Item | Table | Purpose | Recipient | Retention | Sensitivity |
|---|---|---|---|---|---|
| Event key + non-sensitive payload | `appointment_notification_outbox` | Durable events | Worker | OPEN | Low |
| Channel, role, template, status | `appointment_notification_deliveries` | Dispatch | SMTP/Twilio | OPEN | Low |
| Attempt results | `appointment_notification_attempts` | Retry/dead-letter | Ops | OPEN | Low |
| WhatsApp opt-in flags / timestamps | `patient_profiles` | Consent | App | OPEN | Medium |

---

## Data minimization (responses)

Patient APIs return public ids, times, status labels, version. Booking JSON is tested to omit internal UUIDs. Psychologist lists omit email; detail includes patient email for operational contact (phone not returned). Outbox payload omits email/phone.

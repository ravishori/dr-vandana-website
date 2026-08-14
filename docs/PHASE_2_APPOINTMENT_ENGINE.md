# Phase 2 Appointment Engine

**Status:** Phase 2H gate preparation in code/docs; **not** a production launch  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.

This document describes the appointment domain through **Phase 2F (Notification Architecture)**. Phase 2G is the end-to-end security and reliability audit (`docs/PHASE_2G_SECURITY_RELIABILITY_AUDIT.md`). It is **not** legal advice and does **not** claim DPDP or professional-ethics compliance.

**PRODUCTION remains BLOCKED.** Patient registration stays disabled. This phase does not deploy, choose a PostgreSQL vendor, enable OTP, or activate production SMTP/Twilio WhatsApp.

---

## Milestone status

| Milestone | Status |
|---|---|
| Phase 2A — appointment schema, types, hours, exceptions, history, state model | Present in `drizzle/0003_appointment_engine.sql` and `src/lib/appointments/` |
| Phase 2B — server-side availability and slot engine | Present in `src/lib/appointments/availability.ts` |
| Phase 2C — secure appointment booking workflow | Present in `src/lib/appointments/booking.ts` |
| Phase 2D — psychologist appointment management and lifecycle | Present in `src/lib/appointments/lifecycle.ts` |
| Phase 2E — patient appointment portal and history | Present in `src/lib/appointments/patient-portal.ts` |
| Phase 2F — notification outbox, email, Twilio WhatsApp | Present |
| Phase 2G — security, reliability, and production-gate audit | `docs/PHASE_2G_SECURITY_RELIABILITY_AUDIT.md` — **PRODUCTION BLOCKED** |
| Phase 2H — production readiness remediation and gate preparation | `docs/PHASE_2H_PRODUCTION_READINESS_REPORT.md` — **PRODUCTION BLOCKED** |
| Production notification activation | **Not done** — SMTP/Twilio secrets, templates, opt-in legal review, worker hosting |

---

## Domain model (Phase 2A)

PostgreSQL is the system of record. Tables:

- `appointment_types` — public id `ATY-…`, duration and buffers from configuration
- `practice_appointment_settings` — timezone, slot granularity, booking-window fields (nullable until configured)
- `practice_hours` / `practice_hour_breaks` — ISO weekday 1–7, local `time` values
- `availability_exceptions` — `FULL_DAY_CLOSURE`, `CUSTOM_AVAILABILITY`, `UNAVAILABLE_PERIOD`
- `appointments` — public id `APT-…`, `timestamptz` instants, occupied range including buffers, optimistic `version`
- `appointment_history` — append-only (trigger rejects `UPDATE`/`DELETE`)
- `appointment_notification_outbox` — durable domain events; dispatcher expands to deliveries
- `appointment_notification_deliveries` / `appointment_notification_attempts` — Phase 2F channel attempts
- `booking_idempotency` — Phase 2C; scoped to authenticated user + `appointment.request`

`btree_gist` is created so `EXCLUDE USING gist` can combine `psychologist_user_id =` with `tstzrange(occupied_starts_at, occupied_ends_at, '[)') &&` for blocking statuses. PGlite test runtimes may skip the constraint; occupancy queries still use `tstzrange`.

---

## Blocking statuses

Calendar occupancy (availability **and** the exclusion constraint) uses:

```text
PENDING
CONFIRMED
RESCHEDULE_REQUESTED
```

These **do not** block:

```text
CANCELLED
REJECTED
COMPLETED
NO_SHOW
```

`REQUESTED` is retained on the status check constraint for the approved state model. After successful validation, Phase 2 treats a stored request as `PENDING` (history records `REQUESTED`). `RESCHEDULED` is a **history event only**, not a durable current status.

---

## Availability & Slot Engine

### Timezone

Practice timezone: **Asia/Kolkata**.

| Layer | Rule |
|---|---|
| Storage | `timestamptz` (UTC instants) |
| Hours / breaks / civil dates | Converted with `Intl` IANA data, not a hard-coded `+05:30` offset |
| Display / slot dates | `YYYY-MM-DD` and ISO-8601 instants in the practice zone |
| Server local TZ | Ignored |

India does not observe DST. Tests cover January/July offset stability, midnight, month/year boundaries, and leap day.

### Interval semantics

Half-open intervals **`[start, end)`**.

- A slot may **end exactly at closing**.
- A slot may **not start at closing** or extend past it.
- Adjacent appointments that meet at an instant do **not** overlap.
- Buffers extend the **occupied** range; occupancy is also `[start, end)`.
- PostgreSQL uses `tstzrange(..., '[)')` for the same bounds.

### Slot generation (deterministic)

```text
Practice hours for the local weekday
    ↓
FULL_DAY_CLOSURE → no windows
    ↓ else CUSTOM_AVAILABILITY (union) replaces weekday hours
    ↓ else subtract practice_hour_breaks
    ↓
Subtract UNAVAILABLE_PERIOD (partial closure)
    ↓
Walk remaining windows at configured slot granularity
    ↓
Keep candidates whose duration fits in a window
    ↓
Apply appointment-type buffer before/after → occupied range
    ↓
Remove occupied ranges that tstzrange-overlap blocking appointments
    ↓
Remove starts at or before now + minimum_notice
    ↓
Remove dates after today + maximum_advance_days
    ↓
Return { date, timezone, appointmentType, slots: [{ start, end }] }
```

Clock injection: `IdentityContext.now()` (tests use a fixed instant, not `Date.now()`).

### Exception priority

Deterministic, in this order:

1. **FULL_DAY_CLOSURE** on that local date wins (including over custom hours).
2. **CUSTOM_AVAILABILITY** on that local date **replaces** weekday hours. Weekday breaks are **not** applied to custom windows. Multiple custom rows for the same date are **unioned**.
3. Otherwise **active weekday hours**, then **breaks**.
4. **UNAVAILABLE_PERIOD** always subtracts from the resolved windows (partial closure / one-off unavailability).

No public holidays are hard-coded.

### Duration and buffers

Read from `appointment_types`. Not production policy. Tests use **TEST FIXTURE ONLY** values (for example 30 minutes duration, 10 minutes buffer after).

Occupied range written on appointments:

```text
occupied_starts_at = starts_at − buffer_before
occupied_ends_at   = ends_at + buffer_after
```

### Existing appointments

Availability loads blocking occupied ranges with PostgreSQL:

```sql
tstzrange(occupied_starts_at, occupied_ends_at, '[)')
  &&
tstzrange($dayStart, $dayEnd, '[)')
```

filtered to the psychologist and blocking statuses. `isSlotAvailable()` repeats a `tstzrange` overlap check. Application code does not treat timestamp **strings** as overlap authority.

### Booking window

`practice_appointment_settings.minimum_notice_minutes` and `maximum_advance_days` are nullable (**OPEN**). When null, only “start must be strictly after the injected clock” applies for past-slot exclusion. Tests assign explicit fixture numbers. No production notice/advance values are committed as policy.

### Public output

`getAvailableSlots` / `getPracticeAvailability` / `isSlotAvailable` return only:

- local date
- timezone
- appointment type public id, name, duration
- slot `start` / `end` ISO instants
- or a safe unavailable reason

They do **not** return database UUIDs, patient ids, appointment ids, statuses, notes, or clinical content.

### Advisory vs authoritative

**Availability is advisory.** A listed slot “currently appears available.”

**Transactional booking is authoritative.** The booking workflow reloads current configuration, recalculates the slot, and commits inside a PostgreSQL transaction. The occupied-range exclusion constraint is the final authority for overlap. `AvailabilityService.isSlotAvailable()` must not be treated as a reservation.

Listing a slot does **not** authorize a patient to book it. Authentication and ownership checks belong to the booking workflow.

---

## Secure Booking Workflow

Phase 2C implements authenticated patient booking only.

```text
Patient selects a displayed slot
        ↓
Server authenticates the practice session
        ↓
Server requires PATIENT + ACTIVE + email verified + mobile verified
        ↓
Rate limit (per IP and per patient)
        ↓
BEGIN
  Resolve appointment type (public id only)
  Derive psychologist from the type (never from the client)
  pg_advisory_xact_lock(psychologist)
  Claim user-scoped idempotency key
  Reload type, hours, exceptions, occupancy from the transaction
  Validate start against current configuration (advisory preflight)
  Calculate end = start + type.duration
  Calculate occupied range = consultation ± buffers
  INSERT appointment status PENDING
  INSERT appointment_history (CREATED → REQUESTED, REQUESTED → PENDING)
  INSERT appointment_notification_outbox (AppointmentRequested, PENDING)
  INSERT audit_logs APPOINTMENT_REQUESTED SUCCESS
  Store idempotency result
COMMIT
        ↓
Safe confirmation (public id, type, date, start, end, timezone, status)
```

If any step throws, the transaction rolls back. No partial appointment, history row, or outbox row remains.

### Authentication

Identity comes from the existing Phase 1 practice session (`drv_practice_session`). There is no second patient auth mechanism.

Required:

- Authenticated session
- Role `PATIENT` from server-side RBAC (not from the request body)
- Account `ACTIVE`
- `emailVerifiedAt` and `mobileVerifiedAt` set

Rejected: unauthenticated, `PENDING_VERIFICATION`, `SUSPENDED`, `DISABLED`, psychologist/staff/admin.

The client must not supply `patientUserId`, `patientProfileId`, `psychologistId`, `appointmentStatus`, `appointmentEnd`, `createdBy`, or `actorId`. Extra fields are ignored.

### Request validation

Accepted input: `appointmentTypePublicId`, `requestedStart`, optional `idempotencyKey`.

Appointment type must exist, be active, have `duration_minutes > 0`, and non-negative buffers. Duration and buffers are read from the database.

`requestedStart` is parsed as an instant. Consultation end is **not** accepted from the client:

```text
ends_at = starts_at + appointment_types.duration_minutes
```

Buffers are **resource occupancy**, not patient-facing duration:

```text
occupied_starts_at = starts_at − buffer_before
occupied_ends_at   = ends_at + buffer_after
```

The patient response uses consultation `start` / `end` only.

### Availability preflight vs transaction

`AvailabilityService` remains the slot calculator. Booking calls `loadSlotContext` **on the transaction client after the psychologist advisory lock**, then checks:

1. Structural exact slot (hours, breaks, exceptions, notice, advance, duration) with occupancy ignored
2. Occupied-range overlap against blocking statuses (`PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`)
3. `INSERT` — PostgreSQL `EXCLUDE USING gist` on psychologist + `tstzrange(occupied, '[)')` is the last check

PGlite test runtimes may skip `btree_gist`. Application code still serializes with `pg_advisory_xact_lock` and occupancy queries. CI job `appointment-pg-concurrency` runs the same race against PostgreSQL 16 where the exclusion constraint is present.

Isolation remains default `READ COMMITTED`. Advisory lock serializes bookings per psychologist; the exclusion constraint is the safety net. Isolation is not raised globally.

### Idempotency

Table `booking_idempotency` (migration `0004_booking_idempotency.sql`):

- Unique `(user_id, operation, key_hash)`
- `operation` = `appointment.request`
- Key is HMAC-hashed with purpose `booking-idempotency`; raw keys are not stored
- Fingerprint is HMAC of `appointmentTypePublicId|startsAt ISO`
- Result payload stores only the patient-facing view or a safe error

Same patient + same key + same fingerprint → same result, no second appointment.  
Same patient + same key + different slot → `IDEMPOTENCY_CONFLICT`.  
Patient B reusing Patient A’s key hashes to a different row and cannot read A’s appointment.

Missing keys are replaced with a server-generated UUID (no replay for that request). Keys are 8–128 characters `[A-Za-z0-9_.:-]`.

### Appointment state

Durable status after a successful patient request: **`PENDING`**.

History in the same transaction:

1. `CREATED` (`null` → `REQUESTED`)
2. `REQUESTED` (`REQUESTED` → `PENDING`)

Not auto-`CONFIRMED`. Cancellation, reschedule, complete, and no-show are Phase 2D.

### History, outbox, audit

History is append-only (Phase 2A trigger). Metadata is public ids only — no passwords, OTPs, session tokens, or clinical content.

Outbox event `AppointmentRequested` is inserted as `PENDING`. **No email, WhatsApp, or SMS is sent.** Delivery is a later phase. If outbox insert fails, the appointment rolls back.

Audit action `APPOINTMENT_REQUESTED`:

- `SUCCESS` with actor, appointment public id, type public id, status
- `DENIED` for unauthenticated / forbidden attempts

### Error handling

Technical PostgreSQL details (constraint names, `23P01`, SQLSTATE) are never returned to the client. Occupancy / exclusion conflicts use:

“Sorry, this time is no longer available. Please choose another time.”

Other safe copy:

| Case | Message |
|---|---|
| Unauthenticated | Please sign in to request an appointment. |
| Type missing/inactive | This appointment type is currently unavailable. |
| Outside hours / break / closure / window | This time is not available. |
| Rate limited | Please wait a little while before trying again. |

### Rate limiting

Uses the identity rate-limiter (memory in tests; Upstash in production if configured):

- `appointment-book-ip:{ip}` — 10 / 15 minutes
- `appointment-book-user:{userId}` — 10 / 15 minutes
- Slot listing: 20 / 15 minutes per user+IP

Not CAPTCHA. Not a one-appointment-per-day rule (not approved).

### Current psychologist scope

Phase 2 models **one psychologist per appointment type**, derived from `appointment_types.psychologist_user_id`. Concurrent bookings for different psychologists are not implemented as a product feature. If two types share the same psychologist, their occupied ranges conflict. Do not invent multi-practice booking.

### UI

Minimum authenticated page: `/patient/appointments/new`.

It can choose type, date, load slots, submit, and show the recorded request. There is **no** patient appointment list, cancel, reschedule, or psychologist dashboard.

`/book-appointment` enquiry is unchanged and is not converted into appointments.

### What Phase 2C does not implement

- Cancellation, reschedule, complete, no-show
- Psychologist appointment dashboard
- Patient appointment history beyond the booking confirmation
- Email / WhatsApp / SMS / reminders
- Clinical records, documents, payments, teleconsultation, calendar sync
- Super Admin dashboard, child accounts, staff booking


### Queries

For one local day the engine loads: settings (1), hours (1), breaks for those hours (1), exceptions (1), blocking occupied ranges overlapping the day (1). No N+1 per slot. Redis is not used.

---

## TEST FIXTURE ONLY values

Used in automated tests / `seedTestPracticeConfiguration`. **Not** Dr. Vandana’s real hours.

| Setting | Test fixture |
|---|---|
| Hours | Monday–Friday 10:00–18:00 IST |
| Break | 13:00–14:00 |
| Duration | 30 minutes (additional tests use 15 / 90 / 300) |
| Slot granularity | 15 minutes |
| Buffer after | 10 minutes (0 in some overlap cases) |
| Minimum notice | 0 (120 minutes in booking-window tests) |
| Maximum advance | 14 days (3 days in a window test) |

---

## Authorization (Phase 2B / 2C)

The availability service does not expose a public HTTP route. Booking uses the Phase 1 practice session and `AuthorizationService`. Psychologist identity is derived from the **appointment type**, not a client-supplied psychologist UUID.

---

## Phase 2D — Psychologist Appointment Management

Phase 2D lets the authenticated psychologist manage appointment requests and lifecycle events. It is operational, not clinical. No EHR, notes, assessments, or documents.

### Authorization

Every psychologist mutation and list/detail read requires:

- Phase 1 practice session (`/psychologist/practice/login`)
- Role `PSYCHOLOGIST` (not question-portal HMAC)
- Permission `MANAGE_APPOINTMENT_SETTINGS`
- MFA completed (`AuthorizationService`)
- Account `ACTIVE`
- **Practice ownership:** `appointments.psychologist_user_id = session user`

`SUPER_ADMIN` does **not** receive all appointments. `STAFF` has no lifecycle authority. Patients cannot confirm, reject, complete, or mark no-show. Patient **cancellation** is supported in the domain (no patient UI in this phase).

### Psychologist UI

- `/psychologist/practice/appointments` — server-filtered, paginated list (limit 20, max 50)
- `/psychologist/practice/appointments/[publicId]` — operational detail + history + actions

Filters: today, upcoming, pending, confirmed, completed, cancelled, no-show, rejected, date range. Sort whitelist: `starts_at_asc` / `starts_at_desc`. Default upcoming nearest-first; historical newest-first.

List query joins appointment, type, and patient display name in one statement (no N+1, no clinical tables). Detail may show patient display name, public id, and email as operational contact. No passwords, OTP, MFA, DOB, gender, or emergency contact.

Action buttons are derived from the state machine. UI visibility is not authorization.

### Lifecycle transitions

Centralized in `AppointmentStateMachine`. The client cannot set status.

| Action | From | Actor | To | History | Outbox | Audit |
|---|---|---|---|---|---|---|
| CONFIRM | PENDING | PSYCHOLOGIST | CONFIRMED | CONFIRMED | AppointmentConfirmed | APPOINTMENT_CONFIRMED |
| REJECT | PENDING | PSYCHOLOGIST | REJECTED | REJECTED | AppointmentRejected | APPOINTMENT_REJECTED |
| CANCEL | PENDING, CONFIRMED, RESCHEDULE_REQUESTED | PATIENT or PSYCHOLOGIST | CANCELLED | CANCELLED | AppointmentCancelled | APPOINTMENT_CANCELLED |
| RESCHEDULE | CONFIRMED, RESCHEDULE_REQUESTED | PSYCHOLOGIST | CONFIRMED | RESCHEDULED | AppointmentRescheduled | APPOINTMENT_RESCHEDULED |
| COMPLETE | CONFIRMED | PSYCHOLOGIST | COMPLETED | COMPLETED | AppointmentCompleted | APPOINTMENT_COMPLETED |
| NO_SHOW | CONFIRMED | PSYCHOLOGIST | NO_SHOW | NO_SHOW | AppointmentNoShow | APPOINTMENT_NO_SHOW |

`RESCHEDULED` is a **history event**. Current status after a successful psychologist reschedule is `CONFIRMED`.

Terminal: `CANCELLED`, `REJECTED`, `COMPLETED`, `NO_SHOW`. No reopen transitions.

### Blocking after lifecycle changes

Unchanged from Phase 2A:

Blocking: `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`  
Non-blocking: `CANCELLED`, `REJECTED`, `COMPLETED`, `NO_SHOW`

Appointments are never deleted. Status change removes them from the exclusion constraint and occupancy queries. Slots become bookable again.

### Confirmation

Transaction: `SELECT … FOR UPDATE` + `version` CAS. Re-validates that the existing start is still an exact practice slot and that no **other** blocking occupancy overlaps (self excluded). Concurrent confirms: one success, the other stale / already confirmed.

### Cancellation policy (OPEN)

`practice_appointment_settings.cancellation_minimum_notice_minutes` is nullable.

- `null`: no extra window (state machine only)
- set: **patient** cancel is refused when `starts_at < now + notice` (TEST FIXTURE values in tests)
- psychologist cancel is **not** window-restricted in this phase because “psychologist may cancel at any time” remains **OPEN**

Do not treat fixture numbers as production policy. Actor is recorded as `PATIENT`, `PSYCHOLOGIST`, or never invented.

### Rescheduling

Same psychologist calendar lock as booking (`pg_advisory_xact_lock`). New start is validated like booking. Duration and buffers are recalculated from the current appointment type.

The row is **updated in place** (new `starts_at` / `ends_at` / occupied range) so the old occupancy is replaced atomically. There is no delete-then-insert. If the new slot is unavailable, the original row is unchanged and no `RESCHEDULED` history is written.

Copy: “This time is no longer available. Please choose another time.”

Reschedule **window** is not implemented (OPEN). Direct psychologist reschedule is immediately `CONFIRMED` (not a patient request). Patient `REQUEST_RESCHEDULE` remains in the state machine for Phase 2E.

### Concurrency

- Confirm race: row lock + version
- Complete vs no-show: only one terminal state
- Reschedule onto the same slot: occupancy + exclusion
- Cancel vs reschedule: one winner; the other stale/invalid

Isolation remains `READ COMMITTED`. Advisory lock is for calendar occupancy changes (booking + reschedule). Status-only transitions use row `FOR UPDATE` + `version`.

### History, audit, outbox

Every successful transition appends immutable history, an outbox row (`PENDING`), and an audit `SUCCESS` in the **same transaction**. Rollback tests cover update/history/outbox failures. **No email, WhatsApp, or SMS is sent.**

Outbox payloads: appointment public id, status, start, end, timezone. No clinical content.

### Unresolved policy (still OPEN)

Cancellation window production value, whether psychologist cancel is always allowed, patient-cancel approval, reschedule minimum notice, practice hours, duration, buffers, notification provider. Tests use **TEST FIXTURE ONLY** values.

---

## Phase 2E — Patient Appointment Portal

Phase 2E exposes the existing appointment domain to the authenticated patient. It does not add clinical records, Super Admin views, or notification delivery.

### Authorization

Every patient portal read and mutation requires:

- Phase 1 practice session (`drv_practice_session`)
- Role `PATIENT`
- Account `ACTIVE`
- Email verified
- Mobile verified

Identity is taken from the session only. Client-supplied patient IDs, roles, status, psychologist IDs, duration, end time, and occupied range are ignored.

### Ownership

List and detail queries always include:

`appointments.patient_user_id = authenticated_session.user_id`

Detail and mutations also require the public appointment ID. Missing and unauthorized IDs return the same message: “This appointment cannot be accessed.” Existence of another patient’s appointment is not leaked.

`SUPER_ADMIN` and `STAFF` do not receive patient portal access. Psychologists cannot use `/patient/appointments`.

### Patient UI

- `/patient/appointments` — home (pending requests + upcoming confirmed) and filtered lists
- `/patient/appointments/history` — completed, cancelled, rejected, no-show
- `/patient/appointments/[publicId]` — operational detail, patient-visible history, actions
- `/patient/appointments/new` — existing booking page; success links to “View my appointments”

Filters (whitelist): upcoming, pending, confirmed, completed, cancelled, rejected, no-show, history, date range. Server-side pagination (default 20, max 50). Upcoming nearest-first; history newest-first.

Times are formatted in **Asia/Kolkata (IST)** using server timezone utilities, not the browser timezone.

### Patient-facing status

| Internal | Patient copy |
|---|---|
| PENDING | Appointment request pending |
| CONFIRMED | Appointment confirmed |
| RESCHEDULE_REQUESTED | Reschedule requested |
| CANCELLED | Cancelled |
| REJECTED | Request not accepted |
| COMPLETED | Appointment completed |
| NO_SHOW | Appointment marked as no-show |

PENDING is never described as confirmed. Copy: “Your appointment request has been submitted and is awaiting confirmation.”

Patient history uses labels such as “Appointment requested” and actors **You** / **Psychologist**. No audit logs, UUIDs, or security metadata.

### Cancellation

The portal calls Phase 2D `cancelAppointment`. UI hiding is not authorization. Confirmation dialog: “Are you sure you want to cancel this appointment?” Success: “Your appointment has been cancelled.” No notification promise.

`cancellation_minimum_notice_minutes` remains nullable and **OPEN**. `null` means no extra window. When set, the server enforces it for patients. Tests use **TEST FIXTURE ONLY** values.

### Rescheduling

Patients cannot call psychologist `RESCHEDULE` (immediate move). They may `REQUEST_RESCHEDULE` from `CONFIRMED`:

- Patient selects a proposed start (availability is advisory)
- Server recalculates duration/buffers, verifies occupancy, and stores `proposed_starts_at` / `proposed_ends_at`
- Current `starts_at` / occupied range stay in place (`RESCHEDULE_REQUESTED` remains blocking)
- History: `RESCHEDULE_REQUESTED`; current status is not `RESCHEDULED`
- Copy: “Your reschedule request has been submitted and is awaiting confirmation.”

If the proposed slot is unavailable: “This time is no longer available. Please choose another time.” Original appointment unchanged.

The psychologist may **accept** (move to the proposed slot, history `RESCHEDULED`, status `CONFIRMED`) or **decline** (clear proposal, remain `CONFIRMED`). Accept uses the same occupancy + exclusion protection as booking. Reschedule window remains **OPEN**.

### Data minimization

Portal responses include appointment public ID, type name, times, status, version, and allowed actions. They do not include email, mobile, psychologist internal IDs, audit rows, or other patients.

### Concurrency

Patient cancel vs psychologist cancel: one winner. Patient reschedule request vs psychologist cancel: one winner. Patient proposed slot vs another booking: at most one occupant of the target range. PostgreSQL remains authoritative.

### Unresolved policy (still OPEN)

Same as Phase 2D: cancellation window production value, reschedule notice, practice hours, duration, buffers. Notification production activation is Phase 2F and remains **OPEN**.

---

## Phase 2F — Notification Architecture

Notification delivery is **never** part of the appointment transaction.

```text
DOMAIN TRANSACTION (appointment + history + audit + outbox)
        ↓ commit
notification_outbox
        ↓
NotificationDispatcher (claim / retry / dead-letter)
        ↓
EmailService          WhatsAppService
        ↓                      ↓
Nodemailer SMTP       TwilioWhatsAppProvider
                              ↓
                     Twilio WhatsApp Business API
```

If SMTP or Twilio is down, times out, or returns an error, the appointment row stays committed. If the outbox insert fails, the appointment transaction rolls back.

There is no public `POST /api/send-notification` route. Outbox rows are created only by authorized booking/lifecycle mutations. Recipients, channels, templates, and Twilio destinations cannot be supplied by the client.

### Outbox states

| Status | Meaning |
|---|---|
| `PENDING` | Written by the domain transaction; not fully processed |
| `PROCESSING` | Reserved for claimed work / compatibility |
| `RETRY` | Transient provider failure; `next_attempt_at` is set |
| `SENT` | All deliveries are `SENT` or `SKIPPED` (or the event is policy-skipped) |
| `FAILED` | Retained on the CHECK constraint; the dispatcher writes `DEAD` |
| `DEAD` | Permanent failure or retry exhaustion (dead-letter) |

Deliveries also use `SKIPPED` when email is unverified, WhatsApp opt-in is missing, or a channel is disabled.

Processing is **at-least-once**. Exactly-once delivery is not guaranteed. Dedup is `(outbox_id, channel, recipient_role)` plus a stable delivery id used as the Twilio `I-Twilio-Idempotency-Token`. Provider timeouts after a successful accept can still duplicate; tests assert worker-restart safety after a recorded `SENT`.

### Dispatcher / worker

`processNotificationBatch` expands due outbox rows, claims deliveries with `SELECT … FOR UPDATE SKIP LOCKED`, sends independently, and records attempts. A crashed worker leaves `PROCESSING` + `locked_at`; another worker may reclaim after the lease.

Hosting is compatible with scheduled/serverless invocation. `npm run notifications:process` is a **development/test** command (refuses `NODE_ENV=production`). Production worker hosting (O15) remains **OPEN**. Batch size, lease, backoff, and max attempts are configurable; production values are not an approved SLA.

### Email

Appointment code does not import Nodemailer. The dispatcher calls `EmailService.send` through a classified adapter with an explicit timeout. Existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and `SMTP_FROM_NAME` are reused. `EMAIL_PROVIDER=test|mock` is refused in production. Unverified patient/psychologist email is not used (`email_verified_at` required).

### Twilio WhatsApp

`WhatsAppService.sendTemplateMessage` is the only WhatsApp port. `TwilioWhatsAppProvider` is the infrastructure adapter (HTTP to Twilio Messages + ContentSid). Appointment services do not import Twilio.

Production remains fail-closed:

- `TWILIO_WHATSAPP_ENABLED=false` by default
- missing Account SID, Auth Token, or sender → not configured
- missing Content SID → `MISSING_TEMPLATE` (permanent)
- `WHATSAPP_PROVIDER=test|mock|sandbox` refused in production
- Twilio Sandbox is not a production sender

Verified mobile is **not** consent. WhatsApp is created only when dispatch is enabled **and** `patient_profiles.whatsapp_notifications_enabled` with a later opt-in than opt-out. Destination is the authenticated profile `mobile_normalized`, never a client-supplied number. No SMS fallback, no `wa.me`, no Bitly. The public site WhatsApp CTA is unchanged and is not this dispatcher.

Twilio Message SID is stored as `provider_message_id`. Auth tokens and authorization headers are not stored or logged.

### Templates

Central registry in `src/lib/notifications/templates.ts`. Logical keys such as `appointment_confirmed` are mapped to Twilio Content SIDs only inside the Twilio adapter (`TWILIO_TEMPLATE_*`). Missing variables do not send. Subjects are `Appointment update from Dr. Vandana`. Copy is operational and must not include diagnosis, symptoms, notes, assessment, or treatment detail. Psychologist rejection notes are not sent to patients.

Completion and no-show events are written to the outbox; email/WhatsApp stay off unless `NOTIFICATION_COMPLETED_EMAIL` / `NOTIFICATION_NO_SHOW_EMAIL` are explicitly true. That communication policy is **OPEN**.

### Recipients

Patient and psychologist only. Super Admin and staff are not notified. Psychologist WhatsApp is not sent (no psychologist WhatsApp consent model).

### Privacy, logs, retention

Payloads hold public appointment id, type, times, and timezone — not emails, phones, OTPs, passwords, MFA, session tokens, or clinical content. Logs use event key, channel, role, error category, and latency. Retention of delivery/attempt rows is **OPEN** (O10). Production copy, WhatsApp opt-in wording, processor terms, and Twilio/Meta cross-border processing still require legal/privacy review (O11, O18). This implementation does not claim DPDP, HIPAA, or medical compliance.

Twilio/Meta WhatsApp **pricing is not encoded**. Recheck current Twilio pricing before production activation (noted 14 August 2026; no price figures recorded).

### Observability

Batch logs: expanded, claimed, sent, retry, dead, skipped. Provider latency and normalized error codes. Dead deliveries may write `NOTIFICATION_DELIVERY_DEAD` audit rows (channel, role, error code only). Consent changes write `PATIENT_WHATSAPP_OPT_IN` / `PATIENT_WHATSAPP_OPT_OUT`.

---

## What later phases still do not implement

Phase 2F added asynchronous email and Twilio WhatsApp dispatch. Still not implemented:

- Super Admin appointment console or provider-secret UI
- Clinical records, documents, payments, teleconsultation, calendar sync
- Marketing, bulk, or promotional WhatsApp
- Production worker scheduling

The public `/book-appointment` enquiry form is unchanged and is **not** this engine.

---

## Legal / privacy

Appointment accounts and booking will require updates to Privacy Policy, Terms, appointment policy, cancellation policy, and consent wording. Marked **REQUIRES REVIEW**. This milestone does not change legal copy or claim compliance.

---

## Production blockers

Phase 1C gates remain: PostgreSQL provider/region, OTP provider, SMTP, privacy/terms/consent, MFA recovery, production secrets, backups, monitoring, deployment verification, security review, `PATIENT_REGISTRATION_ENABLED=false`.

Phase 2F adds: Twilio production account/sender/template approval, WhatsApp opt-in legal wording, notification retention, worker hosting, and data-residency review for Twilio/Meta. Notification infrastructure is implemented; production provider activation is **not** complete.

Phase 2G did **not** close those gates. See `docs/PHASE_2G_SECURITY_RELIABILITY_AUDIT.md`.

---

## Testing

- Pure slot-generation tests with an injected clock
- PGlite tests reading hours, exceptions, and `tstzrange` occupancy
- Booking authz, validation, idempotency, IDOR, rate-limit, and rollback tests
- Lifecycle transitions, dashboard filters, IDOR, history immutability, rollback
- Patient portal ownership, filters, pagination, cancellation, reschedule request, and IDOR
- PGlite concurrent booking, lifecycle, and patient-portal tests
- Dispatcher claim/retry/dead-letter, email/Twilio failure, opt-in, privacy, and isolation tests
- Optional PostgreSQL 16 concurrent tests when `APPOINTMENT_PG_URL` is set (CI job `appointment-pg-concurrency`, including notification claiming)
- Identity tests remain in the suite

Run: `npm test` (includes `src/lib/appointments/**/*.test.ts` and `src/lib/notifications/**/*.test.ts`). Dev/test dispatch: `npm run notifications:process`.

# Phase 2 Appointment Engine

**Status:** Phase 2C implemented in code; **not** a production launch  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.

This document describes the appointment domain through **Phase 2C (Secure Appointment Booking)**. It is **not** legal advice and does **not** claim DPDP or professional-ethics compliance.

**PRODUCTION remains BLOCKED.** Patient registration stays disabled. This phase does not deploy, choose a PostgreSQL vendor, enable OTP, or send appointment notifications.

---

## Milestone status

| Milestone | Status |
|---|---|
| Phase 2A — appointment schema, types, hours, exceptions, history, state model | Present in `drizzle/0003_appointment_engine.sql` and `src/lib/appointments/` |
| Phase 2B — server-side availability and slot engine | Present in `src/lib/appointments/availability.ts` |
| Phase 2C — secure appointment booking workflow | **This document** |
| Phase 2D — psychologist appointment management and lifecycle | **Not started** |
| Patient appointment history / cancel / reschedule UI | **Not started** |
| Notifications (email / WhatsApp / reminders) | **Not implemented** |

---

## Domain model (Phase 2A)

PostgreSQL is the system of record. Tables:

- `appointment_types` — public id `ATY-…`, duration and buffers from configuration
- `practice_appointment_settings` — timezone, slot granularity, booking-window fields (nullable until configured)
- `practice_hours` / `practice_hour_breaks` — ISO weekday 1–7, local `time` values
- `availability_exceptions` — `FULL_DAY_CLOSURE`, `CUSTOM_AVAILABILITY`, `UNAVAILABLE_PERIOD`
- `appointments` — public id `APT-…`, `timestamptz` instants, occupied range including buffers, optimistic `version`
- `appointment_history` — append-only (trigger rejects `UPDATE`/`DELETE`)
- `appointment_notification_outbox` — foundation only; **no sender in Phase 2**
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

## What later phases still do not implement

Phase 2C added `/patient/appointments/new` only. Still not implemented:

- Confirm, reject, cancel, reschedule, complete, no-show
- `/patient/appointments` list/history and `/psychologist/practice/appointments`
- Super Admin dashboard
- Email / WhatsApp / SMS / reminders
- Clinical records, documents, payments, teleconsultation, calendar sync

The public `/book-appointment` enquiry form is unchanged and is **not** this engine.

---

## Legal / privacy

Appointment accounts and booking will require updates to Privacy Policy, Terms, appointment policy, cancellation policy, and consent wording. Marked **REQUIRES REVIEW**. This milestone does not change legal copy or claim compliance.

---

## Production blockers

Phase 1C gates remain: PostgreSQL provider/region, OTP provider, SMTP, privacy/terms/consent, MFA recovery, production secrets, backups, monitoring, deployment verification, security review, `PATIENT_REGISTRATION_ENABLED=false`.

---

## Testing

- Pure slot-generation tests with an injected clock
- PGlite tests reading hours, exceptions, and `tstzrange` occupancy
- Booking authz, validation, idempotency, IDOR, rate-limit, and rollback tests
- PGlite concurrent booking tests (advisory lock + occupancy)
- Optional PostgreSQL 16 concurrent exclusion test when `APPOINTMENT_PG_URL` is set (CI job `appointment-pg-concurrency`)
- Identity tests remain in the suite

Run: `npm test` (includes `src/lib/appointments/**/*.test.ts`).

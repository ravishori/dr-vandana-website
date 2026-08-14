# Phase 2 Appointment Engine

**Status:** Phase 2B implemented in code; **not** a production launch  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.

This document describes the appointment domain through **Phase 2B (Availability & Slot Engine)**. It is **not** legal advice and does **not** claim DPDP or professional-ethics compliance.

**PRODUCTION remains BLOCKED.** Patient registration stays disabled. This phase does not deploy, choose a PostgreSQL vendor, enable OTP, or send appointment notifications.

---

## Milestone status

| Milestone | Status |
|---|---|
| Phase 2A — appointment schema, types, hours, exceptions, history, state model | Present in `drizzle/0003_appointment_engine.sql` and `src/lib/appointments/` |
| Phase 2B — server-side availability and slot engine | **This document** |
| Phase 2C — secure appointment booking workflow | **Not started** |
| Patient / psychologist appointment UI | **Not started** |
| Notifications (email / WhatsApp / reminders) | **Not implemented in Phase 2** |

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

**Booking (Phase 2C)** remains the authority: a database transaction, per-psychologist locking, and the PostgreSQL exclusion constraint. The slot engine must not be treated as a reservation.

Listing a slot does **not** authorize a patient to book it. Authentication and ownership checks belong to the booking workflow.

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

## Authorization (Phase 2B)

The availability service does not expose a public HTTP route and does not bypass identity. Callers in later phases must authenticate independently. Psychologist identity for slots is derived from the **appointment type**, not a client-supplied psychologist UUID.

---

## What Phase 2B does not implement

- Patient booking, confirm, reject, cancel, reschedule, complete, no-show
- `/patient/appointments` and `/psychologist/practice/appointments`
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
- Identity tests remain in the suite

Run: `npm test` (includes `src/lib/appointments/**/*.test.ts`).

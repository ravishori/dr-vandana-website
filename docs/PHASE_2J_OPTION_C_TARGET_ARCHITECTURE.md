# Phase 2J — Option C Target Architecture

**Status:** BLUEPRINT ONLY.  
**Date:** 14 August 2026  

Current Phase 1–2 stack remains authoritative. Option C extends it; it does not replace it.

---

## Authoritative stack

```text
Next.js
+ PostgreSQL
+ Drizzle
+ Server-side sessions
+ RBAC + ownership
+ MFA (privileged)
+ Audit logging
+ Appointment engine (transactions + exclusion)
+ Notification outbox
+ Private object storage + signed URLs   ← Option C addition
```

Forbidden for production clinical data: SQLite, JSON snapshots, local app filesystem vaults, public buckets, mock OTP/WhatsApp in production.

---

## Clinical domain path

```text
Patient / Psychologist
  → Next.js Server Actions / Route Handlers
  → Server-side authorization
       (session + role + permission + relationship)
  → Clinical domain services
  → PostgreSQL (metadata + notes ciphertext/refs)
```

## Documents path

```text
Patient / Psychologist
  → Authenticated request
  → Authorization
  → Mint short-lived signed URL
  → Private object storage
  → Client download
```

Never stream from Git or public `/public`. Prefer not to proxy unbounded files through the serverless app when signed URLs are available.

## Notifications path

```text
Clinical domain event (e.g. note shared)
  → Same transactional outbox pattern as Phase 2F
  → Worker
  → Email / WhatsApp
```

Payload: generic, non-clinical. Reuse `appointment_notification_outbox` or a sibling outbox table in the **same** dispatcher architecture — do not invent a second notification system.

---

## Boundary: Phase 2 vs Option C

| Phase 2 (Option B) | Option C |
|---|---|
| Identity, contact | + clinical chart headers |
| Appointments, history | + notes, documents |
| Operational audit | + clinical access audit |
| Notifications for scheduling | + generic “record updated” events |

---

## Super Admin

Platform configuration only. No automatic clinical record access.

## Child accounts / STAFF UI

DEFERRED / reserved. Not part of early Option C implementation phases.

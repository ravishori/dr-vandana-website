# Phase 2G Security & Reliability Audit

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase2-appointments-d73b`  
**Scope:** Phase 1 identity + Phase 2A–2F appointments and notifications  
**Authoritative sources:** source code, `drizzle/*.sql`, automated tests. Previous audit reports were used as context only.

This document is **not** legal advice and does **not** claim DPDP, HIPAA, EHR, medical-record, or professional-ethics compliance.

**PRODUCTION remains BLOCKED.** This milestone does not enable patient registration, configure production PostgreSQL/OTP/SMTP/Twilio, deploy, modify DNS, or merge `main`.

---

## Executive Summary

The Option B patient + appointment platform is implemented through Phase 2F. Automated tests, lint, typecheck, and production build pass. Several genuine in-code defects found during this audit were fixed with regression tests (registration enumeration, disabled-session acceptance, OTP verify oracle, MFA-complete recovery reuse, advisory-lock fail-open, dispatcher SENT overwrite, occupancy lock-order deadlock mapping).

The platform is **not** ready for controlled production deployment. Remaining blockers are infrastructure, providers, legal copy, MFA recovery policy, backups, monitoring, worker hosting, data residency, retention, privileged-account bootstrap, and explicit human approval to turn registration on.

Code can be described as **implementation-complete for Option B through Phase 2F, with residual medium risks**. Production activation is a separate decision after the gate table is green.

---

## Overall Status

**PRODUCTION BLOCKED**

Not PRODUCTION READY. Not PRODUCTION CONDITIONALLY READY.

`PATIENT_REGISTRATION_ENABLED` remains false unless the environment string is exactly `"true"`. Production still refuses registration without PostgreSQL, a real OTP adapter, SMTP, and a usable session secret. There is no production OTP bypass and no public `POST /api/send-notification` endpoint.

---

## Critical Findings

None remaining in application code after this audit’s fixes.

Production remains blocked by **gates**, not by an unfixed in-code critical vulnerability.

---

## High Findings

### H1 — Registration enumeration (FIXED)

**Class:** HIGH — code defect  
**Evidence:** Duplicate email/mobile previously returned `ok: false` while a new registration returned `ok: true`.  
**Fix:** `registerPatient` now returns `{ ok: true }` for duplicates without creating a second user or sending another email. Validation, `NOT_ENABLED`, and `RATE_LIMITED` still fail.  
**Regression:** `src/lib/identity/identity.test.ts` uniqueness cases.

### Remaining High (non-code)

None that can be closed in code without inventing providers, legal copy, or production secrets.

---

## Medium Findings

### M1 — Disabled / suspended sessions remained valid (FIXED)

**Evidence:** `readSession` did not join `users.status`. A previously issued cookie stayed valid after `DISABLED`.  
**Fix:** Inner join `users`; return `null` for `DISABLED` or `SUSPENDED`.  
**Regression:** login test asserts `readSession` is null after disable.

### M2 — OTP verify rate-limit oracle (FIXED)

**Evidence:** IP rate limit for OTP verify ran after the pending-user lookup, so unknown emails could be distinguished from pending accounts before the IP budget applied.  
**Fix:** `otp-verify-ip` is consumed in `verifyPhoneOtpAndActivate` before user lookup. Unknown and pending accounts both receive the generic invalid-OTP message until the IP limit.  
**Regression:** “rate-limits OTP verification before revealing whether the account is pending”.

### M3 — MFA recovery after MFA already complete (FIXED)

**Evidence:** `requirePendingMfaSession` and domain MFA functions allowed TOTP/recovery against a session that already had `mfaCompletedAt`.  
**Fix:** Pending-MFA actions refuse `session.mfaCompleted`. `verifyMfaChallenge` / `consumeRecoveryCode` refuse if `isSessionMfaCompleted`.  
**Regression:** existing MFA test asserts recovery after TOTP completion returns unauthorized.

### M4 — Advisory lock fail-open (FIXED)

**Evidence:** `lockPsychologistCalendar` swallowed backend errors.  
**Fix:** Log ERROR and throw `CALENDAR_LOCK_UNAVAILABLE`. Booking/lifecycle map lock unavailability, deadlocks (`40P01`), and serialization failures (`40001`) to `SLOT_UNAVAILABLE`.  
**Regression:** `src/lib/appointments/lock.test.ts`.

### M5 — Occupancy lock order (FIXED)

**Evidence:** Booking took the psychologist advisory lock then inserted. Reschedule / request-reschedule / accept-reschedule took `FOR UPDATE` on the appointment row **then** the advisory lock. Concurrent booking vs reschedule could deadlock. Unmapped deadlocks became generic lifecycle failures.  
**Fix:** Occupancy-changing lifecycle paths peek ownership, take the advisory lock, then `FOR UPDATE`. Contention maps to `SLOT_UNAVAILABLE`.  
**Not rewritten:** status-only transitions (confirm/cancel/complete/no-show) still use row `FOR UPDATE` only.

### M6 — Dispatcher late worker could overwrite SENT (FIXED)

**Evidence:** Finalize/retry updated deliveries by id only.  
**Fix:** `claimDeliveries` returns `{ id, lockedAt }` from the claimed row. Process skips lock mismatch. Finalize/retry CAS on `status = PROCESSING AND locked_at = claimedLockedAt`.  
**Regression:** “does not let a late worker overwrite SENT”.

### M7 — Psychologist read existence oracle (NOT FIXED — O17)

**Class:** MEDIUM + OPEN HUMAN DECISION  
**Evidence:** `getPracticeAppointmentDetail` returns `NOT_FOUND` when the public id is absent and `FORBIDDEN` when it exists but belongs to another psychologist. The practice detail page maps those to 404 vs a 200 forbidden sentence. Patient portal and psychologist **mutations** already use uniform inaccessible copy.  
**Why not “fixed”:** O17 (403 vs 404 for other-patient resources) is an open human decision. Choosing 403 vs 404 here would silently close that decision. Data is still withheld.  
**Status:** OPEN (O17). Documented residual: authenticated psychologist can tell whether a guessed `APT-…` id exists.

### M8 — Email verification / reset tokens in query strings (ACCEPTED)

GET does not consume. POST consumes. Tokens remain in emailed URLs (Phase 1B F15). Changing the URL shape does not remove the need for a secret in the link. **MEDIUM — ACCEPTED FOR CURRENT PHASE.**

### M9 — CSRF relies on Server Action Origin + SameSite=Lax (ACCEPTED / O14)

No custom CSRF token. Mutations are Next.js Server Actions with HttpOnly host-only cookies. SameSite is **Lax** (O14 OPEN). Residual: cross-site GET, older browsers, XSS-driven same-origin posts. A custom CSRF mechanism was **not** added for checklist compliance.

### M10 — Password hashing remains scrypt (O13 OPEN)

Node scrypt `N=16384, r=8, p=1`. Argon2id was **not** adopted. Do not migrate without explicit approval.

### M11 — `btree_gist` / exclusion constraint fail-open in migration 0003

**Class:** PRODUCTION INFRASTRUCTURE  
`drizzle/0003_appointment_engine.sql` wraps `btree_gist` + exclusion creation in `EXCEPTION WHEN OTHERS`. PGlite tests skip the constraint; occupancy queries still use `tstzrange`. Production PostgreSQL **must** have `btree_gist` and `appointments_blocking_occupied_excl`. Old migrations are not rewritten.

### M12 — Outbox expand lease is short-lived

Expand selects outbox rows with `FOR UPDATE SKIP LOCKED` then commits before delivery insert. Duplicate expand is absorbed by `onConflictDoNothing` on `(outbox_id, channel, recipient_role)`. Outbox rollup updates by id without a status predicate, so concurrent rollups can theoretically race SENT vs DEAD. Delivery-level overwrite is fixed. **MEDIUM residual — not changed in 2G** (duplicate deliveries are constrained; appointment mutations still succeed if SMTP/Twilio fail).

### M13 — SMTP path has no provider idempotency key

Dispatcher passes `idempotencyKey` into the classified email sender. `EmailService.send` / Nodemailer does not forward a provider idempotency header (Twilio does). At-least-once email duplicates remain possible after send-then-crash. **MEDIUM reliability residual.** Do not invent a non-existent SMTP idempotency protocol.

### M14 — CSP allows `'unsafe-inline'` and `'unsafe-eval'`

Required for current Next.js App Router. Residual XSS blast radius if a script-injection bug appears. **Do not weaken headers.** Tightening CSP is a future hardening task, not a silent 2G change.

---

## Low Findings

| ID | Finding | Status |
|---|---|---|
| L1 | Practice session cookie `Path=/` (shared across patient/psychologist/super-admin trees). Role checks are in Server Actions, not the cookie path. | ACCEPTED |
| L2 | Middleware is cookie-presence only; layouts/actions enforce role, MFA, ACTIVE. | ACCEPTED |
| L3 | Concurrent sessions allowed (no single-session policy). | OPEN / not selected |
| L4 | Booking idempotency `expires_at` is stored but not consulted (replay of the same hashed key can last). | LOW reliability |
| L5 | Proposed reschedule slots are not reserved (two patients can propose the same time; second accept fails occupancy). | Design, not authz |
| L6 | Psychologist detail returns patient email (operational contact). Phone is not returned. | Data minimization residual |
| L7 | `audit_logs` has no immutability trigger (unlike `appointment_history`). | LOW |
| L8 | Next.js 16 middleware deprecation warning (`proxy` convention). | INFORMATIONAL / framework |
| L9 | Dev-only esbuild advisory via `drizzle-kit` (`npm audit` without `--omit=dev`). Production audit: 0. | Do not force-upgrade |
| L10 | No dedicated `/faq` route; counselling FAQ is `/understanding-counselling`. | INFORMATIONAL |

---

## Informational Findings

- Public `/book-appointment` enquiry form is **not** the authenticated booking engine.
- Public marketing still contains `wa.me` in contact data; appointment dispatch does **not** use `wa.me`, Bitly, or SMS fallback.
- STAFF role exists in the catalog with no Phase 1/2 permissions.
- Completion / no-show email flags default **false** (policy OPEN).
- `REQUESTED` exists on the appointment status check constraint; successful booking stores `PENDING`.
- `notifications:process` and `db:provision` refuse `NODE_ENV=production`.
- Operator snapshot: `npm run identity:gates` (YES/NO only; never prints secrets).

---

## Identity Security

| Control | Result |
|---|---|
| Registration default | Fail-closed. Only env string `"true"` enables. `.env.example` is `false`. |
| Alternate registration bypass | **Not found.** Production still needs postgres + OTP adapter + SMTP + session secret. |
| Client-side activation | **None.** Email POST consumes token; OTP verify is server-side. |
| Session before verification | **None.** Login requires `ACTIVE`. |
| Duplicate accounts | Unique email/mobile; HTTP success is enumeration-safe after H1. Unique-constraint races still return `FAILED` (LOW residual). |
| Email / mobile normalization | Yes. |
| Password policy | 12+ characters; not the email local-part. |
| Password hashing | scrypt (O13 OPEN). |
| Rate limits | Register IP 5/15m. |
| Enumeration | Registration success-shaped for duplicates; login/reset/OTP-request generic. OTP **verify** uses generic invalid until IP limit (M2). |

Login, logout, password reset, sessions, MFA, recovery codes, account states, and rate limits were re-checked against source. PATIENT / PSYCHOLOGIST / SUPER_ADMIN / STAFF cannot use another role’s appointment or clinical permissions. Super Admin is **not** all-data-access.

---

## Session Security

Cookie name: `drv_practice_session`.

| Attribute | Value |
|---|---|
| Token | Opaque 32-byte random; HMAC hashed at rest (`token_hash`) |
| Storage | Server-side `sessions` row |
| Idle / absolute TTL | Patient 12h / 24h; psychologist 30m / 8h; Super Admin 15m / 4h |
| Logout | Revokes row |
| Password reset | Revokes all sessions for that user in the same transaction; no automatic login |
| HttpOnly | Yes |
| Secure | Production only |
| SameSite | `lax` (O14 OPEN) |
| Domain | Omitted (host-only) |
| Path | `/` |
| Session fixation | New session id/token on login (tested) |
| Disabled/suspended | Session read returns null (M1) |

Public pages do not receive session payloads. Middleware only checks cookie presence on private trees and sets `X-Robots-Tag: noindex, nofollow`.

Question-portal cookie `drvandana_portal_session` remains a separate HMAC stack (`SameSite=Strict`). Unification is **DEFERRED**.

---

## MFA

- Required for `PSYCHOLOGIST` and `SUPER_ADMIN`. Password alone does **not** complete privileged authentication (`AuthorizationService.canAccess` → `mfa_required`).
- TOTP (SHA1, 6 digits, 30s, window 1). Secret encrypted at rest (`MFA_ENCRYPTION_KEY`).
- Recovery codes: 10, HMAC-hashed, single-use, shown once at enrollment, **not emailed**.
- Replay protection: `last_verified_step`.
- Rate limit + lockout: 10 IP / 15m verify; 8 failures → 15m lock.
- Session binding: `mfaCompletedAt` on the practice session.
- **No** “Forgot MFA → email link → bypass MFA” path exists. Do not invent one.
- Lost authenticator **and** lost codes: no in-app recovery. **O12 OPEN HUMAN DECISION.** Options A–D remain in Phase 1C; none selected.

STAFF is not MFA-required (STAFF is unimplemented).

---

## RBAC

| Role | Practice permissions | Clinical permissions | Appointment mutations |
|---|---|---|---|
| SUPER_ADMIN | All `PRACTICE_PERMISSIONS` including `MANAGE_APPOINTMENT_SETTINGS` | **None granted** | **Denied** — requires role `PSYCHOLOGIST` |
| PSYCHOLOGIST | Practice operations used by lifecycle | **None granted** | Yes, after MFA + ACTIVE |
| STAFF | None in this phase | None | Denied |
| PATIENT | Own resources via ownership | None | Own cancel / request-reschedule |

`SUPER_ADMIN ≠ ALL_DATA_ACCESS`. Clinical permission names exist in the catalog (`isClinical: true`) and `grantPermissionToRole` refuses clinical grants. Option C remains **DEFERRED**. Super Admin UI is `/super-admin/signed-in` stub only.

---

## IDOR

| Surface | Result |
|---|---|
| Patient profile | Patient A denied Patient B |
| Patient appointment list/detail/cancel/reschedule | Filtered by `patient_user_id`; missing and other-patient use the same inaccessible message |
| Psychologist list | Own psychologist id |
| Psychologist mutations | Owner predicate; missing and other-psychologist `NOT_FOUND` |
| Psychologist **read** detail | Existence oracle M7 / O17 |
| Patient → psychologist practice | Redirect/deny |
| Patient → Super Admin | Denied |
| Super Admin → appointments | Denied (role PSYCHOLOGIST required) |

Expected “NO UNAUTHORIZED DATA DISCLOSURE” holds for object **contents**. Existence of another psychologist’s `APT-…` id is the residual oracle.

Browser-supplied `patientUserId` / `psychologistId` / `duration` / `status` / `actor` are not authoritative. Server Actions take session + public ids only.

---

## Appointment Security

Authenticated patient only. Identity from session. Psychologist, duration, end, buffers, and status are server-derived. Booking runs in a PostgreSQL transaction with advisory lock, occupancy reload, exclusion constraint (when `btree_gist` exists), hashed idempotency, and IP+user rate limits.

Malicious extra fields on `requestAppointment` are ignored (tested).

---

## Availability

- Timezone **Asia/Kolkata** (`timestamptz` storage; `Intl` conversion, not a hard-coded offset).
- Practice hours, breaks, closures, custom availability, unavailable periods, duration, buffers, minimum notice, maximum advance (nullable until configured).
- Clock injected via `IdentityContext.now()`.
- Half-open `[start, end)` in JS and PG `tstzrange(..., '[)')`.
- Occupancy for `PENDING` / `CONFIRMED` / `RESCHEDULE_REQUESTED`.
- Tests cover opening/closing/break boundaries, buffers, adjacent slots, DST-irrelevant IST, month/year boundaries as exercised in `availability.test.ts` / `timezone.test.ts`.

Listing is advisory; booking reloads after the lock.

---

## Booking

| Control | Present |
|---|---|
| Authenticated PATIENT + ACTIVE + verified email/mobile | Yes |
| PostgreSQL transaction | Yes |
| Advisory lock | Yes, fail-closed |
| Exclusion constraint | Yes on real Postgres; skippable in 0003 exception handler |
| Occupancy reload | Yes |
| Idempotency | HMAC key + fingerprint; raw key not stored; other patient cannot read first result |
| Rate limit | 10 / 15 min IP + user |

---

## Lifecycle

Valid transitions match Phase 2D:

```text
PENDING → CONFIRMED | REJECTED | CANCELLED
CONFIRMED → CANCELLED | COMPLETED | NO_SHOW | RESCHEDULE_REQUESTED
RESCHEDULE_REQUESTED → CONFIRMED (accept/decline/psychologist reschedule) | CANCELLED
```

Terminal `CANCELLED` / `COMPLETED` / `NO_SHOW` / `REJECTED` have no outbound rules. CAS is `id + version + status`. Patient reschedule is **proposal only**. Psychologist confirms movement. Cancel vs psychologist cancel: one CAS winner.

---

## Patient Portal

Routes: `/patient/appointments`, `/history`, `/[publicId]`, `/new`.

Authentication, ownership, pagination, filters, sorting, status labels, timezone, public ids (`APT-…` / `ATY-…` / `PAT-…`). Booking success JSON is tested to contain no internal UUID. Internal user UUIDs are not returned to the patient client.

---

## Notification Outbox

Appointment mutation + history + audit + outbox insert commit atomically. Nodemailer/Twilio are **not** imported from appointment domain modules. Provider calls occur in `processNotificationBatch` after commit.

Appointment succeeds if SMTP/Twilio is down (tested).

---

## Email

Server-side Nodemailer only. SMTP secrets are env-only (never `NEXT_PUBLIC_`). Recipients come from verified user emails. Subject: `"Appointment update from Dr. Vandana"`. Bodies are operational (type name, date/time, timezone, public id, practice name). HTML escaped. Timeout + classified retry. Permanent failures dead-letter. Production `EMAIL_PROVIDER=test|mock` refused.

---

## Twilio WhatsApp

Twilio Content API only, server-side, via `WhatsAppService`. No appointment `wa.me`, Bitly, or SMS fallback. Credentials env-only. Opt-in column default **false**; verified mobile is not consent; opt-out respected. Production `TWILIO_WHATSAPP_ENABLED=false`. Sandbox/test providers forbidden in production. Dispatcher uses `I-Twilio-Idempotency-Token`. `npm run notifications:process` exits in production (O15).

---

## Privacy

Notification templates, dispatcher logs, and outbox payloads were searched for diagnosis, symptoms, therapy, assessment, treatment, clinical notes, and psychological condition. **No sensitive clinical content in appointment email/WhatsApp/subject/template variables/dispatcher logs.** Those words appear in public educational/legal copy and as **forbidden-pattern tests**, not as sent appointment copy.

Outbox payload does not include email or phone.

---

## Audit Logging

Identity and appointment actions record actor, action, timestamp, outcome, and stripped metadata. `stripSecrets` drops password/otp/token/secret/cookie/authorization/recovery and exact `code` / `session` / `token` / `cookie`. OTP/MFA/session secrets, Twilio Auth Token, SMTP password, and clinical notes are not logged by these paths. `console.log` is absent from `src/`.

---

## Database

| Migration | Additive? | Notes |
|---|---|---|
| `0001_identity_foundation.sql` | Yes | Identity |
| `0002_mfa_replay_guard.sql` | Yes | `last_verified_step` |
| `0003_appointment_engine.sql` | Yes | Exclusion + immutable history trigger; extension fail-open (M11) |
| `0004_booking_idempotency.sql` | Yes | Unique `(user_id, operation, key_hash)` |
| `0005_notification_dispatch.sql` | Yes | Deliveries/attempts + WhatsApp consent columns |

Down files exist for disaster recovery and must not be run in production without a restore plan. No auto-migrate on boot. `APPLY_IDENTITY_MIGRATION` is CLI-only.

No Phase 2 clinical-notes / diagnosis / documents tables.

---

## Concurrency

PGlite suite includes booking vs booking, lifecycle races, patient-portal races, and dispatcher claim isolation. CI job `appointment-pg-concurrency` runs `booking.pg.test.ts`, `lifecycle.pg.test.ts`, and `dispatcher.pg.test.ts` against PostgreSQL 16 when `APPOINTMENT_PG_URL` is set.

This audit environment: `APPOINTMENT_PG_URL` **unset** (PG files skip). In-memory concurrency tests **ran** as part of `npm test` 259/259.

Lock-order hardening (M5) reduces booking vs reschedule deadlock. Exclusion remains the last-line overlap defense on real Postgres.

---

## Rate Limiting

| Area | Limit (window 15m unless noted) |
|---|---|
| Registration | 5 / IP |
| Login | 8 / IP and 8 / account |
| Password reset | 5 / IP, 3 / email |
| Email resend | 5 / IP |
| OTP send | 5 / IP and account; public OTP 5 / IP |
| OTP verify | 10 / IP (before user lookup) |
| MFA verify | 10 / IP |
| Booking request | 10 / IP+user |
| Lifecycle mutate | 20 / 15m (patient mutate) / 60 psychologist lifecycle |
| Portal listing | 60 / 15m |
| Notification dispatch | No public HTTP; worker is CLI |

Production identity/appointment rate limits fail closed if the shared store is misconfigured. Client-supplied identity is not trusted as the rate-limit subject; IP comes from headers via server helpers, user id from session.

---

## CSRF

Sufficient for the current Server Action + HttpOnly + SameSite=Lax architecture, with residual risk documented as M9 / O14. No extra custom CSRF token added.

---

## Security Headers

Applied to `/:path*` in `next.config.ts`: CSP (moderate), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Permissions-Policy` camera/microphone/geolocation/payment disabled, `X-Powered-By` disabled. Private trees: `X-Robots-Tag: noindex, nofollow`. `robots.txt` disallows `/api/`, `/patient`, `/psychologist`, `/super-admin`. Sitemap contains public marketing/legal/enquiry/AI routes only.

Local smoke (14 August 2026) confirmed these headers on `/` and `noindex` on `/patient/appointments` redirect.

---

## Dependency Security

```text
npm audit --omit=dev   → found 0 vulnerabilities
npm audit              → 4 moderate (esbuild via drizzle-kit, development-only)
```

Do not `npm audit fix --force` (would install breaking `drizzle-kit`).

---

## CI

`.github/workflows/ci.yml`:

- `verify`: `npm test`, lint, typecheck, build. `PATIENT_REGISTRATION_ENABLED=false`. Placeholder session/MFA secrets for build only. **No Postgres service.**
- `appointment-pg-concurrency`: Postgres 16 service; runs the three `*.pg.test.ts` files with `APPOINTMENT_PG_URL`.

PGlite `*.concurrency.test.ts` files run in `verify`. Real PostgreSQL exclusion tests run in the second job.

**CI ENHANCEMENT / PRODUCTION GATE:** this cloud-agent environment did not have `APPOINTMENT_PG_URL`; rely on GitHub Actions for that job.

---

## Deployment

- No auto-migrate on boot (`instrumentation.ts` only validates config).
- Secrets supplied externally; `.env.example` has empty placeholders.
- Registration remains disabled by default.
- Dev provisioning cannot run in production.
- Notification worker CLI cannot run in production (O15 still OPEN for real hosting).
- Next.js middleware deprecation is framework noise, not a deploy blocker.

---

## Backup / Restore

**PRODUCTION INFRASTRUCTURE BLOCKER**

The repository does not contain production backups, PITR configuration, a restore process, a restore test, RPO, or RTO. Architecture **requires** backups/PITR where available; vendor and policy are **OPEN** (O1/O2). Values are not invented here. A backup never restored is not treated as validated.

---

## Monitoring

**REQUIRES CONFIGURATION**

No production APM/SIEM/Datadog/Sentry integration in this repo. What exists: structured JSON logs, optional SMTP error alerts with process-local cooldown, `security_events` / `audit_logs` tables, startup config warnings. Logs are **not** production monitoring.

---

## Legal Review

**REQUIRES LEGAL REVIEW** (O11)

Public legal pages still describe an informational website. Implemented code includes patient accounts, authenticated appointments, email notifications, and a WhatsApp opt-in checkbox (default off).

Statements that require review (do **not** treat as approved; this audit does not rewrite them):

- Privacy: “This site is primarily informational and is not used to maintain clinical records.”
- Privacy: “The website application does not create a patient database, patient portal, or clinical record from these submissions.”
- Privacy: “This public website does not currently offer a production patient portal.”
- Privacy patient-account section: “REQUIRES REVIEW.”
- Terms: “These Terms currently describe a public informational website and enquiry tools. They do not yet describe production patient accounts, account suspension, or authenticated appointment services.”
- Registration checkbox vs WhatsApp account opt-in vs enquiry consent.
- Processor list (host, PostgreSQL, SMTP, OTP vendor, Twilio, Meta/WhatsApp).
- Retention (O10) and cross-border transfer language (O18).

Do **not** claim DPDP, HIPAA, EHR, or medical compliance.

---

## Data Residency

**REQUIRES HUMAN/LEGAL REVIEW** (O18). No legal conclusion.

| Category | Where it could reside if production were configured |
|---|---|
| PostgreSQL | Unchosen vendor/region (O1/O2) |
| Application hosting | Current public site is Vercel-compatible at `drvandana.trinetra.net`; production identity region unset |
| SMTP | Unchosen SMTP provider |
| OTP/SMS | Unchosen vendor (O4); no production adapter |
| Twilio | United States / Twilio subprocessors if WhatsApp is activated |
| Meta/WhatsApp | Meta infrastructure if WhatsApp is activated |
| Logging | Host logs / optional error email |
| Backups | Unchosen; none configured |

---

## Production Gates

| Gate | Status | Category | Required Action |
|------|--------|----------|-----------------|
| PostgreSQL provider | BLOCKED | HUMAN DECISION (O1) | Select vendor |
| PostgreSQL region | BLOCKED | HUMAN DECISION (O2) | Select region / residency |
| PostgreSQL version / pooling / TLS | BLOCKED | HUMAN DECISION + CONFIGURATION | After vendor choice |
| `btree_gist` + exclusion on production DB | BLOCKED | PRODUCTION INFRASTRUCTURE | Confirm constraint exists after migrate (M11) |
| DATABASE_URL | BLOCKED | CONFIGURATION | Supply in host secret store; do not commit |
| OTP provider | BLOCKED | HUMAN DECISION (O4) | Select vendor; implement adapter (currently `OTP_VENDOR_ADAPTER_IMPLEMENTED=false`) |
| SMTP | BLOCKED | CONFIGURATION + HUMAN DECISION | Production SMTP + SPF/DKIM/DMARC |
| Twilio account | BLOCKED | PROVIDER SETUP | Production account; do not use sandbox as production |
| WhatsApp sender | BLOCKED | PROVIDER SETUP | Approved sender |
| WhatsApp templates | BLOCKED | PROVIDER SETUP | Content SIDs after legal/template approval |
| WhatsApp opt-in | BLOCKED | LEGAL REVIEW | Wording for account checkbox |
| MFA recovery | BLOCKED | HUMAN DECISION (O12) | Select A–D; do not add email bypass |
| Password hashing | OPEN | HUMAN DECISION (O13) | Keep scrypt unless approved otherwise |
| Cookie SameSite | OPEN | HUMAN DECISION (O14) | Confirm Lax vs Strict |
| Privacy policy | BLOCKED | LEGAL REVIEW (O11) | Update for accounts/appointments/notifications |
| Terms | BLOCKED | LEGAL REVIEW | Account + appointment terms |
| Consent copy | BLOCKED | LEGAL REVIEW | Registration, email, OTP, WhatsApp |
| Data residency | BLOCKED | HUMAN/LEGAL REVIEW (O18) | Processor map |
| Retention | BLOCKED | HUMAN DECISION (O10) | Account/appointment/notification retention |
| Backups | BLOCKED | PRODUCTION INFRASTRUCTURE | Vendor backups + policy |
| Restore test | BLOCKED | PRODUCTION INFRASTRUCTURE | Prove restore; set RPO/RTO in ops (not invented here) |
| Monitoring | BLOCKED | CONFIGURATION | Errors, auth, OTP, booking, notifications, worker |
| Worker hosting | BLOCKED | HUMAN DECISION (O15) | Cron/worker; CLI refuses production |
| Secrets | BLOCKED | CONFIGURATION | Host secret store; rotation owners OPEN |
| CI | CODE READY (verify + PG job) | CI ENHANCEMENT | Keep PG concurrency job; this agent env lacked `APPOINTMENT_PG_URL` |
| Deployment smoke test | BLOCKED | CONFIGURATION | Staged environment after providers exist |
| Security review of **deployed** env | BLOCKED | SECURITY REVIEW | Phase 2G is code-only |
| Privileged account bootstrap | BLOCKED | HUMAN DECISION (O19) | First Super Admin / psychologist |
| `PATIENT_REGISTRATION_ENABLED` | CODE READY (false) | FEATURE FLAG | Must stay false until every mandatory gate is green |
| Twilio activation | BLOCKED | PROVIDER + LEGAL | `TWILIO_WHATSAPP_ENABLED=false` |
| Super Admin dashboard | DEFERRED | — | Do not implement in 2G |
| Clinical records / documents | DEFERRED | Option C | Do not implement in 2G |
| Payments / teleconsult / marketing | DEFERRED | — | Do not implement in 2G |

For every gate: **STATUS** as above; **OWNER** = HUMAN DECISION unless a named operator is later assigned. This audit does not invent business owners.

---

## Risk Register

| Risk | Likelihood | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| Production launch with registration on before gates | Low if flag stays false | High | High | Keep `PATIENT_REGISTRATION_ENABLED=false` | HUMAN DECISION | Open |
| Account takeover (credential stuffing) | Medium if launched | High | High | Rate limits, scrypt, session HMAC, MFA for privileged | Code ready; ops monitoring OPEN | Mitigated in code |
| OTP abuse / test OTP in production | Low (fail-closed) | High | High | No production adapter; test provider refused | HUMAN DECISION (O4) | Blocked until vendor |
| Session theft (XSS) | Low–medium | High | High | HttpOnly, CSP residual unsafe-eval | Engineering | Residual M14 |
| IDOR | Low after tests | High | Medium | Ownership filters; O17 oracle residual | HUMAN DECISION (O17) | Partial |
| Double booking | Low on real PG | High | High | Lock + occupancy + exclusion; confirm `btree_gist` | PRODUCTION INFRASTRUCTURE | Code ready; migrate verify needed |
| Notification abuse / public send API | Low | Medium | Medium | No public send endpoint; server-planned templates | — | Mitigated |
| Twilio/SMTP credential compromise | Medium if launched without secret hygiene | High | High | Env-only secrets; rotation playbook OPEN | HUMAN DECISION | Config required |
| Worker compromise | N/A until hosted | High | High | CLI refuses production; O15 unset | HUMAN DECISION (O15) | Blocked |
| Database compromise | Medium if launched | Critical | Critical | Vendor TLS, backups, least privilege unset | HUMAN DECISION (O1) | Blocked |
| Insider / Super Admin privilege | Low | High | High | No automatic clinical or appointment access | HUMAN DECISION (O20/O21) | Code matches architecture |
| Notification data leakage | Low | High | High | Operational templates; deny-list tests | LEGAL REVIEW for copy | Code ready |
| Log leakage | Low | High | Medium | Structured logs; secret strip | Ops | Residual |
| Legal mismatch if registration enabled | Certain if launched now | High | High | Do not enable registration | LEGAL REVIEW | Blocked |
| Lost MFA with no recovery policy | Certain if device+codes lost | High | High | Backup codes only; O12 unset | HUMAN DECISION (O12) | Open |
| No backups | Certain today | Critical | Critical | Vendor backups + restore test | PRODUCTION INFRASTRUCTURE | Blocked |

---

## Threat Model

| Threat | Attack surface | Existing control | Remaining risk |
|---|---|---|---|
| Account takeover | `/patient/login`, practice login | Password policy, scrypt, rate limits, generic errors, MFA for privileged | Credential stuffing until monitoring/WAF; patient has no MFA |
| Credential stuffing | Login endpoints | IP + account limits, fail-closed store | No production bot/WAF selected |
| OTP abuse | Verify/resend | Hashed OTP, expiry, attempts, cooldown, IP limit first, no production test provider | No vendor; India delivery unproven |
| Session theft | Cookie | Opaque HMAC, HttpOnly, Secure in prod, idle/absolute, revoke on reset/logout | Path=/; Lax CSRF residual; XSS |
| IDOR | Portal/practice public ids | Session ownership; uniform patient messages | Psychologist read oracle (O17) |
| Appointment manipulation | Server Actions | Server-derived duration/status/psychologist; state machine; version CAS | Policy windows OPEN |
| Double booking | Concurrent book/reschedule | Advisory lock, occupancy, exclusion | 0003 fail-open if extension missing |
| Notification abuse | No public API | Outbox from mutations only | Worker hosting unset |
| Twilio credential compromise | Env | Server-only; WhatsApp disabled | Rotation/owners OPEN |
| SMTP compromise | Env | Server-only; classified errors | Same |
| Worker compromise | CLI | Production refused | Need real hosting design (O15) |
| Database compromise | DATABASE_URL | Fail-closed if missing; parameterized queries | Vendor, TLS, backups OPEN |
| Insider privilege abuse | Super Admin / psychologist | RBAC; no clinical grants; Super Admin ≠ appointments | O19 bootstrap; O20 matrix |
| Data leakage through notifications | Email/WhatsApp | Operational templates; verified destination; opt-in | Legal wording; Meta subprocessors |
| Log leakage | Logger / audit | stripSecrets; no console.log in src | Host log retention OPEN |

---

## Security Test Matrix

| Feature | Attack | Expected | Result |
|---|---|---|---|
| Registration | Flag false | `NOT_ENABLED` | Pass (existing tests) |
| Registration | Duplicate email/mobile | Success-shaped; one user | Pass (2G) |
| Registration | SQL-like name | Stored as text | Pass |
| Login | Wrong password | Generic failure | Pass |
| Login | Disabled account | Cannot login; existing session null | Pass (2G) |
| Login | Session fixation | New session on login | Pass |
| OTP | Unknown email verify flood | Generic then `RATE_LIMITED` | Pass (2G) |
| OTP | Production test provider | Refused | Pass |
| Reset | Unknown email | Generic success | Pass |
| Reset | Reuse / concurrent | One consume | Pass |
| Reset | After success | Sessions revoked; no auto-login | Pass (2G) |
| MFA | Password only for psychologist | `mfa_required` | Pass |
| MFA | TOTP replay | Rejected | Pass |
| MFA | Recovery after complete | Unauthorized | Pass (2G) |
| MFA | Concurrent recovery | One winner | Pass |
| Patient portal | Patient B id | Same inaccessible message | Pass |
| Booking | Extra patient/psychologist/status fields | Ignored | Pass |
| Booking | Unauthenticated | Denied | Pass |
| Booking vs booking | Same slot | One success | Pass (PGlite; PG in CI) |
| Cancel | Other patient’s appointment | Inaccessible | Pass |
| Reschedule | Patient immediate move | Proposal only | Pass |
| Psychologist portal | Patient cookie | Redirect/deny | Pass (authz tests + smoke redirect) |
| Notification | SMTP down | Appointment still PENDING/CONFIRMED | Pass |
| Notification | Late worker | Cannot overwrite SENT | Pass (2G) |
| Twilio | Production sandbox/test | Forbidden | Pass |
| IDOR | Super Admin confirm | Forbidden | Pass |
| Concurrency | Confirm vs confirm | One winner | Pass |
| Calendar lock | Execute throws | Fail closed | Pass (2G) |
| Public send API | `POST /api/send-notification` | 404 | Pass (smoke) |

---

## Privacy Data-Flow Map

```text
Patient
  ↓  (browser: name, email, mobile, password, appointment type public id, requested start)
Next.js Server Actions
  ↓  (normalized identity, hashed secrets, session HMAC, public ids)
PostgreSQL
  ↓  (appointment row + history + audit + outbox; no provider call)
Notification outbox / deliveries
  ↓  (after commit; worker)
SMTP and/or Twilio
  ↓  (verified email; WhatsApp only if opted in + enabled + verified mobile)
External provider
```

| Boundary | Data that may cross |
|---|---|
| Browser → Next.js | Form fields; HttpOnly session cookie; public appointment ids |
| Next.js → PostgreSQL | Hashed passwords/OTP/tokens; encrypted MFA secret; profile; appointments; outbox event keys; no raw session token |
| PostgreSQL → worker | Delivery row: channel, role, template key, appointment public id, times, type name, names |
| Worker → SMTP | To, operational subject/body (no diagnosis) |
| Worker → Twilio | E.164, Content SID, operational template variables |
| Worker → logs | Operation, channel, role, eventKey, errorCode, duration — not bodies or secrets |

Do not treat this map as a compliance attestation.

---

## API / Server Action Matrix (Phase 1–2)

| Action | AuthN | Role | Permission | Ownership | MFA | Validation | Rate limit | Txn | Audit | Safe error |
|---|---|---|---|---|---|---|---|---|---|---|
| `registerPatientAction` | Public | — | — | — | — | Zod/policy | IP | Yes | Yes | Yes |
| `verifyEmailAction` | Token | — | — | Token user | — | Token | — | Yes | Yes | Yes |
| `resendEmailAction` | Public | — | — | — | — | Email | IP | Yes | Yes | Enumeration-safe |
| `sendPhoneOtpAction` | Public | — | — | Pending user | — | Email | IP | Yes | Yes | Enumeration-safe |
| `verifyPhoneAction` | Public | — | — | Pending user | — | Code | IP first | Yes | Yes | Generic invalid |
| `patientLoginAction` | Public | PATIENT | — | — | N/A (patient) | Email/password | IP+account | Yes | Yes | Generic |
| `patientLogoutAction` | Session | — | — | Own session | — | — | — | Yes | Yes | — |
| `forgotPasswordAction` | Public | — | — | — | — | Email | IP+email | Yes | Yes | Enumeration-safe |
| `resetPasswordAction` | Token | — | — | Token user | — | Policy | — | Yes (revoke sessions) | Yes | Yes |
| `practiceLoginAction` | Public | PSYCHOLOGIST/SUPER_ADMIN | — | — | After password | Email/password | IP+account | Yes | Yes | Generic |
| MFA enroll/confirm/verify/recovery | Pending session | Matching role | — | Session user | Completing | TOTP/code | IP | Yes | Yes | Yes |
| `updateWhatsAppConsentAction` | Session | PATIENT | — | Own profile | — | Boolean | — | Yes | — | Yes |
| `requestAppointmentAction` | Session | PATIENT | — | Session user | — | Type+start | IP+user | Yes + lock | Yes | Yes |
| Patient cancel/reschedule | Session | PATIENT | — | `patient_user_id` | — | Public id+version | Mutate | Yes | Yes | Uniform inaccessible |
| Psychologist confirm/reject/cancel/complete/no-show/reschedule/accept/decline | Session | PSYCHOLOGIST | `MANAGE_APPOINTMENT_SETTINGS` | `psychologist_user_id` | Required | Public id+version | Lifecycle | Yes | Yes | Safe |
| Enquiry / AI / question portal | Existing public or HMAC portal | Separate stack | — | — | Portal HMAC | Existing | Existing | Existing | Existing | Existing |

No public notification-send mutation.

---

## Open decisions (explicitly not closed)

| ID | Topic | Status after 2G |
|---|---|---|
| O1 | PostgreSQL vendor | OPEN |
| O2 | PostgreSQL region/version/pooling | OPEN |
| O4 | OTP vendor | OPEN; adapter unimplemented |
| O5 | WhatsApp production activation | OPEN; Twilio adapter exists; flag false |
| O10 | Retention | OPEN |
| O11 | Legal / privacy wording | OPEN; **REQUIRES LEGAL REVIEW** |
| O12 | MFA recovery policy | OPEN; backup codes only |
| O13 | Argon2id vs scrypt | OPEN; scrypt remains |
| O14 | SameSite | OPEN; implemented Lax |
| O15 | Notification worker hosting | OPEN; CLI refuses production |
| O17 | 403 vs 404 IDOR | OPEN; psychologist read oracle remains |
| O18 | Data residency | OPEN |
| O19 | Privileged account bootstrap | OPEN |
| Twilio sender / templates / opt-in wording | OPEN |
| SMTP production configuration | OPEN |

---

## Clinical boundary

No Phase 2 clinical notes, diagnosis, assessment, treatment, or document tables. Option C remains deferred. Super Admin does not gain clinical or appointment access.

---

## Test Results

Exact results from this audit environment (14 August 2026):

| Command | Result |
|---|---|
| `npm test` | **259/259 pass** (0 fail, 0 skipped in the default glob) |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (Next.js 16.3.0) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` | 4 moderate, development-only esbuild via drizzle-kit |
| PostgreSQL concurrency (`APPOINTMENT_PG_URL`) | **Not run here** (unset). CI job `appointment-pg-concurrency` is the intended runner |

Baseline before 2G fixes: 255/255. Four additional regression tests landed with this audit.

### Local route smoke (production `next start`, port 3100)

| Route | Result |
|---|---|
| `/` `/about` `/contact` `/book-appointment` `/privacy-policy` `/terms` `/disclaimer` `/understanding-counselling` `/psychology/counselling` `/ask-a-question` | 200 |
| `/faq` | 404 (FAQ lives on `/understanding-counselling`) |
| `/patient/login` `/patient/register` `/psychologist/practice/login` `/super-admin/login` | 200 |
| `/patient/account` `/patient/appointments` `/patient/appointments/history` `/patient/appointments/APT-TESTTEST` | 307 → `/patient/login` + `X-Robots-Tag: noindex, nofollow` |
| `/psychologist/practice` `/psychologist/practice/appointments` | 307 → practice login |
| `/super-admin/signed-in` | 307 → `/super-admin/login` |
| `GET /api/ai/ask` | 405 |
| `POST /api/send-notification` | 404 |
| Sitemap | No patient/psychologist/super-admin URLs |
| Security headers on `/` | CSP, HSTS, nosniff, DENY, Referrer-Policy present; `X-Powered-By` absent |

Authenticated portal clicks were not exercised against a provisioned production database in this agent (production remains blocked; no production users provisioned).

---

## Git

Work stays on `cursor/patient-practice-phase2-appointments-d73b`. Do not push `main`, force-push, merge, or deploy.

---

## Production Recommendation

**PRODUCTION BLOCKED.**

Do not enable patient registration. Do not configure real production PostgreSQL/OTP/SMTP/Twilio from this milestone. Do not deploy identity/appointment traffic. Do not merge `main`.

The Option B codebase is suitable to continue **controlled development and security review**. It is not suitable for public patient accounts until every required gate in the table above is genuinely satisfied by humans, providers, and infrastructure — not by this document.

---

## Hard stop

Phase 2G ends here. Do not begin Phase 3 clinical records, documents, Super Admin dashboard, payments, teleconsultation, AI WhatsApp chatbot, or marketing automation without explicit approval.

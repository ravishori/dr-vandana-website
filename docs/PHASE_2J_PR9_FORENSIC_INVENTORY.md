# Phase 2J — PR #9 Forensic Inventory

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**PR #9:** https://github.com/ravishori/dr-vandana-website/pull/9  
**PR head:** `cursor/patient-practice-management-a302` @ `eef4613`  
**Base claimed by PR:** `cursor/patient-practice-management-plan-a302`  
**Current authoritative branch:** `cursor/patient-practice-phase2-appointments-d73b`  

**Status:** FORENSIC INVENTORY ONLY. **Do not merge PR #9.** **Do not copy its store/auth/providers.**

Classification legend (per capability):

| Code | Meaning |
|---|---|
| **A** | REUSABLE REQUIREMENT |
| **B** | REUSABLE UX / UI CONCEPT |
| **C** | REIMPLEMENT ON CURRENT ARCHITECTURE |
| **D** | SECURITY REWORK REQUIRED |
| **E** | LEGAL / PRIVACY REVIEW REQUIRED |
| **F** | REJECT / DO NOT CARRY FORWARD |

Production suitability values: **PROTOTYPE ONLY** | **REQUIREMENT ONLY** | **REJECT**.

Tests passing in PR #9 do **not** make an implementation production-ready.

---

## PR #9 snapshot

| Item | Value |
|---|---|
| Title | feat: Option C Patient & Practice Management System |
| State | OPEN draft |
| Self-description | Option C selected; local SQLite + mocks; **Not PRODUCTION READY** |
| Persistence | Single-row JSON snapshot in SQLite (`practice_snapshot`) |
| Documents | Local filesystem `data/practice-documents/*.bin` |
| OTP / WhatsApp | Always mock providers |
| Super Admin | Absent |
| PostgreSQL / Drizzle / outbox | Absent |

---

## File inventory

### Core library

| Capability | File | Purpose | Implementation | Security | Production Suitability | Class |
|---|---|---|---|---|---|---|
| Store factory | `src/lib/practice/store.ts` | memory vs sqlite bootstrap | Prototype | HIGH risk if used in prod | REJECT | F |
| SQLite snapshot | `src/lib/practice/sqlite-store.ts` | One `payload TEXT` JSON blob | Prototype | CRITICAL for clinical data | REJECT | F |
| Memory store | `src/lib/practice/memory-store.ts` | In-memory Maps + seed | Prototype | Test-only | REJECT for prod | F |
| Repository iface | `src/lib/practice/repository.ts` | State shape | Prototype | N/A | REJECT as store | F / A (entity list) |
| Auth service | `src/lib/practice/auth-service.ts` | Register/login/OTP/MFA/reset/audit/notify | Prototype | CRITICAL/HIGH gaps | REJECT tech; A requirements | C+D |
| Appointment svc | `src/lib/practice/appointment-service.ts` | Slots + lifecycle | Prototype | MFA assert broken | REJECT tech | F vs Phase 2 |
| Clinical svc | `src/lib/practice/clinical-service.ts` | Consultations/notes/docs | Prototype | HIGH MIME/title; local disk | REJECT tech; A+C | C+D |
| Session HMAC | `src/lib/practice/session.ts` | Stateless cookie | Prototype | No revocation | REJECT | F |
| Providers | `src/lib/practice/providers.ts` | Mock OTP/WhatsApp | Prototype | Always mock | REJECT | F |
| Tokens | `src/lib/practice/tokens.ts` | sha256 / random | Prototype | OK helper pattern | REPLACE with identity crypto | C |
| TOTP | `src/lib/practice/totp.ts` | Hand-rolled TOTP | Prototype | Plaintext secret storage | REJECT | F |
| Unit tests | `src/lib/practice/practice.test.ts` | Memory-store flows | Prototype | Gaps (see matrix) | KEEP REQUIREMENT / REWRITE | A |

### Types / config / seed / docs

| Capability | File | Purpose | Implementation | Security | Production Suitability | Class |
|---|---|---|---|---|---|---|
| Domain types | `src/types/practice.ts` | Roles, notes, docs, consultations | Prototype types | Visibility enums useful | REQUIREMENT ONLY | A |
| Practice config | `src/config/practice.ts` | Paths, MIME, secrets, TTL | Prototype | Local paths | REJECT paths; A limits | A+F |
| Seed data | `src/data/practice/seed.ts` | Types + Mon–Fri hours | Prototype | Test fixture | OPEN values | A (fixture) |
| Architecture review | `docs/patient-practice-management-architecture-review.md` | Honest “not prod ready” | Doc | Useful honesty | KEEP as history | A |
| Legal edits | `src/data/legal.ts` | Portal wording in PR | Doc change | **Not counsel-approved** | E — do not treat as approved | E |

### Patient app

| Capability | File | Purpose | Implementation | Security | Production Suitability | Class |
|---|---|---|---|---|---|---|
| Server actions | `src/app/patient/actions.ts` | Shared patient/psych actions | Prototype | OTP by userId CRITICAL | REJECT | D+F |
| Register/login/verify/reset | `src/app/patient/{register,login,verify,verify-email,forgot-password,reset-password}/` | Identity UI | Prototype | Unverified login HIGH | REPLACE with Phase 1 | C+B |
| Dashboard | `src/app/patient/dashboard/page.tsx` | Upcoming + notification subjects | Prototype | Prefer Phase 2 account | B | B |
| Appointments | `src/app/patient/appointments/*` | List + book | Prototype | Overlaps Phase 2 | REPLACE | F vs Phase 2 |
| Consultations | `src/app/patient/consultations/page.tsx` | Shared notes | Prototype Option C | Visibility filter present | C + E | A+B+C+E |
| Documents | `src/app/patient/documents/page.tsx` | Shared docs list | Prototype Option C | Download via API | C + D + E | A+B+C+D+E |
| Profile | `src/app/patient/profile/page.tsx` | Read-only prefs | Prototype | Emergency contact fields | A + E | A+B+E |
| Layout | `src/app/patient/layout.tsx` | Portal chrome | Prototype | — | B | B |
| Components | `src/components/practice/*` | Auth/book/verify clients | Prototype | `devCode` UI | REJECT tech | B+F |

### Psychologist practice app

| Capability | File | Purpose | Implementation | Security | Production Suitability | Class |
|---|---|---|---|---|---|---|
| Dashboard | `src/app/psychologist/practice/page.tsx` | Stats + queue actions | Prototype | MFA optional | B + C (stats only) | B |
| Patients | `src/app/psychologist/practice/patients/*` | Directory + chart | Prototype Option C | All-patients access | A+B+C+E | A+B+C |
| Calendar | `src/app/psychologist/practice/calendar/page.tsx` | Availability UI | Prototype | — | B (Option B gap) | B |
| Audit | `src/app/psychologist/practice/audit/page.tsx` | Last 100 events | Prototype | May show metadata | A+B | A+B |
| Security/MFA | `src/app/psychologist/practice/{security,mfa}/` | Enable TOTP | Prototype | Enables before confirm | D | D+F |
| Document API | `src/app/api/practice/documents/[id]/route.ts` | Download bytes | Prototype | Session check; streams file | C+D | C+D |
| Middleware | `src/middleware.ts` | Cookie gate | Prototype | Doc API not in matcher | REPLACE with current | F |

### Env

| Capability | File | Purpose | Implementation | Security | Production Suitability | Class |
|---|---|---|---|---|---|---|
| Practice env | `.env.example` | PRACTICE_* / mock OTP/WA | Template | Empty secrets | REMOVE PRACTICE_*; FUTURE object storage | F / FUTURE |

---

## Capability matrix (condensed)

| Capability | Class | Notes |
|---|---|---|
| PRIVATE vs PATIENT_VISIBLE notes/docs | A + B | Default PRIVATE in UI — keep as requirement |
| Neutral notification copy | A | Keep hard rule |
| Appointment request → psychologist confirm | A | Already in Phase 2 — do not reimplement from PR #9 |
| Double-book prevention | A | Phase 2 PostgreSQL exclusion is authoritative |
| Patient public ids | A | Phase 1 `PAT-` CSPRNG is authoritative (PR #9 sequential style weaker) |
| Consultations linked to appointments | A | Policy OPEN for create rules |
| Clinical note body | A + E | Requires legal approval before build |
| Document upload/download | A + D + E | Must use private object storage + signed URLs |
| Patient list / chart UI | B | Missing in Phase 2; Option B gap vs Option C content |
| Calendar availability UI | B | Phase 2 has server availability, no UI |
| SQLite JSON snapshot | F | Forbidden |
| Local document directory | F | Forbidden for production clinical files |
| Mock OTP/WhatsApp always | F | Forbidden in production |
| HMAC practice session | F | Replace with server-side sessions |
| Unauthenticated OTP by `userId` | D + F | Must not carry forward |
| Plaintext MFA secret | D + F | Must not carry forward |
| Tokens in notification bodies | D + F | Must not carry forward |
| Legal copy rewritten in PR | E | Not counsel-approved; current site still informational |
| Option C as “selected and implemented” claim | F | Conflicts with current decision register (Option C DEFERRED) |

---

## Prototype-only markers

```text
PRACTICE_STORE=sqlite|memory
practice_snapshot.payload JSON
data/practice-documents/*.bin
MockOtpProvider / MockWhatsAppProvider
devCode returned to client
RESCHEDULED as durable appointment status
No SUPER_ADMIN
No PostgreSQL / Drizzle / outbox
```

---

## Independent PR #9 test status

| Item | Status |
|---|---|
| Test file exists | `src/lib/practice/practice.test.ts` (~322 lines) |
| Asserted | register, email token, OTP, double-book, note visibility, session HMAC, TOTP |
| Not asserted | document IDOR, OTP-by-userId, unverified login, rate limits, MIME spoofing, token-in-notify |
| Executed in Phase 2J agent | **NOT RUN** against production architecture (isolated worktree; deps not installed). Prototype tests must not be used as production security evidence |

Current Phase 1–2 suite remains the authoritative automated baseline.

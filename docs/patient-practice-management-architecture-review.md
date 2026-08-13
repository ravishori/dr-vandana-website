# Patient & Practice Management System — Architecture Review (Phase 0)

**Status:** HARD STOP — implementation deferred pending product, legal, and provider decisions  
**Date:** 2026-08-14  
**Branch:** `cursor/patient-practice-management-plan-a302`  
**Audited codebase tip:** counselling FAQ + crisis + psychologist question portal stack  

This document is the required **INSPECT → PLAN** deliverable. No PMS application code has been added, because the repository’s current product boundary, privacy policy, and missing third-party providers conflict with a production-ready clinical practice-management system.

---

## 1. Existing architecture

| Layer | Finding |
| --- | --- |
| App type | Public marketing / education site + lead intake + limited psychologist admin |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 |
| Backend | Next.js Server Actions + 2 Route Handlers (`/api/ai/ask`, `/api/internal/errors`) |
| Design | Brand tokens / themes (`calm-sage` etc.), `Container` / `Section` / `ButtonLink` |
| Domain | `drvandana.trinetra.net` |
| Persistence | **No ORM.** Repository adapters: SQLite (`node:sqlite`) / Upstash Redis / memory for question portal + crisis directory only |
| Email | Nodemailer SMTP (appointment enquiry, question notify/reply, error alerts) |
| WhatsApp | **Outbound deep links only** (`wa.me`, Bitly booking URL) — not WhatsApp Business API |
| SMS / OTP | **None** |
| MFA / 2FA | **None** |
| Patient accounts | **None** |
| Document storage | **None** |
| CI | No GitHub Actions workflows found |
| Deploy hints | Vercel / Node; Upstash required for production rate limits / durable Redis stores |

---

## 2. Existing authentication architecture

Single staff auth system for the psychologist portal:

- Env identity: `PSYCHOLOGIST_LOGIN_EMAIL` + `PSYCHOLOGIST_PASSWORD_HASH` (scrypt)
- Session: HMAC-signed cookie `drvandana_portal_session` (`SESSION_SECRET`, 8h TTL)
- Middleware guard: `/psychologist/*` except login
- Role: only `PSYCHOLOGIST`
- Password helper: `src/lib/question-portal/password.ts`
- Session helper: `src/lib/question-portal/session.ts`
- Auth helpers: `src/lib/question-portal/auth.ts`

**There is no patient registration, patient session, OTP, MFA, password-reset for patients, or multi-user staff table.**

---

## 3. Existing database architecture

| Domain | Storage | Notes |
| --- | --- | --- |
| Appointment enquiries | **Not stored** | Email to practice only |
| Psychology questions | SQLite / Upstash / memory | Private question portal records + audit events |
| Crisis helplines | SQLite / Upstash / memory | Verified directory CMS |
| Ask AI conversations | In-process memory | Ephemeral |
| Theme preference | `localStorage` | Client only |

No patient, appointment-slot, consultation, document, or notification-queue tables exist.

Production durability: SQLite on ephemeral serverless disk is unsafe; Upstash or a dedicated Node host with persistent disk is required for any new durable store.

---

## 4. Existing UI structure

Public: Home, About, Areas of Support, Child/Adolescent, Stress & Wellness, Understanding Counselling, Mental Health Support, Contact, Book Appointment (enquiry), Ask a Question, Ask AI, case studies, legal pages.

Staff: `/psychologist/login`, dashboard, questions review, crisis resource admin.

No `/patient/*` portal routes.

---

## 5. Existing notification capabilities

| Channel | Capability | Status |
| --- | --- | --- |
| Email | SMTP via Nodemailer | **TESTED pattern** for enquiry/question/error mail when SMTP env is set |
| WhatsApp | Click-to-chat links | **NOT CONNECTED** as transactional messaging |
| SMS / OTP | — | **CONFIGURATION REQUIRED** (no provider abstraction exists) |
| Push / in-app | — | Absent |

SMTP variables are used in code (`SMTP_*`, `APPOINTMENT_TO_EMAIL`) but are **missing from `.env.example`** — ops gap.

---

## 6. Existing appointment capabilities

Current flow is **appointment enquiry**, not booking:

1. `/book-appointment` multi-field form  
2. Honeypot + rate limit  
3. Zod validation  
4. Email to practice  
5. Success message that enquiry was received  

Explicitly **does not**:

- Persist appointments  
- Confirm slots  
- Manage availability calendar  
- Prevent double booking  
- Create patient records  

External Bitly WhatsApp booking CTA exists as a separate channel.

Privacy policy and BRD state that submitting an enquiry does **not** confirm an appointment and does **not** create a patient database / EHR.

---

## 7. Gaps identified (vs requested PMS)

Missing entirely (or only partially present):

- Patient registration / email verify / mobile OTP  
- Patient login / portal / notification preferences  
- Psychologist MFA  
- Multi-role RBAC (patient / psychologist / future staff)  
- Configurable consultation types + availability engine  
- Appointment state machine with history  
- Double-booking protection  
- Calendar day/week/month views  
- Consultation records + private vs patient-visible notes  
- Secure document vault + signed URLs  
- Central notification service + WhatsApp templates  
- Audit logging for clinical access  
- Patient search directory  
- Reporting suite  

---

## 8. Proposed architecture (if / when approved)

Prefer a **modular monolith** inside the existing Next.js app (no microservices), extending repository + server-action patterns already used by the question portal.

### Recommended product boundary options

| Option | Description | Recommendation |
| --- | --- | --- |
| **A — Keep site non-clinical** | Improve enquiry + psychologist inbox only; real scheduling via Cal.com/Calendly embed | Matches current BRD/privacy |
| **B — Non-clinical booking portal** | Patient accounts + slot requests + confirmations + neutral notifications; **no clinical notes/documents/EHR** | Possible after privacy policy update |
| **C — Full clinical PMS** | Private notes, documents, consultation charting as requested | Requires **new legal/privacy basis**, dedicated secure hosting, provider credentials, and likely a separate subdomain/app |

**This review recommends Option A or B for this repository.** Option C should not be built on the current public website without an explicit rewrite of BRD § EHR prohibition and privacy policy.

### If Option B is chosen later

1. **Auth module** (`src/lib/practice-auth/`): users, roles (`PATIENT`, `PSYCHOLOGIST`, reserved `STAFF`), sessions, email verification tokens, password reset, TOTP MFA for psychologist. Extend—do not discard—existing psychologist cookie session pattern; migrate env psychologist into a provisioned user row.  
2. **OTP abstraction** (`OtpProvider`): interface only until SMS/WhatsApp OTP credentials exist; default `MockOtpProvider` for tests.  
3. **Appointment engine**: availability rules, exceptions, appointments + status history, transactional slot locking (SQLite transaction or Redis lock + unique constraint).  
4. **Notification service**: queue + templates + EmailProvider (reuse Nodemailer) + WhatsAppProvider (stub until Business API approved). Neutral copy only.  
5. **Patient portal** `/patient/*` and expanded `/psychologist/*` for calendar/appointments (non-clinical).  
6. **Do not implement** private clinical notes or clinical document vault in Option B.

### If Option C is insisted upon

Requires separate architecture review for:

- Hosting with encrypted persistent database (not Redis-as-primary-DB, not ephemeral SQLite)  
- Object storage + malware scanning + signed URLs  
- Stricter retention/backup/restore  
- Legal counsel review of privacy/terms  
- Explicit consent model for clinical data processing  

---

## 9. Database changes (proposed, not applied)

Would be additive migrations only after Option B/C approval. Example Option B tables:

- `users`, `user_roles`, `sessions`  
- `email_verifications`, `password_resets`  
- `otp_challenges` (hashed OTP only)  
- `patients` (public_id `PAT-…`)  
- `consultation_types`  
- `availability_rules`, `availability_exceptions`  
- `appointments`, `appointment_status_history`  
- `notification_outbox`, `notification_preferences`  
- `audit_events`  

Option C additionally: `consultations`, `consultation_notes` (visibility enum), `patient_documents`, `document_access`.

**No migrations run in this Phase 0 branch.**

---

## 10. API changes (proposed)

Follow existing Server Action style rather than inventing a parallel REST style unless a dedicated API is required.

Groups: auth, patient/me, appointments, availability, psychologist patients/appointments, notifications, audit.

All mutations server-side with auth + role + ownership checks.

---

## 11. Frontend changes (proposed)

- Patient routes under `/patient/*` (`noindex`)  
- Psychologist calendar/appointments under `/psychologist/*` (extend existing portal)  
- Reuse existing UI primitives and brand tokens  
- Keep public SEO pages intact  
- Mobile-first psychologist “Today” view  

---

## 12. Security changes (proposed)

- Hash passwords with existing scrypt approach (or argon2 if dependency approved)  
- MFA mandatory for psychologist  
- Rate limits on auth/OTP/booking (reuse Upstash pattern)  
- Server-side authorization on every sensitive action  
- Append-only audit events  
- Never log OTP/passwords/clinical note bodies  
- Neutral notification copy  
- Private file storage with authz (Option C only)  

---

## 13. Third-party integrations required

| Integration | Status | Needed for |
| --- | --- | --- |
| SMTP | Pattern exists; credentials ops-dependent | Email verify + appointment mail |
| SMS OTP provider | **CONFIGURATION REQUIRED** | Mobile verification |
| WhatsApp Business API | **NOT CONNECTED** | Transactional WhatsApp |
| Object storage (S3-compatible) | **CONFIGURATION REQUIRED** | Documents (Option C) |
| Durable DB (Postgres recommended for Option B/C) | **CONFIGURATION REQUIRED** | Production patient/appointment data |
| Upstash Redis | Partially used | Rate limits / queues |

No credentials were fabricated.

---

## 14. Migration strategy

1. Freeze product decision (A / B / C).  
2. Update privacy policy + disclaimer if moving beyond enquiry-only.  
3. Provision durable DB + secrets in staging.  
4. Migrate env psychologist account into user table (no public psychologist registration).  
5. Keep current `/book-appointment` enquiry path until booking portal is proven; then deprecate carefully.  
6. Preserve question portal and crisis features untouched.  
7. No destructive production migrations without backup/restore drill.

---

## 15. Testing strategy (when implementation resumes)

- Unit: auth, OTP expiry/attempts, appointment state machine, double-booking, RBAC denials  
- Integration: email outbox, notification retries (mocked providers)  
- E2E scenarios A–G from the product brief (with mocked OTP/WhatsApp until live)  
- Security: IDOR, private-note 403, document visibility  
- Explicitly label: **MOCKED** / **CONFIGURATION REQUIRED** / **TESTED** / **PRODUCTION READY**

---

## HARD STOP conditions triggered

1. **Existing BRD + privacy policy forbid EHR/clinical records on this website** — conflicts with private clinical notes, consultation charting, and clinical document vault.  
2. **OTP / SMS provider not configured** — mobile verification cannot be production-ready.  
3. **WhatsApp Business API not configured / approved** — WhatsApp notifications cannot be claimed working.  
4. **No durable production patient database** approved (Vercel + SQLite is insufficient for clinical/PII appointment systems).  
5. **Authorization model for clinical data** cannot be declared adequate without Option C hosting + legal review.  
6. **SMTP env vars incomplete in `.env.example`** — email flows are configuration-dependent and not assumed production-ready.

---

## What will NOT be claimed

| Item | Label |
| --- | --- |
| Full PMS implementation | **NOT STARTED** (by design) |
| Patient registration/OTP | **CONFIGURATION REQUIRED** |
| WhatsApp transactional messaging | **NOT CONNECTED** |
| Clinical notes / documents | **BLOCKED** by current privacy/BRD |
| Double-booking calendar | **NOT STARTED** |
| MFA | **NOT STARTED** |

---

## Safe near-term work (does not require lifting HARD STOP)

These can be done later without building an EHR:

1. Document SMTP variables in `.env.example`.  
2. Improve psychologist dashboard UX for existing question + crisis modules.  
3. Optional Cal.com/Calendly embed behind feature flag (external scheduling).  
4. Stronger MFA for the **existing** single psychologist login (TOTP) without creating patient EHR.  
5. Formal product decision workshop for Option A vs B vs C.

---

## Decision checklist for stakeholders

- [ ] Confirm Option **A**, **B**, or **C**  
- [ ] If B/C: approve privacy policy rewrite  
- [ ] Provide SMS/OTP provider choice + credentials (staging)  
- [ ] Provide WhatsApp Business approval path (or defer WhatsApp)  
- [ ] Provide durable database + backup/restore owner  
- [ ] If C: approve clinical data hosting model and retention policy  
- [ ] Confirm timezone Asia/Kolkata and practice booking rules  

**No PMS feature implementation will proceed until these decisions are recorded.**

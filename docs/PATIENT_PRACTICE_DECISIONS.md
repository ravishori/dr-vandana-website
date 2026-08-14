# Patient & Practice Management — Decision Register

**Status:** Phase 0.5 — architecture decision lock  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.

This file is the **authoritative decision register**. Future implementation must follow it.

Labels used in this document (only these):

```text
APPROVED
OPEN
DEFERRED
BLOCKED
```

This document is technical planning. **It is not legal advice.**

**NO Patient & Practice Management functionality is implemented by this document.**

---

## Mandatory reading for future Cursor sessions

Before implementing any Patient & Practice Management feature, read:

1. `docs/PATIENT_PRACTICE_DECISIONS.md` (this file)
2. `docs/PATIENT_PRACTICE_MANAGEMENT_ARCHITECTURE.md`
3. `docs/EXISTING_FEATURE_AUDIT.md`

Treat them as project governance documents. Do not implement deferred or blocked items because they appear in the architecture blueprint.

---

## Source of truth hierarchy

Highest priority first:

1. **Explicit approved project decisions** (human-approved product direction)
2. **`docs/PATIENT_PRACTICE_DECISIONS.md`** — this register
3. **`docs/PATIENT_PRACTICE_MANAGEMENT_ARCHITECTURE.md`** — technical blueprint
4. **`docs/EXISTING_FEATURE_AUDIT.md`** — existing implementation baseline
5. **Existing source code** — current runtime reality
6. **Cursor assumptions** — lowest priority

If source code conflicts with an approved decision, **do not silently change either**. Report the conflict.

Known coexistence (not a silent conflict): the live site still uses HMAC psychologist sessions and has no patient accounts. That is expected until a later implementation phase migrates auth.

---

## 1. Product scope

| Decision | Status |
|---|---|
| First production scope is **Option B — Secure Patient + Appointment Management** | **APPROVED** |
| Option C clinical PMS (consultation charts, private/patient-visible clinical notes, clinical documents, assessments) | **DEFERRED** — **NOT APPROVED FOR IMPLEMENTATION** |
| Child / independent minor patient accounts | **DEFERRED** |
| Draft PR #9 prototype as production architecture | **DEFERRED** (do not merge or copy the JSON snapshot store) |

### Option B — in scope (future implementation phases, not this task)

**Patient**

- Registration, email verification, mobile OTP, login, logout, password reset
- Patient profile (non-clinical)
- Appointment request/booking against availability
- Status, reschedule, cancellation, history
- Email and WhatsApp notifications (privacy-safe copy)

**Psychologist**

- Provisioned login, mandatory TOTP MFA, session management
- Appointment dashboard, calendar, availability management
- Patient directory and non-clinical patient profile
- Appointment management, notifications, audit visibility

**Platform**

- PostgreSQL system of record
- RBAC, server-side sessions
- Appointment concurrency protection
- Notification outbox
- EmailService and WhatsAppService abstractions
- Audit logging, rate limiting, security hardening

### Option C — out of scope until separately approved

**DEFERRED — NOT APPROVED FOR IMPLEMENTATION**

- Detailed consultation records
- Private clinical notes
- Patient-visible clinical notes
- Clinical document management
- Psychological assessment records
- Medical/clinical file storage

The Phase 0 architecture document still *describes* those entities for future-proofing. That description is **not permission to build them**.

Before Option C can leave `DEFERRED`:

1. Privacy policy review  
2. BRD review (current BRD forbids EHR on the website database)  
3. Data governance review  
4. Retention policy  
5. Legal/professional review  
6. Explicit project approval  

Until then, Option C is also **BLOCKED**.

---

## 2. Approved decisions

### 2.1 Database

| Item | Decision | Status |
|---|---|---|
| System of record | **PostgreSQL** (managed production) | **APPROVED** |
| Requirements | TLS, automated backups, PITR where available, transactions, concurrency control, India-region **preference** | **APPROVED** |
| Not for production appointment data | SQLite, JSON snapshot blobs, app filesystem | **APPROVED** (forbidden) |
| Redis | Rate limiting, cache, short-lived coordination, optional queue — **not** system of record | **APPROVED** |

PostgreSQL **vendor** and **region**: **OPEN**.

Evaluation criteria when a human selects a vendor:

- India region availability / data residency
- Encryption in transit and at rest
- Backups and point-in-time recovery
- Next.js / Vercel compatibility and connection pooling
- Cost at low practice volume
- Operational simplicity
- Reliability / SLA
- Processor-contract readiness (DPDP)

Candidates (not selected): Neon, AWS RDS PostgreSQL, Supabase PostgreSQL (database only — not Supabase Auth as RBAC source of truth), other managed Postgres.

No provider credentials may be created or committed in this phase.

### 2.2 Identifiers

| Item | Decision | Status |
|---|---|---|
| Internal primary keys | UUID | **APPROVED** |
| Public patient id | Unguessable `PAT-` + CSPRNG alphabet (e.g. `PAT-7K3F9Q2M`) | **APPROVED** |
| Public appointment id | Unguessable `APT-` + CSPRNG alphabet (e.g. `APT-X8P4N6ZT`) | **APPROVED** |
| Sequential public ids (`PAT-000001`) | Forbidden | **APPROVED** |

### 2.3 Authentication and sessions

| Item | Decision | Status |
|---|---|---|
| Patient workflow | Register → email verify → mobile verify → activate → login → server session | **APPROVED** |
| Patient factors | Email, password, verified mobile, password reset, logout, session management | **APPROVED** |
| Psychologist | Provisioned account (not public registration), password, **mandatory TOTP MFA**, recovery mechanism, session revocation, shorter timeout, security logging | **APPROVED** |
| MFA method | Authenticator-app **TOTP** (not email OTP, not SMS as primary MFA) | **APPROVED** |
| Session store | **Server-side session records** + secure httpOnly cookies | **APPROVED** |
| Client-side authorization | Forbidden (no relying on localStorage tokens for authz) | **APPROVED** |
| Existing HMAC question-portal session | Keep during transition; do not delete in the first PMS commit | **APPROVED** |

Patient V1 is **adult self-registration only**. Guardian/child flows: **DEFERRED**.

TOTP recovery **design**: hashed single-use backup codes, printable once, password required to regenerate. **Final MFA recovery policy** (how many codes, offline procedures if Dr. Vandana loses the device): **OPEN**.

### 2.4 HMAC → practice session migration (not Phase 0.5 work)

| Stage | Question portal (`drvandana_portal_session`) | Practice session (`sessions` table + new cookie) |
|---|---|---|
| Today | HMAC cookie, env psychologist, Q&A + crisis | Does not exist |
| After identity foundation | Unchanged | Patients + new psychologist practice routes |
| After unified psychologist login | Retired | Covers `/psychologist/*` including Q&A/crisis, with MFA |

Unifying authentication is **not** part of Phase 0.5.

### 2.5 RBAC and authorization

| Role | Access | Status |
|---|---|---|
| `SUPER_ADMIN` | Platform and practice **configuration** (not automatic clinical access) | **APPROVED** (architecture; implementation **DEFERRED**) |
| `PSYCHOLOGIST` | Clinical/practice operation appropriate to the psychologist role | **APPROVED** |
| `STAFF` | Limited operational access; reserved, not implemented in V1 | **APPROVED** (reserved) |
| `PATIENT` | Own data only | **APPROVED** |

Every sensitive request must enforce:

```text
Authentication + Role + Resource ownership + Permission
```

Frontend hiding is not authorization. Backend authorization is mandatory.

### 2.6 Appointments

| Item | Decision | Status |
|---|---|---|
| Existing `/book-appointment` enquiry | **Retained** as general/fallback channel | **APPROVED** |
| New booking | Separate authenticated flow after patient login | **APPROVED** |
| Timezone | **Asia/Kolkata** | **APPROVED** |
| Hours / duration | Configurable; not hard-coded | **APPROVED** (values themselves **OPEN**) |
| Current statuses | `REQUESTED`, `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `REJECTED` | **APPROVED** |
| `RESCHEDULED` | History event only; current status returns to `CONFIRMED` | **APPROVED** |
| History | Immutable append-only records (previous/new status and slot, actor, timestamp, reason) | **APPROVED** |
| Double-booking | Database is authoritative. PostgreSQL exclusion constraint on psychologist + time range + transaction/locking. Frontend slots are informational. | **APPROVED** |
| Auto-create clinical consultation row | **Do not** | **APPROVED** (forbidden in Option B) |

Exact SQL for the exclusion constraint is validated in Phase 1. Principle is locked.

Cancellation **policy** (windows, approval): **OPEN**. Architecture must be configurable.

### 2.7 Notifications

| Item | Decision | Status |
|---|---|---|
| Pattern | Transactional outbox in the **same database transaction** as the appointment change | **APPROVED** |
| Appointment commit vs SMTP/WhatsApp failure | Appointment must still commit | **APPROVED** |
| Email | Wrap existing Nodemailer SMTP behind `EmailService` | **APPROVED** |
| WhatsApp | WhatsApp Business API / approved BSP — **not** `wa.me`, **not** Bitly | **APPROVED** (channel); vendor **OPEN** |
| Copy | No diagnosis, notes, condition, assessment, or sensitive document detail in email or WhatsApp (including subject/preview) | **APPROVED** |
| Production mocks | `OTP_PROVIDER=mock` or mocked WhatsApp `ok: true` forbidden in production | **APPROVED** |

### 2.8 Security and audit

| Item | Decision | Status |
|---|---|---|
| Baseline | HTTPS, secure cookies, server-side authz, password hashing, psychologist MFA, rate limiting, audit, validation, security headers, secrets not in Git | **APPROVED** |
| Audit logging | **Approved for Phase 1** — security and appointment events, append-oriented | **APPROVED** |
| Audit must not store | Passwords, OTP values, private clinical notes, unnecessary sensitive payloads | **APPROVED** |
| Reuse existing password hashing | Current scrypt helper may be reused initially | **APPROVED** |
| Hash upgrade (argon2id) | Not locked | **OPEN** |

### 2.9 Deployment and existing site

| Item | Decision | Status |
|---|---|---|
| Public website | Remains intact | **APPROVED** |
| Hosting | Stay compatible with existing Next.js / Vercel-style deploy; no new hosting architecture in 0.5 | **APPROVED** |
| Question portal + crisis directory | Keep | **APPROVED** |
| CI | Minimum CI (install, lint, typecheck, tests, build) should exist before major production PMS functionality | **APPROVED** (plan); provider **OPEN** |

### 2.10 Super Admin and practice configuration

| Item | Decision | Status |
|---|---|---|
| `SUPER_ADMIN` role exists architecturally | Platform/practice administration; **not** unrestricted data access | **APPROVED** |
| Super Admin ≠ clinical authority | Clinical permissions are separate and **not** auto-granted | **APPROVED** |
| Super Admin MFA | Mandatory authenticator **TOTP**; not email/SMS as primary MFA | **APPROVED** |
| Super Admin provisioning | No public registration page; provisioned, audited, recoverable | **APPROVED** |
| Practice configuration | Database-backed via `PracticeConfigService`; not scattered hard-codes | **APPROVED** |
| Public vs secrets | Public/operational settings ≠ infrastructure secrets | **APPROVED** |
| Secrets storage | API keys, DB/SMTP/OTP/WhatsApp passwords stay in env/secrets manager | **APPROVED** |
| Configuration changes | Audited (actor, action, target, time, safe before/after) | **APPROVED** |
| Practice / appointment / notification settings | Configurable by Super Admin (values themselves remain **OPEN**) | **APPROVED** |
| User/role administration | Allowed for Super Admin; self-escalation forbidden; audited | **APPROVED** |
| Security notifications | Password/MFA/suspicious-login events must not be freely disabled | **APPROVED** |
| Super Admin dashboard `/super-admin/*` | Separate from patient and psychologist trees | **APPROVED** (route design); **DEFERRED** (build) |
| SQL console / env viewer / secret viewer / filesystem in UI | Forbidden | **APPROVED** (forbidden) |
| Entire website as CMS | Forbidden; only designed configuration models | **APPROVED** (forbidden) |

Permissions are independent of roles. Super Admin default grants (architecture):

```text
MANAGE_PRACTICE_SETTINGS
MANAGE_CONTACT_SETTINGS
MANAGE_LOCATION_SETTINGS
MANAGE_APPOINTMENT_SETTINGS
MANAGE_NOTIFICATION_SETTINGS
MANAGE_USERS
MANAGE_ROLES
VIEW_AUDIT_LOGS
MANAGE_SYSTEM_SETTINGS
MANAGE_PUBLIC_SITE_SETTINGS
```

Clinical permissions are **not** on Super Admin by default:

```text
VIEW_CLINICAL_RECORDS
VIEW_PRIVATE_CLINICAL_NOTES
MANAGE_CLINICAL_NOTES
VIEW_CLINICAL_DOCUMENTS
MANAGE_CLINICAL_DOCUMENTS
```

Those clinical permissions remain **DEFERRED** with Option C.

Super Admin sessions: stricter than patient (short idle, absolute lifetime, revocation, device list, security logging). High-risk actions (role changes, MFA/security, account deactivation, major appointment policy) require **recent re-authentication**. Documented as a Phase 1/2 security requirement; **not implemented now**.

Configuration groups (future tables/aggregates, not a dump on `users`):

```text
PracticeSettings
ContactSettings
LocationSettings
PracticeHours
AppointmentSettings
NotificationSettings
BrandSettings
PublicSiteSettings
```

Flow: Database configuration → `PracticeConfigService` (load, validate, cache, invalidate, public vs private views) → application surfaces.

Hard-coded public contact/hours/DIGIPIN in `src/data` migrate **during a future implementation phase**, not now.

---

## 3. Open decisions — HUMAN APPROVAL REQUIRED

| ID | Topic | Notes |
|---|---|---|
| O1 | PostgreSQL vendor | Neon / RDS / Supabase Postgres / other |
| O2 | PostgreSQL region | India preference; not selected |
| O3 | ORM / database client | See §5 recommendation; not locked |
| O4 | OTP / SMS vendor | India delivery, OTP, rate limits, receipts; provider-agnostic architecture |
| O5 | WhatsApp BSP / provider | Business API; templates need approval |
| O6 | Object storage vendor | Extension point only; **do not implement** while documents are deferred |
| O7 | Practice working hours | Configurable later; do not invent hours now |
| O8 | Consultation duration | Configurable types; do not assume 30/45/60 |
| O9 | Cancellation policy | Window, late cancel, who may cancel, approval |
| O10 | Account/appointment retention | Must be documented before production rollout |
| O11 | Legal / privacy wording | Notices, consents, terms — not legal advice |
| O12 | Final MFA recovery policy | Backup-code operations if the psychologist loses the device |
| O13 | Password hashing upgrade | scrypt vs argon2id for new hashes |
| O14 | Cookie `SameSite` | Strict vs Lax |
| O15 | Notification worker | Vercel cron vs always-on worker |
| O16 | CI provider / setup | GitHub Actions likely; not implemented in 0.5 |
| O17 | IDOR response | 403 vs 404 for other-patient resources |
| O18 | Hosting vs data residency | If Postgres is in India and the app is on Vercel, processor map still needs review |
| O19 | Exact Super Admin provisioning process | Break-glass, who holds backup codes, first-account bootstrap |
| O20 | Final permission matrix | Including whether any clinical permission can ever attach to Super Admin |
| O21 | Whether Super Admin can manage psychologist accounts | Assign/revoke `PSYCHOLOGIST`, deactivate |
| O22 | Whether Super Admin can manage public FAQ content | Selected FAQ vs read-only educational pages |
| O23 | Configuration caching strategy | TTL, Redis vs in-process, invalidation |
| O24 | Configuration rollback UX | History vs one-click revert |

Do not invent values for O7–O11 in code.

---

## 4. Deferred decisions

| Item | Status |
|---|---|
| Option C clinical consultation records | **DEFERRED** |
| Private clinical notes | **DEFERRED** |
| Patient-visible clinical notes | **DEFERRED** |
| Clinical document management / object-storage implementation | **DEFERRED** |
| Psychological assessments | **DEFERRED** |
| Child/adolescent independent accounts and verifiable parental consent | **DEFERRED** |
| `STAFF` role implementation | **DEFERRED** |
| Super Admin dashboard implementation (`/super-admin/*`) | **DEFERRED** |
| Configuration APIs / `PracticeConfigService` code | **DEFERRED** |
| Configuration database migrations | **DEFERRED** |
| Public website CMS / selected content editing | **DEFERRED** |
| User administration UI | **DEFERRED** |
| Payments, invoices, teleconsult, calendar sync, extra psychologists | **DEFERRED** |
| Merging or reusing PR #9 stores/UI as production | **DEFERRED** |

Object storage remains an **architecture extension point** only. **DO NOT implement document storage** while documents are deferred.

---

## 5. ORM / database access — recommendation (not locked)

**Status: OPEN** (human approval required)

### Recommended

**Drizzle ORM** with SQL migrations (`drizzle-kit`), `postgres.js` (or the official Neon/serverless driver when the vendor is chosen), and **raw SQL migrations** for PostgreSQL `EXCLUDE USING gist` constraints.

### Alternatives

| Approach | Fit |
|---|---|
| Prisma | Strong migrations and studio UX. Exclusion constraints are still raw SQL; serverless needs driver adapters + pooler. Acceptable if the human prefers Prisma. |
| `pg` / `postgres.js` without ORM | Maximum SQL control; weak migration/type-safety story unless another migrator is added. More boilerplate than this codebase should take on for a full domain. |
| Continue SQLite / `node:sqlite` | **Rejected** for PMS (already forbidden above). Existing question/crisis SQLite adapters may remain until those domains are migrated separately. |

### Reason

The current app has **no ORM**, uses TypeScript + Zod, Server Actions, and a repository style with explicit SQL (`src/lib/question-portal/sqlite-store.ts`). The appointment integrity requirement is a **GiST exclusion constraint**, which no schema DSL fully owns. Drizzle stays close to SQL, is light on Next.js 16 serverless, composes with transactions, and matches existing patterns better than introducing Prisma’s client generation as a second world. Prisma remains a valid alternative if approved.

**Do not install an ORM in Phase 0.5.**

---

## 6. Blockers

| Item | Status | Why |
|---|---|---|
| Option C clinical implementation | **BLOCKED** | Privacy policy + BRD forbid EHR/clinical records on the website until rewritten and legally reviewed |
| Production launch of Option B patient accounts | **BLOCKED** until privacy/terms/consent copy is updated | Current privacy text states the site does not create a patient database or portal from submissions. Option B *will* create accounts and appointment records. That is a policy change, not only a code change |
| Production OTP | **BLOCKED** on vendor selection (O4) | Architecture must fail closed if mock is used in production |
| Production WhatsApp notifications | **BLOCKED** on BSP + template + opt-in copy (O5) | `wa.me` / Bitly are not substitutes; feature may ship disabled until a provider is approved |
| Production Postgres | **BLOCKED** on vendor/region (O1, O2) | No credentials in Git |
| Child registration | **BLOCKED** | **DEFERRED**; do not build V1 around minors |

Infrastructure work in a non-production environment may proceed in a later Phase 1 **after** this register is reviewed, without claiming production readiness.

---

## 7. Security baseline (locked)

**APPROVED**

- HTTPS
- Secure cookies (httpOnly; Secure in production)
- Server-side authorization on every sensitive operation
- Password hashing (existing scrypt reusable)
- Mandatory TOTP MFA for psychologist and Super Admin
- Rate limiting (existing Upstash pattern may be reused)
- Append-only audit logging (no secrets/OTP/notes)
- Input validation (Zod, matching current app)
- Security headers (existing `next.config.ts`)
- Secret management via environment; **no secrets in Git**
- Future file architecture: private bucket + signed URLs only (not implemented while documents are deferred)

---

## 8. Legal / privacy (not legal advice)

This architecture is **not** a claim of DPDP or professional-ethics compliance.

Before clinical functionality (Option C) is implemented, obtain appropriate professional/legal review of:

- Digital Personal Data Protection Act, 2023 and applicable rules
- Privacy notices and consent
- Processor agreements
- Breach handling
- Professional confidentiality
- Retention vs erasure

Do not claim compliance merely because technical controls exist.

Account and appointment retention (Option B) must still be documented before production rollout (**OPEN** / **BLOCKED** on policy).

---

## 9. Phase 1 preview (do not start in 0.5)

When a separate Phase 1 prompt is issued, expected foundation work is infrastructure + database + identity — **not** booking UI, **not** WhatsApp, **not** clinical records.

Phase 1 schema must **not** create:

- `consultations`
- `consultation_notes`
- `patient_documents`
- Super Admin dashboard routes
- Configuration CMS tables unless that milestone explicitly includes identity **and** a reviewed config slice

even though some of those appear in the Phase 0 ERD.

---

## 10. Conflicts report

| Topic | Architecture / code | This register | Action |
|---|---|---|---|
| Clinical tables in Phase 0 ERD | Architecture still draws consultations/notes/documents | Option C **DEFERRED** | Future sessions must not migrate those tables |
| Privacy policy vs Option B | Legal copy denies patient database/portal | Option B **APPROVED** as product direction | Production launch **BLOCKED** until copy is updated |
| HMAC psychologist auth | Live code | Keep until unified session | Do not delete now |
| PR #9 | Prototype with mocks + JSON blob | Not production | Do not merge |
| Super Admin | Earlier 0.5 lock said role absent | Role **APPROVED** architecturally; UI **DEFERRED** | This update supersedes “no SUPER_ADMIN” |

No other code/decision conflicts require a silent code change.

---

## 11. Phase 1B audit notes (14 August 2026)

Code-level review: `docs/PHASE_1B_SECURITY_AUDIT.md`. **Production launch remains BLOCKED.**

This audit did **not** change approved architecture. Open items below stay OPEN:

| ID | Phase 1B note | Status |
|---|---|---|
| O12 | Lost authenticator **and** lost recovery codes still have no in-app recovery. No production MFA bypass was added. | **OPEN** |
| O13 | scrypt retained (explicit Node `N=16384,r=8,p=1`) for compatibility with the psychologist portal. Argon2id not adopted; dual-hash migration would be required. | **OPEN** |
| O14 | Implementation remains `SameSite=Lax` on `drv_practice_session` so email/reset GET landings work. Question portal stays Strict. Formal confirmation still required. | **OPEN** |

Do not start Phase 2 from the Phase 1B audit.

---

## Document control

| Field | Value |
|---|---|
| Baseline | `docs/EXISTING_FEATURE_AUDIT.md` (PR #10 checkpoint) |
| Architecture | `docs/PATIENT_PRACTICE_MANAGEMENT_ARCHITECTURE.md` (PR #11) |
| This register | Phase 0.5 |
| Next | Separate prompt for Phase 1 — infrastructure + database + identity foundation |

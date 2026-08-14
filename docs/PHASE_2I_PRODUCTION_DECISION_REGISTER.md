# Phase 2I Production Decision Register

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase2-appointments-d73b`  
**Overall: PRODUCTION BLOCKED**

This is the **authoritative production decision pack** for remaining human, legal, provider, and infrastructure choices. It does **not** deploy, enable registration, create credentials, or close OPEN items.

`PATIENT_REGISTRATION_ENABLED` remains **false**. No alternate activation mechanism exists.

This file is **not** legal advice and does **not** claim DPDP, HIPAA, EHR, or professional-ethics compliance.

Source of truth:

1. Implemented source code
2. `docs/PATIENT_PRACTICE_DECISIONS.md` (architecture lock)
3. This register (production-activation decisions still OPEN)
4. Phase 2H matrix and runbooks

Statuses used here:

```text
OPEN
BLOCKED
NOT CONFIGURED
HUMAN DECISION
LEGAL REVIEW
DEFERRED
PASS (code/safe-default only — never for unchosen vendors)
```

Recommendations below are **technical** only. They are not business, legal, or vendor selections. **Do not convert OPEN to PASS.**

Decision owner is **HUMAN DECISION** until a named operator is assigned.

---

## How to use this pack

For each OPEN row, the owner must supply the information in **Information required** (in the supporting decision document) and record:

- chosen option
- date
- sign-off
- evidence (contract, region screenshot, restore drill log — **never secrets**)

Related operator command:

```bash
npm run production:gates
```

Overall remains **BLOCKED**. Env var presence is not provider readiness.

---

## PRIORITY 1 — Production blockers

These must be resolved before `PATIENT_REGISTRATION_ENABLED=true`.

| ID | Decision | Current Status | Options | Recommendation | Decision Owner | Dependency |
|----|----------|----------------|---------|----------------|----------------|------------|
| O1 | PostgreSQL vendor | OPEN / HUMAN DECISION | Neon; Amazon RDS / Aurora PostgreSQL; Supabase PostgreSQL (database only); Cloud SQL; Azure Database for PostgreSQL; other managed PostgreSQL 16+ | Prefer a managed PostgreSQL 16+ service with TLS, backups, PITR (or equivalent), pooling compatible with Next.js/Vercel, and an India-region option if residency requires it. Do not select here. | HUMAN DECISION | India-region / O2 / O18; DPA |
| O2 | PostgreSQL region | OPEN / HUMAN DECISION | India region if the vendor offers it; nearest supported region if India unavailable; confirm backup/replica regions separately | Prefer the same jurisdiction as the intended residency policy. If the chosen vendor has no India region, treat nearest-region as a **legal** question, not a default. | HUMAN DECISION | O1, O18 |
| P1-PG-VER | PostgreSQL major version | OPEN / HUMAN DECISION | 16+ as required by project gates; confirm vendor default | Production must be PostgreSQL **16+** with `btree_gist`. Confirm the vendor’s default and upgrade policy at selection. | HUMAN DECISION | O1 |
| P1-DB-URL | Production `DATABASE_URL` | NOT CONFIGURED | Host secret manager only | Store in the host secret manager. Never Git, never `NEXT_PUBLIC_*`. Env presence ≠ schema verified. | HUMAN DECISION | O1, O2 |
| P1-SCHEMA | Production schema verification | NOT CONFIGURED | `npm run db:verify-production` on the **target** database | Fail closed if `btree_gist` or `appointments_blocking_occupied_excl` is missing. | HUMAN DECISION | Production DB created and migrated |
| O4 | OTP / SMS vendor | OPEN / HUMAN DECISION / BLOCKED | India SMS OTP vendors with DLT/sender support; no adapter until chosen | Keep production fail-closed until a vendor is approved **and** an adapter is implemented. Do not treat `OTP_API_KEY` as readiness. | HUMAN DECISION | DLT / sender / DPA; LEGAL REVIEW |
| P1-SMTP | Production SMTP | NOT CONFIGURED / HUMAN DECISION | Generic SMTP via existing Nodemailer; API-style providers that still speak SMTP | Keep Nodemailer. Choose a transactional sender with TLS. Env presence ≠ delivery. | HUMAN DECISION | DNS SPF/DKIM/DMARC |
| O5 | Twilio WhatsApp production activation | OPEN / BLOCKED | Remain disabled; or activate Twilio after sender, templates, opt-in legal review | Keep `TWILIO_WHATSAPP_ENABLED=false` until the Twilio checklist is complete. Do not switch BSP. | HUMAN DECISION | Meta sender; Content SIDs; LEGAL REVIEW (opt-in) |
| O11 | Privacy / Terms / consent / disclaimer | OPEN / LEGAL REVIEW / BLOCKED | Counsel-approved replacement copy | Do not invent wording in code. Production accounts are blocked until copy matches Option B. | LEGAL REVIEW | Counsel; practice owner |
| O12 | MFA recovery policy | OPEN / HUMAN DECISION | A Super Admin reset; B out-of-band identity verification; C reviewed backup restoration; D alternative approved ceremony | EMAIL-ONLY MFA BYPASS IS FORBIDDEN. Keep hashed backup codes. Choose A–D before sole-psychologist production MFA. | HUMAN DECISION | O19 Super Admin bootstrap |
| O15 | Notification worker hosting | OPEN / HUMAN DECISION | Always-on process; platform cron with a production entrypoint; managed worker | Do not use `npm run notifications:process` in production (CLI refuses). Vercel serverless request/response is not a substitute for the dispatcher loop. | HUMAN DECISION | SMTP/Twilio; monitoring |
| P1-BACKUP | Production backups | OPEN / BLOCKED | Vendor automated backups; separate backup product | Encrypted automated backups of identity + appointments + audit + outbox. A backup never restored is not validated. | HUMAN DECISION | O1 |
| P1-RESTORE | Restore drill | BLOCKED / NOT EXECUTED | Vendor PITR or backup restore onto a non-production copy | Execute a restore drill before go-live. Do not restore onto live production as the first test. | HUMAN DECISION | P1-BACKUP |
| O8/O9 values | RPO / RTO | OPEN / HUMAN DECISION | Owner-chosen time objectives | Framework only in `docs/DECISION_BACKUP_RPO_RTO.md`. Do not invent numbers. | HUMAN DECISION | P1-BACKUP |
| P1-SECRETS | Production secret store | NOT CONFIGURED | Host secret manager | Names in `.env.example` only. Rotation owners OPEN. | HUMAN DECISION | Hosting |
| P1-SMOKE | Production smoke tests | NOT EXECUTED | Staged then production with registration still false | Registration stays false during smoke tests unless every other gate is genuinely green. | HUMAN DECISION | Staging + production infra |
| P1-REG | Registration activation | BLOCKED / PASS (flag false) | Keep false; enable only after the go-live sequence | Never automate `PATIENT_REGISTRATION_ENABLED=true`. | HUMAN DECISION | Every Priority 1 + legal + MFA recovery |

---

## PRIORITY 2 — Security / privacy

| ID | Decision | Current Status | Options | Recommendation | Decision Owner | Dependency |
|----|----------|----------------|---------|----------------|----------------|------------|
| O13 | Password hashing upgrade | OPEN | Keep scrypt; migrate new hashes to argon2id | Technical: scrypt is explicit (`N=16384,r=8,p=1`) and compatible with existing hashes. Argon2id would need a dual-hash migration. Not required to invent a switch now. | HUMAN DECISION | Identity users exist |
| O14 | Cookie `SameSite` | OPEN | Lax (current); Strict | Technical: Lax allows email verify/reset GET landings. Strict would break those landings unless the flow is redesigned. Do not switch silently. | HUMAN DECISION | Email verify/reset UX |
| O17 | Patient 403 vs 404 | OPEN | Distinguish missing vs unauthorized; or always NOT_FOUND | Psychologist reads already use NOT_FOUND. Patient-facing policy remains a product/security choice. Do not invent it in code. | HUMAN DECISION | Patient portal |
| O18 | Data residency / cross-border processing | OPEN / HUMAN DECISION / LEGAL REVIEW | India-only processors; documented transfers; mixed | Map every processor. Do not claim compliance from architecture. | HUMAN DECISION + LEGAL REVIEW | O1, O2, SMTP, OTP, Twilio, host, backups, monitoring |
| O10 | Data retention / deletion | OPEN / LEGAL REVIEW | Per-category periods after counsel | Inventory exists; **do not invent periods**. | LEGAL REVIEW | Counsel; O11 |
| P2-MFA-KEY | `MFA_ENCRYPTION_KEY` rotation | OPEN | Planned re-encryption vs break-glass | Do not rotate casually; stored TOTP secrets will not decrypt. | HUMAN DECISION | O12 |
| P2-SA-BOUND | Super Admin ≠ all data access | PASS (code) / O20 OPEN | Keep clinical permissions ungranted; future Option C matrix | Keep SUPER_ADMIN off clinical permissions. Dashboard remains DEFERRED. | HUMAN DECISION for O20 | Option C DEFERRED |
| P2-SEC-REV | Deployed-environment security review | BLOCKED | Independent review of staging/production | Code audits (2G/2H/2I) are not a deployed review. | HUMAN DECISION | Staging/production exist |

---

## PRIORITY 3 — Operations

| ID | Decision | Current Status | Options | Recommendation | Decision Owner | Dependency |
|----|----------|----------------|---------|----------------|----------------|------------|
| P3-MON | Monitoring / alerting provider | OPEN / HUMAN DECISION | Host logs; APM vendor; error tracker | Select after hosting. Logs ≠ monitoring. Thresholds remain OPEN. | HUMAN DECISION | Hosting |
| P3-BACKUP-VENDOR | Backup provider / encryption | OPEN | Database-vendor backups; separate backup vendor | Prefer vendor PITR plus access-controlled restore credentials that the app role cannot use. | HUMAN DECISION | O1 |
| O16 | CI provider | OPEN lock / GitHub Actions implemented | Keep GitHub Actions; other CI | Technical: GitHub Actions already runs test, lint, typecheck, build, and PostgreSQL 16 schema/concurrency jobs. Formal lock still OPEN. | HUMAN DECISION | — |
| P3-STAGE | Staging environment | NOT CONFIGURED | Separate DB, secrets, test providers | See `docs/STAGING_ENVIRONMENT_RUNBOOK.md`. Never reuse production credentials. | HUMAN DECISION | O1, SMTP, OTP |
| O19 | Super Admin / psychologist bootstrap | OPEN | Documented break-glass; who holds backup codes | `npm run db:provision` is refused in production. First privileged users need a written ceremony. | HUMAN DECISION | O12 |
| P3-POOL | Connection pooling | OPEN | Vendor pooler; PgBouncer; serverless driver | Required for Vercel/serverless. Choice follows O1. | HUMAN DECISION | O1 |
| P3-ROTATE | Secret rotation cadence | OPEN | Owner-chosen intervals | After `AUTH_SESSION_SECRET` rotation, sessions invalidate. | HUMAN DECISION | Secret store |
| P3-DNS | Production DNS / sender identity | NOT CHANGED | SPF/DKIM/DMARC for SMTP; no identity DNS change in this phase | Do not change live DNS from this milestone. | HUMAN DECISION | SMTP vendor |

---

## PRIORITY 4 — Product policy

| ID | Decision | Current Status | Options | Recommendation | Decision Owner | Dependency |
|----|----------|----------------|---------|----------------|----------------|------------|
| O7 | Practice working hours | OPEN | Owner-chosen hours / breaks | Configurable in schema; do not invent hours. | HUMAN DECISION | Practice owner |
| O8 | Appointment duration / buffers | OPEN | Owner-chosen types | Configurable on appointment types; do not assume 30/45/60. | HUMAN DECISION | Practice owner |
| O9 | Cancellation policy | OPEN | Window, late cancel, who may cancel | Schema field exists; production value OPEN. | HUMAN DECISION | LEGAL REVIEW if patient-facing |
| P4-RESCHED | Reschedule notice | OPEN | Patient proposal vs psychologist immediate; notice window | Patient reschedule is `REQUEST_RESCHEDULE` only. Windows OPEN. | HUMAN DECISION | O9 |
| P4-WA-COPY | WhatsApp consent wording | OPEN / LEGAL REVIEW | Counsel-approved opt-in/opt-out | Current checkbox copy is **not** approved legal text. Do not change without approval. | LEGAL REVIEW | O5, O11 |
| P4-COMPLETE | Completion / no-show email | OPEN | Enable or keep default false | Flags default false. | HUMAN DECISION | SMTP |
| P4-PUBLIC | Public enquiry vs authenticated booking | OPEN copy | Keep both; clarify in legal/UX copy | `/book-appointment` remains the public enquiry channel. | LEGAL REVIEW | O11 |

---

## PRIORITY 5 — Future architecture

| ID | Decision | Current Status | Options | Recommendation | Decision Owner | Dependency |
|----|----------|----------------|---------|----------------|----------------|------------|
| O3 | ORM / database client | OPEN lock / Drizzle implemented | Drizzle (current); Prisma; raw `postgres.js` | Technical: Drizzle + SQL migrations already implement exclusion constraints. Formal lock still OPEN. Do not swap ORMs in this phase. | HUMAN DECISION | — |
| O6 | Object storage | DEFERRED | Future vendor | Do not implement while clinical documents are deferred. | HUMAN DECISION | Option C |
| O20 | Final permission matrix | OPEN / DEFERRED dashboard | Whether clinical permissions can ever attach to Super Admin | Default: no. | HUMAN DECISION | Option C |
| O21 | Super Admin manages psychologist accounts | OPEN | Assign/revoke/deactivate | Dashboard DEFERRED. | HUMAN DECISION | Super Admin UI |
| O22 | Super Admin manages FAQ content | OPEN | Selected FAQ vs read-only | Entire-site CMS remains forbidden. | HUMAN DECISION | Super Admin UI |
| O23 | Configuration caching | OPEN | TTL / Redis / in-process | `PracticeConfigService` DEFERRED. | HUMAN DECISION | Super Admin config |
| O24 | Configuration rollback UX | OPEN | History vs one-click revert | DEFERRED with dashboard. | HUMAN DECISION | Super Admin config |
| P5-OPT-C | Option C clinical records | DEFERRED / BLOCKED | Notes, documents, assessments | Do not implement. Requires legal/BRD/governance reviews. | HUMAN DECISION + LEGAL REVIEW | O11, O10 |
| P5-STAFF | `STAFF` role implementation | DEFERRED | Limited operational access | Reserved in catalog; no V1 implementation. | HUMAN DECISION | RBAC |
| P5-PAY | Payments / teleconsult / calendar sync / AI clinical | DEFERRED | Future phases | Out of Phase 2. | HUMAN DECISION | Separate approval |

---

## Information required (by theme)

| Theme | Document | What the owner must provide |
|---|---|---|
| PostgreSQL | `docs/DECISION_POSTGRESQL.md` | Vendor, region, version, pooling, backup SKU, DPA |
| PostgreSQL production | `docs/POSTGRESQL_PRODUCTION_CHECKLIST.md` | Signed verification of TLS, constraints, restore |
| OTP | `docs/DECISION_OTP_PROVIDER.md` | Vendor, DLT, sender, DPA, retention |
| Twilio | `docs/TWILIO_WHATSAPP_PRODUCTION_CHECKLIST.md` | Account, sender, templates, opt-in legal |
| SMTP | `docs/DECISION_SMTP_PROVIDER.md` | Provider, from-address, DNS auth |
| MFA | `docs/DECISION_MFA_RECOVERY.md` | Option A–D |
| Backup | `docs/DECISION_BACKUP_RPO_RTO.md` | RPO, RTO, restore cadence |
| Retention | `docs/DECISION_DATA_RETENTION.md` | Periods per category |
| Residency | `docs/DECISION_DATA_RESIDENCY.md` | Processor map + legal position |
| Practice settings | `docs/PRACTICE_CONFIGURATION_REQUIREMENTS.md` | Hours, duration, policies (values) |
| Staging | `docs/STAGING_ENVIRONMENT_RUNBOOK.md` | Separate staging project |
| Go-live | `docs/PRODUCTION_GO_LIVE_CHECKLIST.md` | Dated sign-off per row |

---

## Fail-closed reminders (code)

| Control | Required state |
|---|---|
| `PATIENT_REGISTRATION_ENABLED` | not the exact string `true` |
| `IDENTITY_PROVISION_ENABLED` | ignored in production (hard-refused) |
| `OTP_VENDOR_ADAPTER_IMPLEMENTED` | `false` until a vendor adapter exists |
| `TWILIO_WHATSAPP_ENABLED` | `false` until Twilio checklist complete |
| `npm run notifications:process` | refuses `NODE_ENV=production` |
| `npm run db:provision` | refuses `NODE_ENV=production` |
| `db:migrate` | fails if `btree_gist` or exclusion constraint missing after apply |

Do not add an alternate registration switch.

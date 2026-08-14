# PostgreSQL Vendor Decision Pack

**Status:** HUMAN DECISION REQUIRED (O1, O2)  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Overall: PRODUCTION BLOCKED**

This document compares technically appropriate **managed PostgreSQL** options for Option B (identity, appointments, audit, notifications). It does **not** create an account, provision infrastructure, or store credentials.

**Final vendor choice remains HUMAN DECISION.** Do not treat this file as a selection.

Pricing: **REQUIRES VERIFICATION** against current vendor quotes. No prices are recorded here.

PostgreSQL is already the **APPROVED** system of record. SQLite, JSON blobs, and the app filesystem remain forbidden for production appointment/identity data.

---

## Application constraints (code)

| Requirement | Why |
|---|---|
| PostgreSQL 16+ | CI uses `postgres:16`; exclusion constraints and `btree_gist` are required |
| `btree_gist` | `EXCLUDE USING gist` on psychologist + occupied range |
| Exclusion constraint `appointments_blocking_occupied_excl` | Authoritative double-booking prevention |
| Transactions + row locks | Booking, lifecycle, dispatcher |
| TLS | Production client connections |
| Connection pooling | Next.js / Vercel serverless creates many short-lived connections |
| Timezone | Application timezone **Asia/Kolkata** (APPROVED); store `timestamptz` |
| Least privilege | App role must not be a superuser / restore role |
| No credentials in Git | `DATABASE_URL` in host secret manager only |

Drizzle ORM + SQL migrations are **implemented**. Formal ORM lock (O3) remains OPEN; do not switch ORMs as part of vendor selection.

---

## Evaluation criteria

Use these when comparing vendors. A missing India region is not an automatic reject; it becomes an **O18 legal** question.

| Criterion | What to verify with the vendor |
|---|---|
| PostgreSQL compatibility | Real PostgreSQL (not a fork that cannot install `btree_gist`) |
| PostgreSQL 16+ | Default version and upgrade path |
| India region | Mumbai/Hyderabad/Delhi or equivalent |
| Data residency | Primary, backups, replicas, support access, logs |
| Backups | Automated, encrypted, retention controls |
| PITR | Window, how restore is initiated |
| Connection pooling | Built-in pooler vs PgBouncer vs serverless driver |
| TLS | Required; certificate verification |
| Monitoring | Metrics, slow queries, connections |
| Restore capability | Documented restore to a new instance |
| Pricing model | Compute, storage, I/O, PITR, egress — **verify current** |
| Serverless compatibility | Connection limits vs Vercel concurrency |
| Vercel compatibility | Pooler URL, `sslmode`, idle timeouts |
| Connection limits | Max connections vs pooler; bursting |
| Operational simplicity | Single-practitioner ops burden |
| DPA / processor terms | **LEGAL REVIEW** — not certified here |

---

## Options (not selected)

Vendor facts below were checked against public documentation on **14 August 2026**. Re-verify before signing a contract. Region lists change.

### A. Neon

| Topic | Notes |
|---|---|
| Fit | Managed serverless PostgreSQL; commonly used with Vercel |
| PostgreSQL 16+ | **REQUIRES VERIFICATION** of the version offered at project create |
| India region | **Not listed** on Neon’s public AWS region list as of 14 August 2026 (`https://neon.com/docs/introduction/regions`). No `ap-south-1` / Mumbai entry in that list |
| Nearest published APAC regions | AWS Asia Pacific (Singapore) `aws-ap-southeast-1`; AWS Asia Pacific (Sydney) `aws-ap-southeast-2` |
| Region change | Fixed at project creation; move = new project + migrate |
| Azure Neon regions | Public docs stated Azure regions deprecated; new projects AWS-only. **Re-verify**; deprecation date cited as 27 August 2026 |
| Pooling | Vendor pooled connection endpoint (typical for serverless) |
| PITR / backups | Offered on Neon plans — **confirm SKU** |
| Technical recommendation | Reasonable if India residency is **not** required. If India residency **is** required, Neon’s published regions do not currently satisfy that on their own |
| Selection | **NOT SELECTED** |

### B. Supabase PostgreSQL (database only)

| Topic | Notes |
|---|---|
| Fit | Managed Postgres. Architecture already forbids using Supabase Auth as the RBAC source of truth |
| India region | Public region list includes South Asia (Mumbai) `ap-south-1` (`https://supabase.com/docs/guides/platform/regions`) |
| Residency | Region selection is a **location control**, not a compliance claim (vendor docs state this) |
| Pooling | Supabase pooler (session vs transaction mode) — choose for serverless carefully |
| `btree_gist` | Expected on standard Postgres; **verify after provision** |
| Auth/API extras | Do not enable client-side Data API as the practice authorization path |
| Technical recommendation | Viable **database** candidate when an India primary is required. Still HUMAN DECISION |
| Selection | **NOT SELECTED** |

### C. Amazon RDS for PostgreSQL / Amazon Aurora PostgreSQL

| Topic | Notes |
|---|---|
| Fit | Conventional managed PostgreSQL |
| India region | AWS `ap-south-1` (Mumbai) and `ap-south-2` (Hyderabad) exist — **confirm service availability in the account/region at purchase** |
| Pooling | RDS Proxy or external PgBouncer; not automatic |
| PITR | Automated backups + PITR are standard RDS features — **confirm retention window** |
| Vercel | Needs a pooler; serverless connection storms are an ops concern |
| Operational simplicity | Higher than Neon/Supabase for a single practitioner unless already on AWS |
| Selection | **NOT SELECTED** |

### D. Google Cloud SQL for PostgreSQL

| Topic | Notes |
|---|---|
| Fit | Managed PostgreSQL |
| India region | `asia-south1` (Mumbai), `asia-south2` (Delhi) — **confirm Cloud SQL PostgreSQL 16 availability** |
| Pooling | Auth proxy / built-in pooler options vary; **verify** |
| PITR | Available on Cloud SQL — **confirm SKU** |
| Selection | **NOT SELECTED** |

### E. Azure Database for PostgreSQL (Flexible Server)

| Topic | Notes |
|---|---|
| Fit | Managed PostgreSQL |
| India region | Central India, South India, West India — **confirm PostgreSQL 16 Flexible Server in the chosen region** |
| Pooling / PITR | **Verify** current SKU |
| Selection | **NOT SELECTED** |

### F. Other managed PostgreSQL

Any other managed PostgreSQL 16+ that meets the criteria table is allowed. Self-managed VPS PostgreSQL is technically possible but increases backup/PITR/ops burden for a small practice — **not recommended as a default**, and still HUMAN DECISION.

---

## Region decision (do not choose automatically)

| Question | Status |
|---|---|
| Primary database in India | HUMAN DECISION (O2) |
| If India unavailable on the chosen vendor, use nearest region | HUMAN DECISION + LEGAL REVIEW (O18) |
| Backups in the same region | HUMAN DECISION |
| Replicas in another region | HUMAN DECISION + LEGAL REVIEW |
| Cross-region processing (app host, support, logs) | HUMAN DECISION + LEGAL REVIEW |

Technical notes:

- If the application remains on Vercel, the app runtime may process data outside India even when Postgres is in Mumbai. That is an **O18** issue, not solved by vendor choice alone.
- Prefer putting **primary + backups** in the same residency zone unless legal review accepts replication elsewhere.
- Do not enable cross-region read replicas “for safety” without a residency decision.

Nearest-region examples **if** India is unavailable on the chosen vendor (not a selection):

| Vendor (example) | Published nearest APAC (verify) |
|---|---|
| Neon | Singapore `aws-ap-southeast-1` or Sydney `aws-ap-southeast-2` |
| Others | Vendor’s closest Asia region |

---

## Production database must still pass

After a human selects O1/O2 and creates a **non-Git** database:

1. PostgreSQL 16+
2. TLS
3. Migrations applied deliberately
4. `btree_gist` present
5. `appointments_blocking_occupied_excl` present
6. Required indexes and `appointment_history_no_update` trigger
7. `npm run db:verify-production` → PASS on that target
8. PostgreSQL concurrency tests against a staging copy

See `docs/POSTGRESQL_PRODUCTION_CHECKLIST.md`.

---

## What this phase must not do

- Create a Neon/Supabase/AWS/GCP/Azure account
- Provision production or staging from this repository
- Commit `DATABASE_URL`
- Invent monthly pricing
- Claim DPDP compliance because a region was listed

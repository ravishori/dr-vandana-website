# O-B-P03D Production Migration Inventory

**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Migration system:** **Custom SQL runner** (not Prisma; Drizzle ORM in app only)  
**Source:** `drizzle/*.sql` applied by `applyIdentityMigrationSql()` in `src/lib/identity/db.ts`  
**CLI:** `npm run db:migrate` → `scripts/migrate-identity.ts` (**blocks Production** via `assertStagingMigrateTarget`)

```text
NO SECRETS
PRODUCTION MIGRATIONS NOT APPLIED IN P03D
```

---

## Migration tracking

| Mechanism | Status |
| --- | --- |
| `__drizzle_migrations` / `drizzle_migrations` | **ABSENT** (confirmed Production + Staging) |
| Applied-migration table | **NONE** — runner executes all `.sql` files in sort order each run |
| Idempotency | **PARTIAL** — later migrations use `IF NOT EXISTS`; **0001 CREATE TABLE is not idempotent** |
| Re-run risk | **HIGH** if migration re-executed after partial apply without manual recovery |

---

## Ordered migration inventory

| Order | Migration | Purpose | Tables / objects | Extensions | Data ops | Risk | Production applied? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `0001_identity_foundation.sql` | Identity RBAC, sessions, MFA, audit | 15 tables + indexes | — | None | **REVIEW REQUIRED** (large DDL) | **NO** |
| 2 | `0002_mfa_replay_guard.sql` | MFA TOTP replay column | `mfa_credentials.last_verified_step` | — | None | **SAFE** (additive ALTER) | **NO** |
| 3 | `0003_appointment_engine.sql` | Appointments, outbox v1, history immutability | 9 tables + trigger/function | **`btree_gist`** + exclusion constraint | None | **HIGH** (extension + exclusion DO block may NOTICE-skip on failure) | **NO** |
| 4 | `0004_booking_idempotency.sql` | Booking idempotency store | `booking_idempotency` | — | None | **SAFE** | **NO** |
| 5 | `0005_notification_dispatch.sql` | Outbox dispatch columns + delivery/attempt tables | 2 new tables; alters outbox + `patient_profiles` | — | **UPDATE** on outbox (backfill timestamps) | **REVIEW REQUIRED** | **NO** |
| 6 | `0006_otp_delivery_metadata.sql` | OTP delivery metadata on phone verifications | alters `phone_verifications` | — | None (constraint churn) | **REVIEW REQUIRED** | **NO** |
| 7 | `0007_must_change_password.sql` | Provisional password flag | `users.must_change_password` | — | None | **SAFE** (additive) | **NO** |

**Migration count:** **7** (0001–0007)

---

## Safe execution order (from repository)

```text
0001 base identity schema
  ↓
0002 MFA replay column
  ↓
0003 appointment engine (+ btree_gist + appointments_blocking_occupied_excl)
  ↓
0004 booking idempotency
  ↓
0005 notification dispatch (+ UPDATE backfill on empty outbox = no-op)
  ↓
0006 OTP delivery metadata
  ↓
0007 must_change_password column
  ↓
(Optional post-migrate) seedIdentityCatalog() — INSERT roles/permissions — SEPARATE AUTHORIZATION
```

---

## Post-migration runner behavior (`migrate-identity.ts`)

| Step | Action | Production note |
| --- | --- | --- |
| Guard | `assertStagingMigrateTarget` | **BLOCKS** `pg-dr-vandana-prod` / `dr_vandana_db` |
| Gate | `APPLY_IDENTITY_MIGRATION=true` | Required |
| Apply | All SQL files in order | One transaction per `execSql` call (file-level, not single global txn) |
| Seed | `seedIdentityCatalog()` | **INSERT** reference roles/permissions — not patient PII |
| Verify | `verifyPracticeSchema()` | Must PASS (27 tables, btree_gist, exclusion, indexes, trigger) |

**Future O-B-P03E must use an authorized Production migration path** — current CLI is staging-only by design.

---

## Exclusion constraint (expected from 0003)

| Field | Expected |
| --- | --- |
| Name | `appointments_blocking_occupied_excl` |
| Table | `appointments` |
| Type | EXCLUDE USING gist |
| Columns | `psychologist_user_id WITH =`, `tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&` |
| WHERE | `status IN ('PENDING','CONFIRMED','RESCHEDULE_REQUESTED')` |
| Depends on | **`btree_gist`** installed |

Production actual (P03D): **ABSENT**  
Staging actual: **PRESENT**

---

## Commands explicitly not executed on Production

```text
npm run db:migrate
db:push / prisma migrate *
APPLY_IDENTITY_MIGRATION against Production
CREATE EXTENSION / CREATE TABLE / ALTER / INSERT / UPDATE / DELETE / DROP
```

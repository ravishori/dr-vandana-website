# O-B-P03E Production Migration Ceremony

**Document type:** Controlled Production database change procedure  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)

```text
AUTHORIZED PRODUCTION SCHEMA MUTATION (O-B-P03E)
MIGRATIONS 0001–0007 ONLY
NO IDENTITY CATALOG SEED (operator default: DO NOT SEED)
```

---

## 1. Purpose

Apply repository SQL migrations **0001–0007** to Production PostgreSQL (`pg-dr-vandana-prod` / `dr_vandana_db`) and verify schema via `verifyPracticeSchema()`.

---

## 2. Authorized mutations

| Authorized | Not authorized |
| --- | --- |
| `btree_gist` via migration 0003 | Patient / admin / psychologist creation |
| Tables/indexes/constraints in 0001–0007 | Appointments, notifications, outbox data |
| Extension objects from migrations | Staging changes, data copy |
| — | `seedIdentityCatalog` (not executed) |
| — | Deploy, worker, email, OTP, WhatsApp |

---

## 3. Production target

| Item | Value |
| --- | --- |
| Server | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| PG | 17 |
| Secret | `kv-dr-vandana-prod` / `production-app-database-url` |
| Domain | `https://drvandana.trinetralab.net/` — unchanged |

---

## 4. Migration system

| Item | Detail |
| --- | --- |
| Engine | Custom SQL runner — **not** Prisma / not `drizzle-kit migrate deploy` |
| Files | `drizzle/0001` … `0007` (sorted forward SQL) |
| Core API | `applyIdentityMigrationSql()` in `src/lib/identity/db.ts` |
| Verify | `verifyPracticeSchema()` in `src/lib/identity/schema-verification.ts` |
| Standard CLI | `npm run db:migrate` — **staging-only guard; not used for Production** |
| Ceremony | Temporary operator script with **Production target guard** + `O_B_P03E_AUTHORIZED=true` + `APPLY_IDENTITY_MIGRATION=true` |

**Guard policy:** `assertStagingMigrateTarget` was **not** modified or bypassed. Production used explicit Production-target ceremony script importing repository functions only.

---

## 5. Pre-flight gates

| Gate | Requirement | P03E result |
| --- | --- | --- |
| Git HEAD | `7974175` | PASS |
| Target | `pg-dr-vandana-prod` / `dr_vandana_db` | PASS |
| PG version | 17 | PASS (17.10) |
| TLS | Required | PASS (TLSv1.3) |
| Pre-migration tables | 0 expected | PASS (0) |
| Pre-migration data | 0 rows | PASS |
| `azure.extensions` | `BTREE_GIST` | PASS |
| Backup / PITR | 7-day retention; PITR available | PASS (restore drill **not verified**) |
| Seed decision | Default DO NOT SEED | **NO SEED** |

---

## 6. Migration execution plan

| Order | Migration | Purpose |
| --- | --- | --- |
| 1 | 0001 | Identity foundation (users, roles, auth, audit) |
| 2 | 0002 | MFA replay guard |
| 3 | 0003 | Appointments + `CREATE EXTENSION btree_gist` + exclusion constraint |
| 4 | 0004 | Booking idempotency |
| 5 | 0005 | Notification dispatch |
| 6 | 0006 | OTP delivery metadata |
| 7 | 0007 | `must_change_password` column |

**Order within 0003:** base tables → indexes → DO block (extension + exclusion).

---

## 7. Seed identity catalog

`seedIdentityCatalog()` inserts **roles, permissions, role_permissions only** — no users.

**P03E decision:** **NOT EXECUTED** (default). Production `roles` / `permissions` tables exist but contain **0 rows**.

---

## 8. Post-migration verification

Mandatory: `verifyPracticeSchema()` — **PASS** (27 tables, `btree_gist`, exclusion, 3 gate indexes, trigger).

Note: `npm run db:verify-production` failed against Azure without explicit client `ssl: "require"` (pre-existing script gap). Ceremony verification used TLS client option.

---

## 9. Rollback policy

| Method | Status |
| --- | --- |
| Azure PITR / backup restore | Documented; **restore drill NOT VERIFIED** |
| Down migrations | Exist for DR; **not run** in P03E |
| Manual DROP | **NOT AUTHORIZED** |

---

## 10. Boundaries preserved

No deploy, Vercel, DNS, Staging, worker, registration enablement, messaging, or application source changes.

---

## 11. Next task

**O-B-P03F — Production Post-Migration Verification & Release Gate** — do not start automatically.

Potential follow-ups: catalog seed authorization, `DATABASE_URL` on Vercel, `sslmode=require` in KV URL, verify-script TLS hardening, restore drill.

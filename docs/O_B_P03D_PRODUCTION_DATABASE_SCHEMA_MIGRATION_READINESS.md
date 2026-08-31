# O-B-P03D Production Database Schema & Migration Readiness

**Document type:** Architecture / readiness procedure  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
READ-ONLY ASSESSMENT ONLY
NO PRODUCTION MUTATIONS IN P03D
```

---

## 1. Purpose

Establish whether Production PostgreSQL (`pg-dr-vandana-prod` / `dr_vandana_db`) is ready for a **future controlled schema migration** (O-B-P03E). P03D does **not** apply migrations.

---

## 2. Database technology

| Item | Finding |
| --- | --- |
| ORM | **Drizzle ORM** (`drizzle-orm`) — schema in TypeScript |
| Migrations | **Plain SQL** in `drizzle/` — **not** Prisma; **not** `drizzle-kit migrate` deploy in CI |
| Runner | `readIdentityMigrationFiles()` → sorted `drizzle/NNNN_*.sql` → `applyIdentityMigrationSql()` |
| Verify | `npm run db:verify-production` → `scripts/verify-production-schema.ts` + `verifyPracticeSchema()` |
| Migrate CLI | `npm run db:migrate` → **staging-only guard** (`assertStagingMigrateTarget`) |

---

## 3. Production target

| Item | Value |
| --- | --- |
| Server | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| Port | 5432 |
| PG version | 17 |
| Secret | `kv-dr-vandana-prod` / `production-app-database-url` |
| Public domain (Option B) | `https://drvandana.trinetralab.net/` — unchanged |

---

## 4. Expected schema (authoritative)

- **27 tables** — `REQUIRED_TABLES` in `schema-verification.ts`  
- **Extension:** `btree_gist`  
- **Exclusion:** `appointments_blocking_occupied_excl`  
- **Indexes:** 3 gate indexes + many per-table indexes from SQL  
- **Trigger:** `appointment_history_no_update`  
- **Migrations:** 0001–0007 (7 files)

Staging (post-migrate) proves this shape on PG17.

---

## 5. Current Production state (P03D verification)

| Area | Status |
| --- | --- |
| Connectivity | PASS |
| TLS | PASS (TLSv1.3); URL `sslmode=require` **absent** in secret |
| Schema | **EMPTY** (0/27 tables) |
| `btree_gist` allowlist | PASS |
| `btree_gist` installed | **NOT INSTALLED** |
| Exclusion constraint | **ABSENT** |
| Data | **0 rows** |
| Mutations in P03D | **NONE** |

**Interpretation:** Database **target ready**; **schema deployment required**.

---

## 6. Migration safety highlights

| Risk | Detail |
| --- | --- |
| No migration history table | Re-run after partial failure is **dangerous** for 0001 |
| 0003 DO block | Exclusion may NOTICE-skip — **verifyPracticeSchema must fail closed** |
| 0005 UPDATE | Backfill on outbox — safe on empty DB |
| Post-migrate seed | `seedIdentityCatalog()` inserts roles/permissions — needs explicit Production authorization |
| Production CLI block | `db:migrate` refuses Production until separate authorized path |

---

## 7. Backup / restore

| Item | Production |
| --- | --- |
| Backup retention | 7 days |
| PITR earliest | 2026-08-26 (Azure metadata) |
| Geo-redundant backup | Disabled |
| Restore drill | **NOT VERIFIED** |

Take backup / confirm restore point **before** O-B-P03E.

---

## 8. Network

| Item | Production |
| --- | --- |
| Public access | Enabled |
| Firewall | Named operator IPs only — **no 0.0.0.0/0** |
| Staging | Separate server — **not copied** |

---

## 9. Boundaries preserved

No migrations, extensions, deploy, worker, registration enablement, or messaging in P03D.

---

## 10. Next task

**O-B-P03E — Controlled Production Schema Migration** (when authorized). Do not start automatically.

Prerequisites: Production migration authorization path, backup ceremony, post-migrate verification including exclusion constraint, optional catalog seed decision.

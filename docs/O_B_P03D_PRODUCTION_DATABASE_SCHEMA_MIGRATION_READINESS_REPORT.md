# O-B-P03D Production Database Schema & Migration Readiness Report

**Document type:** Controlled read-only migration readiness report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-P03D DECISION = READY WITH CONDITIONS
PRODUCTION MUTATIONS = NONE
SECRET LEAKAGE = NONE DETECTED
NEXT = O-B-P03E — Controlled Production Schema Migration (DO NOT START AUTOMATICALLY)
```

---

## 1. Executive summary

P03D re-verified Production PostgreSQL **`pg-dr-vandana-prod` / `dr_vandana_db`**: **connectivity PASS**, **TLS PASS (TLSv1.3)**, **PG 17**, **`azure.extensions=BTREE_GIST` allowlist PASS**, but **schema empty (0/27 tables)**, **`btree_gist` NOT INSTALLED**, **exclusion constraint ABSENT**, **0 rows**. Staging matches full expected schema (27/27, extension + exclusion present) with **85 aggregate rows** (synthetic/test — not copied).

Migration system: **7 SQL files (0001–0007)** via custom runner — **no applied-migration table**. Current **`npm run db:migrate` blocks Production** by design.

**No Production mutations** occurred. **READY WITH CONDITIONS** for future **O-B-P03E** controlled migration.

---

## 2. Baseline

| Check | Result |
| --- | --- |
| HEAD | `7974175` |
| Application code | UNCHANGED |
| Commit / push | NONE |

---

## 3. Previous vs current findings

| Item | O-B-P03B (previous) | P03D (current) |
| --- | --- | --- |
| Prod connectivity | PASS | **PASS** |
| Prod TLS | PASS TLSv1.3 | **PASS TLSv1.3** |
| Prod tables | 0/27 | **0/27** (unchanged) |
| `btree_gist` installed | NOT INSTALLED | **NOT INSTALLED** |
| Exclusion constraint | ABSENT | **ABSENT** |
| Prod rows | Not inspected | **0 total** |
| Staging schema | Not fully compared | **27/27 PASS** |
| `azure.extensions` | BTREE_GIST | **BTREE_GIST** (reconfirmed) |

---

## 4. Migration technology

| Question | Answer |
| --- | --- |
| Prisma? | **NO** |
| Drizzle Kit deploy? | **Not used for migrate deploy** |
| Mechanism | **Sorted SQL in `drizzle/`** + `applyIdentityMigrationSql()` |
| Count | **7** migrations (0001–0007) |
| Tracking | **NONE** — no `drizzle_migrations` table |
| Production CLI | **`assertStagingMigrateTarget` blocks prod** |

See `docs/O_B_P03D_PRODUCTION_MIGRATION_INVENTORY.md`.

---

## 5. Migration gap matrix

| Component | Expected | Production actual | Gap | Future action | Risk |
| --- | --- | --- | --- | --- | --- |
| **BTREE_GIST allowlist** | `BTREE_GIST` on server | `BTREE_GIST` | None | — | LOW |
| **BTREE_GIST installed** | Extension in DB | **Not installed** | YES | Apply via **0003** in O-B-P03E | **HIGH** |
| **27 required tables** | All present | **0/27** | YES | Run **0001–0007** in O-B-P03E | **HIGH** |
| **Indexes** | ~75 on staging | **0** | YES | Created by migrations | MEDIUM |
| **PK / FK / CHECK** | Staging counts | **0** | YES | Created by migrations | MEDIUM |
| **`appointments_blocking_occupied_excl`** | GiST exclusion | **ABSENT** | YES | **0003** + verify gate | **CRITICAL** |
| **`appointment_history_no_update`** | Trigger | **ABSENT** | YES | **0003** | MEDIUM |
| **Gate indexes (3)** | Present | **ABSENT** | YES | **0003–0005** | MEDIUM |
| **Migration tracking table** | N/A in repo | **ABSENT** | Operational | Document one-shot apply + verify; no re-run | **HIGH** |
| **Catalog seed** | Optional post-migrate INSERT | N/A | Policy | Operator authorize `seedIdentityCatalog` in O-B-P03E | MEDIUM |
| **URL `sslmode=require`** | Recommended | **Absent in URL** | Config | Add to KV/Vercel without weakening TLS | MEDIUM |

---

## 6. Exclusion constraint

| | Detail |
| --- | --- |
| **Expected** | `appointments_blocking_occupied_excl` on `appointments` (GiST, blocking statuses) |
| **Production actual** | **ABSENT** |
| **Staging actual** | **PRESENT** |
| **Gap** | Full schema migration required |
| **P03D action** | **NONE** — documented only |

---

## 7. Staging comparison

Full matrix: `docs/O_B_P03D_STAGING_PRODUCTION_SCHEMA_COMPARISON.md`

**Match?** **NO** — by design (Production empty pre-migration). Staging validates migration **outcome shape**.

---

## 8. Production data safety

| Metric | Value |
| --- | --- |
| Public tables | 0 |
| Total rows | **0** |
| PII printed | **NONE** |
| Data copied from Staging | **NO** |

---

## 9. Backup / PITR / restore

| Item | Production |
| --- | --- |
| Backup retention | 7 days |
| PITR | Available (earliest restore ~2026-08-26 UTC) |
| Geo-redundant | Disabled |
| Restore drill | **NOT VERIFIED** |

**Recommendation:** snapshot / restore-point ceremony immediately before O-B-P03E.

---

## 10. Network / firewall

| Item | Production |
| --- | --- |
| TLS required | YES (client + server) |
| `0.0.0.0/0` on Prod firewall | **NO** |
| Rules | Named operator verification IP(s) only |

---

## 11. Application compatibility (PG 17)

| Area | Finding |
| --- | --- |
| SQL dialect | Standard PostgreSQL — UUID, timestamptz, CHECK, FK |
| `btree_gist` + GiST exclusion | Required — Azure allowlist OK; install pending |
| Drizzle ORM | Compatible with PG17 (staging proof) |
| `verify-production-schema.ts` | Uses `postgres` without explicit `ssl` — **may fail on Azure without TLS client option** (inspect script used `ssl: "require"` successfully) |

**Separate task:** optional hardening of verify script TLS for Azure (not changed in P03D).

---

## 12. Domain / flags / worker

| Item | Status |
| --- | --- |
| Option B domain | `https://drvandana.trinetralab.net/` — **UNCHANGED** |
| Registration | **false** (unchanged) |
| WhatsApp | **false** (unchanged) |
| Worker | **NOT PROVISIONED** |
| Deploy | **NOT TRIGGERED** |

Database config does not hardcode hostname for migrations.

---

## 13. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **CRITICAL** | Production schema empty — Option B runtime blocked until O-B-P03E |
| S2 | **HIGH** | No migration history — partial re-run risk |
| S3 | **HIGH** | `db:migrate` staging guard — Production path must be explicitly authorized for O-B-P03E |
| S4 | **MEDIUM** | Prod URL missing `sslmode=require` query param |
| S5 | **MEDIUM** | Restore drill not verified despite 7-day PITR |
| S6 | **MEDIUM** | Post-migrate `seedIdentityCatalog` performs INSERTs — needs Production authorization |
| S7 | **INFORMATIONAL** | Prod firewall tight; no 0.0.0.0/0 |
| S8 | **INFORMATIONAL** | Staging isolation maintained; no data copy |
| — | — | No credentials exposed; no Production mutations |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 14. Independent review (§31)

| # | Check | Result |
| --- | --- | --- |
| 1 | Correct Production target | YES |
| 2–3 | No credentials / PII exposed | YES |
| 4 | No Production mutation | YES |
| 5 | `btree_gist` status accurate | YES (allowlist yes, installed no) |
| 6 | 27-table expectation verified | YES (source + staging) |
| 7 | Exclusion constraint identified | YES |
| 8 | Migration order from files | YES |
| 9 | Staging data not copied | YES |
| 10–12 | Flags false; worker untouched; domain unchanged | YES |
| 13–14 | Git HEAD clean (docs uncommitted only); no deploy | YES |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 15. Tests

| Suite | Result |
| --- | --- |
| Application tests | **NOT RUN** |
| Typecheck | **NOT RUN** |
| Lint | **NOT RUN** |
| Build | **NOT RUN** |
| Read-only DB inspection | **EXECUTED** |

---

## 16. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| New docs | Uncommitted (`docs/O_B_P03D_*`) |
| Commit | NONE |

---

## 17. Production migration GO/NO-GO

**READY WITH CONDITIONS**

Conditions before **O-B-P03E**:

1. Authorized Production migration procedure (override or new operator script — not `db:migrate` as-is).  
2. Pre-migration backup / restore-point verification.  
3. One-shot apply 0001–0007 + **`verifyPracticeSchema` PASS** (especially exclusion + `btree_gist`).  
4. Decision on **`seedIdentityCatalog`** (roles/permissions only).  
5. Add **`sslmode=require`** to Production DATABASE_URL configuration.  
6. Optional: fix verify script TLS client for Azure.

**NOT** interpreted as database failure — **target ready, schema deployment required**.

---

## 18. Related documents

- `docs/O_B_P03D_PRODUCTION_DATABASE_SCHEMA_MIGRATION_READINESS.md`  
- `docs/O_B_P03D_PRODUCTION_DATABASE_SCHEMA_INVENTORY.md`  
- `docs/O_B_P03D_PRODUCTION_MIGRATION_INVENTORY.md`  
- `docs/O_B_P03D_STAGING_PRODUCTION_SCHEMA_COMPARISON.md`

---

## 19. Next controlled task

**O-B-P03E — Controlled Production Schema Migration** — **DO NOT START AUTOMATICALLY.**

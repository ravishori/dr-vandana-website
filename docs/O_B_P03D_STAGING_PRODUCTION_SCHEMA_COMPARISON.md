# O-B-P03D Staging / Production Schema Comparison

**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Method:** Read-only catalog inspection (no data copied)

| Environment | Server | Database |
| --- | --- | --- |
| Production | `pg-dr-vandana-prod.postgres.database.azure.com` | `dr_vandana_db` |
| Staging | `pg-dr-vandana-staging.postgres.database.azure.com` | `dr_vandana_db_staging` |

```text
NO DATA COPIED
AGGREGATE ROW COUNTS ONLY
NO PII PRINTED
```

---

## Summary matrix

| Component | Staging | Production | Match? | Notes |
| --- | --- | --- | --- | --- |
| PostgreSQL major | 17 | 17 | YES | |
| TLS (client `ssl: require`) | TLSv1.3 | TLSv1.3 | YES | |
| URL `sslmode=require` | Present | **Absent** (runtime TLS still OK) | NO | Operator should add to Prod URL config |
| `btree_gist` installed | YES | **NO** | NO | Allowlist on both; Prod needs migration 0003 |
| Required tables (27) | 27/27 | **0/27** | NO | Prod empty — expected pre-migration |
| Public indexes | 75 | 0 | NO | |
| PK constraints | 27 | 0 | NO | |
| FK constraints | 30 | 0 | NO | |
| CHECK constraints | 190 | 0 | NO | |
| `appointments_blocking_occupied_excl` | PRESENT | **ABSENT** | NO | |
| `appointment_history_no_update` trigger | PRESENT | **ABSENT** | NO | |
| Required gate indexes (3) | PRESENT | **ABSENT** | NO | |
| Migration tracking table | ABSENT | ABSENT | YES | Neither env tracks applied migrations |
| Total public rows | **85** (aggregate) | **0** | N/A | Staging has synthetic/test rows — **not copied** |

---

## Staging aggregate row counts (non-PII metadata)

Tables with rows > 0: `users` (4), `roles` (4), `permissions` (15), `role_permissions` (16), `user_roles` (4), `psychologist_profiles` (2), `patient_profiles` (1), `sessions` (2), `appointment_types` (1), `practice_*` (11 combined), `appointments` (2), `appointment_history` (4), outbox/delivery/attempt tables (10), `booking_idempotency` (2), `audit_logs` (7).

**Production:** **0** rows in all public tables.

---

## Interpretation

Staging schema matches the **expected post-migration** shape and validates that migrations 0001–0007 produce a working catalog when applied on PG17 with `btree_gist` allowlisted.

Production is an **empty target database** — ready for **controlled schema deployment**, not a failed server.

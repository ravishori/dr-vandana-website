# O-B-P03F Production Database Final State

**Document type:** Read-only Production database snapshot (metadata only)  
**Date:** 2026-08-31  
**Target:** `pg-dr-vandana-prod` / `dr_vandana_db`

---

## Connection

| Check | Result |
| --- | --- |
| Hostname | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| PostgreSQL | **17.10** |
| Schema | `public` |
| TLS | **PASS** (TLSv1.3) |
| KV secret `production-app-database-url` | **PRESENT**, enabled |
| URL `sslmode` query | **(absent)** — runtime TLS OK with client `ssl: require` |

---

## Extensions

| Item | Azure allowlist | Installed |
| --- | --- | --- |
| `btree_gist` | **BTREE_GIST** | **YES** |

---

## Schema objects

| Object type | Count |
| --- | --- |
| Public base tables | **27** |
| Indexes (public) | **75** |
| Foreign keys | **30** |
| CHECK constraints | **190** |
| Unique indexes (public) | **44** |
| Exclusion `appointments_blocking_occupied_excl` | **PRESENT** |
| Trigger `appointment_history_no_update` | **PRESENT** |

---

## verifyPracticeSchema

**PASS** — all 27 required tables, extension, exclusion (+ definition checks), 3 gate indexes, trigger.

---

## Migration state

| Item | Status |
| --- | --- |
| Migrations 0001–0007 | Applied (O-B-P03E) |
| DB migration journal | **NONE** |
| Operational tracking | Ceremony change record + this verification |

---

## Data aggregates (no PII)

| Table | Rows |
| --- | --- |
| `users` | 0 |
| `patient_profiles` | 0 |
| `psychologist_profiles` | 0 |
| `appointments` | 0 |
| `appointment_notification_outbox` | 0 |
| `appointment_notification_deliveries` | 0 |
| `roles` | 0 |
| `permissions` | 0 |
| `role_permissions` | 0 |
| `sessions` | 0 |

---

## Backup / network

| Item | Value |
| --- | --- |
| Backup retention | 7 days |
| PITR earliest | ~2026-08-26 UTC |
| Geo-redundant backup | Disabled |
| Public network access | Enabled |
| Firewall | Named IP `45.119.30.7` only — **no 0.0.0.0/0** |

---

## P03F mutations

**NONE**

# O-B-P02 Production PostgreSQL Readiness Verification

**Document type:** Production PostgreSQL infrastructure verification (control plane + authorized allowlist remediation)  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**ManagedBy:** O-B-P02  

```text
PRODUCTION SERVER = pg-dr-vandana-prod
PRODUCTION DATABASE NAME = dr_vandana_db
STAGING SERVER = pg-dr-vandana-staging (untouched)
SECRET VALUES = NEVER SHOWN
```

---

## 1. Resource identity

| Item | Verified value |
| --- | --- |
| Subscription | Confirmed via Azure CLI (same program subscription) |
| Resource group | `rg-dr-vandana-prod` |
| Server | `pg-dr-vandana-prod` |
| FQDN host | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Region | India South Central |
| Application DB | `dr_vandana_db` (UTF8 / en_US.utf8) |
| Admin login name | `drvandanaadmin` (password **[SECRET — NOT SHOWN]**) |

Ambiguity check: naming + RG + separate staging server → **Production identity CONFIRMED**.

---

## 2. Tags

| Resource | Tags observed |
| --- | --- |
| `rg-dr-vandana-prod` | Environment=**Development**, Project=DrVandanaPsychology |
| `pg-dr-vandana-prod` | Environment=**Development**, Project=DrVandanaPsychology |

```text
PRODUCTION TAG INCONSISTENCY
```

Metadata correction **not** performed (not authorized as silent change). Risk: automation/monitoring/cost policies that key off `Environment` may misclassify this server as non-Production. Does not by itself change PostgreSQL behavior.

---

## 3. Version / SKU / capacity

| Item | Value | Assessment |
| --- | --- | --- |
| PostgreSQL | **17** | Compatible with repo |
| State | Ready | OK |
| SKU | Standard_B1ms / Burstable | Acceptable only for **initial** low-traffic launch; **PRODUCTION HARDENING / CAPACITY RECOMMENDATION** for sustained Production |
| Storage | 32 GiB Premium_LSS P4, auto-grow Disabled | Monitor growth |
| HA | Disabled | Documented; not upgraded this task |
| Auth | Password auth Enabled; AD auth Disabled | Credential via KV (O-B-P01) |

No PostgreSQL version/SKU upgrade performed.

---

## 4. BTREE_GIST allowlist (authorized remediation)

### Repository requirement

`REQUIRED_EXTENSIONS = ["btree_gist"]` in `src/lib/identity/schema-verification.ts`.  
`drizzle/0003_appointment_engine.sql` uses `CREATE EXTENSION IF NOT EXISTS btree_gist` and exclusion constraint `appointments_blocking_occupied_excl`.

### Before

| Parameter | Value |
| --- | --- |
| `azure.extensions` | **empty** (`""`) |

### After (executed)

| Parameter | Value |
| --- | --- |
| `azure.extensions` | **`BTREE_GIST`** |

Operation: `az postgres flexible-server parameter set ... --value BTREE_GIST`  
No unrelated extensions added. Prior list was empty → set to sole required allowlist entry.

### Extension installation in database

Allowlist ≠ installed. `CREATE EXTENSION` requires a DB session.  
Production `DATABASE_URL` is **not** available in `kv-dr-vandana-prod` (empty) / Vercel Production (absent per O-B-P01A).  
Existing migrate CLI **refuses Production** (`assertStagingMigrateTarget` — no Production bypass).

```text
BTREE_GIST INSTALLED = NOT VERIFIED
EXTENSION INSTALLATION REQUIRED — SEPARATE CONTROLLED ACTION
(after Production credentials + authorized Production migrate/verify path)
```

---

## 5. Schema / migrations

| Item | Status |
| --- | --- |
| Expected migrations | `drizzle/0001` … `0007` (identity → MFA → appointments → idempotency → notifications → OTP metadata → must_change_password) |
| Production schema verify | **NOT VERIFIED** (no safe credentialed connection this task) |
| Migration apply | **NOT EXECUTED** (not authorized blindly; CLI blocks Production) |
| If schema empty/behind | **MIGRATION REQUIRED** — identifiers `0001`–`0007` via a **future Production-authorized** migrate mechanism |

Required objects (when migrated), from schema-verification:

- Tables: users, roles, permissions, profiles, sessions, appointments, notification outbox/deliveries/attempts, audit/security, etc. (`REQUIRED_TABLES`)
- Extension: `btree_gist`
- Constraint: `appointments_blocking_occupied_excl`
- Indexes: `booking_idempotency_user_op_key_uidx`, `appointment_delivery_outbox_channel_role_uidx`, `appointments_public_id_uidx`
- Trigger: `appointment_history_no_update`

---

## 6. Exclusion constraint / indexes / tables

| Check | Result |
| --- | --- |
| Exclusion constraint | **NOT VERIFIED** (needs DB session) |
| Indexes | **NOT VERIFIED** |
| Table inventory | **NOT VERIFIED** at SQL catalog level |
| Azure DB list | Application DB `dr_vandana_db` exists alongside system DBs |

---

## 7. Production data safety

SQL row inspection **not performed** (no connection).  
No staging→Production copy performed.  
No patient/synthetic/appointment creation performed.

```text
PRODUCTION DATA = NOT VERIFIED (catalog-level)
EXPECTED INITIAL PATIENT DATA = NONE
```

If later verify finds unexpected patient rows → STOP per release policy.

---

## 8. TLS

| Setting | Value |
| --- | --- |
| `require_secure_transport` | **on** |
| `ssl_min_protocol_version` | **TLSv1.2** |

Application must use TLS in `DATABASE_URL` (sslmode). Connection string **not printed**.

---

## 9. Networking / firewall

| Item | Value |
| --- | --- |
| Public network access | **Enabled** |
| Firewall rules | One rule: `ClientIPAddress_2026-8-26_19-52-57` → `45.127.44.30`–`45.127.44.30` |
| `0.0.0.0/0` | **ABSENT** (PASS) |
| Allow Azure services (`0.0.0.0`) | **NOT present** on Production |

| Rule | Classification |
| --- | --- |
| ClientIPAddress_2026-8-26_19-52-57 | **TEMPORARY / OPERATOR** — single historical client IP; purpose UNKNOWN without owner confirmation |

No firewall changes this task.

Operator public IP at inspection time differed from allowlisted IP → even with credentials, ad-hoc verify from this network would be blocked until a narrow rule is authorized separately.

---

## 10. Connectivity feasibility

| Consumer | Feasibility | Notes |
| --- | --- | --- |
| Vercel → Prod PG | **FEASIBLE** with conditions | Needs Prod `DATABASE_URL` + TLS + firewall strategy for Vercel egress (not `0.0.0.0/0`; consider Azure services / static egress / private link later) |
| ACA Job → Prod PG | **FEASIBLE** with conditions | Mirror staging pattern carefully; Production must not copy staging’s Azure-services special-case without review |
| Verified live | **NOT VERIFIED** | No connection attempt with credentials |

---

## 11. Backups / PITR / restore / HA

| Item | Evidence |
| --- | --- |
| Backup retention | **7 days** |
| Geo-redundant backup | Disabled |
| PITR | Platform indicates earliest restore date present → **PITR capability indicated** |
| Restore drill | **NOT VERIFIED** |
| HA / AZ standby | Disabled |

RPO/RTO policy remains UNSET (governance). Do not claim BACKUP READY for launch without drill + policy.

---

## 12. Isolation

| Check | Result |
| --- | --- |
| Staging vs Prod servers | **PASS** — separate Flexible Servers |
| DB names | Prod `dr_vandana_db` ≠ Staging `dr_vandana_db_staging` |
| Key Vault target | Architecture uses `kv-dr-vandana-prod` (O-B-P01); staging KV untouched |
| Staging PG parameters | Read-only confirm; staging `azure.extensions=BTREE_GIST` unchanged by intent |

---

## 13. Credential readiness

| Item | Status |
| --- | --- |
| Prod admin password auth | Enabled |
| Store in `kv-dr-vandana-prod` as `production-app-database-url` | Architecture READY; **value NOT populated** (O-B-P03) |
| Separate from staging | REQUIRED |
| Rotation | NOT YET DECIDED |

---

## 14. Registration / WhatsApp / Option C / legal

| Item | Status |
| --- | --- |
| Registration flag on Vercel Production | Still absent → **PRODUCTION REGISTRATION FLAG STILL REQUIRES O-B-P03** |
| WhatsApp | Remain disabled |
| Option C | BLOCKED |
| O10 / O11 / O18 | OPEN (preserved) |

---

## 15. Changes executed vs not

### Executed

1. Set Production `azure.extensions` = `BTREE_GIST`

### Not executed

- Schema migration / `CREATE EXTENSION` in DB  
- Firewall changes  
- Tag correction  
- SKU/HA upgrade  
- Vercel / KV secret population  
- Worker provision  
- Any data mutation  

---

## 16. Remaining blockers (DB-related)

1. Production schema / btree_gist install / exclusion constraint **NOT VERIFIED**  
2. Production migrate path (CLI currently staging-only)  
3. `DATABASE_URL` absent from Prod KV/Vercel  
4. Firewall not yet designed for Vercel/ACA  
5. Tag inconsistency  
6. Restore drill + RPO/RTO  
7. Capacity/HA recommendations  

---

## 17. Decision implication

Control-plane allowlist remediation **PASS**. In-database readiness **pending**. Suitable next step: **O-B-P03** (secrets/Vercel) so a later controlled Production migrate/verify can run — without claiming full DB readiness for launch.

# O-B-P03E Production Schema Post-Migration Verification

**Document type:** Read-only post-migration schema verification record  
**Date:** 2026-08-31  
**Target:** `pg-dr-vandana-prod` / `dr_vandana_db`

---

## 1. verifyPracticeSchema result

**Status: PASS**

All checks from `src/lib/identity/schema-verification.ts`:

| Category | Result |
| --- | --- |
| Required tables (27) | **PASS** |
| Extension `btree_gist` | **PASS** |
| Constraint `appointments_blocking_occupied_excl` | **PASS** (exclusion type, GiST, psychologist + range + blocking statuses) |
| Index `booking_idempotency_user_op_key_uidx` | **PASS** |
| Index `appointment_delivery_outbox_channel_role_uidx` | **PASS** |
| Index `appointments_public_id_uidx` | **PASS** |
| Trigger `appointment_history_no_update` | **PASS** |

---

## 2. Schema object counts (Production)

| Object type | Count |
| --- | --- |
| Public base tables | **27** |
| Indexes (`pg_indexes`, public) | **75** |
| Foreign keys | **30** |
| Check constraints (information_schema) | **190** |
| Extension `btree_gist` | **INSTALLED** |
| Exclusion constraint | **PRESENT** |

Unique constraints via `information_schema.table_constraints` report 0 (many uniques implemented as unique indexes — gate indexes verified by name).

---

## 3. Migration tracking

| Item | Status |
| --- | --- |
| Repository journal table | **NONE** |
| Applied migration IDs recorded in DB | **NONE** |
| Operational record | This ceremony + change record only |

**Risk:** Re-running full migration set on Production would be unsafe (0001 not idempotent). Do not re-apply without restore or explicit DR plan.

---

## 4. Data aggregates (no PII)

| Table / metric | Row count |
| --- | --- |
| Total public tables | 27 |
| Total sampled rows | **0** |
| `users` | 0 |
| `patient_profiles` | 0 |
| `appointments` | 0 |
| `appointment_notification_outbox` | 0 |
| `roles` | 0 |
| `permissions` | 0 |

Identity catalog seed **not** executed.

---

## 5. Repository verify CLI

| Command | Result | Notes |
| --- | --- | --- |
| `npm run db:verify-production` | **FAIL** (could not run) | Script lacks explicit `ssl: "require"` for Azure; schema verified via ceremony script with TLS |

---

## 6. Staging comparison (schema shape)

| Component | Staging (reference) | Production (post-P03E) |
| --- | --- | --- |
| PG version | 17 | 17 |
| Tables | 27 | **27** |
| `btree_gist` | Installed | **Installed** |
| Exclusion constraint | Present | **Present** |
| Application data | Synthetic rows present | **0 rows** |

Schema **shape matches** Staging reference; Production data intentionally empty.

---

## 7. TLS / connectivity (post-migration)

| Check | Result |
| --- | --- |
| TLS | PASS (TLSv1.3) |
| Database | `dr_vandana_db` |
| Mutations beyond migrations | **NONE** |

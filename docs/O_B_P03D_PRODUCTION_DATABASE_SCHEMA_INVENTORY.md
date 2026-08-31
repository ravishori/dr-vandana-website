# O-B-P03D Production Database Schema Inventory

**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Expected source:** `src/lib/identity/schema-verification.ts` + `drizzle/0001`–`0007`  
**Expected required tables:** **27**

```text
NO SECRETS · NO PII · READ-ONLY INSPECTION
```

---

## Extensions

| Object | Expected | Production | Staging | Status |
| --- | --- | --- | --- | --- |
| `btree_gist` | Installed (0003) | **NOT INSTALLED** | INSTALLED | **GAP — installation required in O-B-P03E** |
| `plpgsql` | (Azure default) | INSTALLED | INSTALLED | PASS |

---

## Required tables (27)

| Table | Expected | Production | Staging | Status |
| --- | --- | --- | --- | --- |
| `users` | YES | ABSENT | PRESENT | **GAP** |
| `roles` | YES | ABSENT | PRESENT | **GAP** |
| `permissions` | YES | ABSENT | PRESENT | **GAP** |
| `user_roles` | YES | ABSENT | PRESENT | **GAP** |
| `role_permissions` | YES | ABSENT | PRESENT | **GAP** |
| `patient_profiles` | YES | ABSENT | PRESENT | **GAP** |
| `psychologist_profiles` | YES | ABSENT | PRESENT | **GAP** |
| `sessions` | YES | ABSENT | PRESENT | **GAP** |
| `email_verifications` | YES | ABSENT | PRESENT | **GAP** |
| `phone_verifications` | YES | ABSENT | PRESENT | **GAP** |
| `otp_attempts` | YES | ABSENT | PRESENT | **GAP** |
| `password_reset_tokens` | YES | ABSENT | PRESENT | **GAP** |
| `mfa_credentials` | YES | ABSENT | PRESENT | **GAP** |
| `mfa_recovery_codes` | YES | ABSENT | PRESENT | **GAP** |
| `audit_logs` | YES | ABSENT | PRESENT | **GAP** |
| `security_events` | YES | ABSENT | PRESENT | **GAP** |
| `appointment_types` | YES | ABSENT | PRESENT | **GAP** |
| `practice_appointment_settings` | YES | ABSENT | PRESENT | **GAP** |
| `practice_hours` | YES | ABSENT | PRESENT | **GAP** |
| `practice_hour_breaks` | YES | ABSENT | PRESENT | **GAP** |
| `availability_exceptions` | YES | ABSENT | PRESENT | **GAP** |
| `appointments` | YES | ABSENT | PRESENT | **GAP** |
| `appointment_history` | YES | ABSENT | PRESENT | **GAP** |
| `appointment_notification_outbox` | YES | ABSENT | PRESENT | **GAP** |
| `appointment_notification_deliveries` | YES | ABSENT | PRESENT | **GAP** |
| `appointment_notification_attempts` | YES | ABSENT | PRESENT | **GAP** |
| `booking_idempotency` | YES | ABSENT | PRESENT | **GAP** |

**Production present:** **0/27**

---

## Constraints & integrity objects

| Object | Expected | Production | Staging | Status |
| --- | --- | --- | --- | --- |
| `appointments_blocking_occupied_excl` | EXCLUDE GiST on `appointments` | **ABSENT** | PRESENT | **GAP** |
| `booking_idempotency_user_op_key_uidx` | Index | **ABSENT** | PRESENT | **GAP** |
| `appointment_delivery_outbox_channel_role_uidx` | Index | **ABSENT** | PRESENT | **GAP** |
| `appointments_public_id_uidx` | Index | **ABSENT** | PRESENT | **GAP** |
| `appointment_history_no_update` | Trigger | **ABSENT** | PRESENT | **GAP** |
| Primary keys (public) | 27 | **0** | 27 | **GAP** |
| Foreign keys (public) | ~30 | **0** | 30 | **GAP** |

---

## Migration tracking

| Object | Expected | Production | Staging | Status |
| --- | --- | --- | --- | --- |
| Applied-migration table | Not defined in repo | **ABSENT** | **ABSENT** | N/A — runner has no history table |

---

## Production data (aggregate only)

| Metric | Production |
| --- | --- |
| Public tables | 0 |
| Total public rows | **0** |
| Patient PII rows inspected | **NONE** (no tables) |

---

## Azure allowlist (previous vs current)

| Item | O-B-P02 / P03B | P03D current |
| --- | --- | --- |
| `azure.extensions` | Remediated to `BTREE_GIST` | **`BTREE_GIST`** (confirmed) |
| Extension installed in DB | Not verified / not installed | **Still NOT INSTALLED** on Production |

Allowlist ≠ installed extension until migration 0003 runs successfully.

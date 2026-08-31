# O-B-P03B Production Database Credential & Target Verification Report

**Document type:** Read-only Production DATABASE_URL target verification  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
SECRET VALUE = [SECRET — NOT SHOWN]
COMPLETE DATABASE_URL = NOT DOCUMENTED
PASSWORD = NOT DOCUMENTED
USERNAME = NOT DOCUMENTED
PRODUCTION DATA ROWS = NOT INSPECTED
MIGRATIONS = NOT APPLIED BY THIS TASK
```

---

## 1. Executive summary

Key Vault secret **`production-app-database-url`** in **`kv-dr-vandana-prod`** is **PRESENT** and **enabled**. Safe parse confirms hostname **`pg-dr-vandana-prod.postgres.database.azure.com`**, port **`5432`**, database **`dr_vandana_db`**, and **no staging host/database markers**. The URL has **no query parameters** (including **no `sslmode=require`**). A read-only client connection with **`ssl: "require"`** succeeded; **`pg_stat_ssl`** reported **`ssl=true`** / **TLSv1.3**. Production public schema is **empty** (0 application tables); **`btree_gist`** is **NOT INSTALLED**; exclusion constraint **ABSENT**. **MIGRATION REQUIRED — SEPARATE CONTROLLED TASK.** Vercel Production still has **no `DATABASE_URL`** name. Staging unchanged. No secret leakage detected.

---

## 2. Baseline

| Check | Result |
| --- | --- |
| HEAD | `7974175` |
| Application code | UNCHANGED |
| Commit / push | NONE |

---

## 3. Key Vault

| Item | Result |
| --- | --- |
| Vault | `kv-dr-vandana-prod` |
| Secret name | `production-app-database-url` |
| Exists | YES |
| Enabled | YES |
| Current version | YES (version id present; not a secret value) |
| Value | `[SECRET — NOT SHOWN]` |

---

## 4. Safe target inspection (non-sensitive metadata only)

| Field | Expected | Observed | Result |
| --- | --- | --- | --- |
| Hostname | `pg-dr-vandana-prod.postgres.database.azure.com` | same | **VERIFIED** |
| Port | `5432` | `5432` | **VERIFIED** |
| Database | `dr_vandana_db` | `dr_vandana_db` | **VERIFIED** |
| `sslmode` query | `require` | **(absent)** — no query params | **NOT VERIFIED / FAIL vs required string** |
| Staging host/db | Must not target staging | No `staging` in host or db name | **PASS** |
| Username / password | — | Present in URL but **not reported** | `[SECRET — NOT SHOWN]` |

**Operator recommendation (separate change):** append `?sslmode=require` (or equivalent) to the Production connection string in Key Vault **and** Vercel when configured, without weakening TLS.

---

## 5. Database connectivity (read-only)

| Item | Result |
| --- | --- |
| Connectivity | **PASS** |
| Client TLS option | `ssl: "require"` (plaintext refused by client config) |
| `current_database()` | `dr_vandana_db` |
| `current_user` | Role name present (value not printed; length-only metadata) |
| `version()` | PostgreSQL **17.10** (prefix only) |
| Mutations | NONE |
| Migrations applied by this task | NONE |

---

## 6. TLS

| Check | Result |
| --- | --- |
| Runtime `pg_stat_ssl.ssl` | `true` |
| TLS protocol | TLSv1.3 |
| `sslmode=disable` used | NO |
| Overall TLS (connection) | **PASS** |
| URL `sslmode=require` literal | **ABSENT** (gap) |

---

## 7. Schema / migrations status

| Check | Result |
| --- | --- |
| `btree_gist` | **NOT INSTALLED** |
| Exclusion constraints (`contype = 'x'`) | **0** |
| `appointments_blocking_occupied_excl` | **ABSENT** |
| Public tables | **0** |
| Required application tables (27) | **0/27 present** |
| `__drizzle_migrations` | **ABSENT** |
| Public indexes | **0** |
| Schema | **EMPTY / NOT READY** |
| Migrations 0001–0007 | **REQUIRED** |

```text
MIGRATION REQUIRED — SEPARATE CONTROLLED TASK
```

Do **not** apply migrations in O-B-P03B.

---

## 8. Data safety

| Item | Result |
| --- | --- |
| Row-level patient/PII inspection | **NOT PERFORMED** |
| Aggregate row counts of PII tables | **NOT RUN** (no application tables) |
| Production data modifications | **NONE** |

---

## 9. Production / Staging separation

| Check | Result |
| --- | --- |
| Targets `pg-dr-vandana-staging` | **NO** |
| Staging Key Vault / Vercel modified | **NO** |
| Staging | **UNCHANGED** |

---

## 10. Vercel

| Item | Result |
| --- | --- |
| Vercel modified this task | **NO** |
| Production `DATABASE_URL` on `drvandana-psychology` | **MISSING** |

```text
VERCEL PRODUCTION DATABASE_URL — OPERATOR CONFIGURATION REQUIRED
```

Copy from Key Vault via Portal/secure dashboard into Vercel Production Secret only — never into Cursor/chat/Git.

---

## 11. Feature flags (unchanged; name presence only)

| Flag | Expected | Note |
| --- | --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` | Present as Production Config (not modified) |
| `TWILIO_WHATSAPP_ENABLED` | `false` | Present as Production Config (not modified) |

---

## 12. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | HIGH | Application schema empty — migrations still required before Option B runtime |
| S2 | MEDIUM | Connection string lacks `sslmode=require` query param (runtime TLS still PASS) |
| S3 | HIGH | Vercel Production `DATABASE_URL` not configured |
| S4 | INFORMATIONAL | KV secret present, enabled, correct host/db/port; staging not targeted |
| — | — | No secret printed; temp files scrubbed; no Git leakage |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 13. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |

---

## 14. Decision / next

Credential **target** verification: **PASS** (host / db / port / connectivity / runtime TLS).  
Schema readiness: **NOT READY** (migrations required).  
Vercel mirror: **OPERATOR ACTION**.

**Next controlled task:** `O-B-P03C — Production Domain/DNS Alignment` — **DO NOT START AUTOMATICALLY.**

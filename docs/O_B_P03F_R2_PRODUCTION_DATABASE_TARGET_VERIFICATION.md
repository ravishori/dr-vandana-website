# O-B-P03F-R2 Production Database Target Verification

**Date:** 2026-08-31  
**Read-only — no secret values**

---

## 1. Authoritative Production target

| Field | Expected | Verified |
| --- | --- | --- |
| Server | `pg-dr-vandana-prod.postgres.database.azure.com` | **PASS** (KV metadata + connect) |
| Database | `dr_vandana_db` | **PASS** (`current_database()`) |
| Port | 5432 | **PASS** (KV metadata) |
| PostgreSQL | 17.x | **PASS** (17.10) |
| TLS session | Required | **PASS** (TLSv1.3) |

---

## 2. Key Vault `production-app-database-url`

| Item | Result |
| --- | --- |
| Present | **YES** |
| Enabled | **YES** |
| Updated | 2026-08-31T04:37:23+00:00 |
| Scheme | postgresql |
| Hostname | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| `sslmode` | **require** |
| Staging markers | **none** |

**Password / full URL:** `[SECRET — NOT EXPOSED]`

---

## 3. Vercel `dr-vandana-website` Production `DATABASE_URL`

| Item | Result |
| --- | --- |
| Variable name | **PRESENT** (Secret) |
| Value inspectable | **NO** |
| Target host/db | **NOT VERIFIED** |
| `sslmode=require` | **NOT VERIFIED** |

**Note:** Vercel CLI lists `created ~2d ago`; does not expose value updates. Operator ceremony updated KV at 04:37 UTC; Production redeploy occurred ~10:09 IST — circumstantial only, not cryptographic proof.

---

## 4. Read-only connection verification (KV credentials)

Executed via sanitized local script with `ssl: "require"` — **no mutations**.

| Check | Result |
| --- | --- |
| `current_database()` | `dr_vandana_db` |
| TLS | TLSv1.3 |
| `verifyPracticeSchema` | **PASS** (39/39) |
| Public tables | **27** |
| `btree_gist` | installed |
| Exclusion constraint | present |

---

## 5. Aggregate data (no PII)

| Table | Rows |
| --- | --- |
| users | 0 |
| patient_profiles | 0 |
| appointments | 0 |
| appointment_notification_outbox | 0 |
| roles | 0 |
| permissions | 0 |

---

## 6. Decision summary

| Scope | DATABASE TARGET | SSL MODE |
| --- | --- | --- |
| Key Vault (authoritative secret) | **PASS** | **PASS** |
| Vercel runtime config | **NOT VERIFIED** | **NOT VERIFIED** |
| Production PostgreSQL (direct read-only) | **PASS** | **PASS** (session) |

**Overall Vercel DATABASE_URL target gate:** **NOT VERIFIED** (read-only constraint — not a claim that configuration is wrong).

---

## 7. Mutations

**NONE** during P03F-R2.

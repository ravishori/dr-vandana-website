# O-B-P02 Production PostgreSQL Readiness Verification Report

**Document type:** Controlled Production PostgreSQL verification report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**Architecture companion:** `docs/O_B_P02_PRODUCTION_POSTGRESQL_READINESS_VERIFICATION.md`

```text
O-B-P02 DECISION = READY WITH CONDITIONS
BTREE_GIST ALLOWLIST = REMEDIATED
IN-DATABASE SCHEMA / EXTENSION = NOT VERIFIED
NO SECRETS EXPOSED
STAGING = UNTOUCHED
VERCEL / WORKER / KV VALUES = UNTOUCHED
GIT COMMIT = NONE
```

---

## 1. Executive Summary

O-B-P02 confirmed Production Flexible Server `pg-dr-vandana-prod` / database `dr_vandana_db` in India South Central and **remediated** the empty `azure.extensions` allowlist to **`BTREE_GIST`** (authorized). TLS enforcement and absence of `0.0.0.0/0` firewall were verified at the control plane.

In-database checks (`btree_gist` installed, schema, exclusion constraint, indexes, data) were **not** executed: Production `DATABASE_URL` is not available in Key Vault/Vercel, the migrate CLI **refuses Production**, and the current operator IP is not on the Production firewall allowlist. No destructive SQL, no data copy, no Vercel/worker changes.

---

## 2. Production Resource Identity

| Field | Result |
| --- | --- |
| Server | `pg-dr-vandana-prod` |
| RG | `rg-dr-vandana-prod` |
| App DB | `dr_vandana_db` |
| Ambiguity | None — Production confirmed |

---

## 3. Region

**India South Central** — PASS

---

## 4. Tags

```text
PRODUCTION TAG INCONSISTENCY
```

`Environment=Development` on RG and server. Not modified. Risk to tag-driven automation only.

---

## 5. PostgreSQL Version

**17** / State Ready — PASS (compatible)

---

## 6. SKU / Capacity

**Standard_B1ms Burstable**, 32 GiB, HA off.  
**PRODUCTION HARDENING / CAPACITY RECOMMENDATION** for sustained Production — not changed.

---

## 7. BTREE_GIST Allowlist

| Phase | Value |
| --- | --- |
| Before | empty |
| After | `BTREE_GIST` |

**REMEDIATED / PASS**

---

## 8. btree_gist Installation

**NOT VERIFIED** — requires DB session + `CREATE EXTENSION`.  
```text
EXTENSION INSTALLATION REQUIRED — SEPARATE CONTROLLED ACTION
```

---

## 9. Schema

**NOT VERIFIED**

---

## 10. Migrations

| Item | Result |
| --- | --- |
| Expected | `0001`–`0007` |
| Applied? | UNKNOWN / likely not (empty schema unverified) |
| Apply this task? | **NO** |
| Guard | `assertStagingMigrateTarget` blocks Production |

```text
MIGRATION REQUIRED
```
(via future Production-authorized path after credentials)

---

## 11. Exclusion Constraint

Expected: `appointments_blocking_occupied_excl`  
**NOT VERIFIED**

---

## 12. Indexes

Required set in schema-verification — **NOT VERIFIED**

---

## 13. Tables

Azure lists DB `dr_vandana_db`. Catalog table inventory — **NOT VERIFIED**

---

## 14. Production Data Check

No SQL data query. No copy/create.  
**NOT VERIFIED** (expected NONE at launch)

---

## 15. TLS

`require_secure_transport=on`, `ssl_min_protocol_version=TLSv1.2` — **PASS**

---

## 16. Firewall

Single client IP rule; **no 0.0.0.0/0** — **PASS** (narrow; may be stale)  
Rules not deleted.

---

## 17. Network

Public access Enabled. Azure-services allow-all **not** enabled on Production.  
Risk of public endpoint accepted as interim; harden later.

---

## 18. Vercel Connectivity

**FEASIBLE** with firewall + `DATABASE_URL` + TLS conditions — **NOT VERIFIED** live. Vercel **unchanged**.

---

## 19. ACA Connectivity

**FEASIBLE** with conditions — worker **not** provisioned. **NOT VERIFIED**.

---

## 20. Backups

7-day retention; geo-redundant disabled — **CONFIGURED (platform)**

---

## 21. PITR

Earliest restore date present — **CAPABILITY INDICATED**

---

## 22. Restore Drill

**NOT VERIFIED**

---

## 23. Availability / HA

Disabled — documented recommendation only

---

## 24. Staging Isolation

**PASS** — separate servers/DBs; staging not modified

---

## 25. Key Vault Isolation

Architecture: `kv-dr-vandana-prod`. Secrets **not** populated/read. Staging KV untouched. **PASS** (isolation intent)

---

## 26. Security Findings

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | HIGH | Schema/extension/constraint not verified in-database |
| S2 | HIGH | No Production migrate path in existing CLI |
| S3 | MEDIUM | Public access + single historical firewall IP |
| S4 | MEDIUM | Environment=Development tag mismatch |
| S5 | MEDIUM | Burstable SKU / no HA for Production posture |
| S6 | LOW | Restore drill absent |
| S7 | INFORMATIONAL | Allowlist remediated successfully |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 27. Changes Executed

1. Production `azure.extensions` → `BTREE_GIST`

---

## 28. Changes Not Executed

Schema migrate, CREATE EXTENSION, firewall, tags, SKU/HA, Vercel, KV secrets, worker, data ops.

---

## 29. Independent Review

| Check | Result |
| --- | --- |
| Correct Prod resource/region | PASS |
| BTREE_GIST allowlist correct | PASS |
| No unnecessary extensions | PASS |
| Schema/constraint/indexes verified | FAIL → reported NOT VERIFIED |
| TLS | PASS |
| No broad firewall | PASS |
| Backups/restore honesty | PASS |
| No patient data used | PASS |
| Staging/Vercel/worker/KV values untouched | PASS |
| Registration/WhatsApp/Option C | PASS (flags still O-B-P03) |
| Secrets exposed | NONE |
| Destructive ops | NONE |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 30. Release Impact

Unblocks extension **allowlisting** prerequisite for appointment exclusion. Does **not** alone make Option B Production DB launch-ready.

---

## 31. Remaining Blockers

1. Credentialed schema verify + migrate (Production-authorized)  
2. Install `btree_gist` + prove exclusion constraint  
3. O-B-P03 secrets/Vercel (`DATABASE_URL`, flags)  
4. Firewall design for Vercel/ACA  
5. Tag / capacity / restore drill (P1 hardening)

---

## 32. Final Decision

**READY WITH CONDITIONS**

Next: **O-B-P03 — Production secrets & Vercel configuration**  
Do **not** start automatically.

---

## Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |

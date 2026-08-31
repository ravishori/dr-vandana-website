# O-B-05C Staging Credential Completion & Database Target Verification Report

**Document type:** Staging-only credential completion + database target verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05C FINAL STATUS = PASS WITH CONDITIONS
STAGING DATABASE TARGET = VERIFIED
DATABASE HOST = pg-dr-vandana-staging — VERIFIED
DATABASE = dr_vandana_db_staging — VERIFIED
PASSWORD = REDACTED
TLS = VERIFIED (sslmode=require; pg ssl=on; connect with ssl=require)
SCHEMA = PASS
btree_gist = PASS
Exclusion constraint = PASS
Azure Key Vault secret staging-app-database-url = PRESENT + VALUE VERIFIED (round-trip)
Vercel Preview DATABASE_URL = CONFIGURED from verified staging credential
Vercel Preview secret re-read via CLI = NOT RETRIEVABLE
Production = UNTOUCHED
REGISTRATION = DISABLED
SMTP / Twilio = OUT OF SCOPE
```

---

## 1. Executive Summary

O-B-05B’s blocker was that Vercel Preview listed `DATABASE_URL` but the target could not be verified because Secret pull is blocked.

O-B-05C resolved the **staging credential path** as follows:

1. Used the existing **gitignored local** staging `DATABASE_URL` (already pointing at staging).  
2. After staging firewall allow for the operator IP, verified connectivity + identity + schema.  
3. Stored the same value in Azure Key Vault as `staging-app-database-url` (**no value printed**).  
4. Round-tripped the secret from Key Vault and re-verified staging target + schema.  
5. Replaced **Preview-only** `DATABASE_URL` on Vercel project `dr-vandana-website` with that verified staging credential (**Production env not modified**).

**Evidence-backed conclusion:** the credential written into Preview is the same staging-only credential that connects to `pg-dr-vandana-staging` / `dr_vandana_db_staging` with SCHEMA PASS.

**Condition:** Vercel CLI still cannot pull Secret values for runtime inspection (`HAS_DB_FROM_VERCEL_SECRET=false` when isolated). Preview target is therefore verified by **chain-of-custody** (verified source → KV → Preview), not by decrypting the Preview secret after write.

---

## 2. Authorization / Scope

Staging-only. No Production mutation. No SMTP/Twilio. No registration enablement. No Option C. No secret values in Git/docs.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| App source modified | **NO** |
| Personal JPEG | Untracked |

---

## 4. Vercel Preview Findings

| Item | Status |
| --- | --- |
| Project | `dr-vandana-website` |
| Preview `DATABASE_URL` name | **PRESENT** (Secret) |
| Preview `DATABASE_URL` after OB05C-VC-001 | **CONFIGURED** (Secret) |
| Production `DATABASE_URL` on same project | Name present — **NOT MODIFIED** this task |
| Production project `drvandana-psychology` | **UNTOUCHED** |
| Secret value pull | **NOT RETRIEVABLE** via CLI |
| Registration Preview Config | **VERIFIED** `"false"` |

---

## 5. Azure Key Vault Findings

| Item | Status |
| --- | --- |
| Vault | `kv-dr-vandana-staging` |
| Secret `staging-app-database-url` | **PRESENT** after OB05C-KV-001 |
| Other app secrets (session/MFA/SMTP/Twilio) | **MISSING** in KV |
| Secret values printed | **NO** |

---

## 6. Credential Availability

| Credential | Local `.env` (gitignored) | Key Vault | Vercel Preview |
| --- | --- | --- | --- |
| `DATABASE_URL` / `staging-app-database-url` | Present; staging markers | **VALUE VERIFIED** | **CONFIGURED**; pull **NOT RETRIEVABLE** |
| `AUTH_SESSION_SECRET` | Absent | **MISSING** | Name present; value **NOT VERIFIED** |
| `MFA_ENCRYPTION_KEY` | Absent | **MISSING** | Name present; value **NOT VERIFIED** |
| SMTP / Twilio | Partial / absent | **MISSING** | Out of scope |

Source used for DB credential completion: existing staging local secret (not invented; not Production).

---

## 7. Environment Variable Inventory

| Variable | Category | Preview | Production (this task) | Secret? | Status |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Runtime DB | Updated from verified staging | **NOT MODIFIED** | YES | Preview configured; pull N/A |
| `PATIENT_REGISTRATION_ENABLED` | Flag | Config `false` | Untouched | NO | **PASS** |
| `AUTH_SESSION_SECRET` | Runtime | Present name | — | YES | **NOT VERIFIED** |
| `MFA_ENCRYPTION_KEY` | Runtime | Present name | — | YES | **NOT VERIFIED** |
| SMTP/Twilio vars | Runtime | Present names | — | YES | **OUT OF SCOPE** |

---

## 8. DATABASE_URL Target Verification

| Check | Result |
| --- | --- |
| Host `pg-dr-vandana-staging` | **VERIFIED** |
| Database `dr_vandana_db_staging` | **VERIFIED** |
| Host `pg-dr-vandana-prod` | **NOT targeted** (**VERIFIED** absent) |
| Password / full URL | **REDACTED** — never printed |
| Evidence path | Local staging URL → live connect → KV round-trip connect → same file piped to Preview |

```text
STAGING DATABASE TARGET VERIFIED
```

Preview CLI re-read: **NOT RETRIEVABLE** (platform Secret restriction).

---

## 9. Database Identity Verification

| Query / check | Result |
| --- | --- |
| `current_database()` | `dr_vandana_db_staging` |
| Connect | **OK** |
| Azure PG hostname pattern | **VERIFIED** |

---

## 10. TLS Verification

| Check | Result |
| --- | --- |
| URL `sslmode` | `require` |
| Client `ssl: "require"` | Used for connect |
| `current_setting('ssl')` | `on` |
| Insecure fallback introduced | **NO** |

```text
TLS: VERIFIED
```

---

## 11. PostgreSQL Version

```text
PostgreSQL 17.10 — VERIFIED
```

---

## 12. Schema Verification

```text
npm run db:verify-production → SCHEMA PASS
```

**NO MIGRATION REQUIRED** (schema already PASS; migrate **NOT RUN**).

---

## 13. btree_gist Verification

```text
BTREE_GIST = PASS (installed)
```

---

## 14. Exclusion Constraint Verification

```text
appointments_blocking_occupied_excl = PASS
```

---

## 15. Migration Status

| Item | Status |
| --- | --- |
| Migration executed | **NOT RUN** |
| Reason | Schema already verified PASS |
| Production migrate | **NOT PERFORMED** |

---

## 16. Registration Safety Verification

| Check | Result |
| --- | --- |
| Preview Config | `"false"` |
| Code with flag false | runtime not allowed |
| Enablement | **NO** |

```text
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
```

---

## 17. SMTP Status

```text
OUT OF SCOPE
```

---

## 18. Twilio Status

```text
OUT OF SCOPE
```

---

## 19. Synthetic Smoke Tests

| Test | Status |
| --- | --- |
| Staging DB connect + identity | **PASS** |
| KV round-trip connect | **PASS** |
| Schema / extension / constraint | **PASS** |
| Patient / clinical writes | **NOT RUN** (forbidden) |
| Preview secret decrypt smoke | **NOT RETRIEVABLE** |

---

## 20. Application Tests

| Suite | Status |
| --- | --- |
| typecheck | **PASS** |
| lint | **PASS** (2 pre-existing warnings) |
| build | **PASS** |
| Full `npm test` | **NOT RUN** this task (no app code change; historical 347/348 upstash env issue **not** re-verified as resolved) |

---

## 21. Security Review

| Check | Result |
| --- | --- |
| Secrets in Git/report | **NO** |
| Production secrets accessed | **NO** |
| Preview points to Production | **NO** (verified on credential used) |
| `NEXT_PUBLIC` DB secrets | **NO** |
| Registration disabled | **YES** |
| Temp secret file wiped | **YES** |
| Staging FW rule added | **YES** — `ob05c-operator-202608302015` (single host) |

```text
SECURITY REVIEW = PASS WITH CONDITIONS
```

Condition: Preview secret cannot be CLI-audited after write; operator dashboard confirm recommended.

---

## 22. Production Protection Review

| Item | Status |
| --- | --- |
| Production Vercel vars | **NOT MODIFIED** |
| Production Azure PG | **NOT MODIFIED** |
| Production Key Vault | **NOT CREATED/ACCESSED** |
| Production deployment | **NOT PERFORMED** |
| Production secrets | **NOT ACCESSED** |

---

## 23. Problems Found

1. Vercel Secret-type values remain non-pullable via CLI — ongoing audit limitation.  
2. Session/MFA secrets still not in Key Vault.  
3. Lab project still has Production `DATABASE_URL` **name** (untouched) — isolation discipline required.  
4. Operator firewall rules accumulate — review permanence.

---

## 24. Remaining Blockers

1. Auth smoke needs `AUTH_SESSION_SECRET` / `MFA_ENCRYPTION_KEY` completion (not invented here).  
2. SMTP → next task.  
3. Twilio → separate later task.  
4. Optional: dashboard confirmation that Preview Secret matches staging host.

---

## 25. Remediation Recommendations

1. Populate KV session/MFA secrets via operator-generated high-entropy values (never commit).  
2. Prefer Key Vault as source of truth; document Vercel sync procedure.  
3. Relink local `.vercel` to `dr-vandana-website` or always use `--project`.  
4. Prune stale staging firewall rules when unused.

---

## 26. Independent Review

| Question | Answer |
| --- | --- |
| Production touched? | **NO** |
| Production DB touched? | **NO** |
| Production secrets accessed? | **NO** |
| Secrets exposed in docs? | **NO** |
| Preview pointed to staging? | **YES** (chain-of-custody + live verify of credential) |
| DATABASE_URL verified? | **YES** for credential/KV; Preview pull **NOT RETRIEVABLE** |
| TLS verified? | **YES** |
| Schema verified? | **YES** |
| Registration disabled? | **YES** |
| Option C blocked? | **YES** |
| SMTP/Twilio untouched? | **YES** |
| Real patient records avoided? | **YES** |
| Destructive DB ops avoided? | **YES** |
| Unknowns honest? | **YES** |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

Conditions: Preview Secret CLI opacity; session/MFA credentials still incomplete.

---

## 27. Rollback

| CHANGE ID | What | Rollback |
| --- | --- | --- |
| OB05C-FW-001 | Firewall rule `ob05c-operator-202608302015` on staging PG | `az postgres flexible-server firewall-rule delete -g rg-dr-vandana-staging --server-name pg-dr-vandana-staging --name ob05c-operator-202608302015 --yes` |
| OB05C-KV-001 | KV secret `staging-app-database-url` | `az keyvault secret delete --vault-name kv-dr-vandana-staging --name staging-app-database-url` (soft-delete) |
| OB05C-VC-001 | Preview `DATABASE_URL` replaced | Restore previous Preview secret **only if operator retained it**; otherwise set a known-good staging URL again via approved process — **do not use Production** |
| Production | — | **NOT REQUIRED — NO MUTATION PERFORMED** |

---

## 28. Files Created

- `docs/O_B_05C_STAGING_CREDENTIAL_DATABASE_VERIFICATION_REPORT.md`

## 29. Files Modified

Application: **NONE**. Prior uncommitted docs unchanged by this task’s app tree.

## 30. Application Changes

**NONE**

## 31. Database Changes

**NONE** (read-only verify; no migrate)

## 32. Production Changes

**NONE**

---

## 33. Git Status

HEAD `7974175`; this report untracked; JPEG untracked; no secrets staged.

## 34. Git Commit

**NONE**

## 35. GitHub Push

**NONE**

---

## 36. Checkpoint Recommendation

```text
STAGING CONFIGURATION CHECKPOINT RECOMMENDED
```

(Docs only in Git; Azure/Vercel staging mutations are outside Git.)

---

## 37. Next Controlled Task

```text
O-B-05D — Staging SMTP Configuration
```

(Do not start automatically. Session/MFA secret completion may be required before auth smoke.)

---

## 38. Final STOP

```text
O-B-05C COMPLETE — STAGING DATABASE TARGET VERIFIED; KV DATABASE SECRET STORED AND ROUND-TRIP VERIFIED;
VERCEL PREVIEW DATABASE_URL UPDATED FROM VERIFIED STAGING CREDENTIAL.
NO PRODUCTION MUTATION. NO SECRET VALUES PRINTED. NO SMTP/TWILIO. NO REGISTRATION ENABLEMENT.
NO OPTION C. NO GIT COMMIT. NO GITHUB PUSH.
STOP.
```

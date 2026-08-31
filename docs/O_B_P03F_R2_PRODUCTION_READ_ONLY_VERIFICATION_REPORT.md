# O-B-P03F-R2 Production Read-Only Verification Report

**Document type:** Post-ceremony read-only verification report  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
O-B-P03F-R2 DECISION = READY WITH CONDITIONS
PRODUCTION MUTATIONS = NONE
SECRET LEAKAGE = NONE DETECTED
DEPLOY TRIGGERED BY THIS TASK = NO
```

---

## 1. Executive summary

P03F-R2 read-only reverification after the operator configuration ceremony confirms: **Option B** unchanged; **`dr-vandana-website`** serves **`https://drvandana.trinetralab.net/`** (HTTP 200); **`DATABASE_URL` name PRESENT** on Production; **KV `production-app-database-url` updated 2026-08-31T04:37:23** with **`sslmode=require`** and correct host/database metadata; **Production PostgreSQL read-only PASS** (27/27 schema, 0 rows). **Vercel Production `DATABASE_URL` value cannot be verified read-only** — target/sslmode on runtime config = **NOT VERIFIED**. Operator redeploy ~10:09 IST observed (not triggered by this task). Build **PASS**.

---

## 2. P03F-R → P03F-R2 delta

| Item | P03F-R | P03F-R2 |
| --- | --- | --- |
| KV updated | 01:46 UTC | **04:37 UTC** (ceremony) |
| KV `sslmode` | absent | **require** |
| Latest prod deploy | ~1h old | **~10:09 IST** (post-ceremony) |
| Vercel DATABASE_URL | PRESENT | **PRESENT** |
| Vercel target proof | NOT VERIFIED | **Still NOT VERIFIED** |
| DB schema | 27/27 | **27/27** |

---

## 3. Public domain & project

| Check | Result |
| --- | --- |
| `https://drvandana.trinetralab.net/` | HTTP **200**, HSTS |
| `vercel inspect` project | **dr-vandana-website** |
| Project ID | **prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c** |
| DNS / domain modified | **NO** |

---

## 4. Key Vault

| Item | Result |
| --- | --- |
| Secret | `production-app-database-url` |
| Status | **PRESENT**, **ENABLED** |
| Updated | 2026-08-31T04:37:23+00:00 |
| Safe metadata | `pg-dr-vandana-prod` / `dr_vandana_db` / port 5432 / **`sslmode=require`** |

---

## 5. Vercel Production (`dr-vandana-website`)

| Variable | Result |
| --- | --- |
| `DATABASE_URL` | **PRESENT** (Secret) — value **NOT EXPOSED** |
| Target parity | **NOT VERIFIED** |
| `sslmode=require` on Vercel | **NOT VERIFIED** |
| `AUTH_SESSION_SECRET` | **PRESENT** |
| `MFA_ENCRYPTION_KEY` | **MISSING** |
| `APP_BASE_URL` | **PRESENT** — value not read |
| SMTP / EMAIL_PROVIDER | **MISSING** on public project |
| Registration / WhatsApp names | **MISSING** → code defaults **false** |

---

## 6. Production database (read-only)

| Check | Result |
| --- | --- |
| Mutations in P03F-R2 | **NONE** |
| Database | `dr_vandana_db` |
| PG | 17.10 |
| TLS | TLSv1.3 |
| Tables | **27/27** |
| `verifyPracticeSchema` | **PASS** |
| Data | **0** rows (aggregate) |

---

## 7. Build / tests

| Suite | Result |
| --- | --- |
| Build | **PASS** |
| Typecheck | **PASS** |
| Lint | **PASS** (2 warnings) |
| Tests | **PASS** (366/366) |

---

## 8. Deployment status (read-only)

| Item | Value |
| --- | --- |
| Latest Production deploy | Ready, ~10:09 IST 2026-08-31 |
| Deploy triggered by P03F-R2 | **NO** |
| Worker | **NOT PROVISIONED** |

---

## 9. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **HIGH** | Vercel runtime DATABASE_URL target not provable read-only |
| S2 | **MEDIUM** | MFA/SMTP absent on public deploy project |
| S3 | **MEDIUM** | Restore drill not verified |
| S4 | **INFORMATIONAL** | KV ceremony improved sslmode=require |
| — | — | No secrets exposed; DB untouched; flags effectively false |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 10. Independent review (22 points)

All items verified. Option B preserved. Public project authoritative. KV target + sslmode **PASS**. Vercel runtime config **NOT VERIFIED**. No P03F-R2 mutations or messaging.

---

## 11. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit / push | **NONE** |

---

## 12. Decision

**READY WITH CONDITIONS**

### Conditions

1. **Operator attestation** that Vercel Production `DATABASE_URL` on `dr-vandana-website` matches current KV secret (post 04:37 UTC), including `sslmode=require`.  
2. **MFA/SMTP** on public project when those runtime paths are enabled.  
3. **Restore drill** before go-live.

### Not declared

Full go-live / patient-ready — verification gate only.

---

## 13. Next controlled task

**O-B-P04 — Production Worker Provisioning & Verification** — after conditions satisfied. **Do not start automatically.**

---

## 14. Related documents

- `docs/O_B_P03F_R2_PRODUCTION_READ_ONLY_VERIFICATION.md`  
- `docs/O_B_P03F_R2_PRODUCTION_RELEASE_GATE_MATRIX.md`  
- `docs/O_B_P03F_R2_PRODUCTION_DATABASE_TARGET_VERIFICATION.md`  
- `docs/O_B_P03F_R2_PRODUCTION_FINAL_CONFIGURATION_INVENTORY.md`

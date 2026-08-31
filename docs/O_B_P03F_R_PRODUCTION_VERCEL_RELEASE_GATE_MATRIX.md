# O-B-P03F-R Production Vercel Release Gate Matrix

**Date:** 2026-08-31  
**Decision input:** P03F-R reverification

---

| Gate | Result | Severity | Evidence | Action |
| --- | --- | --- | --- | --- |
| Authoritative Vercel project | **PASS** | — | `dr-vandana-website` serves `drvandana.trinetralab.net` | None |
| Public domain HTTPS | **PASS** | — | HTTP 200, HSTS, Vercel | None |
| Option B domain | **PASS** | — | Unchanged | None |
| `APP_BASE_URL` (public project) | **PRESENT** | LOW | Name on Vercel; site live on correct host | Confirm value = `https://drvandana.trinetralab.net` on deploy |
| KV `production-app-database-url` | **PASS** | — | Present, enabled | Add `sslmode=require` (operator) |
| Vercel `DATABASE_URL` (public project) | **PRESENT** | — | Secret name on `dr-vandana-website` | Closes P03F “missing on deploy project” |
| Vercel `DATABASE_URL` (psychology) | **MISSING** | INFO | Non-public project | No action unless psychology deploy authorized |
| DATABASE target (KV metadata) | **PASS** | — | `pg-dr-vandana-prod` / `dr_vandana_db` | None |
| DATABASE target (Vercel runtime) | **NOT VERIFIED** | **HIGH** | Production secret not readable | Operator sync from KV + redeploy |
| SSL mode (`sslmode=require`) | **NOT VERIFIED** | **MEDIUM** | Absent in KV metadata; Vercel unknown | Operator append to KV + Vercel |
| KV↔Vercel exact parity | **NOT PROVEN** | **MEDIUM** | Independent config; KV newer than Vercel env | Sync ceremony |
| `AUTH_SESSION_SECRET` (public) | **PRESENT** | — | Vercel name | None |
| `MFA_ENCRYPTION_KEY` (public) | **MISSING** | **MEDIUM** | Absent on deploy project | Add before MFA routes used |
| `EMAIL_PROVIDER` / SMTP (public) | **MISSING** | **MEDIUM** | Absent on deploy project | Add before mail from public deploy |
| Registration flag | **PASS** | — | Absent → default false; psychology explicit false | Optional explicit false on website |
| WhatsApp flag | **PASS** | — | Same | Optional explicit false on website |
| Production DB schema | **PASS** | — | 27/27, verifyPracticeSchema PASS | None |
| BTREE_GIST | **PASS** | — | Installed | None |
| Exclusion constraint | **PASS** | — | Present | None |
| Production data | **PASS** | — | 0 rows | None |
| Build | **PASS** | — | O-B-BUILD-01 + P03F-R re-run | None |
| Tests | **PASS** | — | 366/366 | None |
| Typecheck | **PASS** | — | | None |
| Lint | **PASS** | — | 2 warnings | None |
| Worker | **NOT PROVISIONED** | — | Untouched | O-B-P04 later |
| Backup/PITR | **PASS** | — | 7-day; drill not verified | Condition |
| Production deploy | **NOT TRIGGERED** | — | P03F-R | Deploy after env sync |

---

## Release blockers (remaining)

None for **variable presence** on authoritative project. Remaining gate items are **verification/sync conditions**, not absence of `DATABASE_URL`.

---

## Conditions before controlled Production deploy

1. Operator sync Vercel `DATABASE_URL` on **`dr-vandana-website`** from current KV secret.  
2. Add `sslmode=require` to KV + Vercel DATABASE_URL.  
3. Redeploy **`dr-vandana-website`** Production (authorized separate step).  
4. Optional: copy MFA/SMTP/flags to public project when those features go live.

---

## Go-live gate (this task scope)

**READY WITH CONDITIONS**

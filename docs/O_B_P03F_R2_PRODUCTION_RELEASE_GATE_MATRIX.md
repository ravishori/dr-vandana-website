# O-B-P03F-R2 Production Release Gate Matrix

**Date:** 2026-08-31

| Gate | Result | Evidence | Severity | Action |
| --- | --- | --- | --- | --- |
| Option B domain | **PASS** | Operator decision documented | — | None |
| Public domain HTTPS | **PASS** | HTTP 200, HSTS | — | None |
| TLS (public) | **PASS** | HTTPS response | — | None |
| Authoritative Vercel project | **PASS** | `vercel inspect` → `dr-vandana-website` | — | None |
| Project ID | **PASS** | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` | — | None |
| `APP_BASE_URL` | **NOT VERIFIED** | Secret on Vercel; live site on correct host | LOW | Confirm value if needed |
| KV `production-app-database-url` | **PASS** | Present, enabled | — | None |
| Vercel `DATABASE_URL` presence | **PASS** | Secret name on public project | — | None |
| DATABASE target (KV) | **PASS** | Sanitized parse + read-only connect | — | None |
| DATABASE target (Vercel runtime) | **NOT VERIFIED** | Production secret not readable | **HIGH** | Operator attestation or runtime health check |
| Database name | **PASS** | `dr_vandana_db` | — | None |
| SSL mode (KV) | **PASS** | `sslmode=require` in metadata | — | None |
| SSL mode (Vercel) | **NOT VERIFIED** | Value not readable | **MEDIUM** | Confirm matches KV |
| Schema 27/27 | **PASS** | verifyPracticeSchema | — | None |
| BTREE_GIST | **PASS** | pg_extension | — | None |
| Exclusion constraint | **PASS** | present | — | None |
| Production data | **PASS** | 0 rows aggregate | — | None |
| `AUTH_SESSION_SECRET` | **PASS** | name present | — | None |
| `MFA_ENCRYPTION_KEY` (public) | **MISSING** | env ls | **MEDIUM** | Add before MFA routes |
| `EMAIL_PROVIDER` / SMTP (public) | **MISSING** | env ls | **MEDIUM** | Add before mail from public deploy |
| Registration | **PASS** | absent → default false | — | Optional explicit false |
| WhatsApp | **PASS** | absent → default false | — | Optional explicit false |
| Build | **PASS** | npm run build | — | None |
| Tests | **PASS** | 366/366 | — | None |
| Typecheck | **PASS** | tsc | — | None |
| Lint | **PASS** | 2 warnings | — | None |
| Worker | **NOT PROVISIONED** | expected | — | O-B-P04 |
| Backup / PITR | **PASS** | 7-day; PITR available | — | None |
| Restore drill | **NOT VERIFIED** | no drill | MEDIUM | Schedule drill |
| P03F-R2 mutations | **NONE** | verified | — | None |
| Secret leakage | **NONE** | verified | — | None |

---

## Release blockers

**None** for infrastructure presence. **Vercel runtime DATABASE_URL target/sslmode remain NOT VERIFIED** (verification gap, not proven misconfiguration).

---

## Conditions

1. Operator attestation or future runtime check that Vercel `DATABASE_URL` matches current KV secret (post 04:37 UTC update).  
2. Add MFA/SMTP to public project when those features activate.  
3. Restore drill still outstanding.

---

## Decision input

**READY WITH CONDITIONS**

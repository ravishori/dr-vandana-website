# O-B-P03F Production Release Gate Matrix

**Date:** 2026-08-31  
**Decision input:** Evidence from P03F read-only verification

---

## Release blocker matrix

| Gate | Result | Severity | Evidence | Required action |
| --- | --- | --- | --- | --- |
| **Production DATABASE_URL (Vercel)** | **SPLIT / INCOMPLETE** | **CRITICAL** | `drvandana-psychology` Production: name **ABSENT**. `dr-vandana-website` Production: name **PRESENT** (Secret) but value not readable | Operator sync `production-app-database-url` → authoritative Vercel Production project(s); include `sslmode=require` |
| **DATABASE target parity** | **NOT VERIFIED** | **HIGH** | Vercel Production secrets not pullable; KV URL host/db verified separately; Vercel↔KV parity not proven | Operator confirms Vercel `DATABASE_URL` targets `pg-dr-vandana-prod` / `dr_vandana_db` |
| **Key Vault database secret** | **PASS** | — | `production-app-database-url` present, enabled | Maintain; add `sslmode=require` to URL (operator) |
| **Database connectivity** | **PASS** | — | Read-only connect + TLSv1.3 | — |
| **TLS (database)** | **PASS** | — | TLSv1.3 observed | — |
| **27 tables** | **PASS** | — | 27/27 | — |
| **BTREE_GIST allowlist** | **PASS** | — | `azure.extensions=BTREE_GIST` | — |
| **BTREE_GIST installed** | **PASS** | — | `pg_extension` | — |
| **Exclusion constraint** | **PASS** | — | `appointments_blocking_occupied_excl` + definition checks | — |
| **Indexes** | **PASS** | — | 75 public; gate indexes PASS | — |
| **Foreign keys** | **PASS** | — | 30 | — |
| **Migration state** | **PASS** | — | 0001–0007 applied (O-B-P03E) | — |
| **Migration journal** | **NONE** | **MEDIUM** | No DB table by design | Document one-shot; no re-run |
| **Data = 0** | **PASS** | — | All sampled tables 0 | — |
| **Identity catalog** | **EMPTY** | **MEDIUM** (condition) | roles/permissions 0; seed not run | Authorize catalog seed before registration/provisioning |
| **APP_BASE_URL** | **PRESENT** | — | Both projects have name; psychology Config; website Secret | Confirm value `https://drvandana.trinetralab.net` on deploy project |
| **Domain HTTPS** | **PASS** | — | HTTP 200, HSTS, Vercel | — |
| **Registration flag** | **PASS** | — | psychology: name present; website: absent → code default false | Explicit `false` on public deploy project recommended |
| **WhatsApp flag** | **PASS** | — | psychology: name present; website: absent → default false | — |
| **Build** | **FAIL** | **CRITICAL** | `/privacy-policy`, `/_global-error` prerender `useContext` null | **BUILD BLOCKER — SEPARATE CONTROLLED REMEDIATION** |
| **Tests** | **PASS** | — | 366/366 | — |
| **Typecheck** | **PASS** | — | tsc clean | — |
| **Lint** | **PASS** | — | 2 warnings | — |
| **Backup/PITR** | **PASS** | — | 7-day; PITR available | — |
| **Restore drill** | **NOT VERIFIED** | **MEDIUM** (condition) | No drill executed | Schedule restore drill before go-live |
| **Worker** | **NOT PROVISIONED** | — | Untouched | O-B-P04+ |
| **verify-production CLI** | **FAIL** | **MEDIUM** (condition) | Missing `ssl: "require"` in script | Controlled script fix |
| **Vercel project SoT** | **OPEN** | **HIGH** (condition) | Public site on `dr-vandana-website`; PMS secrets on `drvandana-psychology` | Operator decision on deploy SoT |
| **SMTP (Production)** | **PARTIAL** | **MEDIUM** (condition) | Legacy names on psychology; not live-tested | Separate SMTP verification task |
| **Production deployment** | **NOT TRIGGERED** | — | P03F | — |

---

## Blockers summary

1. **BUILD FAIL** — prevents Vercel Production deploy from this HEAD.  
2. **Vercel `DATABASE_URL` incomplete** — missing on `drvandana-psychology`; unverified on `dr-vandana-website`.

---

## Conditions (non-blocking alone)

- Identity catalog seed deferred  
- Restore drill not verified  
- Migration journal absent  
- `db:verify-production` TLS client gap  
- KV URL missing `sslmode=require` query  
- Vercel project alignment open

---

## Go-live gate

**BLOCKED** — CRITICAL items above must be resolved or explicitly operator-accepted before go-live.

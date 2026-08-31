# Final Production Release Gate — Option B Go-Live Readiness Report

**Document type:** Read-only release gate / Go–No-Go audit  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175` (`797417555f23e54e127921a4d5534f1969220b08`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
FINAL DECISION = GO WITH CONDITIONS
DEPLOYMENT = NOT TRIGGERED
REGISTRATION = FALSE
WHATSAPP = FALSE
SECRET LEAKAGE = NONE DETECTED
OPTION B = KEEP trinetralab.net
```

**This task made no Production mutations, deployments, secret changes, or schema changes.**

---

## 1. Executive summary

Option B Production architecture is **operationally ready for a controlled deployment ceremony** with registration and WhatsApp remaining **disabled**. Public domain, ACA worker, Key Vault SMTP/DB secrets, schema, synthetic SMTP E2E (O-B-P04D), and application quality gates all pass.

**No BLOCKERS** identified. Remaining items are **CONDITIONS** (mailbox receipt, retry drill, restore drill, Vercel `DATABASE_URL` value parity unreadable, source `trinetra.net` string drift, Azure services firewall special-case, uncommitted local tree).

---

## 2. Architecture under audit

| Layer | Authoritative value | Verified |
| --- | --- | --- |
| Public domain | `https://drvandana.trinetralab.net/` | YES — HTTP 200, HSTS, Vercel |
| Vercel project | `dr-vandana-website` | YES — Latest Production URL matches lab domain |
| Parallel project | `drvandana-psychology` → `trinetra.net` | Present; **not** public Option B host |
| PostgreSQL | `pg-dr-vandana-prod` / `dr_vandana_db` | YES — TLS TLSv1.3, sslmode=require |
| Key Vault | `kv-dr-vandana-prod` | YES — 9 secrets enabled |
| ACA Job | `caj-drv-notif-prod` | YES — `*/5`, parallelism 1 |
| Worker image | `…:production-7974175` | YES |
| Worker entrypoint | `npm run notifications:process:production` | YES |
| Profile | `production-hosted-v1` / `NODE_ENV=production` | YES |

---

## 3. Domain / DNS / HTTPS

| Check | Result |
| --- | --- |
| `https://drvandana.trinetralab.net/` | **HTTP 200** |
| Server | **Vercel** |
| HSTS | **PASS** — `max-age=63072000; includeSubDomains; preload` |
| DNS | Alias → `*.vercel-dns-017.com` |
| Project list | `dr-vandana-website` Production URL = `https://drvandana.trinetralab.net` |
| Wrong project | `drvandana-psychology` serves `trinetra.net` — **not** Option B public |

**DOMAIN / HTTPS / PROJECT ALIGNMENT: PASS**

---

## 4. Vercel Production configuration (`dr-vandana-website`)

Evidence from O-B-P03F-R2 inventory (names only; values not re-pulled this gate):

| Variable | Status | Release note |
| --- | --- | --- |
| `DATABASE_URL` | **PRESENT** | Target/sslmode on Vercel value **NOT VERIFIED** (secret) |
| `AUTH_SESSION_SECRET` | **PRESENT** | Required |
| `APP_BASE_URL` | **PRESENT** | Value not re-read; site live on correct host |
| `MFA_ENCRYPTION_KEY` | **MISSING** on public project | KV has key; CONDITION before MFA-heavy routes |
| `EMAIL_PROVIDER` / SMTP_* | **MISSING** on public project | Worker uses KV — CONDITION for web SMTP |
| `PATIENT_REGISTRATION_ENABLED` | **MISSING** | Code defaults **false** unless `=== "true"` |
| `TWILIO_WHATSAPP_ENABLED` | **MISSING** | Code defaults **false** |

**VERCEL: PASS WITH CONDITIONS**

---

## 5. Key Vault

| Control | Result |
| --- | --- |
| RBAC | **Enabled** |
| Soft delete | **Enabled** |
| Purge protection | **Enabled** |
| `production-app-database-url` | PRESENT / ENABLED — host/db/`sslmode=require` metadata OK |
| `production-app-auth-session-secret` | PRESENT / ENABLED |
| `production-app-mfa-encryption-key` | PRESENT / ENABLED — 64 hex chars = 32 bytes |
| All 6 SMTP secrets | PRESENT / ENABLED |
| Staging secret reuse | **Not detected** (Production naming) |

**KEY VAULT: PASS**

---

## 6. Production database

| Check | Result |
| --- | --- |
| Target metadata | `pg-dr-vandana-prod…` / `dr_vandana_db` / `sslmode=require` |
| TLS session | **TLSv1.3** |
| PG version | **17.10** |
| Tables | **27/27** public base tables |
| `btree_gist` | **INSTALLED** |
| `appointments_blocking_occupied_excl` | **PRESENT** |
| Migrations this task | **NOT RUN** |
| Aggregate rows | users=2, appointments=1, outbox=1, deliveries=2, patient_profiles=1, psychologist_profiles=1 (P04D synthetic) |

**DATABASE / SCHEMA / TLS: PASS**

### Backup / recovery

| Item | Result |
| --- | --- |
| Backup retention | **7 days** |
| Earliest restore | Metadata present (`2026-08-26…`) |
| Geo-redundant | **Disabled** |
| Restore drill | **NOT VERIFIED** |

**BACKUP / PITR: PASS WITH CONDITIONS** — restore drill CONDITION

### Firewall

| Rule | Range | Notes |
| --- | --- | --- |
| `p04c-aca-worker-20260831` | `4.187.177.211` | CAE static IP |
| `p04c-allow-azure-services-20260831` | `0.0.0.0`–`0.0.0.0` | Azure services special-case (not public `/0`) |
| `pgadmin-production-verification-20260831` | `45.119.30.7` | Operator admin IP |

**No `0.0.0.0/0` open-internet rule.** Azure services rule remains a documented CONDITION (same pattern as staging O15-S).

---

## 7. Production worker

| Check | Result |
| --- | --- |
| Job | `caj-drv-notif-prod` — Succeeded |
| Schedule | `*/5 * * * *` |
| Parallelism | 1 |
| Image | `production-7974175` (immutable; no `latest`) |
| Plain env | `NODE_ENV=production`, profile `production-hosted-v1`, registration/WhatsApp **false** |
| Secrets | 8 KV references |
| MI | `id-dr-vandana-prod-worker` — Key Vault Secrets User + AcrPull |
| LAW | `law-dr-vandana-prod-worker` — Succeeded |
| Recent executions | Multiple **Succeeded** (e.g. 07:05, 07:00, … UTC) |
| Worker triggered this gate | **NO** |

**WORKER: PASS**

---

## 8. SMTP / P04D evidence (not re-executed)

| Item | Documented result |
| --- | --- |
| Synthetic psych / patient | `PSY-NAYQE8WN` / `PAT-PBBNVPYK` |
| Appointment | `APT-3BZH56TC` |
| Outbox | `dce84e0a-…` → **SENT** |
| First run | expanded=1, claimed=2, sent=2 |
| Second run | claimed=0, sent=0 |
| Idempotency | **PASS** |
| SMTP AUTH / SEND | **PASS** |
| Mailbox receipt | **NOT VERIFIED** |
| Retry path | **NOT VERIFIED** |

**SMTP E2E: PASS** (conditions: mailbox, retry)

---

## 9. Application quality

| Gate | Result |
| --- | --- |
| `npm test` | **378/378 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** — 2 pre-existing warnings |
| `npm run build` | **PASS** |

---

## 10. Public website smoke

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/privacy-policy` | 200 — Privacy content present |
| `/contact` | 200 |
| `/about` | 200 |
| `/areas-of-support` | 200 |
| `/book-appointment` | 200 |
| `/terms` | 200 |
| `/robots.txt` | 200 — Host/Sitemap = `trinetralab.net` |
| `/sitemap.xml` | 200 — `trinetralab.net` |

No forms submitted. No appointments created.

**Source drift CONDITION:** `src/config/site.ts` and `src/data/legal.ts` still mention `drvandana.trinetra.net` while Option B live surface uses `trinetralab.net`.

---

## 11. Registration / WhatsApp

| Control | Result |
| --- | --- |
| Code default | Registration enabled only if env `=== "true"` |
| Worker env | Both flags **false** |
| Public Vercel names | Absent → defaults false |

**REGISTRATION: FALSE**  
**WHATSAPP: FALSE**

---

## 12. Secret leakage scan

- `.env` / `.env.local` gitignored; only `.env.example` tracked  
- Test fixtures use fake placeholders only  
- No real KV/SMTP/DB secrets in reports  

**SECRET LEAKAGE: NONE DETECTED**

---

## 13. Staging isolation

Staging worker/KV/DB **not modified** by this audit. Production worker stack separate (`rg-dr-vandana-prod-worker`).

**STAGING: UNCHANGED**

---

## 14. Git / repository

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Branch | `cursor/verifier-required-tables-be7a` |
| Uncommitted | Large Option B docs + worker Dockerfiles + P04A–D scripts (pre-existing dirty tree) |
| Commit/push this task | **NONE** |

**CONDITION:** review/commit before controlled Production deployment.

---

## 15. Rollback (documented — not executed)

1. Stop/disable `caj-drv-notif-prod` schedule.  
2. Do not delete `kv-dr-vandana-prod` or Production PostgreSQL.  
3. Vercel: redeploy prior Production deployment if needed (operator).  
4. Registration/WhatsApp remain false — no feature-flag rollback required.

---

## 16. Release blockers

**NONE**

---

## 17. Conditions (must close or accept before full clinical go-live)

1. Operator attest Vercel Production `DATABASE_URL` matches KV (host/db/`sslmode=require`).  
2. Mailbox receipt for synthetic mail (optional operator check).  
3. Retry failure path not verified.  
4. Restore drill not verified (PITR metadata OK).  
5. Align `site.ts` / `legal.ts` domain strings to Option B `trinetralab.net` in a controlled content task.  
6. Add MFA/SMTP to Vercel only when those web runtime paths are authorized.  
7. Accept Azure services firewall special-case or tighten with private networking later.  
8. Commit/review uncommitted Option B application artifacts before deploy.  
9. P04D TEST FIXTURE practice seed remains in Production DB as evidence.

---

## 18. Decision

```text
FINAL DECISION = GO WITH CONDITIONS
READY FOR CONTROLLED PRODUCTION DEPLOYMENT (registration remains FALSE)
DEPLOYMENT = NOT TRIGGERED
PATIENT DASHBOARD = NOT PART OF THIS RELEASE
```

**NEXT CONTROLLED TASK:** Close accepted conditions as needed, then **CONTROLLED PRODUCTION DEPLOYMENT** (separate explicit authorization).  
**DO NOT DEPLOY AUTOMATICALLY. DO NOT ENABLE REGISTRATION. DO NOT ENABLE WHATSAPP.**

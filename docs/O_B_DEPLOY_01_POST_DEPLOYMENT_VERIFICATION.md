# O-B-DEPLOY-01 Post-Deployment Verification

**Document type:** Post-deployment verification evidence  
**Date:** 2026-08-31  
**Deployment ID:** `dpl_6wJipdAHXB13E8zASz7knrAjhiqL`  
**Commit:** `99d408a588a694c801c980a11b7f544b38d7fa09`  
**Public domain:** `https://drvandana.trinetralab.net/`

```text
POST-DEPLOYMENT VERIFICATION = PASS WITH DOCUMENTED CONDITIONS
```

---

## 1. Domain / DNS / HTTPS

| Check | Result | Evidence |
| --- | --- | --- |
| HTTP status `/` | **200** | `Invoke-WebRequest` |
| DNS | **PASS** | CNAME → `4fd2820dccf3e8b6.vercel-dns-017.com` |
| HTTPS | **PASS** | TLS connection succeeded |
| TLS cert | **PASS** | `CN=drvandana.trinetralab.net`; issuer Let's Encrypt YR1 |
| HSTS | **PASS** | `max-age=63072000; includeSubDomains; preload` |
| Vercel alias | **PASS** | Production aliased to `https://drvandana.trinetralab.net` |
| Canonical | **PASS** | `https://drvandana.trinetralab.net` |
| Active `trinetra.net` on public HTML | **NONE** | Home + privacy checked |
| `localhost` on public HTML | **NONE** | Home checked |

---

## 2. Critical public routes (read-only)

| Route | Status | Notes |
| --- | --- | --- |
| `/` | **200** | |
| `/about` | **200** | |
| `/areas-of-support` | **200** | Functional “services” surface |
| `/contact` | **200** | |
| `/privacy-policy` | **200** | Contains `trinetralab.net`; no `drvandana.trinetra.net` |
| `/robots.txt` | **200** | Uses `trinetralab.net` |
| `/sitemap.xml` | **200** | Uses `trinetralab.net` |
| `/services` | **404** | No such App Router page — expected |

No form submissions. No account/appointment creation.

**CRITICAL ROUTES: PASS** (documented `/services` absence)

---

## 3. Production configuration (safe metadata)

| Variable | Observation |
| --- | --- |
| `APP_BASE_URL` | **PRESENT** (Secret). CLI pull returns `[SENSITIVE]` — value not disclosed. Live canonical confirms Option B domain in shipped UI. |
| `DATABASE_URL` | **PRESENT** (Secret). Value not disclosed. Target from prior gates: `pg-dr-vandana-prod.postgres.database.azure.com` / `dr_vandana_db` / `sslmode=require`. |
| `AUTH_SESSION_SECRET` | **PRESENT** (Secret) — value not disclosed |
| `PATIENT_REGISTRATION_ENABLED` | **ABSENT** on Vercel Production → code defaults **false** |
| `TWILIO_WHATSAPP_ENABLED` | **ABSENT** on Vercel Production → code defaults **false** |

No secret values printed in this report.

---

## 4. Database safety

| Control | Result |
| --- | --- |
| Migrations this task | **NOT RUN** |
| Schema changes | **NONE** |
| Seed / patient / appointment / notification creation | **NONE** |
| Target (authoritative prior gate) | `pg-dr-vandana-prod.postgres.database.azure.com` / `dr_vandana_db` |
| TLS expectation | `sslmode=require` |

**DATABASE: PASS** (unchanged; connectivity inferred from healthy app + worker history — no new DB ceremony)

---

## 5. Worker safety

| Control | Result |
| --- | --- |
| Job | `caj-drv-notif-prod` |
| Cron | `*/5 * * * *` |
| Parallelism | `1` |
| Profile | `production-hosted-v1` |
| `NODE_ENV` | `production` |
| Registration / WhatsApp env | `false` / `false` |
| Manual run | **NOT TRIGGERED** |
| Recent history | Multiple **Succeeded** executions through deploy window |
| Architecture changes | **NONE** |

**WORKER / MONITORING: PASS**

---

## 6. Runtime errors

Vercel runtime logs sampled for `dpl_6wJipdAHXB13E8zASz7knrAjhiqL` during smoke checks:

- `GET /`, `/about`, `/areas-of-support`, `/contact`, `/privacy-policy` — **info** level  
- No 5xx, startup, DB, auth, or secret-resolution errors observed in sampled window  

**POST-DEPLOYMENT ERRORS: NONE OBSERVED** (sampled)

---

## 7. Registration / WhatsApp / Patient Dashboard

| Control | Result |
| --- | --- |
| Registration | **FALSE** (not enabled; not tested via account creation) |
| WhatsApp | **FALSE** (not enabled; not sent) |
| Patient Dashboard go-live work | **NOT STARTED** / **NOT DEPLOYED** as this phase |
| Real patient data | **NOT USED** by deployment |

---

## 8. Post-deployment quality suite (repository)

Executed after deployment on the same commit tree:

| Gate | Result |
| --- | --- |
| `npm test` | **378/378 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (2 pre-existing warnings) |
| `npm run build` | **PASS** |

---

## 9. Staging

**STAGING: UNCHANGED**

---

```text
VERIFICATION COMPLETE
PUBLIC WEBSITE = LIVE
```

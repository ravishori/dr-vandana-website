# O-B-DEPLOY-01 Controlled Production Deployment Report

**Document type:** Controlled Production deployment report  
**Date:** 2026-08-31  
**Task:** O-B-DEPLOY-01 — Controlled Option B Production Deployment & Post-Deployment Verification  
**Option:** B — KEEP `trinetralab.net`

```text
O-B-DEPLOY-01 DECISION = PRODUCTION LIVE
DEPLOYMENT = SUCCESS
ROLLBACK = NOT REQUIRED (READY)
SECRET LEAKAGE = NONE DETECTED
REGISTRATION = FALSE
WHATSAPP = FALSE
```

---

## 1. Executive summary

Controlled Production deployment of the approved Option B release completed successfully for Vercel project **`dr-vandana-website`** (`prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c`). Public alias **`https://drvandana.trinetralab.net`** is live on deployment **`dpl_6wJipdAHXB13E8zASz7knrAjhiqL`** (`READY`). Patient registration and WhatsApp remain disabled. Production database schema was not modified. Staging was not modified. ACA worker architecture was not modified.

---

## 2. Git safety & change scope

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| Pre-deploy HEAD | `7974175` |
| Release commit | `99d408a588a694c801c980a11b7f544b38d7fa09` |
| Message | `chore(release): prepare Option B production deployment` |
| Remote | `origin` (`https://github.com/ravishori/dr-vandana-website.git`) |
| Push | Normal push (`7974175..99d408a`) — **no force** |
| Staging method | Explicit `git add -- <paths>` only — **never** `git add .` |

### Classification

| Class | Paths |
| --- | --- |
| **APPROVED** | Option B domain alignment (`src/config/site.ts`, `src/data/legal.ts`, knowledge corpus, production-gates tests); Production worker entrypoint/guards; Production build wrapper; Dockerfiles; staging SMTP verify (Preview-gated); synthetic/production E2E ceremony scripts; Option B / Final Gate / O15–P04 / RELEASE-01 documentation; `.env.example` / runbook / checklist updates; `package.json` scripts |
| **EXCLUDED** | `WhatsApp Image 2026-08-27 at 7.53.17 PM.jpeg` (explicitly unrelated) |
| **UNRELATED (excluded for operator review)** | `docs/F4_HUMAN_GOVERNANCE_DECISION_WORKBOOK.md` (not Option B Production release scope; left untracked) |

Staged security scan: **no secret values**, no `.env` secrets, no private keys.

---

## 3. Option B domain verification (pre-deploy)

| Check | Result |
| --- | --- |
| Active `src/` references to `drvandana.trinetra.net` | **NONE** |
| `siteConfig.url` | `https://drvandana.trinetralab.net` |
| Historical docs may retain `trinetra.net` | **Intentional audit evidence** — not rewritten |

Note: Prior RELEASE-01 domain edit briefly introduced UTF-8 mojibake/`BOM` in knowledge files; files were restored from HEAD and domain alignment re-applied with correct UTF-8 before quality gate and commit.

---

## 4. Pre-commit quality gate

| Gate | Result |
| --- | --- |
| `npm test` | **378/378 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (2 pre-existing warnings; 0 errors) |
| `npm run build` | **PASS** |

---

## 5. Vercel Production deployment

| Item | Value |
| --- | --- |
| Project | `dr-vandana-website` |
| Project ID | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Mechanism | `vercel deploy --prod --yes --project prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c --scope trinetra-digital-lab` |
| Explicitly avoided | `drvandana-psychology` (local `.vercel` link points there — **not used**) |
| Deployment ID | `dpl_6wJipdAHXB13E8zASz7knrAjhiqL` |
| Deployment URL | `https://dr-vandana-website-59wafcn67-trinetra-digital-lab.vercel.app` |
| Inspector | `https://vercel.com/trinetra-digital-lab/dr-vandana-website/6wJipdAHXB13E8zASz7knrAjhiqL` |
| Target | `production` |
| Status | **READY** |
| Alias | `https://drvandana.trinetralab.net` |

DNS/domain not modified. No secret rotation. No new Vercel project.

---

## 6. Safety controls confirmed

| Control | State |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` (Vercel Production) | **Name absent** → application defaults **false** |
| `TWILIO_WHATSAPP_ENABLED` (Vercel Production) | **Name absent** → application defaults **false** |
| ACA Job env flags | Explicit `false` / `false` |
| Patient Dashboard | **NOT DEPLOYED** as a go-live feature phase (existing Option B patient routes remain registration-gated) |
| Migrations / DB writes by this task | **NONE** |
| Staging modifications | **NONE** |
| Email / WhatsApp / synthetic data creation during deploy | **NONE** |

`APP_BASE_URL` and `DATABASE_URL` are Production Secrets; CLI pull returns `[SENSITIVE]` placeholders — values not printed. Live canonical/privacy copy use `trinetralab.net`. Prior gates record DB host `pg-dr-vandana-prod.postgres.database.azure.com` / `dr_vandana_db` / `sslmode=require`.

---

## 7. Worker (unchanged architecture)

| Item | Value |
| --- | --- |
| ACA Job | `caj-drv-notif-prod` |
| Schedule | `*/5 * * * *` |
| Parallelism | `1` |
| `NODE_ENV` | `production` |
| Profile | `production-hosted-v1` |
| Command (image) | `CMD ["npm", "run", "notifications:process:production"]` |
| Image tag observed | `production-7974175` (not rebuilt this task — per authorization) |
| Recent executions | Succeeded on 5-minute cadence (including around deploy window) |
| Manual trigger this task | **NONE** |

---

## 8. Conditions / residual notes

1. Vercel Production `DATABASE_URL` / `APP_BASE_URL` **values** remain operator-attested (secret pull blocked).  
2. ACA worker image tag still `production-7974175` — rebuild not in scope.  
3. `/services` is **not** an application route (**404**); public services content lives under `/areas-of-support` (**200**).  
4. Untracked leftovers remain: JPEG + F4 workbook (operator decision).  
5. Open Final Gate conditions (mailbox receipt, restore drill, Azure firewall special-case) unchanged — not deploy blockers while registration is false.

---

## 9. Related artifacts

- Verification: `docs/O_B_DEPLOY_01_POST_DEPLOYMENT_VERIFICATION.md`  
- Rollback: `docs/O_B_DEPLOY_01_ROLLBACK_RECORD.md`

```text
FINAL DECISION = PRODUCTION LIVE
NEXT PHASE = PATIENT DASHBOARD — SEPARATE DEVELOPMENT / TESTING PHASE
DO NOT ENABLE PATIENT REGISTRATION
DO NOT ENABLE WHATSAPP
```

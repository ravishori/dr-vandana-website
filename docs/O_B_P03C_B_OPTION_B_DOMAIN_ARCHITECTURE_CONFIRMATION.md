# O-B-P03C-B Option B Domain Architecture Confirmation

**Document type:** Operator-approved Production domain architecture (Option B)  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Companions:**  
- `docs/O_B_P03C_B_OPTION_B_DOMAIN_ARCHITECTURE_CONFIRMATION_REPORT.md`  
- `docs/O_B_P03C_B_VERCEL_PROJECT_ALIGNMENT_REPORT.md`

```text
OPTION B SELECTED BY OPERATOR
PREFERRED PUBLIC PRODUCTION DOMAIN = https://drvandana.trinetralab.net/
NO DNS / VERCEL / DEPLOY / DB / CODE CHANGES IN THIS TASK
```

---

## 1. Operator decision (locked)

| Item | Value |
| --- | --- |
| Selected option | **OPTION B — KEEP trinetralab.net** |
| Authoritative public hostname | **`https://drvandana.trinetralab.net/`** |
| Rejected for public Production | `drvandana.trinetra.net` (not selected; do not repair/transfer in this task) |

This document **does not reopen** domain selection.

---

## 2. Option B architecture (as confirmed)

```text
PUBLIC PRODUCTION DOMAIN
        ↓
https://drvandana.trinetralab.net/
        ↓
Vercel project serving this hostname (evidence)
        ↓
dr-vandana-website  (prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c)
        ↓
Dr. Vandana Rajiv Chaudhary psychology website (public Next.js site)
```

**Preserved:** existing working custom domain and DNS (CNAME → Vercel). **No transfer** to `drvandana-psychology` in this task.

---

## 3. Domain matrix

| Domain | Selected? | DNS | HTTPS | TLS | Vercel Project | Role | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`drvandana.trinetralab.net`** | **YES** | CNAME → Vercel | **200** | TLS OK | **`dr-vandana-website`** | **Public Production hostname (Option B)** | **WORKING — PRESERVE** |
| **`trinetralab.net`** (apex) | Parent zone | Cloudflare NS; apex on other projects | Not probed as app host | — | `trinetra-digital-lab`, `dr-vandana-website` (subdomain) | Parent domain | Active; **no DNS change** |
| **`drvandana.trinetra.net`** | **NO** | Afternic/parking | Timeout | N/A | `drvandana-psychology` (metadata claim) | **NOT AUTHORITATIVE FOR OPTION B** | Broken; **do not repair** |
| **`trinetra.net`** (apex) | **NO** | Afternic NS | Not verified | N/A | Registered; misconfigured | Legacy / unused for Option B | **NOT SELECTED** |

---

## 4. Project matrix

| Vercel Project | Current Role (evidence) | Domain | Production URL | Status | Action |
| --- | --- | --- | --- | --- | --- |
| **`dr-vandana-website`** | **Current public website Production** — serves Option B hostname | `drvandana.trinetralab.net` | Latest deploy ~16m; `…ddw899sd3…vercel.app` | **LIVE** | **Preserve** — do not delete/modify |
| **`drvandana-psychology`** | **Parallel / infra-oriented project** — Option B secrets partially configured; **does not serve** public hostname | Metadata: `drvandana.trinetra.net` (broken) | Latest deploy ~22d stale | **NOT public SoT for Option B** | **Do not delete** — **VERCEL PROJECT ALIGNMENT REQUIRES OPERATOR DECISION** for PMS infra SoT |

---

## 5. `APP_BASE_URL`

| Project | Expected (Option B) | Observed | Change in P03C-B |
| --- | --- | --- | --- |
| `drvandana-psychology` Production | `https://drvandana.trinetralab.net` | **CONFIGURED** (readable Config) | **NONE** (already correct) |
| `dr-vandana-website` Production | Same | Name present (Secret type) — value not pulled | **NONE** |
| Repository runtime | Via `APP_BASE_URL` env | Identity flows use env; fallback `siteConfig.url` still **`trinetra.net`** | **No code change** — document mismatch for future authorized alignment |

---

## 6. Authentication / link safety (document only)

| Flow | Uses | Risk if domain/project split |
| --- | --- | --- |
| Email verification | `APP_BASE_URL` + token path | Links must target **`drvandana.trinetralab.net`** on the project that runs identity code |
| Password reset | same | same |
| Session cookies | request host | Host must match deployed app origin |
| SEO (sitemap/robots/OG) | `siteConfig.url` (repo) | **Mismatch** until repo updated in authorized task |

---

## 7. Boundaries preserved

| Item | Status |
| --- | --- |
| DNS / MX / SPF / DKIM / DMARC | UNCHANGED |
| Vercel projects / domains | UNCHANGED |
| Deploy | NOT TRIGGERED |
| `pg-dr-vandana-prod` | UNCHANGED (0/27 tables) |
| Worker | NOT PROVISIONED |
| Registration / WhatsApp | Remain `false` on psychology Production config |
| Git commit / push | NONE |

---

## 8. Remaining question (not domain selection)

**Which Vercel project is the Production SoT for Option B PMS infrastructure** (DATABASE_URL, session/MFA secrets, future deploy target) given the **public site** already lives on **`dr-vandana-website`**?

Operator decision required in a **future** controlled task — **not** resolved by moving the public domain to `drvandana-psychology`.

---

## 9. Next controlled task

**O-B-P03D — Production Database Schema & Migration Readiness** — do not start automatically.

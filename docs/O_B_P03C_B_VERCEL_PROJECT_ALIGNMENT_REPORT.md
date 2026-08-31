# O-B-P03C-B Vercel Project Alignment Report

**Document type:** Vercel project role / alignment (Option B)  
**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Operator decision:** OPTION B — **`https://drvandana.trinetralab.net/`**

```text
NO PROJECT OR DOMAIN MODIFICATIONS
NO SECRET VALUES
```

---

## 1. Project inventory

### Project A — `dr-vandana-website`

| Field | Value |
| --- | --- |
| Name | `dr-vandana-website` |
| ID | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Owner | Trinetra Digital Lab |
| Framework | Next.js 24.x |
| Root directory | `.` |
| Latest Production URL (Vercel) | **`https://drvandana.trinetralab.net`** |
| Latest Production deployment | ~16m — `https://dr-vandana-website-ddw899sd3-trinetra-digital-lab.vercel.app` |
| Custom domain (Vercel) | **`drvandana.trinetralab.net`** on `trinetralab.net` zone |
| Git (local link) | Not the linked `.vercel/project.json` in this workspace |

**Production env names (no values):** `DATABASE_URL`, `AUTH_SESSION_SECRET`, `APP_BASE_URL` (Secret types)

**Preview env names (subset):** `DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `APP_BASE_URL` (Config), flags `false`, staging-oriented

**Role (Option B):** **Current public website Production** — hostname terminates here.

---

### Project B — `drvandana-psychology`

| Field | Value |
| --- | --- |
| Name | `drvandana-psychology` |
| ID | `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV` |
| Owner | Trinetra Digital Lab |
| Framework | Next.js 24.x |
| Root directory | `.` |
| Latest Production URL (Vercel metadata) | `https://drvandana.trinetra.net` (**broken DNS**) |
| Latest Production deployment | ~22d stale |
| Custom domain claim | `trinetra.net` zone — **misconfigured** |
| Git (local link) | **This repo workspace links here** (`.vercel/project.json`) |

**Production env names (no values):** `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `APP_BASE_URL` (Config), `EMAIL_PROVIDER`, flags `false`, SMTP/Upstash legacy names — **`DATABASE_URL` name ABSENT**

**Role (Option B):** **Parallel / infra-oriented** — prior O-B-P01–P03A secret configuration target; **does not serve** public Option B hostname. Full purpose: **PROJECT PURPOSE NOT FULLY ESTABLISHED** beyond partial PMS config holder.

---

## 2. Alignment assessment

| Question | Answer |
| --- | --- |
| Which project serves `drvandana.trinetralab.net`? | **`dr-vandana-website`** |
| Is that a defect under Option B? | **NO** — operator selected preserving working domain |
| Should domain move to `drvandana-psychology`? | **NO** — explicitly forbidden without future authorization |
| Public Production SoT (website) | **`dr-vandana-website`** (evidence: domain + HTTPS + fresh deploy) |
| PMS infra Production SoT (secrets/deploy) | **AMBIGUOUS** — secrets split; local CLI linked to psychology |

---

## 3. `APP_BASE_URL` alignment

| Project | Value (safe) | Match Option B? |
| --- | --- | --- |
| `drvandana-psychology` Production | `https://drvandana.trinetralab.net` | **YES** — unchanged |
| `dr-vandana-website` Production | Present (Secret) — not pulled | **Assumed aligned** (site live on same host) |

---

## 4. Operator actions (future — not executed)

1. **Declare Production SoT** for Option B PMS: either consolidate infra secrets onto **`dr-vandana-website`** (same project as public site) **or** document **`drvandana-psychology`** as infra-only with **no public domain** (never deploy public traffic there without domain attach authorization).  
2. Add **`DATABASE_URL`** to the chosen SoT Vercel Production environment (from KV — operator Portal only).  
3. Align repository **`siteConfig.url`** to `trinetralab.net` in an **authorized code task** (not P03C-B).  
4. Leave **`drvandana.trinetra.net`** unrepaired unless operator reverses Option B (not expected).

---

## 5. Actions taken in P03C-B

| Action | Result |
| --- | --- |
| Delete/transfer domain | **NOT DONE** |
| Modify either project | **NOT DONE** |
| Change DNS | **NOT DONE** |
| Deploy | **NOT DONE** |

---

## 6. Project matrix (summary)

| Vercel Project | Current Role | Domain | Production URL | Status | Action |
| --- | --- | --- | --- | --- | --- |
| `dr-vandana-website` | Public website Production (Option B) | `drvandana.trinetralab.net` | Live + recent deploy | **PASS** | Preserve |
| `drvandana-psychology` | Parallel / partial PMS config | Broken `trinetra.net` claim | Stale | **PASS WITH CONDITIONS** | Operator SoT decision; no deletion |

**PROJECT ALIGNMENT: PASS WITH CONDITIONS — VERCEL PROJECT ALIGNMENT REQUIRES OPERATOR DECISION**

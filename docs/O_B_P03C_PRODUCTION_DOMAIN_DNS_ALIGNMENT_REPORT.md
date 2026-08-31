# O-B-P03C Production Domain / DNS Alignment Report

**Document type:** Controlled domain alignment verification report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-P03C DECISION = DOMAIN ALIGNMENT REQUIRES OPERATOR ACTION
DOMAIN MUTATION = NONE
VERCEL CHANGES = NONE
DNS CHANGES = NONE
APP_BASE_URL CHANGES = NONE
SECRET LEAKAGE = NONE DETECTED
```

---

## 1. Executive summary

Inspection confirms a **cross-project domain conflict**: the live hostname **`drvandana.trinetralab.net`** (HTTPS 200, Vercel) is attached to **`dr-vandana-website`**, while the Production SoT project **`drvandana-psychology`** claims **`drvandana.trinetra.net`** with **broken DNS** (Afternic parking; HTTPS timeout). Production **`APP_BASE_URL`** is set to **`https://drvandana.trinetralab.net`** on `drvandana-psychology` but that hostname **does not terminate on that project**. No DNS, Vercel domain, or `APP_BASE_URL` changes were made. **Authoritative Production domain is NOT VERIFIED.**

---

## 2. Baseline

| Check | Result |
| --- | --- |
| HEAD | `7974175` |
| Application code | UNCHANGED |
| Commit / push | NONE |

---

## 3. Required report sections

### A. VERCEL PROJECT VERIFIED

| Item | Result |
| --- | --- |
| Project name | `drvandana-psychology` |
| Project ID | `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV` |
| Owner | Trinetra Digital Lab |
| Environment inspected | Production |
| Latest Production deploy | ~22 days old (no new deploy this task) |

### B. CURRENT PRODUCTION URL

Vercel **Latest Production URL** metadata: **`https://drvandana.trinetra.net`** (not reachable).

Effective live public URL for configured `APP_BASE_URL` host: **`https://drvandana.trinetralab.net`** (served by **`dr-vandana-website`**, not SoT project).

### C. CUSTOM DOMAINS

| Host / zone | Vercel registration | Project association | Verification |
| --- | --- | --- | --- |
| `drvandana.trinetralab.net` | Under `trinetralab.net` | **`dr-vandana-website`** | DNS resolves (CNAME); HTTPS works |
| `drvandana.trinetra.net` | Under `trinetra.net` | Claimed by psychology metadata | **Misconfigured** — Vercel warns NS/DNS |
| `trinetralab.net` | Team domain | `dr-vandana-website` + `trinetra-digital-lab` | Cloudflare NS ≠ Vercel intended NS |
| `trinetra.net` | Team domain | Registered; broken | Afternic NS; parking A records |

### D. DNS RESULTS

| Hostname | Record types observed | Result |
| --- | --- | --- |
| `drvandana.trinetralab.net` | CNAME → Vercel DNS | **PASS** |
| `drvandana.trinetra.net` | A → parking; NS Afternic | **FAIL** |
| `trinetralab.net` | A/AAAA Cloudflare | Apex active; not Production app host |
| `trinetra.net` | A → parking; NS Afternic | **FAIL** vs Vercel |

### E. SSL/TLS RESULTS

| Hostname | HTTPS | TLS / cert | Result |
| --- | --- | --- | --- |
| `drvandana.trinetralab.net` | 200 OK | TLS session established; HSTS | **PASS** |
| `drvandana.trinetra.net` | Timeout | Not established | **FAIL / NOT VERIFIED** |

### F. DOMAIN MATRIX

Documented in **`docs/O_B_P03C_PRODUCTION_DOMAIN_MATRIX.md`**.

### G. AUTHORITATIVE PRODUCTION DOMAIN

**NOT VERIFIED** — **OPERATOR DECISION REQUIRED**

Neither candidate satisfies all authoritative criteria on **`drvandana-psychology`**.

### H. APP_BASE_URL STATUS

| Item | Result |
| --- | --- |
| Value | `https://drvandana.trinetralab.net` (not secret) |
| Outcome | **C — DOMAIN AMBIGUOUS — OPERATOR DECISION REQUIRED** |
| Correct for SoT project today? | **NO** — hostname served by different project |
| Changed in O-B-P03C | **NO** |

### I. DOMAIN CONFLICTS

```text
DOMAIN CURRENTLY ASSOCIATED WITH DIFFERENT PROJECT
```

- **`drvandana.trinetralab.net`** → **`dr-vandana-website`**  
- **`drvandana-psychology`** → claims **`drvandana.trinetra.net`** (broken) but **`APP_BASE_URL`** points at lab host  

Repository **`siteConfig`** still defaults to **`https://drvandana.trinetra.net`** (`src/config/site.ts`) — third mismatch vector for SEO/metadata vs env.

### J. OPERATOR ACTION REQUIRED

1. **Choose one Production hostname** (Path A lab vs Path B trinetra — see architecture doc).  
2. **Attach chosen host to `drvandana-psychology`** in Vercel (do not remove from other project without explicit plan).  
3. **DNS:** For `trinetra.net` path — at registrar/DNS provider set `A drvandana.trinetra.net 76.76.21.21` or delegate NS to Vercel; regain control from Afternic parking.  
4. **Prove HTTPS** on chosen host attached to psychology project.  
5. **Align `APP_BASE_URL`** and (when authorized) repo `siteConfig` to the same origin.  
6. **Clarify project split:** purpose of **`dr-vandana-website`** vs **`drvandana-psychology`**.

### K. DNS CHANGES MADE

**NONE**

### L. DNS CHANGES NOT MADE

All DNS — documented only (Afternic/Cloudflare/Vercel records unchanged).

### M. PRODUCTION CHANGES

**NONE** (no deploy, no env mutation, no domain transfer).

### N. STAGING CHANGES

**NONE** — `dr-vandana-website` Preview not modified.

---

## 4. Safety flags (verified, not changed)

| Flag | Expected | Result |
| --- | --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` | Verified on Production config |
| `TWILIO_WHATSAPP_ENABLED` | `false` | Verified on Production config |

---

## 5. Boundaries

| Item | Result |
| --- | --- |
| Production database | UNCHANGED |
| Migrations | NOT RUN |
| Worker | NOT PROVISIONED |
| Email / OTP / WhatsApp | NOT SENT |
| `dr-vandana-website` | NOT MODIFIED |

---

## 6. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **CRITICAL** | `APP_BASE_URL` on SoT project points to hostname owned by **`dr-vandana-website`** — auth/email link risk when identity flows go live |
| S2 | **HIGH** | Claimed Production URL `drvandana.trinetra.net` has broken DNS (Afternic parking) |
| S3 | **HIGH** | Triple mismatch: Vercel psychology URL vs `APP_BASE_URL` vs repo `siteConfig` |
| S4 | MEDIUM | Psychology Production deploy stale (~22d) vs active lab project deploy |
| S5 | MEDIUM | Apex `trinetra.net` / `trinetralab.net` NS not delegated to Vercel (subdomain CNAME still works for lab) |
| S6 | INFORMATIONAL | `trinetralab.net` HTTPS/HSTS functional on Vercel edge |
| — | — | No secret leakage; no destructive domain actions |

**SECURITY REVIEW: FAIL (domain alignment)** with **PASS** on safety boundaries (no mutation, no messaging).

---

## 7. Independent review (§25)

| # | Check | Result |
| --- | --- | --- |
| 1–2 | Correct project / Production env | YES |
| 3–6 | Authoritative domain / DNS / HTTPS / TLS | **FAIL** for SoT |
| 7 | `APP_BASE_URL` | Present but **misaligned** |
| 8 | Domain/project alignment | **FAIL** |
| 9–10 | Unrelated project / staging | NOT MODIFIED |
| 11–12 | Registration / WhatsApp false | YES |
| 13–16 | No deploy / DB / worker / messages | YES |
| 17 | No secrets exposed | YES |

**INDEPENDENT REVIEW: FAIL (domain); PASS (safety boundaries)**

---

## 8. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |

---

## 9. Decision

**DOMAIN ALIGNMENT REQUIRES OPERATOR ACTION**

Not **DOMAIN VERIFIED — READY FOR O-B-P04** — authoritative hostname on **`drvandana-psychology`** is not established.

**Next:** **OPERATOR DOMAIN/DNS ACTION REQUIRED** — then **O-B-P03D — Production Database Schema & Migration Readiness**. **DO NOT START AUTOMATICALLY.**

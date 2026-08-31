# O-B-P03C-B Option B Domain Architecture Confirmation Report

**Document type:** Controlled Option B domain architecture confirmation  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
OPTION B SELECTED BY OPERATOR
PREFERRED PUBLIC PRODUCTION DOMAIN = https://drvandana.trinetralab.net/
O-B-P03C-B DECISION = OPTION B CONFIRMED — READY WITH CONDITIONS
VERCEL PROJECT ALIGNMENT REQUIRES OPERATOR DECISION
NO DESTRUCTIVE CHANGES
SECRET LEAKAGE = NONE DETECTED
```

---

## 1. Executive summary

The operator **formally selected OPTION B — KEEP trinetralab.net** with authoritative public hostname **`https://drvandana.trinetralab.net/`**. Read-only verification confirms this hostname is **live** (HTTPS 200, Vercel, HSTS), DNS resolves via **CNAME to Vercel**, and terminates on Vercel project **`dr-vandana-website`** — which matches the operator’s requirement to **preserve the working domain** without transferring it to **`drvandana-psychology`**.

**`drvandana.trinetra.net`** remains **NOT SELECTED**, broken (HTTPS timeout), and was **not repaired**. No DNS, Vercel, deploy, database, or application changes were made.

Remaining gap: **which Vercel project is Production SoT for Option B PMS infrastructure** (secrets/deploy) while the **public site** clearly runs on **`dr-vandana-website`**.

---

## 2. Baseline

| Check | Result |
| --- | --- |
| HEAD | `7974175` |
| Application code | UNCHANGED |
| Commit / push | NONE |

---

## 3. Option B confirmation

```text
OPTION B SELECTED BY OPERATOR
PREFERRED PUBLIC PRODUCTION DOMAIN:
    https://drvandana.trinetralab.net/
```

Domain selection is **closed**. This task documents alignment only.

---

## 4. Primary domain verification

| Check | Result |
| --- | --- |
| URL | `https://drvandana.trinetralab.net/` |
| HTTP status | **200 OK** |
| Server | Vercel |
| HSTS | Present |
| Final hostname | `drvandana.trinetralab.net` (no redirect away) |
| Forms / auth / data | **NOT exercised** |

---

## 5. DNS / HTTPS / TLS

| Host | DNS | HTTPS | TLS |
| --- | --- | --- | --- |
| **`drvandana.trinetralab.net`** | CNAME → `4fd2820dccf3e8b6.vercel-dns-017.com` | **PASS** | **PASS** (TLS session on probe) |
| **`drvandana.trinetra.net`** | Parking / Afternic | **FAIL** (timeout) | **NOT VERIFIED** |
| **`trinetralab.net`** apex | Cloudflare NS | Not app canonical | — |
| **`trinetra.net`** apex | Afternic NS | Not selected | — |

**DNS changes:** **NONE**  
**Email DNS (MX/SPF/DKIM/DMARC):** **UNCHANGED**

---

## 6. Vercel project serving domain

| Item | Result |
| --- | --- |
| **Project serving Option B hostname** | **`dr-vandana-website`** (`prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c`) |
| Evidence | Vercel `trinetralab.net` domain list; Latest Production URL; HTTPS 200; deploy `…ddw899sd3…` |
| **`drvandana-psychology`** | Does **not** serve `trinetralab.net`; stale deploy; broken `trinetra.net` metadata |

---

## 7. Project relationship

| Project | Classification | Notes |
| --- | --- | --- |
| **`dr-vandana-website`** | **Current public website Production (Option B)** | Working custom domain; recent Production deploy |
| **`drvandana-psychology`** | **Parallel / infra-oriented (E partial + B)** | O-B-P01–P03A secret target; local `.vercel` link; **PROJECT PURPOSE NOT FULLY ESTABLISHED** beyond partial PMS config |

**Not treated as defect:** lab hostname on `dr-vandana-website` per operator Option B.

---

## 8. `APP_BASE_URL`

| Location | Value | Status | Modified? |
| --- | --- | --- | --- |
| `drvandana-psychology` Production | `https://drvandana.trinetralab.net` | **CORRECT** | **NO** |
| `dr-vandana-website` Production | Name present (Secret) | **PRESENT — value not pulled** | **NO** |
| Repository `siteConfig.url` | `https://drvandana.trinetra.net` | **CONFLICTING** with Option B (SEO/metadata) | **NO code change** — future authorized task |

Identity runtime uses **`APP_BASE_URL` env** for verification/reset links (`email-service.ts`, `config.ts`).

---

## 9. `trinetra.net` (not selected)

Documented as **NOT AUTHORITATIVE FOR OPTION B**. Not repaired, not transferred, DNS unchanged.

---

## 10. Production flags (psychology Production — readable)

| Flag | Value |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |

Not enabled. Not modified.

---

## 11. Database / worker

| Item | Status |
| --- | --- |
| `pg-dr-vandana-prod` | UNCHANGED — 0/27 tables; migrations required (O-B-P03B) |
| Worker | NOT PROVISIONED |
| Messages | NOT SENT |

---

## 12. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | MEDIUM | **Vercel project SoT split** — public site on `dr-vandana-website`; PMS secrets partially on `drvandana-psychology`; `DATABASE_URL` absent on psychology Vercel |
| S2 | MEDIUM | Repo **`siteConfig.url`** still `trinetra.net` — sitemap/robots/OG mismatch with Option B |
| S3 | LOW | Psychology Production deploy stale (~22d) vs active website project |
| S4 | INFORMATIONAL | Option B hostname HTTPS/HSTS OK; domain preserved |
| S5 | INFORMATIONAL | `trinetra.net` correctly excluded from Option B |
| — | — | No DNS/email DNS changes; no secret leakage |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 13. Independent review (§26)

| # | Check | Result |
| --- | --- | --- |
| 1 | Option B recorded | YES |
| 2 | trinetralab preserved | YES |
| 3–6 | No DNS/Vercel/project modifications | YES |
| 7 | `APP_BASE_URL` appropriate on psychology | YES |
| 8 | trinetra not selected | YES |
| 9–10 | HTTPS/TLS trinetralab | YES |
| 11–12 | Registration/WhatsApp false | YES |
| 13–15 | DB/worker/messages | UNCHANGED / none |
| 16 | No secrets exposed | YES |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 14. Changes summary

| Category | Result |
| --- | --- |
| DNS changes | **NONE** |
| Vercel changes | **NONE** |
| Production deployment | **NOT TRIGGERED** |
| Staging | **UNCHANGED** |

---

## 15. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |

---

## 16. Decision

**OPTION B CONFIRMED — READY WITH CONDITIONS**

Conditions (not domain selection):

1. **VERCEL PROJECT ALIGNMENT REQUIRES OPERATOR DECISION** — declare PMS Production SoT vs public site on `dr-vandana-website`.  
2. **`DATABASE_URL`** on chosen Vercel Production (still absent on psychology).  
3. Repository **`siteConfig`** alignment to `trinetralab.net` — separate authorized code task.  
4. **O-B-P03D** — schema/migration readiness still required on database.

**Next controlled task:** **O-B-P03D — Production Database Schema & Migration Readiness** — **DO NOT START AUTOMATICALLY.**

---

## 17. Related documents

- `docs/O_B_P03C_B_OPTION_B_DOMAIN_ARCHITECTURE_CONFIRMATION.md`  
- `docs/O_B_P03C_B_VERCEL_PROJECT_ALIGNMENT_REPORT.md`  
- Prior: `docs/O_B_P03C_PRODUCTION_DOMAIN_DNS_ALIGNMENT_REPORT.md`

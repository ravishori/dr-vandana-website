# O-B-P03C Production Domain / DNS Alignment

**Document type:** Architecture / procedure for Production domain authority  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Companions:**  
- `docs/O_B_P03C_PRODUCTION_DOMAIN_DNS_ALIGNMENT_REPORT.md`  
- `docs/O_B_P03C_PRODUCTION_DOMAIN_MATRIX.md`

```text
AUTHORITATIVE PRODUCTION DOMAIN = NOT CONclusively VERIFIED FOR drvandana-psychology
DOMAIN MUTATION IN O-B-P03C = NONE
```

---

## 1. Purpose

Determine the **authoritative Production domain** for Vercel project **`drvandana-psychology`**, verify DNS/HTTPS/TLS, assess **`APP_BASE_URL`**, and document operator actions. Do **not** guess or mutate DNS/Vercel/domains without unambiguous evidence.

---

## 2. Authoritative domain criteria (all required)

A hostname may be declared **AUTHORITATIVE PRODUCTION DOMAIN** only if:

1. Organization ownership is established (operator decision).  
2. Attached to **`drvandana-psychology`**.  
3. Configured for **Production**.  
4. DNS resolves to Vercel (or approved origin).  
5. HTTPS/TLS works with valid certificate for that hostname.  
6. Not solely associated with **`dr-vandana-website`** without documented split.  
7. **`APP_BASE_URL`** can safely match it.  
8. No unresolved conflicting Production hostname.

**O-B-P03C result:** criteria **not met** for either candidate on the SoT project.

---

## 3. Candidate summary

| Hostname | Live? | On `drvandana-psychology`? | Verdict |
| --- | --- | --- | --- |
| `drvandana.trinetralab.net` | YES (HTTPS 200) | **NO** — on `dr-vandana-website` | Cannot be authoritative for SoT without operator transfer/attach |
| `drvandana.trinetra.net` | NO (timeout / parking) | Claimed in project metadata | Cannot be authoritative until DNS repaired |

---

## 4. `APP_BASE_URL` policy

| Rule | Detail |
| --- | --- |
| Current Production value | `https://drvandana.trinetralab.net` |
| Auto-change in O-B-P03C | **FORBIDDEN** (ambiguous) |
| Outcome | **C — DOMAIN AMBIGUOUS — OPERATOR DECISION REQUIRED** |

Must not point to staging, Preview, broken DNS, or unrelated project origin once Production launches.

---

## 5. Authentication / link sensitivity

Repository uses **`APP_BASE_URL`** (and `siteConfig.url` fallback) for:

| Consumer | Risk if domain wrong |
| --- | --- |
| Email verification links (`/patient/verify-email?token=…`) | Tokens open wrong origin; verification fails or lands on wrong deploy |
| Password reset links (`/patient/reset-password?token=…`) | Same |
| Registration / identity flows | Broken redirects; possible session cookie scope mismatch |
| Sitemap / robots / Open Graph / JSON-LD | SEO and social previews point at wrong host |
| Question portal dashboard links | Staff links misrouted |

Domain alignment is **security-sensitive** even when registration is disabled (links may still be generated in future authorized phases).

---

## 6. Operator decision paths (document only — not executed)

**Path A — Lab hostname as Production:**  
Attach `drvandana.trinetralab.net` to **`drvandana-psychology`** (operator action in Vercel + DNS if needed). Keep `APP_BASE_URL=https://drvandana.trinetralab.net`. Clarify role of **`dr-vandana-website`**.

**Path B — Trinetra hostname as Production:**  
At Afternic/registrar DNS: set `A drvandana.trinetra.net 76.76.21.21` (per Vercel) or delegate NS to Vercel. Prove HTTPS. Set `APP_BASE_URL=https://drvandana.trinetra.net`. Align repo `siteConfig`.

Do **not** remove `drvandana.trinetralab.net` from `dr-vandana-website` without explicit operator authorization.

---

## 7. Boundaries preserved

| Boundary | Status |
| --- | --- |
| Staging / Preview (`dr-vandana-website`) | UNCHANGED |
| Production database | UNCHANGED (0/27 tables per O-B-P03B) |
| Production worker | NOT PROVISIONED |
| Registration / WhatsApp flags | Remain `false` |
| Deploy | NOT TRIGGERED |
| Git commit / push | NONE |

---

## 8. Next controlled task

If domain remains unresolved: **OPERATOR DOMAIN/DNS ACTION REQUIRED** before O-B-P04.

If domain resolved in a future task: **O-B-P03D — Production Database Schema & Migration Readiness**.

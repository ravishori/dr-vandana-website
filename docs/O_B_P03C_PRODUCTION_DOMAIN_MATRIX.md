# O-B-P03C Production Domain Matrix

**Document type:** Domain / DNS / Vercel / TLS evidence matrix  
**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Production Vercel SoT:** `drvandana-psychology` (`prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV`)

```text
NO SECRETS
NO DNS CHANGES IN THIS TASK
```

---

## Domain matrix

| Domain | DNS | Vercel Project | Vercel Environment | SSL/TLS | HTTP/HTTPS | Intended Use | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`drvandana.trinetralab.net`** | CNAME → `4fd2820dccf3e8b6.vercel-dns-017.com` → Vercel A | **`dr-vandana-website`** (Vercel apex `trinetralab.net` project list) | Production (that project’s Latest Production URL) | HTTPS **200**; HSTS present; Vercel edge | **PASS** — `HTTP/1.1 200`, `Server: Vercel` | Live public site; O-B-P03 `APP_BASE_URL` target | **LIVE — WRONG PROJECT for SoT** |
| **`drvandana.trinetra.net`** | A → `13.248.169.48`, `76.223.54.146` (Afternic/parking); NS `afternic.com` | **`drvandana-psychology`** (Latest Production URL claim) | Production (claimed) | **NOT VERIFIED** — connection timeout | **FAIL** — HTTPS/HTTP timeout | Historical / repo `siteConfig` default | **BROKEN / MISCONFIGURED** |
| **`trinetralab.net`** (apex) | A → Cloudflare (`104.21.15.86`, `172.67.161.252`); NS Cloudflare | Team domains: `trinetra-digital-lab`, **`dr-vandana-website`** (subdomain) | Mixed | Apex not probed as Production host | Not used as app canonical in env | Parent zone for lab subdomain | **ACTIVE (Cloudflare)**; Vercel NS mismatch |
| **`trinetra.net`** (apex) | A → parking IPs; NS Afternic | Registered in Vercel team; **misconfigured** per Vercel warning | — | **NOT VERIFIED** | Not reachable as Production | Parent zone for psychology subdomain claim | **BROKEN vs Vercel**; operator DNS action required |

---

## Vercel nameserver warnings (non-destructive inspect)

| Zone | Vercel intended NS | Current NS | Vercel status |
| --- | --- | --- | --- |
| `trinetralab.net` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` | Cloudflare (`adelaide`, `sam`) | Subdomain works via **CNAME** despite apex NS mismatch |
| `trinetra.net` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` | Afternic (`ns1.afternic.com`, `ns2.afternic.com`) | **Misconfigured** — Vercel recommends `A drvandana.trinetra.net 76.76.21.21` or NS delegation |

---

## Project comparison

| Item | `drvandana-psychology` | `dr-vandana-website` |
| --- | --- | --- |
| Project ID | `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV` | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Latest Production URL | `https://drvandana.trinetra.net` | `https://drvandana.trinetralab.net` |
| Latest Production deploy age (inspect) | ~22 days | ~7 minutes |
| Custom domain attachment (Vercel) | `trinetra.net` zone (broken DNS) | `drvandana.trinetralab.net` on `trinetralab.net` zone |
| Modified in O-B-P03C | **NO** | **NO** |

---

## `APP_BASE_URL` (Production `drvandana-psychology`)

| Item | Value |
| --- | --- |
| Configured | `https://drvandana.trinetralab.net` |
| Host terminates on SoT project? | **NO** — terminates on `dr-vandana-website` |
| Changed in O-B-P03C | **NO** |

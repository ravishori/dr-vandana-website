# O-B-P03A Production Domain Alignment Report

**Document type:** Domain / DNS / Vercel attachment evidence  
**Date:** 2026-08-31  
**Baseline:** `7974175`  
**Vercel Production project (task SoT):** `drvandana-psychology`

```text
DOMAIN ALIGNMENT = REQUIRES OPERATOR ACTION
AUTHORITATIVE PRODUCTION DOMAIN = NOT UNIQUELY VERIFIED FOR drvandana-psychology
DNS CHANGES = NONE
DEPLOY = NOT TRIGGERED
```

---

## 1. Decision (section 18)

**DOMAIN ALIGNMENT REQUIRED** — configuration of a new authoritative hostname was **STOPPED**.

Neither candidate is both (a) correctly attached to `drvandana-psychology` and (b) live/healthy without conflict.

| Candidate | Attached to `drvandana-psychology`? | Live HTTPS | Verdict |
| --- | --- | --- | --- |
| `drvandana.trinetralab.net` | **No** — Vercel Latest Production URL for this hostname is project **`dr-vandana-website`** | **200** via Vercel | Live lab/site hostname; **not** proven owned by Production project SoT |
| `drvandana.trinetra.net` | Claimed as Latest Production URL for **`drvandana-psychology`** | **Timeout** / Afternic parking DNS | Broken DNS; not a working Production origin |

Per task rules: do **not** silently override; do **not** guess; do **not** change DNS/domains in this task.

---

## 2. Domain matrix

| Domain | Vercel project (Latest Production URL evidence) | Environment | DNS status | SSL / HTTPS | Intended purpose (claimed) | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| `drvandana.trinetralab.net` | **`dr-vandana-website`** | Production (that project) | CNAME → `*.vercel-dns-017.com` | HTTPS **200**, `Server: Vercel`, HSTS present | Operator-preferred live site / O-B-P03 `APP_BASE_URL` | **LIVE** on **non-SoT** project |
| `drvandana.trinetra.net` | **`drvandana-psychology`** | Production (claimed) | A → Afternic/parking IPs; NS `afternic.com` ≠ Vercel intended NS | HTTPS **connection timeout** | Historical / repo `siteConfig` default | **BROKEN** / parked |
| `trinetralab.net` (apex) | Team domain inventory | — | Third-party NS (Cloudflare) | — | Parent of lab subdomain | Present in Vercel team domains |
| `trinetra.net` (apex) | Team domain inventory | — | Third-party NS (Afternic) ≠ Vercel | — | Parent of psychology subdomain claim | Misconfigured vs Vercel |

---

## 3. Evidence sources

1. `vercel project ls` — Latest Production URLs per project  
2. `vercel domains inspect` — nameserver mismatch warnings  
3. DNS resolution (`Resolve-DnsName`)  
4. `curl -sSI` HTTPS probes  
5. Repository `src/config/site.ts` still defaults to `https://drvandana.trinetra.net` on this branch  
6. Prior O-B-P03 operator confirmation set Vercel `APP_BASE_URL=https://drvandana.trinetralab.net` on `drvandana-psychology`  
7. Workspace rule / older docs reference `drvandana.trinetra.net`

---

## 4. `APP_BASE_URL` status

| Item | Status |
| --- | --- |
| Vercel Production `drvandana-psychology` | **CONFIGURED** `https://drvandana.trinetralab.net` (O-B-P03; verified readable Config) |
| Matches authoritative hostname on SoT project? | **NO** — hostname serves from `dr-vandana-website` |
| Changed in O-B-P03A? | **NO** (domain STOP) |

**Implication:** Cookie / email link base URL may disagree with which Vercel project actually terminates TLS for that hostname until operator realigns projects/DNS.

---

## 5. Operator actions (authorized separately)

Choose **one** Production hostname and attach it to **`drvandana-psychology`**:

**Option A (prefer live hostname):** Move/attach `drvandana.trinetralab.net` to `drvandana-psychology` (or merge projects), keep `APP_BASE_URL=https://drvandana.trinetralab.net`, update repo `siteConfig` when authorized.

**Option B (prefer psychology project claim):** Repair DNS for `drvandana.trinetra.net` to Vercel, prove HTTPS, then set `APP_BASE_URL=https://drvandana.trinetra.net` and stop using lab hostname for Production.

Do **not** leave both projects claiming different “Production” public hosts without a documented split of purpose.

---

## 6. Safety

| Action | Done? |
| --- | --- |
| DNS record changes | NO |
| Domain remove/delete | NO |
| Redirect creation | NO |
| Preview/Staging project env changes | NO |
| Production deployment | NO |

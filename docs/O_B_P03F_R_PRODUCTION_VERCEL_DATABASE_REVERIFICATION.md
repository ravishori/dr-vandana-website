# O-B-P03F-R Production Vercel Database Reverification

**Document type:** Vercel / DATABASE_URL configuration verification architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
OPTION B — KEEP trinetralab.net
NO DOMAIN CHANGES
NO PRODUCTION DEPLOY IN P03F-R
```

---

## 1. Authoritative architecture

```text
https://drvandana.trinetralab.net/
            ↓
    dr-vandana-website (prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c)
            ↓
    Public Production website deployment
```

**Parallel (not public):** `drvandana-psychology` (`prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV`) — partial PMS infra secrets; **does not serve** the Option B hostname.

---

## 2. Production database (authoritative)

| Item | Value |
| --- | --- |
| Server | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| Port | 5432 |
| PG | 17 |
| KV | `kv-dr-vandana-prod` |
| Secret | `production-app-database-url` |

---

## 3. Secret architecture

**Model B — independent configuration**

- Key Vault holds authoritative Production secrets (operator-managed).
- Vercel Production env vars are set **separately** (no automated KV→Vercel sync in repo).
- Exact KV↔Vercel byte parity **cannot be proven** without exposing secrets.
- Safe metadata comparison uses hostname/database/sslmode only where readable.

---

## 4. P03F-R findings (summary)

| Gate | Result |
| --- | --- |
| KV `production-app-database-url` | **PRESENT**, enabled |
| KV target metadata | `pg-dr-vandana-prod` / `dr_vandana_db` — **PASS** |
| KV `sslmode=require` | **NOT VERIFIED** (absent in URL) |
| Vercel `DATABASE_URL` on **dr-vandana-website** | **PRESENT** (Secret) |
| Vercel `DATABASE_URL` on **drvandana-psychology** | **MISSING** (expected for non-deploy project) |
| Vercel target parity | **NOT VERIFIED** (Production secret not readable via CLI) |
| KV vs Vercel age | KV updated **2026-08-31**; Vercel env **~2d ago** — **sync likely required** |
| Production DB schema (read-only) | **27/27 PASS** |
| Build (O-B-BUILD-01) | **PASS** |

---

## 5. Operator actions (not executed in P03F-R)

1. Copy current `production-app-database-url` from KV into Vercel Production on **`dr-vandana-website`** (never paste into docs/chat).  
2. Append `?sslmode=require` (or `&sslmode=require`) to both KV and Vercel values.  
3. **Redeploy** `dr-vandana-website` Production after env update (separate authorized deploy).  
4. Optional: add explicit `PATIENT_REGISTRATION_ENABLED=false` and `TWILIO_WHATSAPP_ENABLED=false` on public project for clarity.

---

## 6. Project split rationale

| Variable class | dr-vandana-website (public) | drvandana-psychology (infra) |
| --- | --- | --- |
| `DATABASE_URL` | **Required** for identity/DB routes | Not required until that project deploys |
| `AUTH_SESSION_SECRET` | **Required** | Duplicate OK |
| `MFA_ENCRYPTION_KEY` | Required when MFA routes used | Present |
| SMTP / EMAIL | Required for mail from public deploy | Present (legacy names) |
| Feature flags | Default false if absent | Explicit false |

Do **not** duplicate secrets to psychology merely for symmetry.

---

## 7. Boundaries

No migrations, deploy, DNS, worker, messaging, or secret exposure in P03F-R.

---

## 8. Next task

After operator sync + controlled deploy: **O-B-P04 — Production Worker Provisioning & Verification** (do not start automatically).

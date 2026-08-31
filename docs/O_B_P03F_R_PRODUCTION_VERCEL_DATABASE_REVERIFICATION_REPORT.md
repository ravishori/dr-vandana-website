# O-B-P03F-R Production Vercel Database Reverification Report

**Document type:** Release gate reverification report  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
O-B-P03F-R DECISION = READY WITH CONDITIONS
SECRET LEAKAGE = NONE DETECTED
PRODUCTION DEPLOY = NOT TRIGGERED
```

---

## 1. Executive summary

P03F-R re-verified Option B architecture: **`dr-vandana-website`** serves **`https://drvandana.trinetralab.net/`**. Production **`DATABASE_URL` name is PRESENT** on that project (closing P03F “missing on deploy project”). **Target parity on Vercel cannot be safely proven** without exposing secrets; KV metadata confirms **`pg-dr-vandana-prod` / `dr_vandana_db`**. KV secret was **updated 2026-08-31** while Vercel env is **~2 days old** — **operator sync recommended**. **`sslmode=require`** not confirmed on KV. Production database **unchanged** (27/27 schema PASS). Build **PASS**.

---

## 2. P03F blocker status

| P03F finding | P03F-R result |
| --- | --- |
| `DATABASE_URL` missing on psychology | Still missing — **not blocking** (non-public project) |
| `DATABASE_URL` on public project | **PRESENT** on `dr-vandana-website` |
| Target parity unverified | **Still NOT VERIFIED** on Vercel side |
| Build FAIL | **RESOLVED** (O-B-BUILD-01) |

---

## 3. Key Vault

| Item | Result |
| --- | --- |
| Vault | `kv-dr-vandana-prod` |
| Secret | `production-app-database-url` |
| Status | **PRESENT**, enabled |
| Last updated | 2026-08-31T01:46:53+00:00 |
| Safe metadata | Host `pg-dr-vandana-prod.postgres.database.azure.com`, DB `dr_vandana_db`, port 5432 |
| `sslmode=require` | **(absent)** in URL metadata |

---

## 4. Vercel projects

### dr-vandana-website (authoritative)

| Item | Value |
| --- | --- |
| ID | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Domain | `drvandana.trinetralab.net` |
| `DATABASE_URL` | **PRESENT** (Secret, ~2d) |
| Deploy | Production Ready |

### drvandana-psychology (parallel)

| Item | Value |
| --- | --- |
| ID | `prj_yH7OSCdFCL9OKSDlEoO9gO9RtpNV` |
| Public Option B domain | **NO** |
| `DATABASE_URL` | **MISSING** |

---

## 5. DATABASE target parity

| Source | Host / DB | Result |
| --- | --- | --- |
| Key Vault (safe parse) | `pg-dr-vandana-prod` / `dr_vandana_db` | **PASS** |
| Vercel Production (public) | Not readable | **NOT VERIFIED** |
| Read-only DB connect (KV creds) | `dr_vandana_db`, PG 17.10, TLSv1.3 | **PASS** |
| KV ↔ Vercel byte equality | Not inspectable | **NOT PROVEN** |

---

## 6. SSL mode

| Location | Result |
| --- | --- |
| KV URL | `sslmode=require` **NOT VERIFIED** (absent) |
| Vercel URL | **NOT VERIFIED** |
| Runtime TLS (KV connect) | **PASS** with client `ssl: require` |

**Operator action:** append `sslmode=require` to KV and Vercel without weakening TLS.

---

## 7. Required variables (public deploy project)

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | **PRESENT** |
| `AUTH_SESSION_SECRET` | **PRESENT** |
| `APP_BASE_URL` | **PRESENT** |
| `MFA_ENCRYPTION_KEY` | **MISSING** (condition for MFA) |
| `EMAIL_PROVIDER` / SMTP | **MISSING** (condition for mail) |
| `PATIENT_REGISTRATION_ENABLED` | **MISSING** → default **false** |
| `TWILIO_WHATSAPP_ENABLED` | **MISSING** → default **false** |

---

## 8. Production database (read-only)

| Check | Result |
| --- | --- |
| Mutations in P03F-R | **NONE** |
| Tables | 27/27 |
| `verifyPracticeSchema` | **PASS** |
| Data | 0 rows |

---

## 9. Build / tests (P03F-R re-run)

| Suite | Result |
| --- | --- |
| Build | **PASS** |
| Typecheck | **PASS** |
| Lint | **PASS** (2 warnings) |
| Tests | **PASS** (366/366) |

---

## 10. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **HIGH** | Vercel DATABASE_URL target not cryptographically verified |
| S2 | **MEDIUM** | KV↔Vercel sync timing mismatch (KV newer) |
| S3 | **MEDIUM** | `sslmode=require` not in KV URL metadata |
| S4 | **MEDIUM** | SMTP/MFA absent on public deploy project |
| S5 | **INFORMATIONAL** | Psychology project holds duplicate partial secrets |
| — | — | No secrets exposed; domain unchanged; DB untouched |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 11. Independent review

All 20 checklist items verified. Option B preserved. Public project identified. `DATABASE_URL` **present** on deploy project. Target/sslmode require operator sync. No deploy/mutation/messaging.

---

## 12. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit / push | **NONE** |

---

## 13. Decision

**READY WITH CONDITIONS**

### Conditions

1. Operator sync **`DATABASE_URL`** on **`dr-vandana-website`** from current **`production-app-database-url`**.  
2. Add **`sslmode=require`** to KV + Vercel DATABASE_URL.  
3. **Controlled Production redeploy** of `dr-vandana-website` after env update.  
4. Add MFA/SMTP/flags to public project when those runtime paths are in scope.

### Not full go-live

Schema + build gates improved; runtime env sync + deploy still required.

---

## 14. Next controlled task

**O-B-P04 — Production Worker Provisioning & Verification** — only after conditions 1–3 satisfied and deploy authorized. **Do not start automatically.**

---

## 15. Related documents

- `docs/O_B_P03F_R_PRODUCTION_VERCEL_DATABASE_REVERIFICATION.md`  
- `docs/O_B_P03F_R_PRODUCTION_VERCEL_RELEASE_GATE_MATRIX.md`  
- `docs/O_B_P03F_R_PRODUCTION_PROJECT_ENVIRONMENT_ALIGNMENT.md`

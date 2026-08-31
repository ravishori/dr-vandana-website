# O-B-P03F Production Post-Migration Verification Report

**Document type:** Release gate report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)

```text
O-B-P03F DECISION = BLOCKED
PRODUCTION MUTATIONS IN P03F = NONE
SECRET LEAKAGE = NONE DETECTED
```

---

## 1. Executive summary

P03F **re-verified** Production PostgreSQL after O-B-P03E: schema **PASS** (27/27, `btree_gist`, exclusion, 0 rows). Runtime release gate **BLOCKED** by: (1) **`npm run build` FAIL** on `/privacy-policy` and `/_global-error` prerender (`useContext` null — not database-related); (2) **Vercel Production `DATABASE_URL` gap** — absent on `drvandana-psychology`, present but **target parity unverified** on `dr-vandana-website`. No P03F mutations, deploy, seed, worker, or messaging.

---

## 2. O-B-P03E baseline vs P03F current

| Item | O-B-P03E | P03F (current) |
| --- | --- | --- |
| Tables | 27 | **27** (confirmed) |
| `btree_gist` | Installed | **Installed** |
| Exclusion | Present | **Present** |
| Data rows | 0 | **0** |
| Catalog seed | NO | **NO** (roles/permissions 0) |
| `verifyPracticeSchema` | PASS | **PASS** |
| Build | FAIL | **FAIL** (same class) |
| Vercel DATABASE_URL | Not on psychology | **Still missing on psychology**; **present on website** (unverified target) |

---

## 3. Database verification

| Check | Result |
| --- | --- |
| Target | `pg-dr-vandana-prod` / `dr_vandana_db` **PASS** |
| Connectivity | **PASS** |
| TLS | **PASS** (TLSv1.3) |
| PostgreSQL | **17.10** |
| Tables | **27/27** |
| Indexes | **75** |
| Foreign keys | **30** |
| CHECK constraints | **190** |
| Unique indexes | **44** |
| `verifyPracticeSchema` | **PASS** (39 checks) |
| `npm run db:verify-production` | **FAIL** — TLS client config gap in script |

---

## 4. Migration history

No database journal table. Operational tracking: O-B-P03E change record + P03F verification. **Re-run risk remains HIGH** if migrations re-applied.

---

## 5. Identity catalog

| Inserts if seeded | Users? |
| --- | --- |
| 4 roles, practice + clinical permissions, role_permissions grants | **NO users** |

**Classification:** **CONDITION** — required before registration/provisioning; **not a blocker** while `PATIENT_REGISTRATION_ENABLED=false` and no provisioning.

---

## 6. Vercel Production environment (names only)

### `drvandana-psychology` (local `.vercel` link)

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | **MISSING** |
| `AUTH_SESSION_SECRET` | PRESENT |
| `MFA_ENCRYPTION_KEY` | PRESENT |
| `APP_BASE_URL` | PRESENT (Config) |
| `EMAIL_PROVIDER` | PRESENT |
| `PATIENT_REGISTRATION_ENABLED` | PRESENT (Config) |
| `TWILIO_WHATSAPP_ENABLED` | PRESENT (Config) |
| `SMTP_*` (legacy names) | PRESENT |
| `SMTP_SERVER` / `SMTP_EMAIL` | MISSING (aliases in use) |

### `dr-vandana-website` (serves public domain)

| Variable | Status |
| --- | --- |
| `DATABASE_URL` | **PRESENT** (Secret) — **target parity NOT VERIFIED** |
| `AUTH_SESSION_SECRET` | PRESENT |
| `APP_BASE_URL` | PRESENT (Secret) |
| `PATIENT_REGISTRATION_ENABLED` | **MISSING** (defaults false in code) |
| `TWILIO_WHATSAPP_ENABLED` | **MISSING** (defaults false) |
| MFA / SMTP / EMAIL_PROVIDER | **MISSING** on this project |

---

## 7. Key Vault

| Secret | Status |
| --- | --- |
| `production-app-database-url` | **PRESENT**, enabled |
| `production-app-auth-session-secret` | PRESENT |
| `production-app-mfa-encryption-key` | PRESENT |

KV↔Vercel exact value parity: **NOT PROVEN** (by design — no secret exposure).

---

## 8. Domain

| Check | Result |
| --- | --- |
| `https://drvandana.trinetralab.net/` | **HTTP 200** |
| HSTS | Present |
| Server | Vercel |
| DNS/Vercel modified in P03F | **NO** |

---

## 9. Build investigation

| Question | Answer |
| --- | --- |
| Failing routes | `/privacy-policy`, `/_global-error` |
| Error | `TypeError: Cannot read properties of null (reading 'useContext')` during static prerender |
| Database? | **NO** |
| Env vars? | **NO** (local repro without Production DB) |
| Domain? | **NO** |
| Auth? | **NO** |
| Evidence | `LegalDocument` is server component; failure occurs during Next.js 16 prerender/export alongside `global-error.tsx` client boundary |

**Verdict:** **BUILD BLOCKER — SEPARATE CONTROLLED REMEDIATION REQUIRED**

---

## 10. Tests (P03F re-run)

| Suite | Result |
| --- | --- |
| Tests | **PASS** (366/366) |
| Typecheck | **PASS** |
| Lint | **PASS** (2 warnings) |
| Build | **FAIL** |

---

## 11. Backup / firewall

| Item | Result |
| --- | --- |
| Backup | 7-day retention |
| PITR | Available (~2026-08-26 earliest) |
| Restore drill | **NOT VERIFIED** (condition) |
| Firewall | Single named IP; **no 0.0.0.0/0** |

---

## 12. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **CRITICAL** | Build fails — cannot deploy current HEAD |
| S2 | **CRITICAL** | `DATABASE_URL` missing on PMS-oriented Vercel project |
| S3 | **HIGH** | Vercel↔Production DB target parity not proven on website project |
| S4 | **HIGH** | Vercel project split (public vs PMS secrets) |
| S5 | **MEDIUM** | Empty identity catalog — OK until registration |
| S6 | **MEDIUM** | No migration journal |
| S7 | **MEDIUM** | Restore drill not verified |
| S8 | **MEDIUM** | `db:verify-production` TLS gap |
| S9 | **LOW** | KV URL lacks `sslmode=require` query |
| — | — | No secrets exposed; DB schema sound; flags effectively false |

**SECURITY REVIEW: BLOCKED (release gate)**

---

## 13. Independent review

All 23 checks performed. Database/schema/data verification **PASS**. Release gate **BLOCKED** on build + Vercel DATABASE_URL gaps. No P03F mutations or messaging.

---

## 14. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| P03F docs | Uncommitted |
| Commit | NONE |

---

## 15. Release decision

**BLOCKED**

### Release blockers

1. **Build failure** — `/privacy-policy` + `/_global-error` prerender.  
2. **Vercel Production `DATABASE_URL`** — missing on `drvandana-psychology`; target unverified on `dr-vandana-website`.

### Conditions (address before or with go-live)

- Identity catalog seed (when registration/provisioning authorized)  
- Restore drill  
- Verify-script TLS fix  
- Vercel project SoT decision  
- `sslmode=require` in DATABASE_URL configuration  

---

## 16. Next controlled tasks (do not auto-start)

1. **O-B-P04A (or equivalent) — Build prerender remediation** — fix `/privacy-policy` / `/_global-error` build failure.  
2. **O-B-P04B (or equivalent) — Vercel Production DATABASE_URL ceremony** — operator sync from KV; prove target parity on deploy project(s).  
3. **Optional:** Identity catalog seed ceremony (separate authorization).  
4. **Optional:** `db:verify-production` TLS hardening.  
5. **O-B-P04** — Production worker (unchanged separate scope).

---

## 17. Related documents

- `docs/O_B_P03F_PRODUCTION_POST_MIGRATION_VERIFICATION.md`  
- `docs/O_B_P03F_PRODUCTION_RELEASE_GATE_MATRIX.md`  
- `docs/O_B_P03F_PRODUCTION_DATABASE_FINAL_STATE.md`

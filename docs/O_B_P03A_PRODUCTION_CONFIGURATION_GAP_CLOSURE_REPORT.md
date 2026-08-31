# O-B-P03A Production Configuration Gap Closure Report

**Document type:** Controlled Production gap-closure report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**Companions:**  
- `docs/O_B_P03A_PRODUCTION_CONFIGURATION_GAP_CLOSURE.md`  
- `docs/O_B_P03A_PRODUCTION_DOMAIN_ALIGNMENT_REPORT.md`  
- `docs/O_B_P03A_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md`

```text
O-B-P03A DECISION = READY WITH CONDITIONS
SECRET LEAKAGE = NONE DETECTED
PRODUCTION DEPLOYMENT = NOT TRIGGERED
PRODUCTION DATABASE = UNCHANGED
PRODUCTION WORKER = NOT PROVISIONED
GIT COMMIT = NONE
```

---

## 1. Executive summary

Closed the crypto-secret gap for Production identity: **`AUTH_SESSION_SECRET`** and **`MFA_ENCRYPTION_KEY`** were generated with CSPRNG, stored in **`kv-dr-vandana-prod`**, and configured as Vercel Production Secrets on **`drvandana-psychology`**. Values were never printed. Registration and WhatsApp remain **false**. **`DATABASE_URL` remains MISSING** (operator must enter). Domain alignment is **REQUIRES OPERATOR ACTION** — live `drvandana.trinetralab.net` terminates on project **`dr-vandana-website`**, while SoT project **`drvandana-psychology`** still claims broken `drvandana.trinetra.net`. No deploy, migrate, mail, OTP, WhatsApp, or worker work was performed.

---

## 2. Baseline

| Check | Result |
| --- | --- |
| `git rev-parse HEAD` | `797417555f23e54e127921a4d5534f1969220b08` |
| Short SHA | `7974175` |
| Unexpected destructive reset | NOT DONE |
| Prior dirty tree (O-B/O15 docs) | PRESERVED |

---

## 3. Authorization boundary

| Allowed | Done |
| --- | --- |
| Repo inventory / docs | YES |
| Prod KV secret create (crypto secrets) | YES — session + MFA |
| Vercel Production secrets/config | YES — session + MFA; flags already set |
| Domain inspection | YES |
| DNS / domain mutation | NO |
| Operator DB/SMTP password invention | NO |
| Migrate / deploy / worker / messaging | NO |
| Staging changes | NO |

---

## 4. Gap closure summary

### A. CONFIGURED SUCCESSFULLY

| Item | Detail |
| --- | --- |
| `AUTH_SESSION_SECRET` | KV `production-app-auth-session-secret` + Vercel Production Secret; length ≥ 32; SHA256 ≠ staging |
| `MFA_ENCRYPTION_KEY` | KV `production-app-mfa-encryption-key` + Vercel Production Secret; 64 lowercase hex → 32 bytes validated; staging MFA KV name absent |
| Flags | Registration / WhatsApp / identity provision = `false` |
| `EMAIL_PROVIDER` | `smtp` |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` (value retained; attachment unresolved) |

### B. MISSING

- `DATABASE_URL` / `production-app-database-url`  
- Canonical `SMTP_SERVER` / `SMTP_EMAIL`  
- Production SMTP entries in Key Vault  
- OTP/Twilio set  

### C. OPERATOR ACTION REQUIRED

1. **DATABASE_URL** — Azure Portal → `kv-dr-vandana-prod` / `production-app-database-url` targeting `pg-dr-vandana-prod` / `dr_vandana_db`, then Vercel Production Secret (do not paste into Cursor).  
2. **Domain** — attach one authoritative hostname to `drvandana-psychology` (see domain report).  
3. **SMTP** — confirm Production mailbox; optionally add canonical names + KV mirror; do not send mail in that step without a separate authorize.  
4. OTP — only when registration launch is authorized.  

### D. PRESENT BUT UNVERIFIED

Legacy SMTP aliases + password name, Upstash, ERROR_*, `APPOINTMENT_TO_EMAIL` on Vercel Production.

### E. LEGACY VARIABLES NOT COPIED

No new duplicate legacy SMTP variables; existing aliases left for code fallback.

### F. STAGING VARIABLES NOT COPIED

No staging secret values reused. Staging KV list unchanged aside from read-only hash compare of auth secret. Staging Preview project not modified.

### G. DOMAIN ISSUES

**REQUIRES OPERATOR ACTION** — see domain report. Alignment **not PASS**.

### H. DATABASE DEPENDENCIES

PG Ready; `dr_vandana_db` exists; migrations 0001–0007 still outstanding (separate task). Schema/data **UNCHANGED** this task.

### I. WORKER DEPENDENCIES

Inventoried — **NOT PROVISIONED**.

---

## 5. MFA notes

| Topic | Result |
| --- | --- |
| App-level key | CONFIGURED (global AES-256-GCM) |
| Per-user TOTP / recovery | **NOT CREATED** (enrollment-only) |
| Rotation | Documented: casual rotation after enrollment breaks ciphertext |

---

## 6. OTP

**NOT REQUIRED** while `PATIENT_REGISTRATION_ENABLED=false`. **NOT CONFIGURED.**

---

## 7. SMTP

Canonical path confirmed in `appointment-email.ts`. Production relies on **legacy aliases** (`SMTP_HOST` / `SMTP_USER`) + `SMTP_PASSWORD` name present. Canonical names still missing. **No email sent.** Staging SMTP values **not** copied.

---

## 8. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **CRITICAL** | `DATABASE_URL` still missing — Option B PMS cannot run against Prod PG |
| S2 | **HIGH** | Domain/project mismatch — `APP_BASE_URL` host not attached to SoT Vercel project |
| S3 | MEDIUM | SMTP Prod-specificity / canonical names / KV mirror incomplete |
| S4 | MEDIUM | O10/O11/O18 legal gates still OPEN (unchanged) |
| S5 | LOW | Repo `siteConfig` still cites `trinetra.net` on this branch |
| S6 | INFORMATIONAL | Session/MFA secrets unique; KV RBAC soft-delete + purge protection confirmed |
| S7 | INFORMATIONAL | Registration/WhatsApp forced false |
| — | — | Secret values not printed; no secret in Git |

**SECURITY REVIEW: PASS WITH CONDITIONS**  
**INDEPENDENT REVIEW: PASS WITH CONDITIONS** (checklist §31 — fails READY FOR O-B-P04 on DATABASE_URL + domain)

---

## 9. Independent review checklist (§31)

| # | Check | Result |
| --- | --- | --- |
| 1 | Correct Vercel Production project | YES — `drvandana-psychology` |
| 2 | Correct Production Key Vault | YES — `kv-dr-vandana-prod` |
| 3 | Production-scoped variables | YES (Production only touched) |
| 4 | `DATABASE_URL` targets Production | **NOT VERIFIED** — missing |
| 5 | `AUTH_SESSION_SECRET` unique | YES vs staging hash |
| 6 | `MFA_ENCRYPTION_KEY` unique 32-byte | YES format + staging MFA absent |
| 7 | SMTP canonical | PARTIAL — aliases only |
| 8 | Legacy aliases not blindly duplicated | YES |
| 9 | OTP only if required | YES — not configured |
| 10–11 | Registration / WhatsApp false | YES |
| 12–13 | Domain verified / APP_BASE_URL match | **FAIL** — operator action |
| 14 | Staging untouched | YES |
| 15–16 | DB schema / patient data | UNCHANGED / NOT USED |
| 17–19 | Email / OTP / WhatsApp | NOT SENT |
| 20–21 | Worker / deploy | NOT PROVISIONED / NOT TRIGGERED |
| 22 | Secret leakage | NONE DETECTED |

---

## 10. Tests / typecheck / lint / build

No application source changes. **NOT RUN** (docs + remote config only).

---

## 11. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |

---

## 12. Decision

**READY WITH CONDITIONS**

Not **READY FOR O-B-P04** until:

1. Production `DATABASE_URL` is in KV + Vercel and targets `pg-dr-vandana-prod` / `dr_vandana_db`  
2. Domain attachment is resolved for `drvandana-psychology`  

Next controlled task (when conditions close): **O-B-P04 — PRODUCTION WORKER PROVISIONING & VERIFICATION** — **DO NOT START AUTOMATICALLY**.

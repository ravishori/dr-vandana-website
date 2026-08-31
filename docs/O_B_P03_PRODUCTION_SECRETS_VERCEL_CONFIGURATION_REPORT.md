# O-B-P03 Production Secrets & Vercel Configuration Report

**Document type:** Controlled Production secrets/Vercel configuration report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Companions:**  
- `docs/O_B_P03_PRODUCTION_SECRETS_VERCEL_CONFIGURATION.md`  
- `docs/O_B_P03_PRODUCTION_VERCEL_ENVIRONMENT_INVENTORY.md`

```text
O-B-P03 DECISION = READY WITH CONDITIONS
PRODUCTION VERCEL = PARTIAL
SECRET VALUES = NOT EXPOSED
REGISTRATION = false
WHATSAPP = false
PRODUCTION DEPLOYMENT = NOT TRIGGERED
GIT COMMIT = NONE
```

---

## 1. Executive Summary

Configured **non-secret** Production environment variables on Vercel project `drvandana-psychology` (Production only): registration/WhatsApp/provision flags `false`, `EMAIL_PROVIDER=smtp`, and `APP_BASE_URL=https://drvandana.trinetralab.net` per **operator confirmation** that this is the Production URL.

Critical secrets (`DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, canonical SMTP, OTP) remain **VALUE REQUIRED — OPERATOR ACTION**. No secret values were printed, invented, or pulled into chat. Staging, Production database, worker, and Key Vault secret values were not modified. No Production deployment was triggered.

---

## 2. Authorization / boundary

| Allowed | Done |
| --- | --- |
| Non-secret Vercel Production config | YES |
| Feature flags false | YES |
| Inspect KV / PG / inventory | YES |
| Populate secret values | NO (operator) |
| Migrate DB / send mail / OTP / worker | NO |
| Staging / Preview changes | NO |

---

## 3. Production URL correction

| Source | URL |
| --- | --- |
| Operator (authoritative for O-B-P03) | `https://drvandana.trinetralab.net` |
| Initial mistaken candidate | `https://drvandana.trinetra.net` (overridden) |
| Vercel metadata for `drvandana-psychology` | Still lists Latest Production URL `https://drvandana.trinetra.net` |
| Vercel metadata for `dr-vandana-website` | Lists `https://drvandana.trinetralab.net` |

**Condition:** DNS/custom-domain ownership between the two Vercel projects needs operator alignment so `APP_BASE_URL`, certificates, and “Latest Production URL” agree.

---

## 4. Variables configured this task

| Variable | Value (safe) |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |
| `EMAIL_PROVIDER` | `smtp` |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` |

---

## 5. Gap report

### A. Successfully configured

Flags + `EMAIL_PROVIDER` + `APP_BASE_URL` (above).

### B. Still missing

`DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `SMTP_SERVER`, `SMTP_EMAIL`, OTP/Twilio (conditional).

### C. Present but unverified

`SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PORT`, From_*, Upstash, ERROR_*, `APPOINTMENT_TO_EMAIL`.

### D. Not copied from staging

Staging secret **values**; synthetic flags; Preview Upstash alias sprawl; lab-as-staging assumptions that conflict with operator Prod URL (documented instead).

### E. Legacy not duplicated

Did not add parallel legacy SMTP vars. Existing aliases left in place (code fallback). Canonical names still recommended.

### F. Operator action

See inventory §F — enter Prod secrets into `kv-dr-vandana-prod` + Vercel Secrets; confirm SMTP Prod mailbox; resolve domain/project metadata mismatch.

---

## 6. SMTP review

Canonical path confirmed in code. Production currently relies on **legacy aliases** for host/user. Password name present — **NOT VERIFIED** as Production-specific. No email sent.

---

## 7. Database / MFA / OTP

| Item | Status |
| --- | --- |
| `DATABASE_URL` | MISSING — must target `pg-dr-vandana-prod` / `dr_vandana_db` |
| Schema migrate | Still O-B-P02 follow-on (not this task) |
| MFA | MISSING key |
| OTP | MISSING (conditional) |

---

## 8. Worker

Inventoried only — **NOT PROVISIONED**.

---

## 9. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | HIGH | Core secrets still missing for Option B PMS |
| S2 | MEDIUM | Domain metadata mismatch (`trinetra.net` vs operator `trinetralab.net`) |
| S3 | MEDIUM | Legacy SMTP aliases without canonical names / unverified mailbox |
| S4 | INFORMATIONAL | Flags correctly forced false |
| — | — | No secret leakage detected |

**SECURITY REVIEW: PASS WITH CONDITIONS**  
**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 10. Tests

No application code changes. **TESTS / TYPECHECK / LINT / BUILD: NOT RUN**

---

## 11. Decision

**READY WITH CONDITIONS**

Critical secrets still missing → not **READY FOR O-B-P04** until operator populates Prod DB/session/MFA (and preferably canonical SMTP) and domain alignment is confirmed.

Next controlled task (when secrets ready): **O-B-P04 — Production worker provisioning & verification** — do **not** start automatically.

---

## 12. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | NONE |
| Push | NONE |
| Production deployment | NOT TRIGGERED |
| Staging | UNCHANGED |
| Production database | UNCHANGED |
| KV secret values | UNCHANGED (empty / not populated) |

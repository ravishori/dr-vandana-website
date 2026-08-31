# O-B-P01A Production Environment Variable Gap Analysis Report

**Document type:** Inspection-only gap analysis report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**Detail tables:** `docs/O_B_P01A_PRODUCTION_ENVIRONMENT_VARIABLE_GAP_ANALYSIS.md`

```text
O-B-P01A = COMPLETE
MUTATIONS = NONE
SECRET VALUES = NOT EXPOSED
PRODUCTION KEY VAULT = UNCHANGED (still empty of secrets)
STAGING = UNCHANGED
```

---

## 1. Executive Summary

Compared Development (`.env.example` + code), Staging (Vercel Preview `dr-vandana-website`, staging Key Vault names, staging ACA Job env names), and Production (Vercel `drvandana-psychology` Production names, empty `kv-dr-vandana-prod`).

**Critical gap:** Production lacks Option B core names — `DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `APP_BASE_URL`, registration/WhatsApp flags, `EMAIL_PROVIDER`, and Twilio OTP — while retaining legacy enquiry SMTP/Upstash/error-mail names that are **present but not verified**.

No secrets were retrieved or printed. No Production, Staging, database, Key Vault, or application changes were made.

---

## 2. Baseline

| Check | Result |
| --- | --- |
| HEAD | `7974175` |
| Unexpected reset | Not performed |
| Dirty tree | Prior uncommitted work preserved |

---

## 3. Authoritative inventory method

Unique variables from repository `process.env` / config readers / `.env.example`, cross-checked against O-B-P01 inventory. Presence in each environment taken only from safe name listings.

**AUTHORITATIVE VARIABLE INVENTORY: COMPLETE** (for gap purposes)

---

## 4. Environment snapshots (names only)

### Development

Expected via `.env.example` (placeholders empty). Local `.env*` not read (gitignored). Classification mostly **DEV + STAGING + PROD** for Option B core; test/synthetic vars **DEV ONLY**.

### Staging

| Surface | Names (count) |
| --- | --- |
| Vercel Preview | 28 |
| Key Vault | 8 (`staging-app-database-url`, `staging-app-auth-session-secret`, SMTP set) |
| ACA Job env | 12 |

### Production

| Surface | Names (count) |
| --- | --- |
| Vercel Production | 14 |
| Key Vault | 0 |

---

## 5. Gap lists

### A. Missing from Production (high priority)

`DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `APP_BASE_URL`, `PATIENT_REGISTRATION_ENABLED`, `IDENTITY_PROVISION_ENABLED`, `TWILIO_WHATSAPP_ENABLED`, `EMAIL_PROVIDER`, canonical `SMTP_SERVER`/`SMTP_EMAIL` (aliases exist), OTP/Twilio SMS set (conditional).

**COUNT (core MUST ADD / CONDITIONAL groups): 12**

### B. Present on Production

14 Vercel Production names (SMTP aliases, Upstash, appointment enquiry, error mail).

**COUNT: 14**

### C. Present but not verified

Same 14 — values Hidden; no Production verification this task.

**COUNT: 14**

### D. Must not copy to Production

Staging secret **values**; staging/lab URLs; synthetic provision flags; test `APPOINTMENT_PG_URL`; provision CLI vars; WA sandbox/templates while disabled; unnecessary Upstash alias sprawl.

---

## 6. Special checks

| Check | Result |
| --- | --- |
| `DATABASE_URL` | Staging TARGET VERIFIED (prior evidence); Production VALUE NOT ACCESSIBLE |
| `AUTH_SESSION_SECRET` | Staging name PRESENT; Production ABSENT; values not compared |
| SMTP | Production names PRESENT (alias form) — NOT VERIFIED |
| OTP | Staging PRESENT; Production ABSENT |
| MFA | Staging Preview PRESENT; Production ABSENT; staging KV MFA name ABSENT |
| Registration / WhatsApp | Must be `false`; Production names ABSENT (MUST ADD false) |
| Worker | Staging configured; Production worker NOT PROVISIONED — worker vars missing |

---

## 7. Security review

| Finding | Severity |
| --- | --- |
| Prod missing session/DB/MFA/flags | HIGH (release blocker — known) |
| Prod SMTP names without verification | MEDIUM |
| No secret leakage in this task | PASS |

**SECURITY REVIEW: PASS** (inspection integrity)  
**INDEPENDENT REVIEW: PASS**

---

## 8. Mutations

| Resource | Change |
| --- | --- |
| Application | NONE |
| Staging | UNCHANGED |
| Production Vercel | UNCHANGED |
| Key Vaults | UNCHANGED |
| Database | UNCHANGED |

---

## 9. Tests

No application files changed. **TESTS/TYPECHECK/LINT/BUILD: NOT RUN**

---

## 10. Git

| Item | Value |
| --- | --- |
| Commit | NONE |
| Push | NONE |
| HEAD | `7974175` |
| New docs | This report + gap analysis |

---

## 11. Next task

**O-B-P02 — Production PostgreSQL readiness & schema/network verification**  
Do **not** start automatically. Operator secret entry / Vercel wiring remain separate from O-B-P02.

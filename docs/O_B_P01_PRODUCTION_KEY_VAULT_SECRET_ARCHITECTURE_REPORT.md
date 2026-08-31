# O-B-P01 Production Key Vault & Secret Architecture Report

**Document type:** Controlled Production secret-architecture task report  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-P01 DECISION = READY FOR O-B-P02
PRODUCTION KEY VAULT = CREATED (kv-dr-vandana-prod)
SECRET VALUES = NOT EXPOSED / NOT POPULATED BY CURSOR
STAGING VAULT = UNTOUCHED
PRODUCTION DATABASE = NOT MODIFIED
PRODUCTION WORKER = NOT PROVISIONED
PRODUCTION VERCEL = NOT MODIFIED
REGISTRATION = false (must remain)
WHATSAPP = false (must remain)
OPTION C = BLOCKED
GIT COMMIT = NONE
```

**Never records secret values, connection strings, passwords, or tokens.**

---

## 1. Executive Summary

O-B-P01 created Production Azure Key Vault `kv-dr-vandana-prod` in `rg-dr-vandana-prod` (India South Central) with RBAC, soft delete, and purge protection. A repository-authoritative Production environment-variable inventory was produced and mapped to `production-app-*` Key Vault names. Secret **values** were deliberately **not** entered by Cursor; operators must enter them via Azure Portal / approved mechanisms. Staging vault and Production PostgreSQL / Vercel / ACA worker were not mutated beyond the authorized vault + operator Secrets Officer assignment.

---

## 2. Authorization / Scope

| Authorized | Performed |
| --- | --- |
| Inspect repo + Azure | YES |
| Create Prod KV if absent | YES |
| Naming / inventory / RBAC architecture | YES |
| Vercel / worker **plans** | YES (docs) |
| Populate secret values | NO (operator) |
| Modify Prod PG / firewall / ACA / Vercel secrets | NO |
| Enable registration / WhatsApp / Option C | NO |

---

## 3. Baseline

| Item | Result |
| --- | --- |
| HEAD | `7974175` — matches expected |
| Unexpected reset | Not performed |
| Dirty tree | Prior O-B/O15 uncommitted docs/code **preserved** |

---

## 4. Prior evidence reused

Master readiness (P0 Prod KV absent), O-B-05A staging KV pattern, O-B-03 naming ceremony, O15-S worker secret pattern, Vercel Production name inspection from release prep.

Staging E2E / SMTP AUTH **not** re-run.

---

## 5. Production Key Vault

| Field | Result |
| --- | --- |
| Pre-existence | None (`kv-dr-vandana-prod` not found) |
| Action | **CREATED** |
| Name | `kv-dr-vandana-prod` |
| RG | `rg-dr-vandana-prod` |
| Region | India South Central |
| RBAC | Enabled |
| Soft delete | Enabled (90-day retention) |
| Purge protection | Enabled |
| SKU | Standard |
| URI | `https://kv-dr-vandana-prod.vault.azure.net/` |
| Tags | Environment=Production, ManagedBy=O-B-P01, … |

Staging `kv-dr-vandana-staging`: **not modified**.

---

## 6. RBAC

| Assignment | Result |
| --- | --- |
| Operator → Key Vault Secrets Officer on Prod vault | **CREATED** (propagation may lag briefly) |
| Worker Secrets User | **PLANNED** — MI not created |
| Broad Owner/Contributor on vault for apps | **NOT GRANTED** |

---

## 7. Environment variable inventory

Comprehensive inventory from `.env.example`, `src/lib/identity/config.ts`, `appointment-email.ts`, Twilio OTP/WhatsApp configs, notifications, question portal, AI, Upstash, error reporting, crisis store.

**No invented app variables.** Test-only vars excluded from Production KV.

See: `docs/O_B_P01_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md`

**PRODUCTION ENVIRONMENT VARIABLES: INVENTORIED**  
**PRODUCTION SECRET INVENTORY: COMPLETE (names/sources); VALUES OPERATOR-OWNED**

---

## 8. DATABASE_URL

| Item | Result |
| --- | --- |
| App variable | `DATABASE_URL` |
| KV name | `production-app-database-url` |
| Target host concept | `pg-dr-vandana-prod` only |
| TLS | Required (`require_secure_transport` on Prod PG previously observed) |
| Value | **[SECRET — NOT SHOWN]** — OPERATOR MUST ENTER |
| Schema readiness | **DATABASE READINESS = SEPARATE O-B-P02 TASK** |

---

## 9. AUTH_SESSION_SECRET

| Item | Result |
| --- | --- |
| Variable | `AUTH_SESSION_SECRET` |
| Minimum | ≥ 32 characters (`isSessionSecretUsable`) |
| KV | `production-app-auth-session-secret` |
| Staging reuse | **FORBIDDEN** |
| Generation | Operator offline — **DO NOT PLACE IN CHAT** |

---

## 10. MFA

| Item | Result |
| --- | --- |
| Variable | `MFA_ENCRYPTION_KEY` |
| Usability | `isMfaKeyUsable` → 32-byte decoded key |
| Consumer | Web (Vercel) primarily |
| KV | `production-app-mfa-encryption-key` |
| Worker | Not required for notification drain |

---

## 11. SMTP

Repository canonical + alias names inventoried. Production-specific credentials required. Vercel already has SMTP **names**; verification and KV SoT still required. **No email sent.**

---

## 12. OTP / Twilio

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (+ alias) confirmed. Production credentials separate. **WhatsApp remains disabled** (`TWILIO_WHATSAPP_ENABLED=false`).

---

## 13. APP_BASE_URL / VERCEL_ENV

| Item | Result |
| --- | --- |
| Repo site URL | `https://drvandana.trinetra.net` |
| Production URL verification | **OPERATOR VERIFICATION REQUIRED** (live TLS probe previously failed from operator network) |
| `VERCEL_ENV` | System-provided — not stored in KV |

---

## 14. Feature flags

| Flag | Production intent |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED` | absent/`false` |

Not enabled by this task. Vercel Production currently **missing** explicit registration/WhatsApp flag names — operator must set `false` when wiring Option B.

---

## 15. Worker secrets (plan only)

Future ACA Job needs: `DATABASE_URL`, `AUTH_SESSION_SECRET`, SMTP set, `EMAIL_PROVIDER=smtp`, flags false, `NODE_ENV` compatible with approved Production entrypoint strategy.

Dedicated MI `id-dr-vandana-prod-worker` + Secrets User — **not created**.

---

## 16. Vercel Production checklist (operator)

| Name | Type | Source | Required | Sensitive | Status |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Secret | Prod KV | YES | YES | NOT CONFIGURED |
| `AUTH_SESSION_SECRET` | Secret | Prod KV | YES | YES | NOT CONFIGURED |
| `MFA_ENCRYPTION_KEY` | Secret | Prod KV | YES if MFA | YES | NOT CONFIGURED |
| `APP_BASE_URL` | Config | Verified URL | YES | NO | NOT CONFIGURED |
| `PATIENT_REGISTRATION_ENABLED` | Flag | Literal false | YES | NO | NOT CONFIGURED |
| `TWILIO_WHATSAPP_ENABLED` | Flag | Literal false | YES | NO | NOT CONFIGURED |
| `EMAIL_PROVIDER` | Config | `smtp` | YES | NO | NOT CONFIGURED |
| SMTP_* | Mixed | Prod KV / provider | YES | password YES | NAMES PRESENT — values not verified |
| Upstash | Mixed | Upstash | RECOMMENDED | token YES | NAMES PRESENT |
| Twilio OTP | Mixed | Twilio Prod | When OTP | YES | NOT CONFIGURED |

**O-B-P01 did not write Vercel secrets.**

---

## 17. Security review

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | INFORMATIONAL | Prod RG still tagged Development | Known P1; vault tagged Production |
| S2 | MEDIUM | Secret values not yet in vault | Operator entry required before use |
| S3 | MEDIUM | Vercel missing PMS core secrets | Expected; next wiring task |
| S4 | LOW | Public network on vault | Acceptable interim; harden later |
| S5 | INFORMATIONAL | RBAC propagation delay after Officer assign | Retry list after wait |
| — | — | Staging secrets not reused | PASS |
| — | — | No secrets in Git/docs/chat | PASS |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 18. Independent review

| Check | Result |
| --- | --- |
| Prod KV ≠ staging | PASS |
| Secrets separate by design | PASS |
| Repo vars inspected | PASS |
| No invented variables | PASS |
| Values absent from reports | PASS |
| DATABASE_URL targets Prod concept | PASS (value not set) |
| Worker/Vercel documented | PASS |
| Registration/WhatsApp disabled intent | PASS |
| Option C blocked | PASS |
| Prod DB/worker unmodified | PASS |
| No real patient data | PASS |
| O10/O11/O18 preserved | PASS |

**INDEPENDENT REVIEW: PASS**

---

## 19. Tests

No application code changes.  
**TESTS / TYPECHECK / LINT / BUILD: NOT RUN** (not required for vault + docs-only).

---

## 20. Production changes (exact)

1. Created Key Vault `kv-dr-vandana-prod` in `rg-dr-vandana-prod`  
2. Assigned Key Vault Secrets Officer to signed-in operator on that vault  

**Database changes: NONE**  
**Application changes: NONE**  
**Vercel changes: NONE**  
**Staging changes: NONE**

---

## 21. Decision

**READY FOR O-B-P02**

Conditions for later gates (not blocking P02 start): operator enters Prod secret values; Vercel Option B env wiring; future worker MI.

Next: **O-B-P02 — Production PostgreSQL readiness & schema/network verification**  
Do **not** start automatically.

---

## 22. Documents

| Doc | Path |
| --- | --- |
| Architecture | `docs/O_B_P01_PRODUCTION_KEY_VAULT_SECRET_ARCHITECTURE.md` |
| Inventory | `docs/O_B_P01_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md` |
| Report | this file |

---

## 23. Git

| Item | Value |
| --- | --- |
| Commit | NONE |
| Push | NONE |
| HEAD | `7974175` |

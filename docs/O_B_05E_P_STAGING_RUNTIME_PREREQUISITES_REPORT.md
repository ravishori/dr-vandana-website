# O-B-05E-P Staging Runtime Prerequisites Report

**Document type:** Staging-only AUTH_SESSION_SECRET + synthetic identity/mailbox readiness  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05E-P FINAL STATUS = BLOCKED
AUTH_SESSION_SECRET (KV SoT) = ABSENT — OPERATOR ACTION REQUIRED
AUTH_SESSION_SECRET (Vercel Preview name) = PRESENT — VALUE NOT RETRIEVED
EXACT SECRET PARITY = NOT VERIFIED
SYNTHETIC PATIENT = NOT READY / BLOCKED
SYNTHETIC PSYCHOLOGIST = NOT READY / BLOCKED (provision path exists; operator credentials required)
SYNTHETIC MAILBOX = REQUIRED
SMTP / WORKER / EMAIL = UNCHANGED / NOT EXECUTED
O15 WORKER HOSTING = SEPARATE — NOT ADDRESSED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05E-P inspected and documented the prerequisites that blocked O-B-05E end-to-end outbox verification. No secrets were generated into the repository, no email was sent, no worker was executed or provisioned, and Production was not touched.

| Prerequisite | Result |
| --- | --- |
| Canonical KV secret `staging-app-auth-session-secret` | **ABSENT** |
| Vercel Preview `AUTH_SESSION_SECRET` variable **name** | **PRESENT** (Secret; value not retrievable via CLI) |
| Exact KV ↔ Preview value parity | **NOT VERIFIED** |
| Staging runtime boot using KV SoT | **NOT VERIFIED** / **BLOCKED** |
| Synthetic psychologist via existing provision CLI | Path **EXISTS**; identities **NOT CREATED** (requires operator passwords/emails outside Cursor) |
| Synthetic patient without enabling registration | **BLOCKED** — `provisionPrivilegedUser` does not create `PATIENT` |
| Designated synthetic mailbox | **REQUIRED** (no approved non-personal staging mailbox documented) |

**Final status: BLOCKED** — operator Portal actions required before O-B-05E-R.

---

## 2. Authorization / Scope

| Allowed | Done |
| --- | --- |
| Inspect AUTH_SESSION_SECRET architecture / naming | **YES** |
| KV / Preview metadata (no values) | **YES** |
| Document operator Portal workflow | **YES** |
| Create secrets / invent values | **NO** |
| Send email / run worker / provision host | **NO** |
| Enable registration | **NO** |
| Git commit / push | **NO** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Unexpected tracked app changes | **NONE** for this task |
| Pre-existing tracked docs | retention / legal / production checklist (earlier work) |

---

## 4. Previous O-B-05E Blocking Findings

From `docs/O_B_05E_WORKER_APPOINTMENT_OUTBOX_VERIFICATION_REPORT.md` (preserved):

1. Hosted worker **NOT PROVISIONED** (O15) — separate.
2. CLI drain blocked: **`AUTH_SESSION_SECRET` absent from KV**.
3. Synthetic identities / mailbox required.
4. Architecture (appointment → outbox → CLI → SMTP) **IMPLEMENTED** but E2E **NOT RUN**.

This task addresses only runtime prerequisites (items 2–3 partially via documentation/operator workflow). **Does not** address O15.

---

## 5. AUTH_SESSION_SECRET Architecture

| Question | Finding |
| --- | --- |
| Exact variable name | `AUTH_SESSION_SECRET` |
| Mandatory? | **YES** for identity context / sessions / MFA paths |
| Format/length | Usable if `length >= 32` (`isSessionSecretUsable`) |
| Use | HMAC / session signing (`sessions.ts`, crypto helpers); MFA also requires separate `MFA_ENCRYPTION_KEY` |
| Rotation effect | Existing practice sessions **invalidate** (documented in production rollback / Phase 1C) |
| Raw vs reference | Application expects **raw secret in process env**, not a Key Vault URI |
| Boot without it | `createAppIdentityContext()` → `not_configured` (fail closed) |
| Safe auto-provision in repo | **NONE** — operator must enter via Portal/dashboard |

---

## 6. Canonical Secret Naming

From O-B-03 naming ceremony + O-B-05A map (unchanged):

| Layer | Name |
| --- | --- |
| Logical | `staging/app/auth-session-secret` |
| Azure KV physical | `staging-app-auth-session-secret` |
| App / Vercel env | `AUTH_SESSION_SECRET` |
| Related MFA | `staging-app-mfa-encryption-key` → `MFA_ENCRYPTION_KEY` |

Do **not** invent alternate names.

---

## 7. Azure Key Vault Verification

| Field | Result |
| --- | --- |
| Vault | `kv-dr-vandana-staging` |
| Resource group | `rg-dr-vandana-staging` |
| Location | India South Central |
| RBAC | **enabled** |
| Soft-delete | **enabled** |
| Purge protection | **enabled** |
| `staging-app-auth-session-secret` | **ABSENT** |
| `staging-app-mfa-encryption-key` | **ABSENT** |
| Secret values | **NOT RETRIEVED / NOT EXPOSED** |

**KEY VAULT: BLOCKED** (required session secret missing from SoT)

### Operator-only procedure (Azure Portal — preferred)

1. Open Azure Portal → Key Vault **`kv-dr-vandana-staging`**.
2. **Secrets** → **Generate/Import**.
3. Name (exact): **`staging-app-auth-session-secret`**.
4. Value: cryptographically random string **≥ 32 characters**, unique to staging (≠ Production).  
   Generate on operator workstation (e.g. password manager / `openssl rand -base64 48`) — **do not paste into Cursor**.
5. Save. Confirm secret **name** appears. Do not screenshot the value.
6. Optionally create **`staging-app-mfa-encryption-key`** (32-byte key as 64 hex or 32-byte base64 per Phase 1 docs) if MFA will be used in staging ops.

---

## 8. Vercel Preview Verification

Project: `dr-vandana-website` / Preview

| Variable | Status |
| --- | --- |
| `AUTH_SESSION_SECRET` | **PRESENT** (Secret; value **NOT RETRIEVED**) |
| `MFA_ENCRYPTION_KEY` | **PRESENT** (Secret; value **NOT RETRIEVED**) |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `EMAIL_PROVIDER` | `smtp` |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` |

**VERCEL PREVIEW: PASS WITH CONDITIONS** (names present; values not proven equal to KV; KV SoT still empty for auth session)

### Operator dashboard action (after KV)

Update Preview `AUTH_SESSION_SECRET` (and MFA key if needed) in Vercel dashboard for `dr-vandana-website` → Preview so Preview runtime matches the **new** staging SoT value. Do **not** paste into Cursor or CLI argv.

---

## 9. Secret Parity Assessment

| Claim | Status |
| --- | --- |
| KV secret exists | **NO** |
| Preview variable exists | **YES** |
| Exact value equality | **NOT VERIFIED** |
| Provider linkage / sync | **ABSENT** |

**SECRET PARITY: NOT VERIFIED**

---

## 10. Staging Runtime Boot Assessment

| Check | Result |
| --- | --- |
| Local `.env` / `.env.local` AUTH | **ABSENT** |
| KV SoT for AUTH | **ABSENT** |
| Safe Preview-hosted boot probe for session init | **NOT AVAILABLE** without inventing endpoints (forbidden) |
| **STAGING RUNTIME BOOT** | **NOT VERIFIED** — **BLOCKED** pending KV secret + approved runtime path |

---

## 11. Synthetic Identity Requirements

Minimum for appointment → outbox → email:

| Actor | Required? | Notes |
| --- | --- | --- |
| Synthetic PATIENT | **YES** | Recipient email on `users` row |
| Synthetic PSYCHOLOGIST | **YES** | Booking/lifecycle actor |
| SUPER_ADMIN | **NO** for default appointment mail path |

---

## 12. Synthetic Identity Status

| Actor | Status |
| --- | --- |
| Mechanism | `npm run db:provision` / `provisionPrivilegedUser` — roles **PSYCHOLOGIST \| SUPER_ADMIN \| STAFF` only** |
| PATIENT via provision CLI | **NOT SUPPORTED** |
| Public registration | **DISABLED** — must stay `false` |
| Existing staging seed for O-B-05E labels | **NOT FOUND** / **NOT EXECUTED** |
| **SYNTHETIC PATIENT** | **NOT READY / BLOCKED** |
| **SYNTHETIC PSYCHOLOGIST** | **NOT READY** — operator must run provision with staging-only email/password **outside Cursor** after AUTH secret available |

No synthetic users were created in this task (would require inventing credentials or pasting secrets).

---

## 13. Synthetic Mailbox Requirement

| Item | Status |
| --- | --- |
| Designated non-personal staging mailbox in docs | **NOT ESTABLISHED** |
| Using personal/operator Gmail as “synthetic” | **NOT APPROVED** by this task’s safety rules as a standing designation |
| **SYNTHETIC MAILBOX** | **REQUIRED** |

Operator must designate an approved staging-only mailbox (address not required in this report) before O-B-05E-R delivery.

---

## 14. SMTP Boundary

SMTP credentials **UNCHANGED**. SMTP AUTH **NOT RUN**. Email **NOT SENT**.

---

## 15. Worker Boundary

Worker **NOT EXECUTED**. Host **NOT PROVISIONED**.

**O15 WORKER HOSTING: SEPARATE BLOCKER — NOT ADDRESSED BY O-B-05E-P**

---

## 16. Registration Safety

Preview `PATIENT_REGISTRATION_ENABLED=false`. Not modified.

**REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED**

---

## 17. WhatsApp Safety

Preview `TWILIO_WHATSAPP_ENABLED=false`. Twilio not configured.

**WHATSAPP: DISABLED**

---

## 18. Option C Safety

No clinical functionality introduced.

**OPTION C: BLOCKED**

---

## 19. Database Safety

No schema changes. No migrations. Staging target unchanged. No patient data written.

**DATABASE: STAGING ONLY / UNCHANGED**

---

## 20. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| P1 | HIGH (ops) | KV missing `staging-app-auth-session-secret` |
| P2 | HIGH (ops) | Synthetic patient path blocked without registration or new seed (out of scope to invent) |
| P3 | MEDIUM | Preview AUTH name exists but parity with future KV value unproven |
| P4 | MEDIUM | MFA key also absent from KV (needed if MFA staging ops) |
| P5 | PASS | No secret printed/committed; registration/WhatsApp off; Production untouched |
| P6 | INFORMATIONAL | App uses raw env secret, not live KV reference — dual-entry risk continues |

**SECURITY REVIEW: PASS WITH CONDITIONS** (prerequisites still **BLOCKED**)

---

## 21. Automated Tests

`npm test`: **357 pass / 1 fail** — pre-existing `upstash-credentials` env flake (`APPOINTMENT_RATE_LIMIT_STORE=upstash`). **Not** an O-B-05E-P regression.

---

## 22. Typecheck

**PASS**

---

## 23. Lint

**PASS** (0 errors; 2 pre-existing unrelated warnings)

---

## 24. Build

**PASS**

---

## 25. Findings

1. Canonical naming confirmed; KV SoT for AUTH still empty.
2. Preview has AUTH/MFA **names** only.
3. Synthetic patient cannot be created via existing privileged provision without registration.
4. Synthetic mailbox must be operator-designated.
5. O-B-05E-R must not start until blockers below clear.

---

## 26. Remaining Blockers

1. Operator creates KV `staging-app-auth-session-secret` (≥32 random chars, staging-unique).
2. Operator updates Vercel Preview `AUTH_SESSION_SECRET` to match (dashboard).
3. Optionally KV + Preview `MFA_ENCRYPTION_KEY`.
4. Operator provisions synthetic psychologist (existing CLI) with staging credentials **outside Cursor**.
5. Operator establishes safe synthetic **patient** path (without enabling public registration) — may need a separately authorized staging seed task.
6. Operator designates synthetic mailbox.
7. O15 hosting remains separate.

---

## 27. Operator Actions Required

| # | Action | Where | Never |
| --- | --- | --- | --- |
| 1 | Create `staging-app-auth-session-secret` | Azure Portal → `kv-dr-vandana-staging` | Cursor / Git / docs value |
| 2 | Set Preview `AUTH_SESSION_SECRET` | Vercel → `dr-vandana-website` → Preview | CLI argv with value |
| 3 | Designate synthetic mailbox | Operator decision | Patient mailboxes |
| 4 | Provision synthetic psychologist | `db:provision` staging-only after AUTH usable | Paste passwords in chat |
| 5 | Resolve synthetic patient seed path | Separate controlled task if needed | Enable registration |

---

## 28. Independent Review

| # | Check | Result |
| --- | --- | --- |
| 1–2 | Staging only / Production untouched | **YES** |
| 3–5 | AUTH secret protected / not printed / not committed | **YES** |
| 6 | KV intended SoT | **YES** (value still absent) |
| 7 | Preview ≠ Production project | **YES** |
| 8 | Exact parity not claimed | **YES** |
| 9–10 | Registration / WhatsApp disabled | **YES** |
| 11–14 | SMTP unchanged; no email; no worker | **YES** |
| 15–16 | Synthetic identities missing honestly | **YES** |
| 17–18 | No clinical / schema change | **YES** |
| 19–20 | Tests run; Upstash flake distinguished | **YES** |
| 21 | No unrelated app changes | **YES** |
| 22 | O-B-05E-R ready? | **NO** until blockers cleared |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS** (task process); overall prerequisite outcome **BLOCKED**.

---

## 29. Recommendation for O-B-05E-R

**DO NOT START O-B-05E-R** until:

- KV `staging-app-auth-session-secret` = **PRESENT**
- Preview AUTH updated (operator-confirmed)
- Synthetic psychologist + patient + mailbox ready

Then: **O-B-05E-R — Staging Worker & Appointment Outbox E2E Verification** (CLI drain; hosted worker still O15).

---

## 30. Files Created

- `docs/O_B_05E_P_STAGING_RUNTIME_PREREQUISITES_REPORT.md`

## 31. Files Modified

**NONE** (application)

## 32. Database Changes

**NONE**

## 33. Production Changes

**NONE**

## 34. Git Status

- HEAD `7974175`
- Report untracked
- No secrets staged

## 35. Git Commit

**NONE**

## 36. GitHub Push

**NONE**

## 37. Final Status

**BLOCKED**

---

## Machine-readable footer

```text
O-B-05E-P COMPLETE
AUTH_SESSION_SECRET: ABSENT
KEY VAULT: BLOCKED
VERCEL PREVIEW: PASS WITH CONDITIONS
SECRET VALUE: NOT EXPOSED
SECRET PARITY: NOT VERIFIED
STAGING RUNTIME BOOT: BLOCKED
SYNTHETIC PATIENT: BLOCKED
SYNTHETIC PSYCHOLOGIST: NOT READY
SYNTHETIC MAILBOX: REQUIRED
SMTP: UNCHANGED
SMTP AUTH: NOT RUN
EMAIL: NOT SENT
WORKER: NOT EXECUTED
WORKER HOST: NOT ADDRESSED — O15 SEPARATE
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
PATIENT DATA: NOT USED
PRODUCTION: UNTOUCHED
DATABASE: STAGING ONLY / UNCHANGED
SECRET LEAKAGE: NONE DETECTED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
TESTS: 357 pass / 1 pre-existing Upstash fail
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
APPLICATION CHANGES: NONE (report only)
DATABASE CHANGES: NONE
PRODUCTION CHANGES: NONE
REPORT: docs/O_B_05E_P_STAGING_RUNTIME_PREREQUISITES_REPORT.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
NEXT CONTROLLED TASK: O-B-05E-R ONLY AFTER operator completes KV AUTH secret + synthetic identities/mailbox; do not start automatically
DO NOT START O-B-05E-R AUTOMATICALLY.
STOP.
```

# O-B-05D-R Staging SMTP Credential Provisioning & Verification Report

**Document type:** Staging-only SMTP App Password provisioning / verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D-R FINAL STATUS = BLOCKED
SMTP App Password in Azure Key Vault = ABSENT
SMTP AUTH = NOT RUN (blocked by missing approved secret)
SMTP DELIVERY = NOT RUN
MAILBOX RECEIPT = NOT VERIFIED
Non-password SMTP metadata in KV = CONFIGURED
Vercel Preview flags = VERIFIED (smtp / lab URL / registration false / WhatsApp false)
Vercel Preview SMTP_PASSWORD value = NOT VERIFIABLE (Secret; operator update required)
Production = UNTOUCHED
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
WhatsApp = DISABLED
Option C = BLOCKED
GIT COMMIT = NONE
GITHUB PUSH = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05D-R inspected the repository SMTP architecture and the approved staging secret boundary (`kv-dr-vandana-staging`). Non-password SMTP metadata secrets were provisioned into the staging Key Vault using the O-B-03 / O-B-05A naming map.

The **Gmail App Password** secret `staging-app-smtp-password` is **ABSENT**. Per hard safety rules, the operator must enter the newly generated App Password **only** through Azure Key Vault / Vercel approved UIs (never Cursor chat, Git, docs, or shell command-line arguments).

Because the approved secret path does not yet hold the App Password:

- SMTP authentication was **not** executed
- Synthetic email send was **not** executed
- Mailbox receipt was **not** verified
- Local gitignored `.env` was **not** used as a substitute for Key Vault (avoids claiming staging SoT success on an unverified / possibly revoked local value)

**Status: BLOCKED — SMTP SECRET VALUE REQUIRED — OPERATOR ACTION REQUIRED**

---

## 2. Authorization / Scope

| Allowed | Status |
| --- | --- |
| Staging Key Vault SMTP metadata | **DONE** (non-password names) |
| Staging App Password via secure operator path | **REQUIRED — NOT COMPLETE** |
| Vercel Preview inspection | **DONE** (names / non-secret flags) |
| Live SMTP auth / synthetic send | **NOT RUN** (blocked) |
| Production mutation | **FORBIDDEN / NOT DONE** |
| Registration enablement | **FORBIDDEN / NOT DONE** |
| WhatsApp / Twilio | **OUT OF SCOPE / NOT DONE** |
| Option C / clinical | **BLOCKED / NOT DONE** |
| DB schema / migrations | **NOT DONE** |
| Git commit / push | **NOT DONE** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` — **MATCHES EXPECTED** |
| App source modified this task | **NO** |
| `.env` tracked in Git | **NO** (`.gitignore` rule `.env*`) |
| Personal JPEG tracked | **NO** (remains untracked) |

---

## 4. SMTP Configuration

### 4.1 Application variable names (actual)

Canonical (preferred) and aliases from `src/config/appointment-email.ts`:

| Role | Canonical | Alias / optional |
| --- | --- | --- |
| Host | `SMTP_SERVER` | `SMTP_HOST` |
| Port | `SMTP_PORT` | — |
| Auth user | `SMTP_EMAIL` | `SMTP_USER` |
| Password | `SMTP_PASSWORD` | *(no alias)* |
| From address | `SMTP_FROM_EMAIL` | falls back to `SMTP_EMAIL` / `SMTP_USER` |
| From display name | `SMTP_FROM_NAME` | default website display string |
| Adapter mode | `EMAIL_PROVIDER` | expected `smtp` for staging |

### 4.2 Expected staging non-secret / sensitive config (names + stated intent only)

| Variable | Expected staging intent | Verified how |
| --- | --- | --- |
| `SMTP_HOST` / `SMTP_SERVER` | `smtp.gmail.com` | Task baseline; KV metadata set |
| `SMTP_PORT` | `587` | Task baseline; KV metadata set |
| `SMTP_USER` / `SMTP_EMAIL` | `ravishori@gmail.com` | Task baseline; KV metadata set |
| `SMTP_FROM_EMAIL` | `dr.vandanarchaudhary@gmail.com` | Task baseline; KV metadata set |
| `SMTP_FROM_NAME` | `Dr. Vandana Rajiv Chaudhary` | Task baseline; KV metadata set |
| `SMTP_PASSWORD` | New Gmail App Password | **VALUE MISSING in KV** |
| `EMAIL_PROVIDER` | `smtp` | Vercel Preview Config **VERIFIED** |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` | Vercel Preview Config **VERIFIED** |

### 4.3 Implementation (unchanged)

| Item | Finding |
| --- | --- |
| Library | Nodemailer |
| Identity path | `createSmtpEmailService()` — synchronous send |
| Appointment path | Notification adapter + outbox + worker (worker **not** provisioned in this task) |
| Port 587 | `secure=false`, `requireTLS=true` (STARTTLS) |
| Port 465 | `secure=true` |
| `rejectUnauthorized=false` | **NOT PRESENT** in inspected transport construction |
| Code change required | **NO** — defect is credential provisioning, not transport code |

---

## 5. Secret Manager Status

**Vault:** `kv-dr-vandana-staging`  
**Resource group:** `rg-dr-vandana-staging` (per O-B-05A)  
**Approved Azure physical name for App Password:** `staging-app-smtp-password`  
**Logical name (O-B-03):** `staging/app/smtp-password`  
**App env:** `SMTP_PASSWORD`

### 5.1 SMTP-related secrets (NAMES ONLY)

| Azure KV name | App env | Class | Presence | Value status | Updated (UTC) |
| --- | --- | --- | --- | --- | --- |
| `staging-app-smtp-server` | `SMTP_SERVER` / `SMTP_HOST` | SENSITIVE | **PRESENT** | **VALUE CONFIGURED** | 2026-08-30T15:10:31Z |
| `staging-app-smtp-port` | `SMTP_PORT` | NON-SECRET | **PRESENT** | **VALUE CONFIGURED** | 2026-08-30T15:10:32Z |
| `staging-app-smtp-username` | `SMTP_EMAIL` / `SMTP_USER` | SENSITIVE | **PRESENT** | **VALUE CONFIGURED** | 2026-08-30T15:10:33Z |
| `staging-app-smtp-from-email` | `SMTP_FROM_EMAIL` | SENSITIVE | **PRESENT** | **VALUE CONFIGURED** | 2026-08-30T15:10:35Z |
| `staging-app-smtp-from-name` | `SMTP_FROM_NAME` | NON-SECRET | **PRESENT** | **VALUE CONFIGURED** | 2026-08-30T15:10:36Z |
| `staging-app-smtp-password` | `SMTP_PASSWORD` | **SECRET** | **ABSENT** | **VALUE MISSING** | N/A |

Also present (unrelated to this mutation set): `staging-app-database-url` (from O-B-05C).

### 5.2 STOP condition (Phase 2 / 3)

```text
SMTP SECRET VALUE REQUIRED — OPERATOR ACTION REQUIRED
```

Do **not** paste the App Password into Cursor chat, Git, documentation, source, or shell history.

#### Operator workflow (Azure Portal — preferred)

1. Open Azure Portal → Key Vault **`kv-dr-vandana-staging`**.
2. **Secrets** → **Generate/Import**.
3. Name (exact): **`staging-app-smtp-password`**.
4. Paste the **new** Gmail App Password **only** in the Portal secret value field.
5. Save. Confirm the secret **name** appears in the list. Do not screenshot the value.
6. Notify the controlled verification pass that the secret name is present (no value).

#### Operator workflow (Azure CLI — only if Portal unavailable)

Use an interactive secure prompt on the operator workstation so the value is **not** placed in Cursor chat and **not** passed as a visible CLI argv string. Prefer Portal if uncertain.

After the secret exists, re-run O-B-05D-R verification phases (auth → one synthetic send → mailbox check).

---

## 6. Vercel Preview Secret Status

**Project (staging/lab):** `dr-vandana-website`  
**Production project (must stay untouched):** `drvandana-psychology`

### 6.1 Preview non-secret flags (VERIFIED)

| Variable | Preview value | Status |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `smtp` | **PASS** |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` | **PASS** |
| `PATIENT_REGISTRATION_ENABLED` | `false` | **PASS** |
| `TWILIO_WHATSAPP_ENABLED` | `false` | **PASS** |

### 6.2 Preview SMTP secret **names**

| Variable | Type | Environment | Value readable via CLI pull | Status |
| --- | --- | --- | --- | --- |
| `SMTP_SERVER` | Secret | Preview | No (`[SENSITIVE]` placeholder) | Name **PRESENT**; value **NOT VERIFIED** |
| `SMTP_PORT` | Secret | Preview | No | Name **PRESENT**; value **NOT VERIFIED** |
| `SMTP_EMAIL` | Secret | Preview | No | Name **PRESENT**; value **NOT VERIFIED** |
| `SMTP_PASSWORD` | Secret | Preview | No | Name **PRESENT**; value **NOT VERIFIED** (age ~5d — treat as **stale vs new App Password**) |

```text
VERCEL SMTP SECRET WIRING — OPERATOR ACTION REQUIRED
```

No automated Key Vault → Vercel sync identity is configured (O-B-05A: staging application identity still required). Therefore the App Password must be entered in the **Vercel dashboard** for project **`dr-vandana-website`**, environment **Preview**, variable **`SMTP_PASSWORD`**, after (or together with) Key Vault population.

Do **not** put the password in Git, `.env.example`, Cursor, or docs.

### 6.3 Production Vercel (read-only observation)

Project `drvandana-psychology` shows pre-existing Production SMTP secret **names** (ages ~21d). **No Production env vars were created, updated, or deleted in this task.**

---

## 7. SMTP TLS Verification

| Check | Result |
| --- | --- |
| Intended port | **587** |
| Code path for 587 | STARTTLS via `requireTLS: true` | 
| Insecure cert bypass in code | **NOT FOUND** |
| Live TLS handshake this task | **NOT RUN** (auth blocked) |
| Overall | **PARTIAL** — code path OK; live TLS **NOT VERIFIED** |

---

## 8. SMTP Authentication Result

| Check | Result |
| --- | --- |
| Mechanism available | Nodemailer `createTransport` + `verify` / `sendMail` |
| Executed this task | **NO** |
| Reason | Approved KV App Password **ABSENT**; local `.env` not used as staging SoT |
| Result | **BLOCKED** / **NOT VERIFIED** |

Possible operator checks **after** Portal/Vercel update (do not guess which applies until retested):

- New App Password entered (old revoked password discarded)
- 2-Step Verification enabled on the Gmail account that owns the App Password
- `SMTP_USER` / `SMTP_EMAIL` matches the App Password account (`ravishori@gmail.com`)
- Preview `SMTP_PASSWORD` updated to the **new** secret
- Sender alias permissions (separate from AUTH)

---

## 9. Sender Identity Result

| Item | Status |
| --- | --- |
| Auth user (intended) | `ravishori@gmail.com` |
| From address (intended) | `dr.vandanarchaudhary@gmail.com` |
| Live Gmail From permission proof | **NOT VERIFIED** |
| Overall | **SENDER IDENTITY — NOT VERIFIED** |

No automatic sender reconfiguration performed.

---

## 10. Synthetic Email Result

| Item | Status |
| --- | --- |
| Prerequisite AUTH | Not satisfied |
| Send attempted | **NO** |
| Result | **BLOCKED** / **NOT RUN** |

---

## 11. Mailbox Receipt Result

| Item | Status |
| --- | --- |
| Mailbox receipt | **NOT VERIFIED** |
| Note | SENT ≠ DELIVERED ≠ RECEIVED ≠ READ |

---

## 12. Outbox / Worker Result

| Item | Status |
| --- | --- |
| Outbox live test | **NOT RUN** |
| Worker hosting | **NOT PROVISIONED** (separate controlled task) |
| Overall | **OUTBOX/WORKER LIVE TEST — BLOCKED BY WORKER PROVISIONING** (and by missing SMTP App Password for any live mail path) |

Identity SMTP path can send without the appointment worker; that path was still **not** exercised because credentials are not in the approved staging SoT.

---

## 13. Registration Safety Result

| Check | Result |
| --- | --- |
| Preview `PATIENT_REGISTRATION_ENABLED` | `false` |
| Gate changed this task | **NO** |
| Patient account created | **NO** |
| Overall | **IMPLEMENTED BUT SAFELY DISABLED** |

---

## 14. WhatsApp Safety Result

| Check | Result |
| --- | --- |
| Preview `TWILIO_WHATSAPP_ENABLED` | `false` |
| Twilio configured this task | **NO** |
| WhatsApp send | **NO** |
| Overall | **DISABLED** / Twilio **OUT OF SCOPE** |

---

## 15. Production Safety Result

| Check | Result |
| --- | --- |
| Production Vercel env mutated | **NO** |
| Production Key Vault mutated | **NO** (staging vault only) |
| Production SMTP used for test | **NO** |
| Production database accessed | **NO** |
| Overall | **UNTOUCHED** |

---

## 16. Security Review

| ID | Class | Finding | Disposition |
| --- | --- | --- | --- |
| SEC-01 | INFORMATIONAL | Workspace search tools can match gitignored `.env` lines. Agent must never copy secret **values** into reports/chat. | Contained: value **not** written to this report; `.env` **not** tracked |
| SEC-02 | HIGH (operational) | Staging App Password not yet in Key Vault; Preview Secret may still hold a **revoked** prior App Password | Operator must set **new** password in KV + Vercel Preview |
| SEC-03 | INFORMATIONAL | No Key Vault → Vercel sync identity yet | Manual dual entry required |
| SEC-04 | PASS | No `NEXT_PUBLIC_SMTP_*`; password is server-side only in code | OK |
| SEC-05 | PASS | No Production secret mutation | OK |
| SEC-06 | PASS | No clinical/patient content generated | OK |
| SEC-07 | PASS | Registration/WhatsApp remain false on Preview | OK |

**No CRITICAL committed-secret finding** (`.env` not in Git index).

If a secret value ever appears in terminal output, Git, or a tracked file: **STOP** and rotate immediately.

**SECURITY REVIEW:** **PASS WITH CONDITIONS** (operator must complete App Password entry; local `.env` hygiene remains operator-owned).

---

## 17. Tests

| Suite | Result | Notes |
| --- | --- | --- |
| `npm test` (filtered run completed full suite path in practice) | **347 pass / 1 fail** | Pre-existing env flake: `APPOINTMENT_RATE_LIMIT_STORE=upstash` → expects `misconfigured`, gets `upstash` |
| Live SMTP auth test | **NOT RUN** | Blocked |
| Application source changes | **NONE** | No new unit failures introduced by this task |

---

## 18. Findings

1. **BLOCKER:** `staging-app-smtp-password` **ABSENT** in `kv-dr-vandana-staging`.
2. **PARTIAL SUCCESS:** Non-password SMTP metadata secrets **CONFIGURED** in staging KV.
3. **WIRING GAP:** Vercel Preview SMTP Secrets exist by **name** but values are not CLI-verifiable; Preview `SMTP_PASSWORD` must be updated by operator after new App Password generation.
4. **NO LIVE PROOF** of AUTH, delivery, sender identity, or mailbox receipt in this pass.
5. Prior O-B-05D `EAUTH` remains unexplained until the new App Password is provisioned and retested.
6. Application SMTP code does not require change for this blocker.

---

## 19. Remaining Blockers

1. Operator enters **new** Gmail App Password into KV secret `staging-app-smtp-password` (Portal).
2. Operator updates Vercel Preview `SMTP_PASSWORD` on `dr-vandana-website` (dashboard).
3. Controlled re-verification: AUTH → one synthetic email → mailbox receipt.
4. Sender identity (From alias) still needs live proof.
5. Appointment outbox delivery still depends on worker provisioning (future O-B-05E-class task).
6. Staging app identity for KV sync remains open (O-B-05A).

---

## 20. Rollback

### Mutations performed this task

| Item | Location | Previous | New | Rollback | Verification |
| --- | --- | --- | --- | --- | --- |
| `staging-app-smtp-server` | `kv-dr-vandana-staging` | ABSENT | PRESENT | `az keyvault secret delete --vault-name kv-dr-vandana-staging --name staging-app-smtp-server` | `az keyvault secret list` no longer lists name |
| `staging-app-smtp-port` | same | ABSENT | PRESENT | delete name as above | list |
| `staging-app-smtp-username` | same | ABSENT | PRESENT | delete name as above | list |
| `staging-app-smtp-from-email` | same | ABSENT | PRESENT | delete name as above | list |
| `staging-app-smtp-from-name` | same | ABSENT | PRESENT | delete name as above | list |
| `staging-app-smtp-password` | same | ABSENT | **still ABSENT** | N/A | show → NotFound |

**Vercel:** no Preview/Production env mutations performed this task.  
**App source:** no mutations.  
**Database:** no mutations.

Soft-deleted Key Vault secrets remain recoverable until purge (purge protection enabled on vault per O-B-05A).

---

## 21. Independent Review

Reviewed as if another engineer performed the work.

| # | Question | Answer |
| --- | --- | --- |
| 1 | Secret exposed in report/chat intentionally? | **NO** (values omitted) |
| 2 | Secret committed? | **NO** |
| 3 | Production untouched? | **YES** |
| 4 | Registration OFF? | **YES** |
| 5 | WhatsApp OFF? | **YES** |
| 6 | Only staging modified? | **YES** (staging KV metadata only) |
| 7 | SMTP auth genuinely verified? | **NO** — honestly **NOT RUN** |
| 8 | Synthetic delivery verified? | **NO** |
| 9 | Sender identity verified? | **NO** |
| 10 | Failures/blockers honest? | **YES** |
| 11 | Credentials invented? | **NO** |
| 12 | Clinical records created? | **NO** |
| 13 | Option C changes? | **NO** |
| 14 | Rollback documented? | **YES** |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

Conditions: overall task outcome is **BLOCKED** on operator App Password entry; live SMTP claims must remain **NOT VERIFIED** until a follow-up verification pass succeeds.

---

## 22. Final Status

**O-B-05D-R = BLOCKED** — staging SMTP App Password not yet present in the approved Key Vault path; auth and synthetic delivery therefore not executed.

---

## 23. Recommended Next Controlled Task

**O-B-05D-R2 — Staging SMTP Auth & Synthetic Delivery Verification**

Prerequisites (operator, outside Cursor):

1. Create KV secret `staging-app-smtp-password` with the **new** App Password.
2. Update Vercel Preview `SMTP_PASSWORD` on `dr-vandana-website`.
3. Confirm secret **names** only to the verification agent.

Then the agent may run AUTH → one synthetic message → mailbox receipt, still without printing secrets.

Do **not** start Twilio/WhatsApp or enable registration.

---

## 24. Files Created

- `docs/O_B_05D_R_STAGING_SMTP_CREDENTIAL_PROVISIONING_VERIFICATION_REPORT.md`

## 25. Files Modified

- None (application / tracked config). Working tree already had prior O-B docs / `.env.example` modifications from earlier tasks.

## 26. Application Changes

**NONE**

## 27. Database Changes

**NONE**

## 28. Production Changes

**NONE**

## 29. Git Status (summary)

- HEAD remains `7974175`
- New untracked report file for this task
- Prior untracked O-B documentation set remains
- Personal JPEG remains untracked
- No commit / no push

## 30. Checkpoint Recommendation

**DOCUMENTATION CHECKPOINT RECOMMENDED** (report only; contains no secrets).

**STAGING SMTP CONFIGURATION CHECKPOINT:** **NOT YET READY** until App Password is in KV + Preview and AUTH/send are verified.

Do **not** commit automatically.

---

## Machine-readable summary

```text
O-B-05D-R FINAL STATUS:
BLOCKED

SMTP AUTH:
BLOCKED

SMTP DELIVERY:
BLOCKED

MAILBOX RECEIPT:
NOT VERIFIED

SENDER IDENTITY:
NOT VERIFIED

AZURE KEY VAULT:
PARTIAL

VERCEL PREVIEW:
PARTIAL

REGISTRATION:
IMPLEMENTED BUT SAFELY DISABLED

WHATSAPP:
DISABLED

PRODUCTION:
UNTOUCHED

REAL PATIENT DATA:
NOT USED

OPTION C:
BLOCKED

SECURITY REVIEW:
PASS WITH CONDITIONS

INDEPENDENT REVIEW:
PASS WITH CONDITIONS

GIT COMMIT:
NONE

GITHUB PUSH:
NONE

CHECKPOINT:
DOCUMENTATION CHECKPOINT RECOMMENDED (SMTP config checkpoint NOT YET READY)

NEXT CONTROLLED TASK:
O-B-05D-R2 — Staging SMTP Auth & Synthetic Delivery Verification (after operator Portal/Vercel App Password entry)

STOP.
```

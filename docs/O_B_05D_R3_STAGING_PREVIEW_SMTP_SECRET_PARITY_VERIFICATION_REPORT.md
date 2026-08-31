# O-B-05D-R3 Staging Preview SMTP Secret Parity Verification Report

**Document type:** Staging-only Vercel Preview ↔ Azure Key Vault SMTP secret parity verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D-R3 FINAL STATUS = BLOCKED
KEY VAULT SECRET = PRESENT
VERCEL PREVIEW SMTP_PASSWORD = PRESENT
SECRET VALUE = NOT EXPOSED
EXACT SECRET PARITY = NOT VERIFIED
PREVIEW SMTP RUNTIME AUTH = NOT RUN
REASON = NO PROVIDER LINKAGE + PREVIEW LISTING AGE STALE VS KV UPDATE
SYNTHETIC EMAIL THIS TASK = NOT SENT (not required / not authorized to auto-send)
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
WhatsApp = DISABLED
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05D-R3 inspected whether Vercel Preview `SMTP_PASSWORD` on project `dr-vandana-website` can be proven to match Azure Key Vault secret `staging-app-smtp-password` **without exposing secret values**.

| Claim | Result |
| --- | --- |
| 1. Key Vault secret exists | **PRESENT** (enabled; current version present) |
| 2. Vercel Preview variable exists | **PRESENT** (Secret; Preview-scoped) |
| 3. KV and Vercel reference the **same** secret | **NOT VERIFIED** |
| 4. Preview runtime can authenticate to SMTP | **NOT RUN** / **NOT VERIFIED** |
| 5. SMTP provider accepts a message (this task) | **NOT RUN** (O-B-05D-R2 already proved KV-path SMTP) |

**Safe staleness evidence:** Key Vault secret `created`/`updated` = `2026-08-30T15:19:24Z`. Vercel Preview `SMTP_PASSWORD` listing age remains approximately **5 days** (unchanged relative to O-B-05D-R2), while Preview `DATABASE_URL` listing age is much newer (~41m), showing Vercel **does** refresh listing ages when values change. Therefore “same variable name” does **not** imply “current App Password.”

No Azure↔Vercel secret integration/resources were found. O-B-05A already recorded that staging application identity for Key Vault get-secret is **not** configured. Application Preview runtime reads `process.env.SMTP_PASSWORD` from **Vercel**, not directly from Key Vault.

**Final status: BLOCKED** — exact Preview↔KV parity cannot be proven; Preview listing age indicates a **stale-secret risk** versus the new KV App Password. No synthetic email was sent in this task.

---

## 2. Authorization / Scope

| Item | Status |
| --- | --- |
| Staging Key Vault metadata inspection | **DONE** |
| Vercel Preview metadata inspection | **DONE** |
| Secret value retrieval for display/compare | **FORBIDDEN / NOT DONE** |
| Production project/secret access | **FORBIDDEN / NOT DONE** |
| Credential rotation | **FORBIDDEN / NOT DONE** |
| Synthetic email | **NOT SENT** |
| Worker / Twilio / registration / Option C | **OUT OF SCOPE / NOT DONE** |
| Git commit / push | **NONE** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` — **MATCHES** |
| Application source modified this task | **NO** |
| Temporary env pull file | Created then **deleted** |

### How `SMTP_PASSWORD` is consumed

| Layer | Behavior |
| --- | --- |
| Application | `getSmtpTransportConfig()` reads `process.env.SMTP_PASSWORD` (server-only; no `NEXT_PUBLIC_`) |
| Vercel Preview runtime | Env injection from Vercel project secrets → **SMTP_PASSWORD source: VERCEL** |
| Azure Key Vault | Approved staging SoT name `staging-app-smtp-password` — **not auto-injected** into Vercel today |
| Hard-coded password in source | **NOT FOUND** |

**SMTP_PASSWORD source (Preview runtime): VERCEL**  
**SMTP_PASSWORD source (approved staging SoT): KEY VAULT**  
**Automated bridge: ABSENT / UNKNOWN (no integration found)**

---

## 4. Staging Environment

| Item | Value |
| --- | --- |
| Vercel project | `dr-vandana-website` |
| Environment | **Preview** |
| Lab URL config | `APP_BASE_URL=https://drvandana.trinetralab.net` |
| Key Vault | `kv-dr-vandana-staging` |
| PostgreSQL (expected) | `pg-dr-vandana-staging` / `dr_vandana_db_staging` |
| Production project (must stay untouched) | `drvandana-psychology` |

---

## 5. Key Vault Verification

**Vault:** `kv-dr-vandana-staging`  
**Secret name:** `staging-app-smtp-password`

| Field | Safe result |
| --- | --- |
| KEY VAULT SECRET | **PRESENT** |
| SECRET VALUE | **NOT EXPOSED** |
| SECRET ENABLED | **YES** |
| CURRENT VERSION | **PRESENT — VALUE REDACTED** (version id fingerprint present; not a secret) |
| created | `2026-08-30T15:19:24+00:00` |
| updated | `2026-08-30T15:19:24+00:00` |
| expires | **null** (none configured) |
| contentType | **null** |
| recovery | Recoverable / 90 days |

Version count observed: **1** enabled version (same created/updated timestamp).

---

## 6. Vercel Preview Verification

**Project:** `dr-vandana-website`  
**Environment:** Preview  
**Variable:** `SMTP_PASSWORD`

| Field | Safe result |
| --- | --- |
| VERCEL PREVIEW SMTP_PASSWORD | **PRESENT** |
| VALUE | **NOT EXPOSED** |
| Type | Secret (Hidden; CLI pull returns `[SENSITIVE]` placeholder) |
| Environment scope | Preview |
| Listing age (safe metadata) | approximately **5d** (unchanged vs O-B-05D-R2 observation) |

### Related Preview flags (non-secret)

| Variable | Result |
| --- | --- |
| `EMAIL_PROVIDER` | `smtp` |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `DATABASE_URL` | **PRESENT — VALUE REDACTED** |
| `SMTP_SERVER` / `SMTP_PORT` / `SMTP_EMAIL` | **PRESENT — VALUE REDACTED** |

### Integration / linkage

| Check | Result |
| --- | --- |
| `vercel integration` / linked resources | **No resources found** |
| `vercel.json` secret reference | **ABSENT** |
| O-B-05A app identity for KV get-secret | **STAGING APPLICATION IDENTITY REQUIRED** (not configured) |

---

## 7. Secret Parity Method

Preferred evidence order evaluated:

| Method | Available? | Result |
| --- | --- | --- |
| A. Provider-managed secret reference/version linkage | **NO** | Cannot prove |
| B. Same secret-manager integration/reference | **NO** | Cannot prove |
| C. Safe version/deployment reference shared across systems | **NO** | Vercel does not expose KV version linkage |
| D. Controlled Preview runtime AUTH | **NOT RUN** | Would require Preview-hosted verify or controlled send |
| E. Other crypto-safe non-reversible shared evidence | **NO** | Not available without retrieving values |

**Staleness analysis (safe metadata only):**

| Store | Update signal |
| --- | --- |
| Key Vault `staging-app-smtp-password` | Updated **2026-08-30T15:19:24Z** (today) |
| Vercel Preview `SMTP_PASSWORD` | Listing age still ~**5d** |
| Vercel Preview `DATABASE_URL` (contrast) | Listing age ~**41m** (shows ages move when updated) |

**PARITY: NOT VERIFIED**

Do **not** assume: same name = same value.  
Do **not** assume: O-B-05D-R2 KV AUTH PASS = Preview secret parity.

---

## 8. Preview Runtime Verification

| Item | Result |
| --- | --- |
| Safe Preview health/verify path for SMTP without send | **NOT FOUND** in repository for hosted Preview |
| Preview runtime AUTH executed | **NOT RUN** |
| Classification | **NOT VERIFIED — PREVIEW RUNTIME AUTHENTICATION REQUIRES CONTROLLED SYNTHETIC SEND** (or a future Preview-hosted verify endpoint) |

No automatic synthetic email was performed (per task rules and prior O-B-05D-R2 coverage of the **KV** path).

---

## 9. SMTP Verification

| Path | Status |
| --- | --- |
| O-B-05D-R2 KV-sourced AUTH / synthetic SMTP acceptance | **PASS** (prior controlled task; not re-executed) |
| Preview-env-sourced AUTH this task | **NOT VERIFIED** |
| Overall for R3 objective | **NOT VERIFIED** (Preview path) / prior KV SMTP **PASS WITH CONDITIONS** remains historical evidence only |

---

## 10. Database Target Verification

| Item | Result |
| --- | --- |
| Preview `DATABASE_URL` | **PRESENT — VALUE REDACTED** |
| Host/db re-opened this task | **NO** (CLI Secret pull is placeholder-only) |
| Prior O-B-05C staging target proof | `pg-dr-vandana-staging` / `dr_vandana_db_staging` / TLS require |
| This task | **STAGING VERIFIED** by **prior O-B-05C chain-of-custody**; **not independently re-probed** here |
| Schema modified | **NO** |

**DATABASE TARGET: STAGING VERIFIED** (inherited evidence; value not exposed)  
**TLS: VERIFIED** (inherited from O-B-05C; not retested this task)

---

## 11. Registration Safety

| Check | Result |
| --- | --- |
| Preview `PATIENT_REGISTRATION_ENABLED` | `false` |
| Patient account created | **NO** |
| Overall | **IMPLEMENTED BUT SAFELY DISABLED** |

---

## 12. WhatsApp Safety

| Check | Result |
| --- | --- |
| Preview `TWILIO_WHATSAPP_ENABLED` | `false` |
| Twilio configured | **NO** |
| Overall | **DISABLED** |

---

## 13. Production Isolation

| Check | Result |
| --- | --- |
| Production Vercel project mutated | **NO** |
| Production Key Vault accessed | **NO** |
| Production DB / SMTP changed | **NO** |
| Overall | **UNTOUCHED** |

Note: `vercel project ls` shows `drvandana-psychology` exists; it was **not** targeted for env mutation or secret retrieval.

---

## 14. Secret Leakage Review

| Surface | Result |
| --- | --- |
| Terminal | Metadata/status only |
| Env pull temp file | Deleted; Secrets were `[SENSITIVE]` placeholders |
| Documentation | Names/status only |
| Git | No secret files staged |
| Value compare/hash of live secrets | **NOT PERFORMED** (would require forbidden retrieval for display/compare) |

**SECRET LEAKAGE: NONE DETECTED**

---

## 15. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| R3-S1 | **HIGH** (ops) | Preview `SMTP_PASSWORD` listing age ~5d while KV App Password updated today → **stale Preview secret risk** (may still hold revoked prior App Password) |
| R3-S2 | MEDIUM | No Key Vault → Vercel sync; dual-entry drift is structural until app identity + sync exists |
| R3-S3 | INFORMATIONAL | Preview Secrets are non-retrievable via CLI — good for confidentiality, blocks agent-side value parity proof |
| R3-S4 | PASS | Registration/WhatsApp remain false; Production untouched; no secret printed |
| R3-S5 | INFORMATIONAL | O-B-05D-R2 AUTH used KV directly, not Preview runtime — must not be misread as Preview parity |

**SECURITY REVIEW: PASS WITH CONDITIONS** (HIGH stale-Preview finding remains open)

---

## 16. Independent Review

| # | Question | Answer |
| --- | --- | --- |
| 1 | Only staging inspected? | **YES** |
| 2 | Production protected? | **YES** |
| 3 | KV value never exposed? | **YES** |
| 4 | Vercel value never exposed? | **YES** |
| 5 | Preview variable definitely exists? | **YES** |
| 6 | KV secret definitely exists? | **YES** |
| 7 | Exact parity proven? | **NO** |
| 8 | What evidence exists? | Both **PRESENT**; **no linkage**; Preview age **stale** vs KV update; DATABASE_URL age contrast shows updates refresh listings |
| 9 | Preview runtime SMTP AUTH proven? | **NO** |
| 10 | Another synthetic email necessary/sent? | **Not sent**; would only help Preview runtime proof after operator updates Preview secret |
| 11 | Patient data used? | **NO** |
| 12 | Registration disabled? | **YES** |
| 13 | WhatsApp disabled? | **YES** |
| 14 | App files modified? | **NO** |
| 15 | DB modified? | **NO** |
| 16 | Secrets committed? | **NO** |
| 17 | Another controlled task required? | **YES** — operator Preview secret update, then optional Preview runtime AUTH |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**  
(Verification process honest and safe; parity objective remains **BLOCKED** / **NOT VERIFIED**.)

---

## 17. Test Matrix

| Area | Result |
| --- | --- |
| Repository baseline | **PASS** |
| KV secret exists | **PASS** |
| Vercel Preview var exists | **PASS** |
| Exact secret parity | **NOT VERIFIED** |
| Preview runtime AUTH | **NOT RUN** |
| Synthetic email (this task) | **NOT RUN** |
| Preview flags / gates | **PASS** |
| Database target | **PASS WITH CONDITIONS** (inherited O-B-05C) |
| Secret leakage | **PASS** |
| Production isolation | **PASS** |
| Registration | **PASS** |
| WhatsApp | **PASS** |

---

## 18. Findings

1. KV `staging-app-smtp-password` is **PRESENT** and enabled (updated today).
2. Vercel Preview `SMTP_PASSWORD` is **PRESENT** but listing age remains ~**5d**.
3. No provider linkage exists between KV and Vercel for this secret.
4. Exact parity is **NOT VERIFIED**; stale Preview risk is **HIGH**.
5. Preview runtime SMTP authentication was **not** executed; another synthetic send was **not** performed.
6. Application continues to consume `SMTP_PASSWORD` from environment (Vercel on Preview), not live from Key Vault.

---

## 19. Remaining Blockers

1. **Operator action (dashboard only):** Update Vercel Preview `SMTP_PASSWORD` on `dr-vandana-website` to the **current** staging App Password already stored in Key Vault. Do **not** paste into Cursor.
2. After update, confirm Vercel listing age for `SMTP_PASSWORD` refreshes (safe metadata).
3. Optional follow-up: controlled Preview runtime AUTH / one synthetic send (**O-B-05D-R4**) only after Preview update.
4. Longer-term: staging app identity + Key Vault sync so dual-entry drift cannot recur (separate architecture task).

---

## 20. Recommendation

**CHECKPOINT:** DOCUMENTATION CHECKPOINT RECOMMENDED (this report; no secrets).

**NEXT CONTROLLED TASK (recommendation only — do not auto-start):**

1. **Operator:** Vercel Preview `SMTP_PASSWORD` update (dashboard).  
2. Then **O-B-05D-R4 — Preview Runtime SMTP Auth Verification** (optional one synthetic send if required).  
3. Only after Preview parity confidence: consider **O-B-05E — Staging Worker / Notification Outbox Delivery**.

Do **not** enable registration, WhatsApp, or Twilio by default.

---

## 21. Files Created

- `docs/O_B_05D_R3_STAGING_PREVIEW_SMTP_SECRET_PARITY_VERIFICATION_REPORT.md`

## 22. Files Modified

- None by this task (application). Prior unrelated doc modifications remain in the working tree.

## 23. Application Changes

**NONE**

## 24. Database Changes

**NONE**

## 25. Production Changes

**NONE**

## 26. Git Status

- HEAD: `7974175`
- New untracked report for this task
- Prior untracked O-B docs remain
- Personal JPEG remains untracked
- No commit

## 27. Git Commit

**NONE**

## 28. GitHub Push

**NONE**

## 29. Final Status

**BLOCKED**

Both stores have the SMTP password **name** present, but **exact secret parity is NOT VERIFIED**, Preview listing age indicates likely staleness versus today’s Key Vault App Password, and Preview runtime authentication was **not** run.

---

## Explicit claim separation (required)

| # | Claim | Status |
| --- | --- | --- |
| 1 | KEY VAULT SECRET EXISTS | **YES** |
| 2 | VERCEL PREVIEW VARIABLE EXISTS | **YES** |
| 3 | KEY VAULT AND VERCEL REFERENCE THE SAME SECRET | **NOT VERIFIED** |
| 4 | PREVIEW RUNTIME CAN AUTHENTICATE TO SMTP | **NOT VERIFIED** |
| 5 | SMTP PROVIDER ACCEPTS A MESSAGE (this task) | **NOT RUN** |

---

## Machine-readable footer

```text
O-B-05D-R3 COMPLETE
KEY VAULT SECRET: PRESENT
VERCEL PREVIEW SMTP_PASSWORD: PRESENT
SECRET VALUE: NOT EXPOSED
EXACT SECRET PARITY: NOT VERIFIED
PREVIEW SMTP RUNTIME AUTH: NOT RUN
SMTP: NOT VERIFIED (Preview path); prior KV-path PASS remains O-B-05D-R2 only
DATABASE TARGET: STAGING VERIFIED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
PRODUCTION: UNTOUCHED
SECRET LEAKAGE: NONE DETECTED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
APPLICATION CHANGES: NONE
DATABASE CHANGES: NONE
PRODUCTION CHANGES: NONE
GIT COMMIT: NONE
GITHUB PUSH: NONE
REPORT: docs/O_B_05D_R3_STAGING_PREVIEW_SMTP_SECRET_PARITY_VERIFICATION_REPORT.md
NEXT CONTROLLED TASK: Operator Preview SMTP_PASSWORD dashboard update → then O-B-05D-R4 Preview runtime AUTH (optional) → later O-B-05E worker/outbox
STOP.
```

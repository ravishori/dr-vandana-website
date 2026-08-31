# O-B-05D-R4 Staging Vercel Preview SMTP Runtime Authentication Report

**Document type:** Staging-only Vercel Preview runtime SMTP AUTH verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D-R4 FINAL STATUS = BLOCKED
KEY VAULT SECRET = PRESENT
VERCEL PREVIEW SMTP_PASSWORD = PRESENT
SECRET VALUE = NOT EXPOSED
EXACT SECRET PARITY = NOT VERIFIED
PREVIEW SMTP RUNTIME AUTH = NOT VERIFIED — NO SAFE EXISTING RUNTIME VERIFICATION PATH
SMTP SEND = NOT RUN
APPLICATION CHANGES = NONE
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05D-R4 attempted to close the O-B-05D-R3 blocker by proving **Vercel Preview runtime** SMTP authentication for project `dr-vandana-website`.

Inspection found:

| Capability | Result |
| --- | --- |
| Preview deployment exists (`Environment=Preview`, Ready) | **YES** |
| Preview `SMTP_PASSWORD` variable exists | **PRESENT** |
| KV `staging-app-smtp-password` exists | **PRESENT** |
| Existing hosted Preview SMTP AUTH / `transporter.verify` endpoint | **ABSENT** |
| Existing script that authenticates without sending (and can run **on Preview**) | **ABSENT** |
| CLI ability to pull Preview Secret values for local AUTH using Preview env | **BLOCKED** (Secrets returned as `[SENSITIVE]` only) |
| Application source change to add verify path | **FORBIDDEN** by this task |

Per authorization §4 / §17: **do not invent** a new verification mechanism that weakens security, and **do not modify application source**. Therefore Preview runtime SMTP AUTH was **not executed**.

**PREVIEW RUNTIME AUTH: NOT VERIFIED — NO SAFE EXISTING RUNTIME VERIFICATION PATH**

**Final status: BLOCKED**

Operator statement that Preview `SMTP_PASSWORD` was updated is acknowledged; listing age metadata for `SMTP_PASSWORD` still showed approximately **5d** at inspection time (while `DATABASE_URL` showed ~53m). Exact KV↔Vercel parity remains **NOT VERIFIED**. No synthetic email was sent.

---

## 2. Authorization / Scope

| Allowed | Done |
| --- | --- |
| Inspect existing SMTP / verify tooling | **YES** |
| Inspect Preview deployment + env **names**/flags | **YES** |
| Inspect KV secret **metadata** | **YES** |
| Modify application to add verify endpoint | **NO (forbidden)** |
| Pull/print Preview Secret values | **NO (impossible / forbidden)** |
| Synthetic email | **NOT RUN** (default policy; not required path available) |
| Production mutation | **NO** |
| Registration / WhatsApp / Twilio / worker | **NO** |
| Git commit / push | **NO** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` — **MATCHES** |
| Application source modified this task | **NO** |

### SMTP consumption (unchanged)

| Component | Behavior |
| --- | --- |
| Config | `getSmtpTransportConfig()` / `getSmtpConfigurationStatus()` — presence only; **no AUTH** |
| Identity send | `createSmtpEmailService()` — Nodemailer `sendMail` (AUTH only as side effect of send) |
| Startup | `validateServerConfigAtStartup()` — config completeness logs; **no `transporter.verify()`** |
| Scripts | `scripts/staging-otp-config-check.ts` — prints `SMTP CONFIGURED` / unset **names**; **no live AUTH** |
| API routes | `src/app/api/ai/ask`, `src/app/api/internal/errors` only — **no SMTP verify route** |

**Conclusion:** No safe existing **Preview-hosted** SMTP authentication verification path.

---

## 4. Preview Environment

| Item | Evidence |
| --- | --- |
| Project | `dr-vandana-website` (trinetra-digital-lab) |
| Latest Ready Preview deployment | Age ~4m; Environment **Preview**; Status Ready |
| Lab Production URL (project metadata) | `https://drvandana.trinetralab.net` |
| Not the Production psychology project | `drvandana-psychology` **not mutated** |

### Preview flags (non-secret)

| Variable | Result |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `EMAIL_PROVIDER` | `smtp` |
| `APP_BASE_URL` | `https://drvandana.trinetralab.net` |
| `DATABASE_URL` | **PRESENT — VALUE REDACTED** |
| `SMTP_PASSWORD` | **PRESENT — VALUE REDACTED** |

Note: this project also lists a **Production** environment deployment in `vercel ls`. R4 did **not** execute tests against Production environment variables or Production deployments.

---

## 5. Key Vault Verification

| Field | Result |
| --- | --- |
| Vault | `kv-dr-vandana-staging` |
| Secret | `staging-app-smtp-password` |
| KEY VAULT SECRET | **PRESENT** |
| SECRET ENABLED | **YES** |
| updated | `2026-08-30T15:19:24+00:00` |
| SECRET VALUE | **NOT EXPOSED** |

---

## 6. Vercel Preview Verification

| Field | Result |
| --- | --- |
| Variable | `SMTP_PASSWORD` |
| Environment | Preview |
| VERCEL PREVIEW SMTP_PASSWORD | **PRESENT** |
| VALUE | **NOT EXPOSED** |
| Listing age (safe metadata) | still approximately **5d** at R4 inspection |
| CLI secret pull | Placeholder `[SENSITIVE]` only |

---

## 7. Secret Parity Assessment

| Claim | Status |
| --- | --- |
| KV secret exists | **YES** |
| Preview variable exists | **YES** |
| Exact KV ↔ Vercel value parity | **NOT VERIFIED** |
| Provider linkage / version sync | **ABSENT** (per O-B-05D-R3) |

Operator update claim is **not** treated as cryptographic proof. Listing-age metadata did not show a refresh comparable to recent `DATABASE_URL` updates.

---

## 8. Preview Runtime Verification

| Step | Result |
| --- | --- |
| Search for Preview-callable SMTP verify / health AUTH | **NONE FOUND** |
| Use existing script on Preview host | **NOT POSSIBLE** without deploy/source change |
| Local AUTH using pulled Preview Secrets | **NOT POSSIBLE** (values not retrievable) |
| Local AUTH using Key Vault secret | **REJECTED for R4** — would re-prove KV path (O-B-05D-R2), not Preview runtime |
| Invent new endpoint / weaken security | **FORBIDDEN** |

**PREVIEW SMTP RUNTIME AUTH: NOT VERIFIED — NO SAFE EXISTING RUNTIME VERIFICATION PATH**

A **separate implementation task** (explicitly authorized) would be required to add a staging-only, gated, non-secret-logging SMTP verify mechanism before R4-class runtime proof can pass.

---

## 9. SMTP Connectivity

| Item | Result |
| --- | --- |
| This task | **NOT RUN** (no Preview runtime path) |
| Prior O-B-05D-R2 (KV-sourced local verify) | Historical **PASS** — **not** counted as Preview runtime |

---

## 10. TLS / STARTTLS

| Item | Result |
| --- | --- |
| This task Preview path | **NOT VERIFIED** |
| Prior R2 (KV path) | Historical **PASS** (TLSv1.3) — not Preview runtime |

---

## 11. SMTP AUTH

| Item | Result |
| --- | --- |
| Preview runtime SMTP AUTH | **NOT VERIFIED** / **NOT RUN** |
| Reason | No safe existing Preview verification path |

---

## 12. Synthetic Email

| Item | Result |
| --- | --- |
| Policy | Default **NO EMAIL SEND** |
| Required by existing Preview verify mechanism? | **N/A** (mechanism absent) |
| SMTP SEND | **NOT RUN** |

---

## 13. Database Target

| Item | Result |
| --- | --- |
| Preview `DATABASE_URL` | **PRESENT — VALUE REDACTED** |
| Re-opened connection string this task | **NO** |
| Prior O-B-05C staging proof | `pg-dr-vandana-staging` / `dr_vandana_db_staging` |
| DATABASE TARGET | **STAGING VERIFIED** (inherited O-B-05C; not re-probed) |

No patient queries; no schema changes.

---

## 14. Registration Safety

| Check | Result |
| --- | --- |
| Preview flag | `false` |
| Patient account created | **NO** |
| Overall | **IMPLEMENTED BUT SAFELY DISABLED** |

---

## 15. WhatsApp Safety

| Check | Result |
| --- | --- |
| Preview flag | `false` |
| Twilio configured | **NO** |
| Overall | **DISABLED** |

---

## 16. Production Isolation

| Check | Result |
| --- | --- |
| `drvandana-psychology` mutated | **NO** |
| Production KV accessed | **NO** |
| Production DB/SMTP changed | **NO** |
| Overall | **UNTOUCHED** |

---

## 17. Secret Leakage Review

| Surface | Result |
| --- | --- |
| Terminal / pull placeholders | No secret values |
| Temp pull file | Deleted |
| Report | Names/status only |
| App/logs from AUTH attempt | **N/A** (AUTH not run) |

**SECRET LEAKAGE: NONE DETECTED**

---

## 18. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| R4-S1 | **HIGH** (verification gap) | No Preview-hosted SMTP AUTH probe; Preview runtime credential effectiveness unproven |
| R4-S2 | MEDIUM | Preview `SMTP_PASSWORD` listing age still ~5d despite operator update claim → residual stale-secret uncertainty |
| R4-S3 | INFORMATIONAL | Startup/config helpers check presence only — intentional, but insufficient for R4 |
| R4-S4 | PASS | No secret exposure; registration/WhatsApp remain off; Production untouched; no app changes |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 19. Independent Review

| # | Question | Answer |
| --- | --- | --- |
| 1 | Staging-only? | **YES** |
| 2 | Production untouched? | **YES** |
| 3 | SMTP password never exposed? | **YES** |
| 4 | KV secret present? | **YES** |
| 5 | Preview SMTP_PASSWORD present? | **YES** |
| 6 | Exact parity proven? | **NO** |
| 7 | Preview runtime AUTH proven? | **NO** |
| 8 | Synthetic email necessary/sent? | **NO / NOT RUN** |
| 9 | Patient data used? | **NO** |
| 10 | Registration disabled? | **YES** |
| 11 | WhatsApp disabled? | **YES** |
| 12 | App source unchanged? | **YES** |
| 13 | Database unchanged? | **YES** |
| 14 | Secrets committed? | **NO** |
| 15 | O-B-05D closed? | **NO** — Preview runtime AUTH remains open |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**  
(Process correctly stopped; R4 objective **BLOCKED**.)

---

## 20. Test Matrix

| Test | Result |
| --- | --- |
| Repository baseline | **PASS** |
| Preview environment identified | **PASS** |
| Key Vault secret exists | **PASS** |
| Preview SMTP_PASSWORD exists | **PASS** |
| Exact KV↔Vercel parity | **NOT VERIFIED** |
| Preview database target | **PASS** (inherited) |
| SMTP connectivity | **NOT RUN** |
| STARTTLS | **NOT VERIFIED** |
| TLS | **NOT VERIFIED** |
| Preview runtime SMTP AUTH | **NOT RUN** / **NOT VERIFIED** |
| Synthetic email | **NOT RUN** |
| Secret leakage | **NONE** |
| Registration disabled | **PASS** |
| WhatsApp disabled | **PASS** |
| Production isolation | **PASS** |

---

## 21. Findings

1. Preview runtime SMTP AUTH cannot be completed with existing tooling without forbidden source changes or forbidden secret retrieval.
2. Config-presence checks (`SMTP CONFIGURED`) are **not** AUTH proof.
3. O-B-05D-R2 KV-path AUTH must not be reclassified as Preview runtime proof.
4. Listing-age metadata for Preview `SMTP_PASSWORD` did not demonstrate a refresh at R4 inspection time.
5. Closing R4 requires a **separate, explicitly authorized** staging-only verification capability (implementation task), then a re-run of R4.

---

## 22. Remaining Blockers

1. **Missing capability:** staging-safe Preview SMTP AUTH verification path (no secret logging; gated; Preview-only).
2. Exact KV↔Vercel parity remains unprovable without provider linkage (acceptable per §25 once Preview AUTH passes — but AUTH has not passed).
3. Optional operator confirmation that Preview `SMTP_PASSWORD` listing/metadata reflects the post-update state.

---

## 23. Recommendation

**Do not start O-B-05E automatically.**

Recommended next controlled tasks (choose explicitly):

1. **O-B-05D-R4-I — Staging SMTP Preview Verify Capability (implementation)**  
   Add a staging-only, gated, non-secret-logging SMTP verify mechanism (e.g. internal route or ops script designed for Preview), then re-run R4.  
   **Requires explicit authorization** (application change).

2. Or, if product owners reject any verify endpoint: accept Preview SMTP as **configuration-present only** and track Preview AUTH as a residual production-readiness risk (not a PASS).

After Preview AUTH **PASS**: recommend **O-B-05E — Staging Worker & Appointment Outbox Delivery** (still separate authorization).

**Checkpoint:** DOCUMENTATION CHECKPOINT RECOMMENDED for this report.

---

## 24. Files Created

- `docs/O_B_05D_R4_STAGING_PREVIEW_SMTP_RUNTIME_AUTH_REPORT.md`

## 25. Files Modified

- None (application). Prior unrelated working-tree docs remain.

## 26. Application Changes

**NONE**

## 27. Database Changes

**NONE**

## 28. Production Changes

**NONE**

## 29. Git Status

- HEAD `7974175`
- This report untracked
- No secrets staged
- App source unchanged

## 30. Git Commit

**NONE**

## 31. GitHub Push

**NONE**

## 32. Final Status

**BLOCKED**

Preview runtime SMTP authentication was not verified because no safe existing Preview verification path exists, and this task forbids inventing one via application changes or secret exposure.

---

## Machine-readable footer

```text
O-B-05D-R4 COMPLETE
KEY VAULT SECRET: PRESENT
VERCEL PREVIEW SMTP_PASSWORD: PRESENT
SECRET VALUE: NOT EXPOSED
EXACT SECRET PARITY: NOT VERIFIED
PREVIEW SMTP RUNTIME AUTH: NOT VERIFIED — NO SAFE EXISTING RUNTIME VERIFICATION PATH
SMTP: NOT VERIFIED
STARTTLS: NOT VERIFIED
DATABASE TARGET: STAGING VERIFIED
SYNTHETIC EMAIL: NOT RUN
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
REPORT: docs/O_B_05D_R4_STAGING_PREVIEW_SMTP_RUNTIME_AUTH_REPORT.md
NEXT CONTROLLED TASK: O-B-05D-R4-I (authorized staging SMTP verify capability) then re-run R4; do not auto-start O-B-05E
STOP.
```

# O-B-05D-R2 Staging SMTP Authentication & Synthetic Delivery Verification Report

**Document type:** Staging-only SMTP auth / synthetic delivery verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D-R2 FINAL STATUS = PASS WITH CONDITIONS
SMTP CONNECTIVITY = PASS
STARTTLS = PASS
TLS VALIDATION = PASS (TLSv1.3; rejectUnauthorized=true)
SMTP AUTHENTICATION = PASS
SYNTHETIC SEND = PASS (SMTP accepted; messageId present; 250)
MAILBOX RECEIPT = NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE
SENDER IDENTITY = PASS WITH CONDITIONS (Gmail accepted From; SPF/DKIM/DMARC not verified)
OUTBOX = NOT VERIFIED (identity sync path used; appointment outbox/worker not provisioned)
SECRET LEAKAGE = NONE DETECTED
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
WhatsApp = DISABLED
Production = UNTOUCHED
APPLICATION CHANGES = NONE
GIT COMMIT = NONE
GITHUB PUSH = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05D-R2 verified the staging Gmail SMTP path using the approved Azure Key Vault secret `staging-app-smtp-password` (presence confirmed; value never displayed).

Evidence obtained in this controlled pass:

| Stage | Result |
| --- | --- |
| TCP reachability `smtp.gmail.com:587` | **PASS** |
| STARTTLS negotiation | **PASS** |
| TLS certificate validation (`rejectUnauthorized: true`) | **PASS** (protocol **TLSv1.3**) |
| SMTP authentication (KV-sourced App Password) | **PASS** |
| Exactly one synthetic email submission | **PASS** (SMTP **250** / accepted=1 / rejected=0 / messageId present) |

Mailbox UI/IMAP receipt was **not** available to this agent, so receipt is **NOT VERIFIED**. Appointment notification outbox/worker was **not** exercised (worker not provisioned). Vercel Preview `SMTP_PASSWORD` remains Secret-type and CLI-non-retrievable; listing still showed a ~5d age, so Preview runtime parity with the new KV secret is a **condition**, not a live proof from this pass.

**Final status: PASS WITH CONDITIONS**

---

## 2. Authorization / Scope

| Allowed | Done |
| --- | --- |
| Staging SMTP TLS / AUTH / one synthetic send | **YES** |
| Use KV staging App Password without displaying it | **YES** |
| Inspect Preview non-secret flags | **YES** |
| Production mutation | **NO** |
| Registration enablement | **NO** |
| WhatsApp / Twilio | **NO** |
| Worker provisioning | **NO** |
| Secret rotation | **NO** |
| App source change | **NO** |
| Git commit / push | **NO** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` — **MATCHES EXPECTED** |
| Unexpected tracked application changes for this task | **NONE** (no app source edits) |
| Temporary verify script | Created under repo as `.ob05dr2-smtp-verify.cjs`, executed, **deleted** |
| Personal JPEG | Remains untracked |

---

## 4. Staging Environment

| Item | Evidence |
| --- | --- |
| App host target | Vercel project **`dr-vandana-website`** (Preview / lab) |
| Preview `APP_BASE_URL` | `https://drvandana.trinetralab.net` |
| Preview `EMAIL_PROVIDER` | `smtp` |
| Key Vault | `kv-dr-vandana-staging` |
| Secret used for AUTH | `staging-app-smtp-password` (**PRESENT**, enabled, updated `2026-08-30T15:19:24Z`) |
| Database | Not required for identity SMTP path; **unchanged** |
| Production project | `drvandana-psychology` — **not mutated** |

Verification credential source for this pass: **Azure Key Vault staging secret** (approved SoT), loaded into process environment for the ephemeral verify script only, then cleared. Value never printed.

---

## 5. SMTP Configuration

### 5.1 Repository variable names

| Role | Canonical | Alias |
| --- | --- | --- |
| Host | `SMTP_SERVER` | `SMTP_HOST` |
| Port | `SMTP_PORT` | — |
| User | `SMTP_EMAIL` | `SMTP_USER` |
| Password | `SMTP_PASSWORD` | *(none)* |
| From | `SMTP_FROM_EMAIL` | fallback to auth email |
| From name | `SMTP_FROM_NAME` | optional |

Hard-coded password in source: **NOT FOUND** (config reads env only).

### 5.2 Metadata used for this verification

| Name | Status / value class |
| --- | --- |
| Host | `smtp.gmail.com` |
| Port | `587` |
| User | `ravishori@gmail.com` (presence only in logs: **PRESENT**) |
| From email | `dr.vandanarchaudhary@gmail.com` |
| From name | `Dr. Vandana Rajiv Chaudhary` |
| `SMTP_PASSWORD` | **PRESENT** (from KV; value **NOT DISPLAYED**) |

### 5.3 Key Vault SMTP inventory (names only)

All of: `staging-app-smtp-server`, `staging-app-smtp-port`, `staging-app-smtp-username`, `staging-app-smtp-from-email`, `staging-app-smtp-from-name`, `staging-app-smtp-password` — **PRESENT / ENABLED**.

### 5.4 Vercel Preview

| Variable | Status |
| --- | --- |
| `SMTP_PASSWORD` name | **PRESENT** (Secret; value **NOT VERIFIED** via CLI) |
| Secret listing age | Still showed ~5d at inspection time → **Preview value parity with new KV secret = NOT VERIFIED** |
| Flags | registration `false`, WhatsApp `false`, `EMAIL_PROVIDER=smtp`, lab `APP_BASE_URL` — **VERIFIED** |

---

## 6. TLS / STARTTLS Verification

| Check | Result |
| --- | --- |
| SMTP connectivity (`smtp.gmail.com:587`) | **PASS** |
| STARTTLS | **PASS** |
| TLS validation | **PASS** (`rejectUnauthorized: true`) |
| Protocol observed | **TLSv1.3** |
| Plaintext downgrade | **NOT OBSERVED** |

---

## 7. SMTP Authentication

| Check | Result |
| --- | --- |
| Mechanism | Nodemailer `transporter.verify()` with port 587 `requireTLS` |
| Credential source | `kv-dr-vandana-staging` / `staging-app-smtp-password` |
| Result | **PASS** |
| Credential rotated this task | **NO** |
| Password printed | **NO** |

---

## 8. Synthetic Email Test

| Field | Evidence |
| --- | --- |
| Count | **Exactly one** |
| Recipient category | **TEST MAILBOX** (operator Gmail auth mailbox; not a patient) |
| Subject | `[STAGING TEST] Dr. Vandana Psychology SMTP Verification` |
| Body | Synthetic staging text only; explicit “No patient data…” |
| Timestamp (UTC) | `2026-08-30T15:27:34.129Z` |
| SMTP accepted | **PASS** |
| Response indicates 250 | **YES** |
| Accepted count | `1` |
| Rejected count | `0` |
| Message ID present | **YES** (value not required in report) |
| Patient / clinical content | **NONE** |

**SYNTHETIC DELIVERY (SMTP submission): PASS**  
(SMTP acceptance ≠ mailbox receipt.)

---

## 9. Sender Identity

| Item | Result |
| --- | --- |
| From header used | `Dr. Vandana Rajiv Chaudhary <dr.vandanarchaudhary@gmail.com>` |
| Gmail acceptance of message with that From | **YES** (send succeeded; not rejected) |
| SPF / DKIM / DMARC | **NOT VERIFIED** (out of scope; no DNS claims) |
| Overall | **PASS WITH CONDITIONS** |

---

## 10. Mailbox Receipt

| Item | Result |
| --- | --- |
| Inbox/IMAP/API access available to agent | **NO** |
| Operator mailbox visual confirmation this session | **NOT PERFORMED** |
| Overall | **NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE** |

Operator may optionally confirm arrival of the subject above around the recorded timestamp; that confirmation is outside this agent’s evidence set.

---

## 11. Outbox Verification

| Item | Result |
| --- | --- |
| Path exercised | Identity / Nodemailer **synchronous** send (same transport pattern as `createSmtpEmailService`) |
| Appointment notification outbox row | **NOT CREATED** / **NOT INSPECTED** |
| Worker | **NOT PROVISIONED** |
| Overall | **NOT VERIFIED** — outbox/worker live path blocked by worker provisioning (separate task) |

No redesign performed.

---

## 12. Secret Leakage Review

| Surface | Result |
| --- | --- |
| Terminal output of verify run | Status keys only; password not printed |
| Ephemeral script | Deleted after run |
| This report | Names/status only |
| Git tracked files from this task | Documentation only (this file) |
| `SMTP_PASSWORD` in output | **NOT PRESENT as a value** |

**SECRET LEAKAGE: NONE DETECTED**

---

## 13. Registration Safety

| Check | Result |
| --- | --- |
| Preview `PATIENT_REGISTRATION_ENABLED` | `false` |
| Test patient created | **NO** |
| Overall | **IMPLEMENTED BUT SAFELY DISABLED** |

---

## 14. WhatsApp Safety

| Check | Result |
| --- | --- |
| Preview `TWILIO_WHATSAPP_ENABLED` | `false` |
| Twilio configured | **NO** |
| Overall | **DISABLED** |

---

## 15. Database Safety

| Check | Result |
| --- | --- |
| Schema / migrations | **NONE** |
| Patient records | **NONE** |
| Overall | **STAGING ONLY / UNCHANGED** |

---

## 16. Production Isolation

| Check | Result |
| --- | --- |
| Production Vercel env mutated | **NO** |
| Production KV / SMTP used | **NO** |
| Production DB accessed | **NO** |
| Overall | **UNTOUCHED** |

---

## 17. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| S1 | INFORMATIONAL | AUTH used KV staging secret in-process; env cleared after run |
| S2 | MEDIUM (ops) | Vercel Preview `SMTP_PASSWORD` value parity with new KV secret **NOT VERIFIED** (CLI cannot read Secret; listing age still ~5d) |
| S3 | INFORMATIONAL | Mailbox receipt not agent-verified |
| S4 | INFORMATIONAL | Appointment outbox/worker path not verified |
| S5 | PASS | TLS validated without `rejectUnauthorized=false` |
| S6 | PASS | No patient data; registration/WhatsApp remain off |
| S7 | PASS | No Production mutation; no secret rotation |

**SECURITY REVIEW: PASS WITH CONDITIONS** (Preview secret sync + mailbox receipt conditions)

---

## 18. Test Matrix

| Area | Result |
| --- | --- |
| Repository baseline | **PASS** |
| Staging target | **PASS** |
| SMTP metadata | **PASS** |
| SMTP connectivity | **PASS** |
| STARTTLS | **PASS** |
| TLS validation | **PASS** |
| SMTP authentication | **PASS** |
| Synthetic send | **PASS** |
| Sender identity | **PASS WITH CONDITIONS** |
| Mailbox receipt | **NOT VERIFIED** |
| Outbox behavior | **NOT VERIFIED** |
| Secret leakage | **PASS** (none detected) |
| Registration gate | **PASS** |
| WhatsApp gate | **PASS** |
| Database safety | **PASS** |
| Production isolation | **PASS** |

---

## 19. Independent Review

| # | Question | Answer |
| --- | --- | --- |
| 1 | Correct environment? | **YES** — staging KV + Gmail SMTP; Preview flags checked on `dr-vandana-website` |
| 2 | Production protected? | **YES** |
| 3 | Secret protected? | **YES** — not printed/committed |
| 4 | TLS actually verified? | **YES** |
| 5 | SMTP auth actually verified? | **YES** |
| 6 | Synthetic message actually sent? | **YES** (SMTP acceptance) |
| 7 | Mailbox receipt actually verified? | **NO** |
| 8 | Sender identity actually verified? | **PARTIAL** — accepted by Gmail; DNS auth not verified |
| 9 | Outbox behavior observed? | **NO** (sync identity path only) |
| 10 | Patient data used? | **NO** |
| 11 | Registration disabled? | **YES** |
| 12 | WhatsApp disabled? | **YES** |
| 13 | App/DB changes? | **NO** |
| 14 | Unevidenced claims? | **NO** — conditions called out |
| 15 | Another step required? | **YES** — optional mailbox confirm; Preview secret sync confirm; later worker/outbox (O-B-05E-class) |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 20. Findings

1. Staging KV App Password authenticates successfully to Gmail SMTP.
2. STARTTLS / TLS validation succeeds on port 587 (TLSv1.3).
3. One synthetic message was accepted by SMTP with configured From identity.
4. Mailbox receipt remains operator-side / **NOT VERIFIED**.
5. Appointment outbox + worker remain unverified.
6. Vercel Preview runtime use of the **new** App Password is **NOT VERIFIED** from this pass.

---

## 21. Remaining Blockers / Conditions

1. Operator optional: confirm mailbox receipt of the synthetic subject near `2026-08-30T15:27:34Z`.
2. Confirm or update Vercel Preview `SMTP_PASSWORD` on `dr-vandana-website` so Preview runtime matches KV (dashboard only; do not paste into Cursor).
3. Appointment notification delivery still requires worker provisioning (future controlled task).
4. SPF/DKIM/DMARC remain separate domain tasks (not claimed here).

---

## 22. Recommendation

**Checkpoint:** DOCUMENTATION CHECKPOINT RECOMMENDED for this report (no secrets).

**Next controlled task (recommendation only — do not auto-start):**

- If Preview SMTP secret sync is still uncertain: **O-B-05D-R3 — Vercel Preview SMTP Secret Parity Check** (operator dashboard confirm + optional Preview-hosted smoke), **or**
- If Preview is already updated by operator: **O-B-05E — Staging Worker Configuration & Notification Outbox Delivery**

Do **not** enable registration, WhatsApp, or Twilio in the next step by default.

---

## 23. Files Changed

**Created:**

- `docs/O_B_05D_R2_STAGING_SMTP_AUTH_SYNTHETIC_DELIVERY_VERIFICATION_REPORT.md`

**Application source:** none  
**Temporary verify artifact:** removed

---

## 24. Application Changes

**NONE**

---

## 25. Database Changes

**NONE**

---

## 26. Production Changes

**NONE**

---

## 27. Git Status

- HEAD remains `7974175`
- Prior untracked O-B documentation set remains
- This report added as untracked documentation
- Personal JPEG remains untracked
- No commit performed

---

## 28. Git Commit

**NONE**

---

## 29. GitHub Push

**NONE**

---

## 30. Final Status

**PASS WITH CONDITIONS**

Core staging SMTP path (connectivity → STARTTLS/TLS → AUTH → synthetic SMTP acceptance → sender accepted by Gmail) is verified using the staging Key Vault App Password. Mailbox receipt, appointment outbox/worker, and Vercel Preview secret parity remain conditions.

---

## Machine-readable footer

```text
O-B-05D-R2 COMPLETE
SMTP AUTH: PASS
TLS / STARTTLS: PASS
SYNTHETIC DELIVERY: PASS
MAILBOX RECEIPT: NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE
SENDER IDENTITY: PASS WITH CONDITIONS
OUTBOX: NOT VERIFIED
SECRET LEAKAGE: NONE DETECTED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
DATABASE: STAGING ONLY / UNCHANGED
PRODUCTION: UNTOUCHED
OPTION C: BLOCKED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
APPLICATION CHANGES: NONE
DATABASE CHANGES: NONE
PRODUCTION CHANGES: NONE
GIT COMMIT: NONE
GITHUB PUSH: NONE
REPORT: docs/O_B_05D_R2_STAGING_SMTP_AUTH_SYNTHETIC_DELIVERY_VERIFICATION_REPORT.md
NEXT CONTROLLED TASK: O-B-05D-R3 (Preview SMTP secret parity) OR O-B-05E (worker/outbox) — operator choose after mailbox/Preview confirm
STOP.
```

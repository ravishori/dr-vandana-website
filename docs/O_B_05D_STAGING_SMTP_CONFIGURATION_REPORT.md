# O-B-05D Staging SMTP Configuration Report

**Document type:** Staging-only SMTP configuration / verification  
**Date:** 2026-08-30  
**Re-verified:** 2026-08-30 (second controlled pass; same baseline)  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D FINAL STATUS = BLOCKED — CREDENTIALS REQUIRED
SMTP architecture = INSPECTED (Nodemailer; no redesign)
SMTP config presence (local) = PRESENT
SMTP authentication = FAIL (EAUTH) — confirmed on re-run
Synthetic send = NOT RUN (blocked by auth failure)
Mailbox receipt = NOT VERIFIED
Key Vault SMTP secrets = NOT CONFIGURED (did not store failing credentials)
Vercel Preview EMAIL_PROVIDER/APP_BASE_URL/registration/WhatsApp = VERIFIED
Production SMTP = UNTOUCHED
REGISTRATION = DISABLED
WhatsApp = DISABLED
Option C = BLOCKED
NO MUTATION on re-run
```

---

## 1. Executive Summary

O-B-05D inspected the existing Nodemailer SMTP architecture and attempted staging verification using already-present local SMTP settings (gitignored). Configuration resolved (host/port/user/password/from), TLS mode for port **587** is `requireTLS` / STARTTLS, and **no** `rejectUnauthorized=false` bypass exists in code.

**SMTP `transporter.verify()` failed with `EAUTH`.** A controlled **re-run on the same baseline** reproduced `EAUTH` with no credential changes detected (KV still has only `staging-app-database-url`; local SMTP vars still present). Credentials remain **present but not valid** for the configured host. Per authorization rules, **no fake credentials were invented**, and **failing secrets were not written** to Azure Key Vault or used to overwrite Vercel Preview SMTP secrets.

Preview non-secret flags from O-B-05B remain correct: `EMAIL_PROVIDER=smtp`, `APP_BASE_URL=https://drvandana.trinetralab.net`, `PATIENT_REGISTRATION_ENABLED=false`, `TWILIO_WHATSAPP_ENABLED=false`.

---

## 2. Authorization / Scope

SMTP staging only. No Production SMTP access/mutation. No Twilio/WhatsApp. No registration enablement. No Option C. No DB schema changes. No worker provisioning. No Git commit/push.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| App source modified | **NO** |

---

## 4. Existing SMTP Architecture

| Topic | Finding |
| --- | --- |
| Library | **Nodemailer** |
| Identity transport | `createSmtpEmailService()` in `src/lib/identity/email-service.ts` |
| Config resolver | `getSmtpTransportConfig()` in `src/config/appointment-email.ts` |
| Canonical vars | `SMTP_SERVER`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` |
| Aliases | `SMTP_HOST`→server; `SMTP_USER`→email; `SMTP_FROM_EMAIL` optional |
| Port 587 | `requireTLS: true`, `secure: false` |
| Port 465 | `secure: true` |
| Auth | user/password |
| Sync vs async | Identity email send is **synchronous** (direct `sendMail`) |
| Appointment notifications | Outbox + dispatcher + email adapter wrapping same EmailService |
| Worker dependency | **Required for appointment outbox dispatch**; **not** required for direct identity SMTP test |
| Templates | Verification / password-reset / OTP / appointment templates — operational, non-clinical |
| Failures | Logged as structured errors **without** password values |

**No architecture redesign performed.**

---

## 5. SMTP Environment Variables

| Variable | Secret? | Staging role | Local presence | Preview name | KV name |
| --- | --- | --- | --- | --- | --- |
| `SMTP_SERVER` / `SMTP_HOST` | SENSITIVE | Required | Present (HOST) | `SMTP_SERVER` present | Missing |
| `SMTP_PORT` | NON-SECRET | Required | Present (587) | Present | Missing |
| `SMTP_EMAIL` / `SMTP_USER` | SENSITIVE | Required | Present (USER) | `SMTP_EMAIL` present | Missing |
| `SMTP_PASSWORD` | SECRET | Required | Present | Present (Secret; not pullable) | Missing |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | SENSITIVE/NON-SECRET | Optional/default | Present | Partial | Missing |
| `EMAIL_PROVIDER` | NON-SECRET | `smtp` | Absent locally | Config `smtp` **VERIFIED** | N/A |
| `APP_BASE_URL` | NON-SECRET | Staging URL | Absent locally | Config lab URL **VERIFIED** | N/A |
| `ERROR_NOTIFY_EMAIL` / `APPOINTMENT_TO_EMAIL` | SENSITIVE | Test/ops recipient | Present | — | — |

Logical KV map (O-B-03): `staging-app-smtp-password`, `staging-app-smtp-username`, `staging-app-smtp-server`, `staging-app-smtp-port`, …

---

## 6. Azure Key Vault Status

| Item | Status |
| --- | --- |
| Vault | `kv-dr-vandana-staging` |
| SMTP secrets stored this task | **NO** |
| Reason | Auth failed — refuse to persist invalid credentials |
| Existing secrets | `staging-app-database-url` only |

---

## 7. Vercel Preview SMTP Configuration

| Item | Status |
| --- | --- |
| Project | `dr-vandana-website` Preview |
| `EMAIL_PROVIDER` | **PASS** = `smtp` |
| `APP_BASE_URL` | **PASS** = `https://drvandana.trinetralab.net` |
| SMTP Secret names | **PRESENT** |
| SMTP Secret values | **NOT RETRIEVABLE** / **NOT VERIFIED** via CLI |
| Preview SMTP overwritten this task | **NO** (avoid pushing failing local password) |
| Production project SMTP | Names exist on `drvandana-psychology` — **UNTOUCHED** |

---

## 8. SMTP Credential Status

```text
SMTP CREDENTIALS: REQUIRES CREDENTIAL
(local values present but EAUTH — not accepted by SMTP server)
```

Do not invent App Passwords or alternate providers.

---

## 9. SMTP TLS/Security Verification

| Check | Status |
| --- | --- |
| Port | **587** |
| Mode | STARTTLS / `requireTLS` (**code-configured**) |
| `rejectUnauthorized=false` | **NOT present** in SMTP modules |
| TLS handshake / auth | Auth failed before successful secured session proof beyond transport setup → overall **NOT VERIFIED** end-to-end |
| Insecure fallback added | **NO** |

```text
SMTP SECURITY: PASS WITH CONDITIONS (code path OK; live auth failed)
```

---

## 10. Sender Identity

| Item | Status |
| --- | --- |
| From address resolvable from env | **PASS** (format OK; value not printed) |
| SPF/DKIM/DMARC | **NOT CLAIMED** / out of scope |
| Production sender impersonation changes | **NONE** |

```text
SENDER: CONFIGURED (local) / NOT VERIFIED (accepted by provider)
```

---

## 11. Synthetic Recipient

| Item | Status |
| --- | --- |
| Recipient source | Operator env `ERROR_NOTIFY_EMAIL` / `APPOINTMENT_TO_EMAIL` |
| Domain observed | `gmail.com` (redacted local-part) |
| Real patient recipient | **NO** |
| Send attempted | **NO** (blocked by `EAUTH` on verify) |

---

## 12. Synthetic Email Test

| Step | Status |
| --- | --- |
| Config validation | **PASS** |
| `transporter.verify()` | **FAIL** (`EAUTH`) |
| Synthetic `sendMail` | **NOT RUN** |
| Content prepared | Staging banner; no clinical/patient content |

```text
SYNTHETIC EMAIL: BLOCKED — CREDENTIALS REQUIRED
```

---

## 13. Outbox Verification

| Item | Status |
| --- | --- |
| Appointment outbox path | **NOT RUN** (SMTP auth blocked; also worker boundary) |
| Identity direct send path | Would not use outbox; blocked by auth |

```text
OUTBOX: NOT RUN
SENT ≠ DELIVERED (semantics retained; neither proven)
```

---

## 14. Worker Dependency

| Path | Worker needed? | Status |
| --- | --- | --- |
| Identity SMTP (`createSmtpEmailService`) | **NO** | Auth blocked |
| Appointment notification outbox | **YES** | **NOT PROVISIONED** this task |

```text
WORKER: NOT PROVISIONED / OUT OF SCOPE FOR O-B-05D
```

No undocumented worker bypass introduced.

---

## 15. Registration Safety Verification

| Check | Result |
| --- | --- |
| Preview Config | `"false"` |
| Enablement | **NO** |
| Registration email test | **NOT RUN — REGISTRATION DISABLED** |

```text
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
```

---

## 16. WhatsApp/Twilio Status

| Item | Status |
| --- | --- |
| Preview `TWILIO_WHATSAPP_ENABLED` | `"false"` |
| Twilio configured this task | **NO** |

```text
WhatsApp: DISABLED
Twilio: OUT OF SCOPE
```

---

## 17. Option C Protection

```text
Option C: BLOCKED
No clinical email/content/schema activated
```

---

## 18. Database Protection

| Item | Status |
| --- | --- |
| Schema migrations | **NONE** |
| Staging DB required for this SMTP attempt | **NOT USED** (failed before send/outbox) |
| Production DB | **UNTOUCHED** |

```text
DATABASE: STAGING ONLY / UNCHANGED
```

---

## 19. Application Tests

| Suite | Status |
| --- | --- |
| typecheck | **PASS** |
| lint | **PASS** (2 pre-existing warnings) |
| build | **PASS** |
| Full `npm test` | **NOT RUN** (no app code change; historical 347/348 upstash issue **not** re-verified) |

---

## 20. Security Review

| Check | Result |
| --- | --- |
| Password printed/committed | **NO** |
| Client/`NEXT_PUBLIC_` SMTP secrets | **NOT FOUND** in SMTP modules |
| Production SMTP accessed | **NO** |
| TLS weakened | **NO** |
| Clinical content in test | **N/A** (send not executed) |
| Registration/WhatsApp | Disabled |

```text
SECURITY REVIEW = PASS WITH CONDITIONS
```

Condition: live SMTP auth failure leaves staging email unproven; Preview SMTP secret values remain opaque to CLI.

---

## 21. Production Protection Review

| Item | Status |
| --- | --- |
| Vercel Production env | **UNTOUCHED** |
| Production SMTP vars (observed names only) | **UNTOUCHED** |
| Production mailbox | **NOT USED** |
| Production DB | **UNTOUCHED** |

---

## 22. Problems Found

1. **EAUTH** — local SMTP password/user rejected by server (likely expired App Password or wrong mailbox credentials).  
2. Key Vault lacks SMTP secrets (intentionally not populated with failing values).  
3. Vercel Preview SMTP Secrets not CLI-verifiable.  
4. Appointment email path still depends on future worker task.

---

## 23. Remaining Blockers

1. **Operator must supply valid staging SMTP credentials** (dedicated staging mailbox / current App Password).  
2. Store verified secrets in `kv-dr-vandana-staging` under O-B-03 names.  
3. Refresh Preview SMTP Secrets from verified staging values only.  
4. Re-run synthetic send + optional mailbox receipt confirmation.  
5. Worker still required for appointment outbox delivery tests.

---

## 24. Remediation Plan

1. Operator creates/rotates **staging** SMTP App Password or dedicated staging mailbox.  
2. Place values only in Key Vault / Vercel Preview (never Git).  
3. Re-run O-B-05D verification script / controlled retest task.  
4. Then proceed to worker/notification delivery task if needed.

---

## 25. Rollback

```text
ROLLBACK: NOT REQUIRED — NO MUTATION PERFORMED
```

(No KV SMTP writes; no Preview SMTP overwrites; no app/DB/Production changes. Re-run also performed **no** mutations.)

---

## 26. Independent Review

| Question | Answer |
| --- | --- |
| Production touched? | **NO** |
| Production SMTP used? | **NO** |
| Secrets exposed in docs? | **NO** |
| Preview isolated? | **YES** (flags verified; secrets not overwritten) |
| TLS code path OK? | **YES**; live auth **FAIL** |
| Email received? | **NO** |
| SENT mislabeled DELIVERED? | **NO** |
| Registration disabled? | **YES** |
| WhatsApp disabled? | **YES** |
| Option C blocked? | **YES** |
| Worker bypassed incorrectly? | **NO** |
| Unknowns honest? | **YES** |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

Condition: SMTP delivery objective unmet until valid credentials provided.

---

## 27. Files Created

- `docs/O_B_05D_STAGING_SMTP_CONFIGURATION_REPORT.md`

## 28. Files Modified

Application: **NONE**

## 29. Application Changes

**NONE**

## 30. Database Changes

**NONE**

## 31. Production Changes

**NONE**

---

## 32. Git Status

HEAD `7974175`; this report untracked; JPEG untracked; no secrets staged.

## 33. Git Commit

**NONE**

## 34. GitHub Push

**NONE**

---

## 35. Checkpoint Recommendation

```text
DOCUMENTATION CHECKPOINT RECOMMENDED
```

---

## 36. Next Controlled Task

```text
O-B-05D-R — Staging SMTP Credential Provisioning (operator-supplied)
```

After valid SMTP auth is proven, consider **O-B-05E — Staging Worker Configuration & Notification Delivery** for outbox paths. Do **not** start automatically.

---

## 37. Final STOP

```text
O-B-05D STOP — SMTP ARCHITECTURE INSPECTED; LIVE AUTH FAILED (EAUTH).
NO INVALID SECRETS STORED. NO PRODUCTION MUTATION. NO REGISTRATION/WHATSAPP/TWILIO/OPTION C.
NO GIT COMMIT. NO GITHUB PUSH.
STOP.
```

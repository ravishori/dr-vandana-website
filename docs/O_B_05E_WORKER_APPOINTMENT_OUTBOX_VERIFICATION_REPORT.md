# O-B-05E Staging Worker & Appointment Outbox Verification Report

**Document type:** Staging-only appointment notification / outbox / worker verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05E FINAL STATUS = BLOCKED
WORKER CODE = IMPLEMENTED (CLI dispatcher)
WORKER HOST = NOT PROVISIONED (O15 DECISION REQUIRED)
SAFE STAGING CLI DRAIN = BLOCKED (AUTH_SESSION_SECRET absent from approved KV SoT)
SYNTHETIC APPOINTMENT E2E = NOT RUN
SYNTHETIC EMAIL = NOT SENT
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
WhatsApp = DISABLED
PRODUCTION = UNTOUCHED
OPTION C = BLOCKED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O-B-05E inspected the existing Option B pipeline:

```text
appointment mutation → appointment_notification_outbox (PENDING)
  → npm run notifications:process (CLI)
  → expand / claim (FOR UPDATE SKIP LOCKED)
  → server-derived recipient from users table
  → SMTP via createSmtpEmailService / Nodemailer
  → delivery + outbox rollup
```

**Findings:**

| Layer | Result |
| --- | --- |
| Outbox + dispatcher **code** | **IMPLEMENTED** and covered by PGlite / security tests |
| Hosted staging/production **worker** | **NOT PROVISIONED** — vendor still **DECISION REQUIRED** (O15) |
| Dev/test CLI (`notifications:process`) | Exists; refuses `NODE_ENV=production` |
| Staging E2E via CLI this task | **BLOCKED** — `AUTH_SESSION_SECRET` **ABSENT** from `kv-dr-vandana-staging` (required to boot identity context); cannot invent or pull Preview Secret values |
| Synthetic users / recipient for live appointment | **NOT PROVISIONED** for this task — **SYNTHETIC RECIPIENT: REQUIRED** (operator) |
| Live SMTP send this task | **NOT SENT** |
| Architecture redesign | **NONE** |

**Final status: BLOCKED** — do not claim end-to-end PASS.

Prior SMTP proofs (O-B-05D-R2 KV-path AUTH/send) remain historical and **do not** substitute for outbox→worker→SMTP E2E.

---

## 2. Authorization / Scope

| Allowed | Done |
| --- | --- |
| Inspect worker/outbox/appointment notification | **YES** |
| Staging-only verification if safe | **Attempted; blocked by prerequisites** |
| Automated tests / typecheck / lint / build | **YES** |
| Provision hosted worker | **NO** (out of scope / O15 open) |
| Enable registration / WhatsApp / Twilio | **NO** |
| Production access | **NO** |
| Git commit / push | **NO** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Unexpected tracked app changes for this task | **NONE** |
| Pre-existing tracked doc edits | retention / legal / production checklist (earlier O-B work) |
| Untracked O-B docs + R4-I smtp-verify code | Present; not deleted |

---

## 4. Existing Worker Architecture

| Item | Detail |
| --- | --- |
| Entry | `scripts/process-notifications.ts` |
| npm script | `npm run notifications:process` |
| Runtime path | `processDueNotifications` → `processNotificationBatch` |
| Public HTTP worker | **NONE** |
| Production guard | Exits if `NODE_ENV=production` or identity `nodeEnv=production` |
| Hosting runbook | `docs/NOTIFICATION_WORKER_RUNBOOK.md` — hosting **OPEN** |
| Staging/prod host | **NOT PROVISIONED** |

---

## 5. Existing Outbox Architecture

| Table | Role |
| --- | --- |
| `appointment_notification_outbox` | Transactional outbox with appointment mutations |
| `appointment_notification_deliveries` | Per-channel/role deliveries |
| `appointment_notification_attempts` | Attempt history |

| Control | Implementation |
| --- | --- |
| Expand / claim | `FOR UPDATE SKIP LOCKED` |
| Lease | `locked_at` + reclaim |
| Idempotency | Unique `(outbox_id, channel, recipient_role)`; delivery CAS on finalize |
| Retry | Bounded attempts + backoff → `DEAD` |
| Rollup | Does not overwrite `SENT` with `DEAD` |
| SMTP provider idempotency header | **NOT** implemented (residual duplicate-email risk documented) |

Schema sources: `drizzle/0003_appointment_engine.sql`, `drizzle/0005_notification_dispatch.sql`.

---

## 6. Existing Appointment Notification Flow

| Trigger | Event key (examples) |
| --- | --- |
| `requestAppointment` | `AppointmentRequested` |
| `confirmAppointment` | `AppointmentConfirmed` |
| cancel / reschedule / complete / no-show | Matching lifecycle events |

Outbox payload: operational ids/times/status only — **no email/phone in payload**.  
Recipients loaded later from `users.email` / mobile in `loadDeliveryContext`.

Templates (`renderNotificationTemplate`): operational appointment copy only; dispatcher tests forbid clinical/secret patterns.

---

## 7. Staging Environment

| Item | Status |
| --- | --- |
| DB | `pg-dr-vandana-staging` / `dr_vandana_db_staging` (prior O-B-04/05C) |
| Vercel Preview | `dr-vandana-website` |
| KV | `kv-dr-vandana-staging` |
| KV has `staging-app-database-url` | **PRESENT** |
| KV has `staging-app-smtp-password` (+ SMTP metadata) | **PRESENT** |
| KV has `staging-app-auth-session-secret` | **ABSENT** |
| Preview `AUTH_SESSION_SECRET` name | **PRESENT** (Secret; value **NOT RETRIEVABLE**) |
| Preview `PATIENT_REGISTRATION_ENABLED` | `false` |
| Preview `TWILIO_WHATSAPP_ENABLED` | `false` |
| Preview `EMAIL_PROVIDER` | `smtp` |

---

## 8. Synthetic Data Controls

| Control | This task |
| --- | --- |
| Real patient data | **NOT USED** |
| Public registration | **NOT USED** (remains disabled) |
| Synthetic appointment created in staging | **NOT CREATED** |
| Reason | Operator-provisioned synthetic psychologist/patient with staging mailbox + usable `AUTH_SESSION_SECRET` in approved SoT required |

**SYNTHETIC RECIPIENT: REQUIRED** (operator) before live E2E.

---

## 9. Worker Identity / Permissions

| Topic | Finding |
| --- | --- |
| Intended scope | Read/claim outbox + send approved templates + update delivery state |
| Current CLI identity | Same app `DATABASE_URL` / identity context as the web app |
| Dedicated least-privilege DB role | **NOT DOCUMENTED / NOT PROVISIONED** |
| Clinical authority | Worker does not implement clinical roles; templates are operational |
| Residual risk | App DB user may be broader than ideal worker identity — **INFORMATIONAL / MEDIUM ops** until least-privilege role is designed |

No redesign performed. Violation of “machine identity” least privilege is **documented**, not silently fixed.

---

## 10. Appointment Trigger Verification

| Item | Result |
| --- | --- |
| Code path | **PASS** (unit/PGlite proven historically + this suite) |
| Live staging appointment | **NOT VERIFIED** / **NOT RUN** |

---

## 11. Notification Creation Verification

| Item | Result |
| --- | --- |
| Code inserts PENDING outbox in same txn | **PASS** (tests) |
| Live staging | **NOT VERIFIED** |

---

## 12. Outbox Verification

| Item | Result |
| --- | --- |
| Schema / dispatcher behavior | **PASS** (code + tests) |
| Live staging outbox row for O-B-05E | **NOT VERIFIED** |

---

## 13. Worker Execution

| Item | Result |
| --- | --- |
| Hosted worker | **NOT PROVISIONED** |
| CLI execution this task | **NOT RUN** (blocked by missing KV `AUTH_SESSION_SECRET` / synthetic actors) |
| **WORKER HOSTING** | **BLOCKED / NOT PROVISIONED** |

---

## 14. SMTP Integration

| Item | Result |
| --- | --- |
| Adapter | `resolveAppointmentEmailSender` → identity SMTP |
| Caller-injected host | **NOT POSSIBLE** on this path |
| Prior R2 KV SMTP AUTH | Historical **PASS** (not outbox E2E) |
| This task SMTP via worker | **NOT VERIFIED** |

---

## 15. Synthetic Email Result

**NOT SENT**

---

## 16. SMTP Acceptance

**NOT VERIFIED** (no send)

---

## 17. Mailbox Receipt

**NOT VERIFIED**

---

## 18. Retry / Idempotency

| Item | Result |
| --- | --- |
| Code / unit tests | **PASS** (SKIP LOCKED, CAS, unique delivery) |
| Live staging duplicate-send probe | **NOT VERIFIED** (would risk repeated mail) |
| SMTP provider idempotency | **NOT VERIFIED** / residual risk **DOCUMENTED** |

---

## 19. Audit / Observability

Dispatcher writes attempt/delivery state and structured logs. Live staging audit trail for O-B-05E: **NOT VERIFIED**.

---

## 20. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| E1 | HIGH (ops) | No provisioned staging worker host; always-on drain unavailable |
| E2 | HIGH (ops) | `AUTH_SESSION_SECRET` not in staging KV — CLI cannot boot against staging SoT without inventing/pulling secrets |
| E3 | MEDIUM | Worker uses full app DB URL privilege — least-privilege worker role still open |
| E4 | MEDIUM | SMTP lacks provider idempotency header — residual duplicate email under reclaim races |
| E5 | PASS | Recipient not caller-injectable; SMTP host not caller-injectable |
| E6 | PASS | Registration/WhatsApp remain disabled on Preview flags |
| E7 | PASS | No Production access; no secret printed; no clinical templates introduced |
| E8 | INFORMATIONAL | Preview `SMTP_PASSWORD` listing age still ~5d (R3/R4 parity gap remains separate) |

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 21. Production Isolation Review

| Check | Result |
| --- | --- |
| Production DB / Vercel / KV / SMTP / worker | **UNTOUCHED** |
| Ambiguous Production CLI run | **AVOIDED** (`notifications:process` refuses production `NODE_ENV`) |

---

## 22. Registration Safety

Preview `PATIENT_REGISTRATION_ENABLED=false`. Not enabled. No public registration test.

**REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED**

---

## 23. WhatsApp Safety

Preview `TWILIO_WHATSAPP_ENABLED=false`. Twilio not configured this task.

**WHATSAPP: DISABLED**

---

## 24. Option C Safety

No clinical messaging/records/assessments/AI workflows added.

**OPTION C: BLOCKED**

---

## 25. Automated Tests

| Suite | Result |
| --- | --- |
| Full `npm test` | **357 pass / 1 fail** |
| Failure | Pre-existing `upstash-credentials.test.ts` when `APPOINTMENT_RATE_LIMIT_STORE=upstash` — **not caused by O-B-05E** |
| Notification/outbox/F1-D-C/dispatcher coverage | Exercised within suite — **PASS** |

---

## 26. Typecheck

`npm run typecheck` → **PASS**

---

## 27. Lint

`npm run lint` → **PASS** (0 errors; 2 pre-existing unrelated warnings)

---

## 28. Build

`npm run build` → **PASS** (executed as part of completion checks)

---

## 29. Findings

1. Worker/outbox **implementation** is present and tested.
2. Hosted worker remains **NOT PROVISIONED** (O15).
3. Staging E2E drain via CLI is **BLOCKED** without KV-backed `AUTH_SESSION_SECRET` and operator synthetic identities/mailbox.
4. No live synthetic email was sent; no PASS claimed for delivery.
5. Prior O-B-05D SMTP results were preserved and not overwritten as outbox E2E success.

---

## 30. Remaining Blockers

1. **O15 / O-B-05E-H:** Select and provision staging worker hosting (or formally accept CLI-only drain as staging ops model).
2. Store `staging-app-auth-session-secret` (and MFA key if required) in `kv-dr-vandana-staging` via operator Portal — **do not paste into Cursor**.
3. Provision **synthetic** psychologist + patient with staging mailbox emails (not public registration).
4. Optional: Preview SMTP secret parity / R4 re-run after R4-I deploy (separate).
5. Least-privilege worker DB role (recommended hardening).

---

## 31. Independent Review

| # | Question | Answer |
| --- | --- | --- |
| 1 | Staging only? | **YES** (no Production commands) |
| 2 | Production untouched? | **YES** |
| 3 | Synthetic data used? | **N/A** — live synthetic not created |
| 4 | Worker correctly scoped? | **PARTIAL** — code scoped; host/privilege role open |
| 5 | Recipient server-derived? | **YES** (design) |
| 6–7 | Arbitrary recipient/SMTP host? | **NO** |
| 8 | SMTP credentials protected? | **YES** (not printed) |
| 9 | One synthetic email? | **NOT SENT** |
| 10 | Clinical content excluded? | **YES** (templates + no send) |
| 11–13 | Outbox/dup/retry live? | **NOT VERIFIED** live; code **PASS** |
| 14 | Audit appropriate? | Design **PASS**; live **NOT VERIFIED** |
| 15–17 | Registration/WhatsApp/Option C | **SAFE** |
| 18 | Schema unchanged? | **YES** |
| 19 | Tests run? | **YES** |
| 20 | Pre-existing failure distinguished? | **YES** (Upstash flake) |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS** (honest **BLOCKED** E2E)

---

## 32. Recommendation

**NEXT CONTROLLED TASK (do not auto-start):**

1. **O-B-05E-P — Staging Worker Prerequisites**  
   Operator: KV `AUTH_SESSION_SECRET`; synthetic identities + mailbox; confirm Preview flags.  
2. Then **O-B-05E-R — Staging Outbox CLI Drain Verification** (one synthetic appointment → one CLI process → SMTP acceptance).  
3. Parallel/separate: **O15 worker hosting decision** for always-on staging/prod.  
4. Do **not** treat R4-I deploy as substitute for outbox E2E.

---

## 33. Files Created

- `docs/O_B_05E_WORKER_APPOINTMENT_OUTBOX_VERIFICATION_REPORT.md`

## 34. Files Modified

- **NONE** (application). No worker redesign.

## 35. Database Changes

**NONE**

## 36. Production Changes

**NONE**

## 37. Git Status

- HEAD `7974175`
- Report untracked
- Prior untracked O-B / R4-I files remain
- No secrets staged

## 38. Git Commit

**NONE**

## 39. GitHub Push

**NONE**

## 40. Final Status

**BLOCKED**

Worker/outbox code exists; hosted worker is not provisioned; staging CLI E2E could not be safely executed without inventing secrets or synthetic identities.

---

## Machine-readable footer

```text
O-B-05E COMPLETE
WORKER: BLOCKED
WORKER HOST: NOT PROVISIONED
APPOINTMENT TRIGGER: NOT VERIFIED (code PASS via tests)
NOTIFICATION CREATION: NOT VERIFIED (code PASS via tests)
OUTBOX: NOT VERIFIED (code PASS via tests)
SMTP: NOT VERIFIED (worker path); prior R2 KV-path historical only
SYNTHETIC EMAIL: NOT SENT
SMTP ACCEPTANCE: NOT VERIFIED
MAILBOX RECEIPT: NOT VERIFIED
RETRY: NOT VERIFIED (code PASS)
IDEMPOTENCY: NOT VERIFIED (code PASS; SMTP provider residual)
SECRET LEAKAGE: NONE DETECTED
PATIENT DATA: NOT USED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
PRODUCTION: UNTOUCHED
DATABASE: STAGING ONLY / UNCHANGED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
APPLICATION CHANGES: NONE (report only)
DATABASE CHANGES: NONE
PRODUCTION CHANGES: NONE
TESTS: 357 pass / 1 pre-existing Upstash fail
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
GIT COMMIT: NONE
GITHUB PUSH: NONE
REPORT: docs/O_B_05E_WORKER_APPOINTMENT_OUTBOX_VERIFICATION_REPORT.md
NEXT CONTROLLED TASK: O-B-05E-P Staging Worker Prerequisites (KV AUTH_SESSION_SECRET + synthetic identities) then O-B-05E-R CLI drain; O15 hosting remains separate
DO NOT START THE NEXT TASK AUTOMATICALLY.
STOP.
```

# O-B-05E-R Staging Worker & Appointment Outbox E2E Verification Report

**Document type:** Staging-only synthetic appointment → outbox → CLI worker → SMTP E2E  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05E-R FINAL STATUS = PASS WITH CONDITIONS
WORKER = PASS (existing CLI notifications:process / processDueNotifications)
WORKER HOST = NOT ADDRESSED — O15 SEPARATE
APPOINTMENT = CREATED (APT-8S5ZK84M)
OUTBOX = PROCESSED (SENT)
SMTP = PASS (acceptance; patient + psychologist EMAIL SENT)
MAILBOX RECEIPT = NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

Controlled staging E2E exercised the existing Option B pipeline:

```text
PAT-TKBMVXZK → PSY-29QFCPKD → APT-8S5ZK84M (PENDING)
  → appointment_notification_outbox (AppointmentRequested)
  → processDueNotifications (CLI-equivalent staging path)
  → SMTP EMAIL SENT (PATIENT + PSYCHOLOGIST)
  → outbox status SENT
  → second worker pass claimed 0 (idempotent)
```

| Stage | Result |
| --- | --- |
| Worker execution path | **Existing CLI** (`npm run notifications:process` / `processDueNotifications`) — **not** a new host |
| Hosted worker (O15) | **NOT PROVISIONED / NOT ADDRESSED** |
| Synthetic identities | **VERIFIED** unchanged |
| Appointment | **CREATED** `APT-8S5ZK84M` |
| Outbox | **PROCESSED** → `SENT` |
| SMTP | **PASS** (2 EMAIL deliveries `SENT`) |
| Mailbox inbox open | **NOT VERIFIED** |
| Retry failure path | **NOT VERIFIED** |
| Idempotency (re-process) | **PASS** (second run sent=0) |

**Final status: PASS WITH CONDITIONS**

---

## 2. Authorization / Scope

Authorized staging E2E only. No Production access, no registration/WhatsApp enablement, no O15 host provisioning, no schema migration, no clinical features, no commit/push.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Pre-existing uncommitted governance / S2 files | Preserved |
| Product application source modified this task | **NONE** |
| One-shot runner scripts | Created temporarily under `scripts/_ob05er_*` then **deleted** |

---

## 4. Previous Gate Status

| Gate | Carry-forward |
| --- | --- |
| O-B-05E (architecture) | CLI worker IMPLEMENTED; hosted worker O15 open; E2E was blocked on secrets/identities |
| O-B-05E-P-R Final | AUTH present; synthetics READY; parity/boot NOT VERIFIED |
| O-B-05E-S2 | Patient READY |
| O-B-05D-R2 | Historical SMTP AUTH/send via KV path |

---

## 5. Worker Host / O15 Assessment

| Question | Finding |
| --- | --- |
| Hosted staging worker service | **NONE** |
| Existing worker command | **YES** — `npm run notifications:process` → `scripts/process-notifications.ts` → `processDueNotifications` |
| Documented as | Development/test CLI; Production hosting **OPEN** (`docs/NOTIFICATION_WORKER_RUNBOOK.md`) |
| New vendor/host provisioned | **NO** |
| O15 decision made | **NO** |

**WORKER HOST: NOT ADDRESSED — O15 SEPARATE**  
**WORKER path used: existing CLI (approved for staging/dev drain)**

---

## 6. Worker Readiness

| Check | Result |
| --- | --- |
| Staging DB guard | **PASS** before writes/processing |
| Secrets from staging KV SoT | DATABASE_URL, AUTH_SESSION_SECRET, SMTP_* loaded into process env only |
| `NODE_ENV=production` | Refused by CLI design; run used `development` |
| Clinical authority | Worker only dispatches notifications |
| Privilege | Uses app DB URL (known residual least-privilege gap — INFORMATIONAL) |

**WORKER ENVIRONMENT: STAGING**

---

## 7. Synthetic Identity Verification

| Identity | Result |
| --- | --- |
| `PSY-29QFCPKD` | ACTIVE; role PSYCHOLOGIST; not modified |
| `PAT-TKBMVXZK` | ACTIVE; role PATIENT; email `ravishori+ob05e-synthetic-patient@gmail.com`; not modified |
| Credentials/hashes printed | **NO** |

---

## 8. Staging Database Target

| Check | Result |
| --- | --- |
| Host | `pg-dr-vandana-staging.postgres.database.azure.com` |
| Database | `dr_vandana_db_staging` |
| `DATABASE_URL` | **[PRESENT — VALUE REDACTED]** |
| Schema migration | **NOT RUN** |

**STAGING DATABASE TARGET: PASS**

---

## 9. Registration Guard

Preview / runtime: `PATIENT_REGISTRATION_ENABLED=false`. Not changed.

**REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED**

---

## 10. WhatsApp Guard

`TWILIO_WHATSAPP_ENABLED=false`. WhatsApp channel not used. EMAIL only.

**WHATSAPP: DISABLED**

---

## 11. Synthetic Appointment

| Field | Value |
| --- | --- |
| Public id | `APT-8S5ZK84M` |
| Status | `PENDING` |
| Patient | `PAT-TKBMVXZK` |
| Psychologist | `PSY-29QFCPKD` |
| Slot | `2026-08-31T04:30:00.000Z` (Asia/Kolkata morning fixture window) |
| Mechanism | Existing `requestAppointment` with PATIENT principal (session created for auth) |
| Prior duplicates | **0** before create; **1** after (no second appointment created) |
| Clinical fields | **NONE** |

**Prerequisite:** Synthetic psychologist had no practice hours/types. Staging seeded via existing `seedTestPracticeConfiguration` (**TEST FIXTURE ONLY** labels) — appointment type `ATY-PVNX2MMM`. Not Production policy.

**APPOINTMENT: CREATED**

---

## 12. Notification Creation

Appointment mutation created outbox event `AppointmentRequested` via normal application path (no manual outbox insert).

**NOTIFICATION: CREATED** (outbox event; deliveries expanded by worker)

---

## 13. Outbox Verification

| Before worker | After worker |
| --- | --- |
| 1 row `AppointmentRequested` / `PENDING` / attempts 0 | 1 row `SENT` |
| Deliveries 0 | 2 EMAIL deliveries |

Channels: **EMAIL** only. Roles: PATIENT + PSYCHOLOGIST (architecture default for `AppointmentRequested`).

---

## 14. Worker Execution

| Pass | Stats |
| --- | --- |
| First | `expanded=1, claimed=2, sent=2, retry=0, dead=0, skipped=0` |
| Second | `expanded=0, claimed=0, sent=0, …` |

Structured logs (no secrets): PATIENT EMAIL SENT (~4.1s); PSYCHOLOGIST EMAIL SENT (~3.8s).

**WORKER: PASS**

---

## 15. SMTP Execution

SMTP credentials from staging KV only. Values not printed.

| Delivery | Status |
| --- | --- |
| PATIENT EMAIL | **SENT** |
| PSYCHOLOGIST EMAIL | **SENT** (recipient is synthetic psych `…@example.test` per identity row — architecture dual-notify) |

Provider message id field on deliveries: **ABSENT** (not populated by adapter).

**SMTP: PASS**  
**SMTP AUTH: PASS** (implicit successful send; dedicated `verify()` not re-run)

---

## 16. Synthetic Email Delivery

Intended verification recipient: `ravishori+ob05e-synthetic-patient@gmail.com` (PATIENT).

Architecture also notified PSYCHOLOGIST synthetic address (`ob05e-synthetic-psychologist@example.test`). SMTP accepted both. No real patient/clinician Production addresses used.

**SYNTHETIC EMAIL: SENT**

---

## 17. Mailbox Receipt

Gmail inbox was **not** accessed.

**MAILBOX RECEIPT: NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE**

---

## 18. Retry Verification

No safe failure injection performed (would risk uncontrolled repeats or credential damage).

**RETRY: NOT VERIFIED**

---

## 19. Idempotency Verification

Second `processDueNotifications` claimed **0** and left delivery attempt counts at **1** / status **SENT**.

**IDEMPOTENCY: PASS**

---

## 20. Audit Verification

Recent audit (metadata only): `APPOINTMENT_REQUESTED` / `SUCCESS` present. No sensitive bodies dumped.

**AUDIT: PASS**

---

## 21. Security Review

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| R1 | MEDIUM (accepted) | Hosted worker still absent (O15) | Documented; CLI path used |
| R2 | MEDIUM (accepted) | Psychologist EMAIL also sent to `@example.test` | Existing architecture; SMTP accepted |
| R3 | LOW | App DB role used by worker (not least-privilege) | Known residual |
| R4 | INFORMATIONAL | Practice fixture seeded for synthetic psych | Required for booking; TEST FIXTURE ONLY |
| R5 | INFORMATIONAL | Mailbox receipt unproven | Condition |

No CRITICAL findings. No secret leakage in logs/report. Registration/WhatsApp remained off. Production untouched.

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 22. Secret Leakage Review

Env secrets cleared after runs. One-shot scripts deleted. Diffs/report inspected for secret values.

**SECRET LEAKAGE: NONE DETECTED**

---

## 23. Test Results

Verification E2E task; product source unchanged.

| Check | Result |
| --- | --- |
| `npm test` | **NOT RUN** (prior baseline 365/1 stands) |
| typecheck / lint / build | **NOT RUN** |

**TESTS: NOT RUN (PRIOR BASELINE 365/1 STANDS)**

---

## 24. Findings

1. End-to-end CLI worker path works on staging with KV secrets + synthetic identities.  
2. Appointment → outbox → SMTP SENT succeeded.  
3. Idempotent re-process did not re-send.  
4. Hosted worker remains an O15 gap.  
5. Inbox receipt and retry failure path remain unverified.

---

## 25. Remaining Blockers

| Item | Status |
| --- | --- |
| O15 hosted worker | **OPEN** |
| Mailbox receipt proof | Optional operator check |
| Exact Preview AUTH parity / runtime boot | Still NOT VERIFIED from P-R (not required for this CLI path) |

---

## 26. Independent Review

| # | Check | Result |
| --- | --- | --- |
| 1–2 | Staging only / Production untouched | PASS |
| 3–4 | Synthetic patient/psychologist used | PASS |
| 5–6 | Registration / WhatsApp disabled | PASS |
| 7–9 | Synthetic appointment / notification / existing outbox path | PASS |
| 10–11 | Staging worker / designated patient recipient | PASS (plus arch psych email) |
| 12–13 | No real patient / no clinical content in template sample | PASS |
| 14 | Secrets not exposed | PASS |
| 15–16 | No duplicate appointment; no unintentional re-send | PASS |
| 17–19 | Retry/idempotency/mailbox reporting accurate | PASS |
| 20–22 | Worker privilege limited to notify; no new host; O15 separate | PASS |
| 23–25 | Option C blocked; no migration; no product code change | PASS |
| 26 | Tests accurately reported | PASS |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 27. E2E Readiness Decision

**PASS WITH CONDITIONS**

Core pipeline verified through SMTP acceptance. Conditions: mailbox receipt not verified; retry not verified; O15 hosting still open; psychologist also emailed to synthetic `@example.test`.

---

## 28. O15 Status

**O15 WORKER HOSTING: NOT ADDRESSED**  
Always-on / production-like hosting remains a separate human decision. CLI drain is proven for staging verification only.

---

## 29. Option C Status

**OPTION C: BLOCKED**

---

## 30. Production Status

**PRODUCTION: UNTOUCHED**

---

## 31. Files Created

- `docs/O_B_05E_R_STAGING_WORKER_APPOINTMENT_OUTBOX_E2E_VERIFICATION_REPORT.md`

(Temporary `scripts/_ob05er_*` runners deleted; not retained.)

---

## 32. Files Modified

**NONE** (application)

---

## 33. Database Changes

Staging only:

- Practice fixture seed for synthetic psychologist (`ATY-PVNX2MMM` + hours/settings)
- Appointment `APT-8S5ZK84M`
- Outbox + deliveries (SENT)
- Patient session row for booking auth
- Audit `APPOINTMENT_REQUESTED`

No schema migration.

---

## 34. Production Changes

**NONE**

---

## 35. Git Status

HEAD `7974175`. No commit. Pre-existing untracked/modified governance and S2 files preserved.

---

## 36. Git Commit

**NONE**

---

## 37. GitHub Push

**NONE**

---

## 38. Final Recommendation

**NEXT CONTROLLED TASK:**  
`O15 — Worker Hosting Resolution`

(Always-on staging/prod worker still open. CLI E2E is proven; do not treat CLI as Production hosting.)

Optional parallel: operator confirms Gmail receipt for `ravishori+ob05e-synthetic-patient@gmail.com`.

Do **not** start the next task automatically.

---

## 39. Final Status

```text
O-B-05E-R COMPLETE
WORKER: PASS
WORKER HOST: NOT ADDRESSED — O15 SEPARATE
WORKER ENVIRONMENT: STAGING
SYNTHETIC PSYCHOLOGIST: PSY-29QFCPKD — VERIFIED
SYNTHETIC PATIENT: PAT-TKBMVXZK — VERIFIED
APPOINTMENT: CREATED
NOTIFICATION: CREATED
OUTBOX: PROCESSED
SMTP: PASS
SMTP AUTH: PASS
SYNTHETIC EMAIL: SENT
RECIPIENT: ravishori+ob05e-synthetic-patient@gmail.com
MAILBOX RECEIPT: NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE
RETRY: NOT VERIFIED
IDEMPOTENCY: PASS
AUDIT: PASS
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
PATIENT DATA: SYNTHETIC ONLY
PRODUCTION: UNTOUCHED
DATABASE: STAGING ONLY
SECRET LEAKAGE: NONE DETECTED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
TESTS: NOT RUN (PRIOR BASELINE 365/1 STANDS)
TYPECHECK: NOT RUN
LINT: NOT RUN
BUILD: NOT RUN
APPLICATION CHANGES: NONE
DATABASE CHANGES: STAGING SYNTHETIC APPOINTMENT/NOTIFICATION DATA ONLY
PRODUCTION CHANGES: NONE
REPORT: docs/O_B_05E_R_STAGING_WORKER_APPOINTMENT_OUTBOX_E2E_VERIFICATION_REPORT.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
NEXT CONTROLLED TASK: O15 — Worker Hosting Resolution
DO NOT START THE NEXT TASK AUTOMATICALLY.
STOP.
```

# O15 Worker Hosting Resolution Report

**Document type:** Architecture resolution / readiness assessment (no provisioning)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O15 FINAL STATUS = RESOLVED WITH CONDITIONS
RECOMMENDED = Azure Container Apps Jobs (scheduled)
ALTERNATIVE = Azure Functions Timer Trigger
WORKER HOST = RECOMMENDED (not provisioned)
PRODUCTION = UNTOUCHED
INFRASTRUCTURE CHANGES = NONE
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O15 inspected the verified notification worker and selected a hosting architecture without provisioning any host.

| Finding | Result |
| --- | --- |
| Worker logic | **VERIFIED** (library + O-B-05E-R E2E) |
| Entrypoint today | `npm run notifications:process` → batch-and-exit; **refuses** `NODE_ENV=production` |
| Best execution model | **Scheduled managed job** (not always-on loop) |
| Recommendation | **Azure Container Apps Jobs** (scheduled), India-colocated with staging PG/KV |
| Alternative | Azure Functions Timer |
| Not recommended | Vercel-alone cron; CLI as Production; primary VM |
| Provisioned? | **NO** |
| Decision | **RESOLVED WITH CONDITIONS** |

Next authorized step (not started): **O15-P — Staging Worker Hosting Provisioning Plan**.

---

## 2. Authorization

Architecture inspection and documentation only. No Production mutation, no ACA/Function/VM create, no secret create/rotate, no registration/WhatsApp enablement, no Option C, no commit/push.

---

## 3. Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Unexpected destructive ops | **NONE** |
| Pre-existing uncommitted docs / JPEG | Preserved |

---

## 4. Previous E2E Evidence

Preserved from O-B-05E-R:

| Item | Status |
| --- | --- |
| WORKER LOGIC | VERIFIED |
| STAGING E2E | PASS WITH CONDITIONS |
| OUTBOX | PROCESSED |
| SMTP | PASS |
| IDEMPOTENCY | PASS |
| AUDIT | PASS |
| HOSTED WORKER | was O15 UNRESOLVED → this task recommends host |

E2E was **not** re-run (not required for hosting recommendation).

---

## 5. Repository Inspection

| Artifact | Role |
| --- | --- |
| `scripts/process-notifications.ts` | Dev/test CLI entrypoint |
| `package.json` → `notifications:process` | npm script |
| `src/lib/notifications/process.ts` | `processDueNotifications` |
| `src/lib/notifications/dispatcher.ts` | Batch expand/claim/send |
| `docs/NOTIFICATION_WORKER_RUNBOOK.md` | O15 OPEN; CLI not Production |
| Prior O-B-03A docs | Reject Vercel-alone worker |

---

## 6. Worker Architecture

Transactional outbox → expand → planned deliveries → `FOR UPDATE SKIP LOCKED` claim → SMTP/WhatsApp adapters → finalize/rollup.  
Appointments succeed even if worker/SMTP are down.

---

## 7. Execution Model

**Scheduled batch job** (run → process due work → exit).

Evidence: CLI calls `processDueNotifications` once; no sleep loop; lease reclaim for crashed PROCESSING rows; multi-instance safe via SKIP LOCKED; no graceful-shutdown protocol; no worker health HTTP endpoint.

---

## 8. Hosting Analysis

| Model | Verdict |
| --- | --- |
| A Long-running container | Possible but needs loop code or external cron — not best fit for current code |
| B Scheduled container | **Best fit** |
| C Managed timer job | **Best fit** (Functions alternative) |
| Vercel cron alone | **Not recommended** |

---

## 9. Provider Comparison

| Provider | Recommendation |
| --- | --- |
| Azure Container Apps Jobs | **RECOMMENDED** |
| Azure Functions Timer | **ALTERNATIVE** |
| Azure App Service always-on | Not preferred (cost/ops for tiny batch) |
| Vercel Cron | **NOT RECOMMENDED** as sole host |
| Self-managed VM | **NOT RECOMMENDED** as primary |

---

## 10. Azure Assessment

**AZURE-FIRST: PASS WITH CONDITIONS**

| Check | Result |
| --- | --- |
| Staging PG India South Central | Confirmed (read-only) |
| Staging KV India South Central | Confirmed (read-only) |
| MI → Key Vault pattern | Architecturally suitable |
| `Microsoft.App` provider | **NotRegistered** (condition before ACA) |
| Production resources | **Not accessed / not modified** |

---

## 11. Security Review

| ID | Severity | Finding |
| --- | --- | --- |
| O15-S1 | HIGH (ops, mitigated by design) | Current CLI/app DB URL is broader than ideal worker role | Condition: least-privilege role in O15-P |
| O15-S2 | MEDIUM | No Production entrypoint yet (CLI refuses production) | Condition: dedicated hosted entrypoint |
| O15-S3 | MEDIUM | SMTP lacks provider idempotency header | Residual; documented |
| O15-S4 | LOW | No worker health endpoint | Monitor Job + outbox depth |
| O15-S5 | INFORMATIONAL | Worker boots via `createAppIdentityContext` (needs AUTH_SESSION_SECRET today) | Keep in KV; do not grant clinical roles |

No CRITICAL findings from inspection. No secrets printed. No clinical authority assigned.

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 12. Secret Management

Staging KV names present (values not retrieved in this task beyond prior knowledge of presence):

- `staging-app-database-url`
- `staging-app-auth-session-secret`
- `staging-app-smtp-*`

**WORKER SECRETS: NOT CREATED** (this task)  
Prefer MI + Key Vault references per environment. No shared Staging/Production secrets.

---

## 13. Database Access

| Environment | Isolation |
| --- | --- |
| Staging | Dedicated PG + dedicated worker identity (future) |
| Production | Separate PG + separate identity (future) |

This task: **DATABASE: STAGING ONLY metadata / NOT modified**. Production DB not accessed.

---

## 14. SMTP

Required for EMAIL path. Staging SMTP previously verified (O-B-05D-R2 / O-B-05E-R).  
**SMTP: NOT EXECUTED** in O15. WhatsApp remains disabled.

---

## 15. Reliability

Schedule + lease reclaim + RETRY/DEAD + Job failure alerts. Pause Job for rollback. Outbox preserved.

---

## 16. Observability

Use existing structured batch logs + platform Job metrics + outbox depth. No SIEM in this task. No secret/clinical logging.

---

## 17. Scaling

Start concurrency **1**. Horizontal scale allowed by SKIP LOCKED. Not a hard singleton.

---

## 18. Cost

Scheduled Job expected lower cost than always-on for this volume.  
**PRICING REQUIRES CURRENT PROVIDER VERIFICATION.**

---

## 19. Region

**INDIA** preference aligned with staging PG/KV (India South Central).  
Not a substitute for O18 legal residency assurance.

---

## 20. Staging Topology

Vercel Preview → Azure PG Staging → outbox ← ACA Job (MI → staging KV) → staging SMTP.

**STAGING WORKER: NOT PROVISIONED**

---

## 21. Production Topology

Conceptual only: Vercel Production → Azure PG Prod ← separate ACA Job + Production KV + Production SMTP.

**PRODUCTION WORKER: NOT PROVISIONED**

---

## 22. Deployment

Staging: build image → deploy Job → validate secrets → health via Job success → synthetic E2E (authorized later).  
Production deployment: **OUT OF SCOPE**.

---

## 23. Rollback

Pause Job → revert revision → preserve outbox → re-enable → verify PENDING. Never use Production CLI bypass.

---

## 24. Failure Modes

Documented in `docs/O15_WORKER_HOSTING_RESOLUTION.md` §16 (DB/SMTP/KV/crash/duplicate/poison/timeout/credential/deploy).

---

## 25. Legal / Governance

| Item | Status |
| --- | --- |
| O10 retention | OPEN |
| O11 privacy copy | OPEN |
| O18 residency/processors | OPEN |
| SMTP / cloud worker as processors | Legal review preserved |

**LEGAL/GOVERNANCE: OPEN ITEMS PRESERVED**

---

## 26. Recommendation

**RECOMMENDED PROVIDER:** Azure Container Apps Jobs (scheduled), India-colocated, Managed Identity → Key Vault.  
**ALTERNATIVE:** Azure Functions Timer Trigger.  
**WORKER HOST: RECOMMENDED** (decision), **NOT PROVISIONED**.

---

## 27. Conditions

1. Explicit O15-P then O15-S authorization before any create.  
2. Register `Microsoft.App`.  
3. Hosted entrypoint plan (especially Production).  
4. Least-privilege DB role + network allowlist.  
5. Alerts + rollback drill on staging.  
6. Legal opens remain explicit for Production go-live.

---

## 28. Independent Review

| # | Check | Result |
| --- | --- | --- |
| 1 | Worker implementation inspected | PASS |
| 2 | E2E evidence preserved | PASS |
| 3 | Evidence-based host decision | PASS |
| 4 | Azure-first evaluated | PASS |
| 5 | No Production infra modified | PASS |
| 6 | No secrets exposed | PASS |
| 7–8 | No worker credentials/DB grants created | PASS |
| 9 | No worker logic modified | PASS |
| 10–12 | Registration false / WhatsApp false / Option C blocked | PASS |
| 13–14 | Legal deps explicit; region ≠ residency | PASS |
| 15–17 | Reliability / rollback / concurrency documented | PASS |
| 18 | No invented provider claims | PASS |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 29. Readiness Decision

**RESOLVED WITH CONDITIONS** — recommendation ready; provisioning not authorized.

---

## 30. Next Controlled Task

**O15-P — Staging Worker Hosting Provisioning Plan**  
Then, only with explicit authorization: **O15-S — Staging Worker Provisioning & Verification**.

**DO NOT START O15-P AUTOMATICALLY.**

---

## 31. Files Created

- `docs/O15_WORKER_HOSTING_RESOLUTION.md`
- `docs/O15_WORKER_HOSTING_RESOLUTION_REPORT.md`

---

## 32. Files Modified

**NONE** (application)

---

## 33. Infrastructure Changes

**NONE**

---

## 34. Database Changes

**NONE**

---

## 35. Production Changes

**NONE**

---

## 36. Tests

Architecture task; no app change.

| Check | Result |
| --- | --- |
| `npm test` | **NOT RUN** (prior baseline 365/1 stands) |
| typecheck / lint / build | **NOT RUN** |

---

## 37. Git Status

HEAD remains `7974175`. Docs untracked/uncommitted. No commit performed.

---

## 38. Git Commit

**NONE**

---

## 39. GitHub Push

**NONE**

---

## 40. Final Status

```text
O15 COMPLETE
WORKER ARCHITECTURE: VERIFIED
WORKER ENTRYPOINT: npm run notifications:process → scripts/process-notifications.ts → processDueNotifications
EXECUTION MODEL: SCHEDULED BATCH JOB (batch-and-exit)
WORKER HOST: RECOMMENDED
RECOMMENDED PROVIDER: Azure Container Apps Jobs (scheduled)
ALTERNATIVE: Azure Functions Timer Trigger
AZURE-FIRST: PASS WITH CONDITIONS
REGION: INDIA
STAGING WORKER: NOT PROVISIONED
PRODUCTION WORKER: NOT PROVISIONED
DATABASE: STAGING ONLY
KEY VAULT: STAGING ONLY
SMTP: NOT EXECUTED
WORKER SECRETS: NOT CREATED
WORKER IDENTITY: NOT CREATED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
REAL PATIENT DATA: NOT USED
PRODUCTION: UNTOUCHED
INFRASTRUCTURE CHANGES: NONE
DATABASE CHANGES: NONE
APPLICATION CHANGES: NONE
SECURITY REVIEW: PASS WITH CONDITIONS
LEGAL/GOVERNANCE: OPEN ITEMS PRESERVED
INDEPENDENT REVIEW: PASS WITH CONDITIONS
TESTS: NOT RUN (PRIOR BASELINE 365/1 STANDS)
TYPECHECK: NOT RUN
LINT: NOT RUN
BUILD: NOT RUN
REPORT: docs/O15_WORKER_HOSTING_RESOLUTION_REPORT.md
ARCHITECTURE DOCUMENT: docs/O15_WORKER_HOSTING_RESOLUTION.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
O15 DECISION: RESOLVED WITH CONDITIONS
NEXT CONTROLLED TASK: O15-P — STAGING WORKER HOSTING PROVISIONING PLAN
DO NOT START O15-P AUTOMATICALLY.
STOP.
```

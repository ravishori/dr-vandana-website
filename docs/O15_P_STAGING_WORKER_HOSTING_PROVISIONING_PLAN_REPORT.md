# O15-P Staging Worker Hosting Provisioning Plan Report

**Document type:** Planning-only readiness report (no provisioning)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O15-P FINAL STATUS = READY WITH CONDITIONS
HOST = Azure Container Apps Jobs (recommended; not provisioned)
CONTAINER FEASIBILITY = PASS WITH CONDITIONS
INFRASTRUCTURE CHANGES = NONE
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

O15-P produced a complete staging provisioning plan for the notification worker as an Azure Container Apps **scheduled Job**, without creating or modifying any Azure, Vercel, database, or application resources.

| Item | Result |
| --- | --- |
| O15 recommendation preserved | Azure Container Apps Jobs |
| Worker model | BATCH-AND-EXIT |
| Dockerfile | Absent — design documented only |
| Providers | `Microsoft.App` / `Microsoft.ContainerRegistry` **NotRegistered** |
| Staging schedule proposal | Every **5 minutes**, parallelism **1** |
| Decision | **READY WITH CONDITIONS** |

---

## 2. Authorization

Planning and documentation only. No resource create/modify, no MI/RBAC, no firewall, no secrets, no deploy, no worker run, no email, no commit/push.

---

## 3. Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **MATCHES** |
| Pre-existing uncommitted work | Preserved |

---

## 4. Prior Evidence

| Source | Carry-forward |
| --- | --- |
| O15 | RESOLVED WITH CONDITIONS; ACA Jobs recommended |
| O-B-05E-R | Staging CLI E2E PASS WITH CONDITIONS |
| O-B-05A/C/D | KV, PG, SMTP staging foundations |
| Preview flags | Registration `false`; WhatsApp `false` (re-verified Config pull) |

---

## 5. Repository Inspection

Inspected `package.json`, `scripts/process-notifications.ts`, notification dispatcher/process/config/constants, `.env.example`, O15 docs, staging secret/DB reports. No Dockerfile found.

---

## 6. Worker Entry Point

`npm run notifications:process` → `tsx scripts/process-notifications.ts` → `processDueNotifications`.

---

## 7. Execution Model

**BATCH-AND-EXIT / SCHEDULED JOB.** Refuses `NODE_ENV=production`. SKIP LOCKED concurrency; lease reclaim; app-level RETRY/DEAD.

---

## 8. Container Feasibility

**PASS WITH CONDITIONS** — Node 24-compatible; needs Dockerfile; `tsx` is devDependency; secrets must be runtime-injected; staging Job must avoid `NODE_ENV=production` until dedicated Production entrypoint exists.

---

## 9. Azure Container Apps Jobs

Scheduled Job in India South Central; completion count 1; parallelism 1; timeout 5 minutes; CPU 0.25 / 0.5 Gi recommended.

---

## 10. Resource Design

Reuse **EXISTING** `rg-dr-vandana-staging`. **PROPOSED:** `cae-dr-vandana-staging`, `caj-dr-vandana-notifications-staging`, `id-dr-vandana-notifications-staging`, `acrdrvandanastaging`, image `dr-vandana-notifications-worker:staging-<sha>`.

---

## 11. Identity

User-assigned MI planned; machine identity only; **NOT CREATED**.

---

## 12. Key Vault

`kv-dr-vandana-staging` **EXISTING / NOT MODIFIED**. Map existing `staging-app-*` secrets to worker env. MI Secrets User planned for O15-S.

---

## 13. Database

Staging only target; TLS; no schema change. Connectivity: firewall allowlist first; private endpoint later decision. Egress/static IP may be prerequisite.

---

## 14. Network

**NOT MODIFIED.** Plan documents firewall/egress needs for O15-S.

---

## 15. SMTP

Config via KV; TLS 587; **NOT EXECUTED**; email **NOT SENT**.

---

## 16. Configuration

Full env matrix in plan §16. Registration/WhatsApp forced false.

---

## 17. Security

MI → KV → PG/SMTP; no clinical authority; no secrets in image; residual SMTP idempotency gap acknowledged.

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 18. Observability

Structured batch logs + Job platform logs; no secret/clinical body logging; alerts planned not created.

---

## 19. Reliability

5-minute schedule; parallelism 1; lease reclaim; low Job-level retries; 5-minute timeout; rollback via pause + image revert.

---

## 20. Cost

**PRICING REQUIRES CURRENT AZURE VERIFICATION.** Drivers: Job seconds, ACR, logs, KV, possible NAT.

---

## 21. Deployment

13-phase sequence documented for O15-S only — **not executed**.

---

## 22. Rollback

Disable schedule → prior image tag → preserve outbox → verify → resume.

---

## 23. Failure Analysis

Job/PG/SMTP/KV/image/credential/region failures mapped to retain-outbox + restore paths. RPO/RTO remain broader Option B decisions.

---

## 24. Production Isolation

Separate future Prod Job/MI/KV/DB/SMTP. **PRODUCTION WORKER: NOT PROVISIONED.** Production **UNTOUCHED**.

---

## 25. Legal / Governance

O10 / O11 / O18 remain OPEN. Region ≠ residency.

**LEGAL/GOVERNANCE: OPEN ITEMS PRESERVED**

---

## 26. Security Review

| ID | Severity | Finding |
| --- | --- | --- |
| P1 | HIGH (ops) | Providers NotRegistered — must register in O15-S | Condition |
| P2 | MEDIUM | No Dockerfile; tsx in devDependencies | Condition |
| P3 | MEDIUM | Staging CLI requires non-production NODE_ENV | Condition / interim |
| P4 | MEDIUM | PG egress/firewall for ACA unknown until provision | Condition |
| P5 | LOW | App DB URL broader than ideal worker role | Recommended hardening |

No CRITICAL invent; no secrets leaked.

---

## 27. Independent Review

| Check | Result |
| --- | --- |
| O15 ACA Jobs preserved; not provisioned | PASS |
| Batch-and-exit preserved | PASS |
| No Prod/staging infra created | PASS |
| No secrets exposed | PASS |
| MI/KV/PG/SMTP planned only | PASS |
| No email/appointment/outbox | PASS |
| Registration/WhatsApp/Option C | PASS |
| Legal opens explicit; region ≠ residency | PASS |
| Cost qualified; rollback/failures documented | PASS |
| Authorization boundary explicit | PASS |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 28. Conditions

1. Explicit O15-S authorization  
2. Register `Microsoft.App` + `Microsoft.ContainerRegistry`  
3. Authorize Dockerfile creation + image build strategy  
4. Resolve ACA egress → PG firewall (or private networking)  
5. Accept interim non-production `NODE_ENV` for staging CLI image  
6. Confirm ACA Jobs in India South Central for this subscription  

---

## 29. Readiness Decision

**READY WITH CONDITIONS**

Plan is complete for staging ACA Jobs. Conditions above must be satisfied during O15-S. This is **not** permission to provision.

---

## 30. Next Task

**O15-S — Staging Worker Hosting Provisioning & Verification**  
**ONLY AFTER EXPLICIT AUTHORIZATION.**  
**DO NOT START AUTOMATICALLY.**

---

## 31. Files Created

- `docs/O15_P_STAGING_WORKER_HOSTING_PROVISIONING_PLAN.md`
- `docs/O15_P_STAGING_WORKER_HOSTING_PROVISIONING_PLAN_REPORT.md`

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

## 35. Application Changes

**NONE**

---

## 36. Production Changes

**NONE**

---

## 37. Tests

| Check | Result |
| --- | --- |
| Unit tests | **NOT RUN** (prior 365/1 stands) |
| typecheck / lint / build | **NOT RUN** |
| Worker / E2E | **NOT RUN** (not required for plan) |

---

## 38. Git Status

HEAD `7974175`. Plan docs untracked. No commit.

---

## 39. Git Commit

**NONE**

---

## 40. GitHub Push

**NONE**

---

## 41. Final Status

```text
O15-P COMPLETE
WORKER: VERIFIED
WORKER ENTRYPOINT: npm run notifications:process
EXECUTION MODEL: BATCH-AND-EXIT / SCHEDULED JOB
RECOMMENDED HOST: AZURE CONTAINER APPS JOBS
ALTERNATIVE: AZURE FUNCTIONS TIMER TRIGGER
CONTAINER FEASIBILITY: PASS WITH CONDITIONS
STAGING REGION: INDIA SOUTH CENTRAL
STAGING WORKER: NOT PROVISIONED
PRODUCTION WORKER: NOT PROVISIONED
MANAGED IDENTITY: NOT CREATED
KEY VAULT: STAGING ONLY / NOT MODIFIED
DATABASE: STAGING ONLY / NOT MODIFIED
NETWORK: NOT MODIFIED
SMTP: NOT EXECUTED
EMAIL: NOT SENT
APPOINTMENT: NOT CREATED
OUTBOX: NOT PROCESSED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
REAL PATIENT DATA: NOT USED
PRODUCTION: UNTOUCHED
SECRETS: NOT EXPOSED
INFRASTRUCTURE CHANGES: NONE
DATABASE CHANGES: NONE
APPLICATION CHANGES: NONE
SECURITY REVIEW: PASS WITH CONDITIONS
LEGAL/GOVERNANCE: OPEN ITEMS PRESERVED
INDEPENDENT REVIEW: PASS WITH CONDITIONS
O15-P DECISION: READY WITH CONDITIONS
PLAN: docs/O15_P_STAGING_WORKER_HOSTING_PROVISIONING_PLAN.md
REPORT: docs/O15_P_STAGING_WORKER_HOSTING_PROVISIONING_PLAN_REPORT.md
GIT COMMIT: NONE
GITHUB PUSH: NONE
NEXT CONTROLLED TASK: O15-S — STAGING WORKER HOSTING PROVISIONING & VERIFICATION
ONLY AFTER EXPLICIT AUTHORIZATION.
DO NOT START O15-S AUTOMATICALLY.
STOP.
```

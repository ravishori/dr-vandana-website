# O15-S Staging Worker Hosting Provisioning & Verification Report

**Document type:** Staging-only ACA Jobs worker provisioning + verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**Related:** O15, O15-P, O-B-05E-R, O-B-05E-P-R, O-B-05D-R2  

```text
O15-S DECISION = PASS WITH CONDITIONS
WORKER HOST = Azure Container Apps Jobs (staging)
EXECUTION MODEL = BATCH-AND-EXIT
SCHEDULE = */5 * * * * (every 5 minutes)
PARALLELISM = 1
PRODUCTION = UNTOUCHED
GIT COMMIT = NONE
GITHUB PUSH = NONE
```

**Secret values, connection strings, passwords, and tokens are never recorded. Use `[PRESENT — VALUE REDACTED]`.**

---

## 1. Executive Summary

O15-S provisioned and verified a **staging-only** Azure Container Apps **Job** that runs `npm run notifications:process` on a 5-minute schedule with parallelism 1. After correcting secret injection (UTF-8 BOM on staging `DATABASE_URL` broke `isPostgresUrl`), the Job connected to `pg-dr-vandana-staging` / `dr_vandana_db_staging`, processed synthetic appointment `APT-5N7XVZYN` (`PAT-TKBMVXZK` → `PSY-29QFCPKD`), sent EMAIL to patient + psychologist via staging SMTP, demonstrated idempotency on a second run (`claimed=0`), and exited normally.

**Conditions:** ACA/LAW/ACR Tasks not available in India South Central → worker stack in **Central India**; mailbox receipt not verified; intentional failure/retry not injected; staging PG includes Azure-services firewall special-case `0.0.0.0`; runtime secrets held in ACA secret store (loaded from staging KV with BOM strip) after live Key Vault refs failed `isPostgresUrl` due to BOM.

---

## 2. Authorization

Staging infrastructure provisioning only, per user O15-S brief. No Production mutations. No Option C. Registration/WhatsApp left disabled. No git commit/push.

---

## 3. Baseline

| Check | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` |
| Unexpected tracked resets | None performed |
| Pre-existing dirty tree | Present (prior O-B docs / synthetic-patient work) — **preserved** |

---

## 4. O15-P Conditions

O15-P recommended ACA Jobs, MI → KV, schedule 5 minutes, parallelism 1, batch-and-exit. O15-S executed that plan with documented regional compromise (Central India for ACA).

---

## 5. Azure Provider Registration

| Provider | Result |
| --- | --- |
| `Microsoft.App` | Registered |
| `Microsoft.ContainerRegistry` | Registered |
| `Microsoft.OperationalInsights` | Registered |
| `Microsoft.ManagedIdentity` | Registered (dependency) |

Not treated as Production access.

---

## 6. Resource Group

| Field | Value |
| --- | --- |
| Name | `rg-dr-vandana-staging-worker` |
| Region | India South Central |
| Tags | Environment=Staging (tag string partially concatenated at create; intent documented) |
| Action | **CREATED** |

---

## 7. Container Apps Environment

| Field | Value |
| --- | --- |
| Name | `cae-dr-vandana-staging` |
| Region | **Central India** (ACA unavailable in India South Central) |
| Workload | Consumption |
| Logs | Log Analytics `law-dr-vandana-staging-worker` |
| Static IP | `4.224.141.164` |
| Action | **CREATED** |

---

## 8. Container Registry

| Registry | Region | Role |
| --- | --- | --- |
| `acrdrvandanastaging` | India South Central | Created; ACR Tasks unsupported → unused for build |
| `acrdrvandanawkrstg` | Central India | **Active** build/push target |

Auth: Managed Identity `AcrPull` (no registry passwords in Git).

---

## 9. Managed Identity

| Field | Value |
| --- | --- |
| Name | `id-dr-vandana-staging-worker` |
| Type | User Assigned (machine identity only) |
| Principal ID | `3544baaa-5518-4801-b126-f0fbef237e60` |
| Client ID | `a5a05dd8-e3d8-447a-8003-5a7819986df9` |
| Roles | Key Vault Secrets User (staging KV); AcrPull |
| Not | PATIENT / PSYCHOLOGIST / SUPER_ADMIN |

---

## 10. Key Vault

| Field | Value |
| --- | --- |
| Vault | `kv-dr-vandana-staging` |
| Access | Secrets User on worker MI |
| Secrets rotated | **No** |
| Values printed | **No** |

**Finding:** `staging-app-database-url` value begins with UTF-8 BOM (`EF BB BF`), which fails `isPostgresUrl` (`startsWith("postgres")`). KV value was **not** rewritten (no rotation). Operator loaded BOM-stripped copies into ACA Job secret store for runtime.

---

## 11. Database Connectivity

| Field | Value |
| --- | --- |
| Server | `pg-dr-vandana-staging` |
| Database | `dr_vandana_db_staging` |
| TLS | Required (staging URL / Azure PG) |
| Production DB | **UNTOUCHED** |
| Evidence | Job logs `notificationsProcess` with successful batch stats |

---

## 12. Firewall / Networking

Simplest secure path consistent with O15-P: public staging PG + restricted firewall.

| Change | Detail |
| --- | --- |
| `o15s-aca-worker-20260830` | Allow CAE static IP `4.224.141.164` |
| `o15s-allow-azure-services-20260830` | Azure services special-case `0.0.0.0`–`0.0.0.0` (Consumption egress is multi-IP; documented condition) |
| Production firewall | **UNTOUCHED** |
| Private networking | Not introduced (would exceed authorization) |

---

## 13. Container Image

| Field | Value |
| --- | --- |
| Dockerfile | `Dockerfile.worker` (new, staging worker minimum) |
| Ignore | `.dockerignore` (excludes `.env`, docs, etc.) |
| Base | `node:24-bookworm-slim` |
| CMD | `npm run notifications:process` |
| Secrets in image | **None** |
| Tag | `acrdrvandanawkrstg.azurecr.io/dr-vandana-notifications-worker:staging-7974175` |

---

## 14. Container Apps Job

| Field | Value |
| --- | --- |
| Name | `caj-drv-notif-stg` |
| Plan name | `job-dr-vandana-notifications-staging` (exceeded length; shortened) |
| Environment | `cae-dr-vandana-staging` |
| Model | Scheduled batch-and-exit |

---

## 15. Schedule

Cron: `*/5 * * * *` (every 5 minutes UTC). Confirmed on Job configuration.

---

## 16. Retry

| Layer | Policy |
| --- | --- |
| Job `replicaRetryLimit` | **0** |
| Application | Existing outbox `RETRY` / `DEAD` / lease reclaim |
| Interaction | Infra does not multiply app retries |

---

## 17. Concurrency

Parallelism **1**; replicaCompletionCount **1**. Aligns with `FOR UPDATE SKIP LOCKED` outbox claiming.

---

## 18. Timeout

`replicaTimeout` = **300s**. Sufficient for dual SMTP sends (~7s observed); below 5-minute schedule to limit overlap.

---

## 19. Logging

Log Analytics destination on CAE. Observed structured ops: `notificationDispatchBatch`, `notificationDelivery`, `notificationsProcess`. No passwords/URLs/bodies observed in sampled logs.

---

## 20. Monitoring

Minimum: Job execution status (Succeeded/Failed) + LAW console logs. No SIEM / Production alerts.

---

## 21. Environment Variables

| VARIABLE | SOURCE | SECRET? | REQUIRED? | KEY VAULT NAME | PURPOSE |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | ACA secret ← staging KV | Yes | Yes | `staging-app-database-url` | DB |
| `AUTH_SESSION_SECRET` | ACA secret ← staging KV | Yes | Yes | `staging-app-auth-session-secret` | Identity ctx |
| `SMTP_PASSWORD` | ACA secret ← staging KV | Yes | Yes | `staging-app-smtp-password` | SMTP auth |
| `SMTP_SERVER` | KV metadata | No* | Yes | `staging-app-smtp-server` | SMTP host |
| `SMTP_PORT` | KV metadata | No* | Yes | `staging-app-smtp-port` | Port |
| `SMTP_EMAIL` | KV metadata | No* | Yes | `staging-app-smtp-username` | Auth user |
| `SMTP_FROM_EMAIL` | KV metadata | No* | Yes | `staging-app-smtp-from-email` | From |
| `SMTP_FROM_NAME` | KV metadata | No* | Yes | `staging-app-smtp-from-name` | From display |
| `EMAIL_PROVIDER` | Literal `smtp` | No | Yes | — | Provider select |
| `NODE_ENV` | Literal `development` | No | Yes | — | CLI allows non-prod only |
| `PATIENT_REGISTRATION_ENABLED` | `false` | No | Yes | — | Safety |
| `TWILIO_WHATSAPP_ENABLED` | `false` | No | Yes | — | Safety |

\*Stored as non-secret Job env; treated as sensitive operational metadata in reports (values not re-listed here beyond prior staging docs).

---

## 22. Secret References

Final runtime: ACA Job secrets (names above) with values loaded from staging KV (BOM-stripped). Live Key Vault refs synced successfully at platform level but runtime URL still failed `isPostgresUrl` while BOM remained in the stored secret — literal ACA secrets used for verification.

---

## 23. Worker Deployment

Image attached; env resolved; Job starts. **PASS**

---

## 24. Worker Execution

| Execution | Result |
| --- | --- |
| Idle smoke (`caj-drv-notif-stg-bddt8ww`) | Succeeded — `claimed=0` |
| Scheduled 19:40 UTC | Succeeded — `expanded=1,claimed=2,sent=2` |
| Idempotency (`caj-drv-notif-stg-tba6nce`) | Succeeded — `claimed=0` |

**WORKER EXECUTION: PASS**

---

## 25. Synthetic E2E

| Step | Result |
| --- | --- |
| Psychologist | `PSY-29QFCPKD` |
| Patient | `PAT-TKBMVXZK` |
| Appointment | **CREATED** `APT-5N7XVZYN` (prior `APT-8S5ZK84M` already SENT — not reused) |
| Notification / outbox | `AppointmentRequested` |
| ACA Job | Processed at ~19:40 UTC |
| SMTP | PATIENT + PSYCHOLOGIST EMAIL **SENT** |
| Recipient (patient) | `ravishori+ob05e-synthetic-patient@gmail.com` |

Temporary seed script deleted after use (not retained as product entrypoint).

---

## 26. SMTP

Existing staging SMTP configuration. Provider unchanged. Credentials not exposed.  
**SMTP: PASS** (acceptance / worker SENT)  
**SMTP AUTH: PASS** (implicit via successful send; dedicated verify not re-run this task)  
**MAILBOX RECEIPT: NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE**

---

## 27. Outbox

| Appointment | Outbox | Deliveries |
| --- | --- | --- |
| `APT-5N7XVZYN` | `AppointmentRequested` → **SENT** | 2 × EMAIL SENT (PATIENT, PSYCHOLOGIST) |

---

## 28. Idempotency

Second Job start after SENT: `expanded=0, claimed=0, sent=0`. Delivery attempt counts remained 1. **PASS**

---

## 29. Failure / Retry

No intentional SMTP/DB breakage. **RETRY: NOT VERIFIED**

---

## 30. Security Review

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | HIGH | Staging `DATABASE_URL` KV secret has UTF-8 BOM breaking URL parse | Documented; ACA load strips BOM; KV cleanup deferred (no rotate in O15-S) |
| S2 | MEDIUM | Staging PG rule `0.0.0.0` Azure-services special-case widens Azure-origin access | Documented condition; Production untouched |
| S3 | MEDIUM | Worker compute region ≠ India South Central | Forced by Azure product availability |
| S4 | MEDIUM | Runtime secrets in ACA store vs continuous KV ref | Values still sourced from staging KV; MI Secrets User retained |
| S5 | LOW | RG tags concatenated into single tag value at create | Cosmetic |
| S6 | INFORMATIONAL | Job name shortened for Azure length limits | Documented |
| S7 | INFORMATIONAL | Unused ISC ACR remains | Cost/cleanup follow-up |

No CRITICAL Production boundary break. No secrets in Git/image/logs sampled.

**SECURITY REVIEW: PASS WITH CONDITIONS**

---

## 31. Production Isolation

| Resource | Status |
| --- | --- |
| Production worker | **NOT PROVISIONED** |
| Production database | **UNTOUCHED** |
| Production Key Vault | **UNTOUCHED** |
| Production Vercel | **UNTOUCHED** |
| Production SMTP | **UNTOUCHED** |
| Production firewall | **UNTOUCHED** |
| Prod RG observed | `rg-dr-vandana-prod` exists; **not modified** |

Only staging Job listed in subscription: `caj-drv-notif-stg`.

---

## 32. Option C

**BLOCKED** — not implemented.

---

## 33. Registration

`PATIENT_REGISTRATION_ENABLED=false` on Job and seed path. **IMPLEMENTED BUT SAFELY DISABLED**

---

## 34. WhatsApp

`TWILIO_WHATSAPP_ENABLED=false`. **DISABLED**

---

## 35. Tests

| Suite | Result |
| --- | --- |
| Infrastructure E2E | Executed (Job + outbox + SMTP) |
| `npm test` / typecheck / lint / build | **NOT RUN** this session (known prior baseline 365 PASS / 1 known Upstash env failure — not reclassified as O15-S regression) |

---

## 36. Rollback

Documented (not executed):

1. Disable Job schedule / stop Job  
2. Stop active executions  
3. Revert image tag if needed  
4. Preserve outbox rows (no truncate)  
5. Verify notification/delivery statuses  
6. Prevent duplicate sends (idempotent SENT state)  
7. Restore prior Job config / firewall rules if required  

---

## 37. Infrastructure Inventory

See `docs/O15_S_STAGING_WORKER_HOSTING_INVENTORY.md`.

---

## 38. Cost

Consumption Job + ACR + LAW + UAMI. **PRICING REQUIRES CURRENT AZURE VERIFICATION**.

---

## 39. Legal / Governance

Staging synthetic only. No real patient/clinical data. Option C blocked. Registration disabled.

---

## 40. Independent Review

Checklist 1–30 from O15-S brief: staging-only mutations; ACA Jobs batch-and-exit; 5-minute schedule; parallelism 1; dedicated MI; Secrets User; staging DB+TLS; firewall restricted with documented Azure-services condition; SMTP protected; no secret leakage detected in docs/logs sampled; image without secrets; synthetic identities only; registration/WhatsApp disabled; Option C blocked; appointment→notification→outbox→Job→SMTP proven; idempotency proven; exit normal; rollback documented; app changes limited to worker Dockerfile/.dockerignore.

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 41. Readiness Decision

**PASS WITH CONDITIONS** — staging hosted worker is provisioned and verified for synthetic E2E; conditions in §1 / §30 remain.

---

## 42. Remaining Blockers / Conditions

1. Clean UTF-8 BOM from staging KV `staging-app-database-url` (authorized secret maintenance).  
2. Prefer narrowing PG firewall if static egress / NAT becomes available.  
3. Re-enable live Key Vault secret refs after BOM fix.  
4. Mailbox receipt still unverified.  
5. Region alignment / Product availability for India South Central ACA (future).  
6. O15-S-C schedule stability soak (recommended next).  

---

## 43. Next Task

Recommend **O15-S-C — STAGING WORKER STABILITY / SCHEDULE VERIFICATION** before treating the schedule as soak-proven.  
Do **not** start Production worker deployment.  
**O-B-06** only after human review of O15-S-C / readiness.

---

## 44. Git Status

HEAD remains `7974175`. Uncommitted prior work preserved. O15-S adds: `Dockerfile.worker`, `.dockerignore`, this report, inventory.

---

## 45. Git Commit

**NONE**

---

## 46. GitHub Push

**NONE**

---

## 47. Final Status

```text
O15-S COMPLETE
AZURE PROVIDERS: REGISTERED (Microsoft.App, Microsoft.ContainerRegistry, Microsoft.OperationalInsights)
RESOURCE GROUP: rg-dr-vandana-staging-worker
CONTAINER APPS ENVIRONMENT: cae-dr-vandana-staging (Central India)
CONTAINER REGISTRY: acrdrvandanawkrstg (active); acrdrvandanastaging (limited)
MANAGED IDENTITY: id-dr-vandana-staging-worker
KEY VAULT: kv-dr-vandana-staging
DATABASE: pg-dr-vandana-staging / dr_vandana_db_staging
NETWORK: PASS WITH CONDITIONS (Central India CAE → ISC PG)
FIREWALL: STAGING RULES ADDED (static IP + Azure services special-case)
CONTAINER IMAGE: acrdrvandanawkrstg.azurecr.io/dr-vandana-notifications-worker:staging-7974175
WORKER ENTRYPOINT: npm run notifications:process
EXECUTION MODEL: BATCH-AND-EXIT
SCHEDULE: 5 MINUTES
PARALLELISM: 1
CONTAINER APPS JOB: caj-drv-notif-stg
WORKER DEPLOYMENT: PASS
WORKER EXECUTION: PASS
KEY VAULT ACCESS: PASS WITH CONDITIONS (Secrets User; runtime via ACA secrets after BOM)
DATABASE CONNECTIVITY: PASS
SMTP: PASS
SMTP AUTH: PASS
APPOINTMENT: CREATED (APT-5N7XVZYN)
NOTIFICATION: CREATED
OUTBOX: PROCESSED
SYNTHETIC EMAIL: SENT
RECIPIENT: ravishori+ob05e-synthetic-patient@gmail.com
MAILBOX RECEIPT: NOT VERIFIED — MAILBOX ACCESS UNAVAILABLE
RETRY: NOT VERIFIED
IDEMPOTENCY: PASS
WORKER EXIT: PASS
LOGGING: PASS
MONITORING: PASS WITH CONDITIONS (minimum Job + LAW)
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
REAL PATIENT DATA: NOT USED
PRODUCTION: UNTOUCHED
O15-S DECISION: PASS WITH CONDITIONS
```

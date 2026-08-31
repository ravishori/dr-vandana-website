# O15 — Worker Hosting Resolution

**Status:** RESOLVED WITH CONDITIONS (recommendation only — **not** provisioning authorization)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08`  
**Related E2E:** O-B-05E-R (CLI `processDueNotifications` staging PASS WITH CONDITIONS)

This document selects a **recommended hosting architecture**. It does **not** authorize creating Azure resources, managed identities, secrets, or Production workers.

---

## 1. Objective

Choose a managed worker-host model that can run the existing Option B notification dispatcher against environment-isolated PostgreSQL and SMTP, without using Vercel request handlers as a substitute, and without treating the development CLI as Production.

---

## 2. Current worker architecture

```text
Appointment mutation (transaction)
  → appointment_notification_outbox (PENDING)
  → expand due outbox rows
  → insert planned deliveries (EMAIL / optional WHATSAPP)
  → claim deliveries (FOR UPDATE SKIP LOCKED + lease)
  → provider send (SMTP / Twilio)
  → delivery finalize + outbox rollup
```

Core library: `processDueNotifications` → `processNotificationBatch`  
(`src/lib/notifications/process.ts`, `src/lib/notifications/dispatcher.ts`)

Verified on staging by O-B-05E-R using the CLI path (not a hosted service).

---

## 3. Existing worker entrypoint

| Item | Value |
| --- | --- |
| Script | `scripts/process-notifications.ts` |
| npm command | `npm run notifications:process` |
| Behaviour | Load identity context → **one** `processDueNotifications` batch → print stats → **exit** |
| Production guard | **Refuses** when `NODE_ENV=production` or identity `nodeEnv=production` |
| HTTP route | **None** |
| Long-running loop | **None** in repository |

**Implication:** Hosting must invoke a **batch job** (schedule / Job), not assume an existing always-on loop. Production requires a **dedicated hosted entrypoint** that is not this CLI (per runbook). Staging may use the existing CLI semantics with non-production `NODE_ENV` only as an interim ops model; preferred path is one hosted entrypoint for both environments with environment-specific config.

---

## 4. Execution model

| Question | Evidence-based answer |
| --- | --- |
| Continuous poll loop? | **No** — single batch then exit |
| Process due notifications? | **Yes** — `PENDING`/`RETRY` with `next_attempt_at` due |
| Safe every ~1 minute? | **Yes** — matches batch semantics; concurrency protected by `SKIP LOCKED` |
| Terminates after processing? | **Yes** |
| Needs scheduler? | **Yes** (platform Job/cron) unless a separate loop is later authorized |
| Two instances? | **Supported** at DB layer (`FOR UPDATE SKIP LOCKED`); not a singleton requirement |
| Crash / restart? | Incomplete batch: leases expire (`NOTIFICATION_LEASE_MS`, default 120000) and reclaim |
| Failed jobs? | Transient → `RETRY` + backoff; permanent/exhaustion → `DEAD` |
| Graceful shutdown? | **Not implemented** as a process protocol |
| Health checks? | **No** dedicated worker health endpoint |

**Best-fit model:** **C — Managed scheduled job execution** (batch-and-exit), optionally with max concurrent jobs = 1 initially for operational simplicity (not because the DB requires singleton).

---

## 5. Database requirements

| Environment | Target |
| --- | --- |
| Staging | `pg-dr-vandana-staging` / `dr_vandana_db_staging` |
| Production | `pg-dr-vandana-prod` / production DB (untouched by O15) |

Worker needs PostgreSQL access to:

- Read/claim/update `appointment_notification_outbox`
- Insert/update `appointment_notification_deliveries` / attempts
- Read appointment + user email/mobile verification fields for recipient resolution
- Write operational audit events used by dispatcher

**Recommended (not implemented):** separate **least-privilege** DB roles per environment (`worker_staging`, `worker_prod`) — no `SUPER_ADMIN` / clinical tables / patient portal session authority. Today the CLI uses the app `DATABASE_URL` (broader than ideal).

TLS required to Azure Flexible Server.

---

## 6. SMTP requirements

| Variable | Role |
| --- | --- |
| `EMAIL_PROVIDER=smtp` | Mode |
| `SMTP_SERVER` / `SMTP_PORT` | Transport |
| `SMTP_EMAIL` / `SMTP_PASSWORD` | AUTH |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | From |

Staging secrets already mapped in `kv-dr-vandana-staging` (`staging-app-smtp-*`).  
Worker host must outbound-reach SMTP over TLS (STARTTLS 587 as previously verified).  
Do not send mail during O15 documentation.

WhatsApp remains **disabled** (`TWILIO_WHATSAPP_ENABLED=false`); worker must not require Twilio for EMAIL-only operation.

---

## 7. Secret requirements

### Secrets (Key Vault)

| Logical secret | Staging KV name (existing) |
| --- | --- |
| Database URL | `staging-app-database-url` |
| Auth session secret (required today to boot `createAppIdentityContext`) | `staging-app-auth-session-secret` |
| SMTP password | `staging-app-smtp-password` |
| SMTP metadata | `staging-app-smtp-server`, `…-port`, `…-username`, `…-from-email`, `…-from-name` |

### Non-secret configuration

- `EMAIL_PROVIDER=smtp`
- `PATIENT_REGISTRATION_ENABLED=false`
- `TWILIO_WHATSAPP_ENABLED=false`
- `NOTIFICATION_*` batch/lease/backoff tunables
- Environment label (`STAGING` / `PRODUCTION`)

Prefer **Managed Identity → Key Vault references** over embedding long-lived cloud credentials in the job definition.  
Staging and Production must use **separate vaults, secrets, and connection strings**.

---

## 8. Security boundary

Worker is a **machine identity**, not a clinician or patient.

| Must NOT have | Must have (minimum) |
| --- | --- |
| SUPER_ADMIN / clinical browse | Outbox claim/process |
| Patient session impersonation as a product feature | Delivery state updates |
| Arbitrary Production DB from Staging | Staging-only secrets on staging host |
| Embedded SMTP password in git | KV-sourced SMTP |

Logging: structured ops only; no passwords; no clinical bodies (templates are operational appointment copy).

---

## 9. Hosting options

| Option | Fit to batch-and-exit | Azure PG/KV adjacency | Notes |
| --- | --- | --- | --- |
| **Azure Container Apps Jobs (scheduled)** | Excellent | Excellent | Cron triggers container that runs Node batch and exits |
| Azure Functions (timer) | Good | Good | Cold start / timeout must cover batch + SMTP; Node custom handler |
| Azure Container Apps (always-on) | Overkill unless loop added | Excellent | Needs sleep-loop code or external cron hitting an entrypoint |
| Azure App Service WebJob / always-on | Possible | Good | Heavier for tiny batch |
| Vercel Cron | Poor–partial | Weak MI/KV | Prod `NODE_ENV`, duration limits, prior architecture: not substitute |
| Self-managed VM | Possible | Possible | Higher ops burden; not preferred |

---

## 10. Azure-first assessment

**PASS WITH CONDITIONS**

Pros:

- Same cloud as `pg-dr-vandana-staging` and `kv-dr-vandana-staging`
- Managed identity + Key Vault pattern
- India South Central affinity with existing staging resources
- Firewall / private access path designable in O15-P

Conditions / gaps observed now:

- `Microsoft.App` provider **NotRegistered** on the inspected subscription (must register before ACA provisioning)
- Least-privilege worker DB role **not** created
- Dedicated Production entrypoint **not** present (CLI refuses production)
- No worker health endpoint

---

## 11. Region assessment

| Preference | Evidence |
| --- | --- |
| India preferred | Staging PG + KV in **India South Central** |
| Worker should colocate | Recommend same region for latency and ops clarity |

**Region ≠ legal data residency.** O18 processor/residency review remains a **legal** dependency.

---

## 12. Reliability

| Topic | Requirement |
| --- | --- |
| Schedule | Start with **every 1 minute** staging Job |
| Overlap | Allow platform overlap **or** set concurrency 1; DB `SKIP LOCKED` remains the safety net |
| Restart | Job retry policy on non-zero exit; lease reclaim covers mid-flight claims |
| DB outage | Job fails; appointments still commit; outbox stays PENDING/RETRY |
| SMTP outage | Transient → RETRY; permanent → DEAD; appointments unaffected |
| Liveness/readiness | Gap: no HTTP health — use job success metrics + outbox depth queries |
| Alerting | Pending age, DEAD count, job failure rate |

---

## 13. Scaling

- **Default:** one scheduled Job, concurrency **1** (ops simplicity)
- **Horizontal:** safe to raise concurrency because of `SKIP LOCKED` + delivery CAS
- **Not required:** singleton distributed lock product
- SMTP has **no** provider idempotency header → residual duplicate-email risk under rare double-send races (documented residual)

---

## 14. Observability

Minimum signals:

- Job start / exit code / duration
- Batch stats (`expanded`, `claimed`, `sent`, `retry`, `dead`, `skipped`) — already logged
- Outbox depth (PENDING/RETRY/DEAD)
- SMTP failure codes (sanitized)
- No secret values, no clinical content in logs

SIEM integration: out of scope for O15.

---

## 15. Cost considerations

Low-volume psychology practice: scheduled Job (~1 run/minute, short CPU) is typically far cheaper than always-on App Service.

**PRICING REQUIRES CURRENT PROVIDER VERIFICATION** (do not treat any INR figure as authoritative without current Azure price list for the chosen SKU/region).

---

## 16. Failure modes (summary)

| Mode | Expected behaviour | Recovery / monitor |
| --- | --- | --- |
| A DB down | Job fails; outbox untouched | Alert job failures; heal DB |
| B SMTP down | RETRY/DEAD per classification | Alert DEAD/retry backlog |
| C Key Vault down | Job cannot boot secrets | Alert; MI/KV health |
| D Crash mid-batch | Lease reclaim | Automatic on next runs |
| E Restart | Safe | — |
| F Duplicate workers | SKIP LOCKED | Prefer concurrency 1 initially |
| G Malformed outbox | Isolated failure logging | Investigate DEAD |
| H Poison notification | Bounded retries → DEAD | Manual review |
| I Network timeout | Transient retry | Provider timeout setting |
| J Credential expiry | AUTH failures | Rotate KV secrets; redeploy refs |
| K Bad deploy | Stop Job / roll image | Rollback procedure below |

---

## 17. Deployment topology

### Staging (target)

```text
Vercel Preview (dr-vandana-website)
        ↓ writes outbox
Azure PostgreSQL Staging (pg-dr-vandana-staging / dr_vandana_db_staging)
        ↑
Azure Container Apps Job (scheduled)  ← Managed Identity → kv-dr-vandana-staging
        ↓
SMTP (staging)
```

### Production (conceptual only — not provisioned)

```text
Vercel Production
        ↓
Azure PostgreSQL Production
        ↑
Azure Container Apps Job (separate) ← MI → Production Key Vault
        ↓
Production SMTP
```

No shared DB URLs, vaults, or worker identities across environments.

---

## 18. Rollback

1. Disable / pause scheduled Job (stop new processing).  
2. Revert container image / revision.  
3. **Preserve** outbox rows (do not truncate).  
4. Rely on lease reclaim + idempotent SENT CAS.  
5. After fix, re-enable Job; verify PENDING drain with synthetic staging appointment only.  
6. Do **not** use `npm run notifications:process` under `NODE_ENV=production`.

---

## 19. Staging architecture

See §17 staging diagram. Registration remains `false`. WhatsApp remains `false`. Synthetic data only.

---

## 20. Production architecture

See §17 production diagram. **Out of scope to provision.** Requires separate Production KV, DB firewall rules, Production SMTP, and hosted entrypoint that allows production runtime.

---

## 21. Provider recommendation

**RECOMMENDED:** Azure Container Apps **Jobs** (scheduled), India South Central (or verified India region colocation with PG/KV), Managed Identity → Key Vault, batch invoke of hosted worker entrypoint.

**Rationale:** Matches batch-and-exit code; Azure-first with existing PG/KV; low idle cost; concurrency controllable; no need for always-on loop.

---

## 22. Alternative

**ALTERNATIVE:** Azure Functions **Timer Trigger** (Node) calling the same batch library — acceptable if timeout/cold-start validated for worst-case batch + SMTP.

---

## 23. Rejected options

| Option | Why not recommended |
| --- | --- |
| Vercel Cron as sole worker host | Duration/`NODE_ENV`/MI-KV limits; prior O-B-03A rejection as Vercel-alone worker |
| Removing CLI production guard without new entrypoint | Violates runbook; unsafe “make CLI production” |
| Always-on VM as primary | Ops overhead for tiny batch |
| App Service always-on as primary | Cost/complexity vs Jobs for this workload |

---

## 24. O15 decision status

**RESOLVED WITH CONDITIONS**

Recommendation is complete. Provisioning is **not** authorized by this document.

---

## 25. Conditions for provisioning

Before O15-S staging provision:

1. Explicit authorization for **O15-P** (plan) then **O15-S** (provision).  
2. Register Azure `Microsoft.App` (currently NotRegistered on inspected subscription).  
3. Define hosted entrypoint strategy (dedicated script/image CMD; do not run Production CLI).  
4. Design least-privilege DB role + firewall allowlist for Job egress.  
5. Wire Managed Identity → `kv-dr-vandana-staging`.  
6. Confirm schedule, concurrency, alerts, rollback drill on staging.  
7. Preserve legal opens (O10/O11/O18) as non-blocking for staging host but blocking for Production go-live claims.

---

## 26. Legal dependencies

| ID | Topic | Status |
| --- | --- | --- |
| O10 | Retention | OPEN / legal |
| O11 | Privacy copy | OPEN / legal |
| O18 | Residency / processors (Azure, SMTP, etc.) | OPEN / legal |

Region choice does **not** satisfy O18 by itself.

---

## 27. Security dependencies

- Least-privilege worker DB role  
- Secret isolation per environment  
- No clinical authority on worker identity  
- SMTP residual duplicate risk acknowledged  
- Registration and WhatsApp remain disabled until separately approved

---

## 28. Open decisions (post-recommendation)

1. Exact ACA Job SKU / CPU-memory (O15-P).  
2. Private endpoint vs public PG + firewall IP allowlist.  
3. Whether staging uses interim CLI image vs dedicated entrypoint immediately.  
4. Production entrypoint design (blocked until Production gates).  
5. Alerting destination (email/Teams/etc.).

---

## Change control

| Action | Status |
| --- | --- |
| Provision worker host | **NOT DONE — NOT AUTHORIZED** |
| Application worker logic change | **NONE** |
| Production mutation | **NONE** |
| Git commit | **NONE** (documentation may be uncommitted) |

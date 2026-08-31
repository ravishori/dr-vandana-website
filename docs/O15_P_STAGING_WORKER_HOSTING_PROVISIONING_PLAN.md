# O15-P — Staging Worker Hosting Provisioning Plan

**Status:** READY WITH CONDITIONS (plan only — **not** provisioning authorization)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08`  
**Depends on:** `docs/O15_WORKER_HOSTING_RESOLUTION.md` (RESOLVED WITH CONDITIONS)  
**E2E evidence:** O-B-05E-R staging CLI worker PASS WITH CONDITIONS

**This document does not authorize creating Azure resources.**  
**O15-S requires separate explicit authorization.**

---

## 1. Objective

Produce an implementation-ready plan to host the **staging** notification worker as an **Azure Container Apps Job** (scheduled batch-and-exit) in **India South Central**, using Managed Identity → `kv-dr-vandana-staging`, targeting only:

- PostgreSQL: `pg-dr-vandana-staging` / `dr_vandana_db_staging`
- SMTP: staging KV SMTP secrets (already verified historically)

---

## 2. Scope

| In scope | Out of scope |
| --- | --- |
| Staging ACA Job design | Creating any Azure resource |
| Naming, identity, KV, network plan | Production provisioning |
| Image/Dockerfile **design** (not create) | App code / schema changes |
| Verification & rollback checklists | Sending email / processing outbox now |
| Cost framework | Exact live Azure price quotes |

---

## 3. Current architecture

```text
Vercel Preview (dr-vandana-website)
        ↓ appointment mutations
Azure PostgreSQL Staging (pg-dr-vandana-staging / dr_vandana_db_staging)
        ↑ (future) scheduled batch
Azure Container Apps Job  ← MI → kv-dr-vandana-staging → SMTP
```

**EXISTING**

| Resource | Status |
| --- | --- |
| `rg-dr-vandana-staging` | EXISTING (India South Central) |
| `pg-dr-vandana-staging` / `dr_vandana_db_staging` | EXISTING |
| `kv-dr-vandana-staging` | EXISTING |
| Staging SMTP secrets in KV | EXISTING (values redacted) |
| Worker logic + CLI | EXISTING; E2E verified |
| Dockerfile | **ABSENT** |
| ACR / ACA / MI for worker | **ABSENT** |
| `Microsoft.App` provider | **NotRegistered** |
| `Microsoft.ContainerRegistry` provider | **NotRegistered** |

---

## 4. Worker architecture

| Item | Value |
| --- | --- |
| Command | `npm run notifications:process` |
| Entrypoint | `scripts/process-notifications.ts` |
| Core | `processDueNotifications` → `processNotificationBatch` |
| Model | **BATCH-AND-EXIT** (one batch, process exit) |
| Production CLI guard | Refuses `NODE_ENV=production` |
| Graceful shutdown protocol | Not implemented |
| Health HTTP endpoint | None |

Application retry (evidence): `NOTIFICATION_MAX_ATTEMPTS` default 5; backoff `60s,5m,15m,1h,4h`; lease `120000` ms; batch 20; expand 50; provider timeout 15s. Claim uses `FOR UPDATE SKIP LOCKED`.

---

## 5. Container feasibility

**CONTAINER FEASIBILITY: PASS WITH CONDITIONS**

| Check | Finding |
| --- | --- |
| Node | Repo/Vercel use Node **24.x**; local observed `v24.15.0` |
| Lockfile | `package-lock.json` present (npm) |
| Dockerfile | **None** — must be designed in O15-S (authorized create) |
| Runtime command | `npm run notifications:process` uses **`tsx`** (currently **devDependency**) |
| Next.js | Not required to run worker; image should **not** need `next start` |
| Exit behaviour | Process exits after batch (Job-friendly) |
| OS | Linux container assumed |

**Conditions before image build (O15-S):**

1. Dockerfile design that installs dependencies needed to run `tsx` **or** compiles TS to JS in build stage (preferred long-term; no app logic change required if build-stage transpile only).  
2. Do **not** bake `.env` / secrets into image.  
3. Staging Job must set `NODE_ENV` to a **non-production** value (e.g. `development` or explicit staging convention) so the **existing** CLI guard does not refuse — **interim**. Production requires a dedicated entrypoint later (O15 resolution condition).  
4. Include only packages needed for worker (postgres, drizzle, nodemailer, identity/notification libs) — full monorepo copy is acceptable for staging simplicity.

**Dockerfile design (DOCUMENT ONLY — do not create in O15-P):**

```text
# Conceptual multi-stage (illustrative)
# Stage build: node:24-bookworm → npm ci → (optional) transpile scripts
# Stage run: node:24-bookworm-slim → copy app + node_modules →
#   CMD ["npm","run","notifications:process"]
# USER non-root; no secrets; no .env
```

---

## 6. Resource naming

All **PROPOSED** unless marked EXISTING.

| Resource | Proposed name | Notes |
| --- | --- | --- |
| Resource group | `rg-dr-vandana-staging` | **EXISTING** — prefer reuse |
| Optional worker RG | `rg-dr-vandana-staging-worker` | PROPOSED alternative if ops wants split |
| Container Apps Environment | `cae-dr-vandana-staging` | PROPOSED |
| Container Apps Job | `caj-dr-vandana-notifications-staging` | PROPOSED |
| Managed Identity | `id-dr-vandana-notifications-staging` | PROPOSED |
| Azure Container Registry | `acrdrvandanastaging` | PROPOSED (ACR names alphanumeric only) |
| Image repository | `dr-vandana-notifications-worker` | PROPOSED |
| Image tag | `staging-<gitsha>` + `staging-latest` movable | PROPOSED |

Production names must differ (`…-prod`, separate ACR/MI/KV). **Not created here.**

---

## 7. Azure Container Apps Job design

| Parameter | Staging recommendation |
| --- | --- |
| Type | Scheduled Job |
| Region | **India South Central** (colocate with PG/KV) |
| Trigger | Cron schedule |
| Replica completion count | 1 |
| Parallelism | **1** (ops simplicity; DB allows more) |
| Job retry limit | **0 or 1** platform retries (see §20) |
| Timeout | **5 minutes** (see §21) |
| CPU | **0.25** vCPU |
| Memory | **0.5 Gi** |
| Max executions / history | Platform default / retain last N for debug |

**PRODUCTION RECOMMENDATION:** Separate Job + MI + ACR image tag + Production KV; cadence **future decision** (not set here).

---

## 8. Schedule

**STAGING RECOMMENDATION:** every **5 minutes** initially (`*/5 * * * *` or ACA equivalent).

Rationale:

- Worker is batch-and-exit; due rows use `next_attempt_at`.  
- Application backoff starts at **60s** — sub-minute Job cadence is optional, not required.  
- 5 minutes reduces overlap risk during early verification while remaining responsive for staging E2E.  
- After verification, operators may tighten to **1 minute** if backlog latency requires it (supported by SKIP LOCKED).

**Do not assume every-minute is mandatory.** O15 noted ~1 minute as *safe*; staging plan prefers **5 minutes** first to reduce accidental repeated Job pressure during bring-up.

**PRODUCTION cadence:** DECISION REQUIRED later.

---

## 9. Concurrency

**SAFE PARALLELISM** at database layer (`FOR UPDATE SKIP LOCKED` + delivery CAS).

**STAGING OPS CHOICE:** **SINGLETON Job parallelism = 1** (not because DB requires it).

SMTP has **no** provider idempotency header → residual duplicate-email risk under rare races; keep parallelism 1 initially.

---

## 10. Managed identity

**PROPOSED:** user-assigned MI `id-dr-vandana-notifications-staging`.

| Must NOT be | Machine role |
| --- | --- |
| SUPER_ADMIN / PATIENT / PSYCHOLOGIST | Read KV secrets listed below |
| Clinical authority | Connect to staging PG (via connection string secret initially) |
| Production vault access | Pull ACR image (AcrPull) |

**NOT CREATED** in O15-P.

Future hardening: DB user least-privilege (`worker_staging`) instead of full app URL — plan in O15-S security checklist; schema grants **not** applied in O15-P.

---

## 11. Key Vault

**EXISTING:** `kv-dr-vandana-staging`

Flow:

```text
Container Apps Job
  → Managed Identity
  → Key Vault secret references / runtime fetch
  → env vars for process
```

RBAC (planned, not assigned): `Key Vault Secrets User` on vault for MI.

Do not embed secrets in image, CMD args, Git, or logs.

---

## 12. Secret names (existing)

| Key Vault name | Runtime variable | Secret? | Purpose | Consumer |
| --- | --- | --- | --- | --- |
| `staging-app-database-url` | `DATABASE_URL` | YES | Staging PG TLS URL | Worker |
| `staging-app-auth-session-secret` | `AUTH_SESSION_SECRET` | YES | Required today to boot `createAppIdentityContext` | Worker |
| `staging-app-smtp-password` | `SMTP_PASSWORD` | YES | SMTP AUTH | Worker |
| `staging-app-smtp-server` | `SMTP_SERVER` | config* | Host | Worker |
| `staging-app-smtp-port` | `SMTP_PORT` | config* | Port (587) | Worker |
| `staging-app-smtp-username` | `SMTP_EMAIL` | config* | Auth user | Worker |
| `staging-app-smtp-from-email` | `SMTP_FROM_EMAIL` | config* | From | Worker |
| `staging-app-smtp-from-name` | `SMTP_FROM_NAME` | config* | From name | Worker |

\*Treat as sensitive operational config; store in KV as today; never print values.

**Rotation:** follow existing staging secret rotation practice; Job picks up new versions on next execution after refresh.

**Do not create duplicate secret names.**

---

## 13. Database

| Target | Value |
| --- | --- |
| Server | `pg-dr-vandana-staging` |
| Database | `dr_vandana_db_staging` |
| TLS | Required |
| Schema changes | **NONE authorized** |

Prior evidence: schema PASS; `btree_gist` PASS; exclusion constraint PASS.

Connectivity recommendation for **staging bring-up**:

1. **Initial:** public PG access + **firewall allowlist** of Job egress IPs (or ACA environment outbound) — matches current staging pattern (operator firewall rules already used).  
2. **Hardening (follow-on):** VNet integration / private endpoint — **TECHNICAL DECISION REQUIRED** (KV already notes public access hardening open).

**Static egress:** If ACA Job lacks stable egress IPs, document **nat gateway / dedicated egress** as O15-S prerequisite before firewall allowlisting. Do not implement in O15-P.

---

## 14. Networking

| Topic | Staging posture |
| --- | --- |
| PG firewall | EXISTING public + rules; Job needs allowlisting or private path |
| KV | Public enabled today; MI access planned |
| SMTP egress | Outbound 587 STARTTLS to configured host |
| Production | Separate; untouched |

**NETWORK: NOT MODIFIED** by O15-P.

---

## 15. SMTP

TLS / port **587** per repository SMTP config. Credentials from KV only.  
Prior: AUTH PASS; synthetic send PASS (O-B-05D-R2 / O-B-05E-R).  
**Do not send email in O15-P.** Mailbox receipt not claimed.

---

## 16. Environment variables matrix

| Variable | Secret? | Source | KV name | Required? | Notes |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | YES | KV | `staging-app-database-url` | YES | Staging only |
| `AUTH_SESSION_SECRET` | YES | KV | `staging-app-auth-session-secret` | YES | Context boot |
| `SMTP_PASSWORD` | YES | KV | `staging-app-smtp-password` | YES | |
| `SMTP_SERVER` | NO* | KV | `staging-app-smtp-server` | YES | |
| `SMTP_PORT` | NO* | KV | `staging-app-smtp-port` | YES | Expect 587 |
| `SMTP_EMAIL` | NO* | KV | `staging-app-smtp-username` | YES | |
| `SMTP_FROM_EMAIL` | NO* | KV | `staging-app-smtp-from-email` | YES | |
| `SMTP_FROM_NAME` | NO* | KV | `staging-app-smtp-from-name` | optional | |
| `EMAIL_PROVIDER` | NO | Job config | — | YES | `smtp` |
| `NODE_ENV` | NO | Job config | — | YES | **Must not be `production`** for current CLI |
| `PATIENT_REGISTRATION_ENABLED` | NO | Job config | — | YES | `false` |
| `TWILIO_WHATSAPP_ENABLED` | NO | Job config | — | YES | `false` |
| `NOTIFICATION_MAX_ATTEMPTS` | NO | Job config | — | optional | default 5 |
| `NOTIFICATION_LEASE_MS` | NO | Job config | — | optional | default 120000 |
| `NOTIFICATION_BATCH_SIZE` | NO | Job config | — | optional | default 20 |
| `NOTIFICATION_EXPAND_BATCH_SIZE` | NO | Job config | — | optional | default 50 |
| `NOTIFICATION_PROVIDER_TIMEOUT_MS` | NO | Job config | — | optional | default 15000 |
| `NOTIFICATION_BACKOFF_MS` | NO | Job config | — | optional | CSV defaults |
| `NOTIFICATION_COMPLETED_EMAIL` | NO | Job config | — | optional | false |
| `NOTIFICATION_NO_SHOW_EMAIL` | NO | Job config | — | optional | false |

Production equivalents: separate vault names / values — **not configured here**.

---

## 17. Image strategy

| Item | Recommendation |
| --- | --- |
| Registry | **Azure Container Registry** `acrdrvandanastaging` (**TO BE CREATED** in O15-S) |
| Repo | `dr-vandana-notifications-worker` |
| Tags | Immutable `staging-<gitsha>`; movable `staging-latest` for Job |
| Auth | MI `AcrPull` on Job; CI push via separate credential/OIDC |
| Scanning | Enable ACR vulnerability scan when available |
| Retention | Keep last N staging tags; purge policy later |
| GHCR | Alternative only if ACR delayed — Azure-first prefers ACR |

**No registry created in O15-P.**

---

## 18. Security

```text
Vercel Preview → Azure PG Staging (app path)
Container Apps Job → MI → Key Vault → DATABASE_URL + SMTP + AUTH_SESSION_SECRET
                 → PG Staging + SMTP egress
```

- Minimum privilege MI  
- No clinical roles  
- No secrets in image/logs/Git  
- Registration/WhatsApp remain false  
- Option C blocked  

---

## 19. Logging

Log: start, end, duration, exit code, batch stats (`expanded/claimed/sent/retry/dead/skipped`), sanitized connectivity errors.

**Never log:** passwords, `DATABASE_URL`, `AUTH_SESSION_SECRET`, tokens, notification bodies with private content.

Platform: Container Apps Job logs → Log Analytics (recommended; not created here).

---

## 20. Monitoring

Minimum alerts (create in O15-S or later):

- Job failed / non-zero exit  
- No successful execution in N intervals  
- Rising PENDING/RETRY/DEAD counts (query-based)  
- Repeated SMTP failures  

Do not create alerts in O15-P.

---

## 21. Retry

| Layer | Behaviour | Staging recommendation |
| --- | --- | --- |
| Application | RETRY/DEAD with backoff | Keep defaults |
| ACA Job | Platform re-run on failure | **0** preferred; max **1** if needed |

**Risk:** Job-level retry + already-SENT deliveries: mitigated by delivery CAS / SENT finality; still prefer low platform retries to avoid duplicate SMTP attempts where provider lacks idempotency.

---

## 22. Timeout

Basis:

- Provider timeout 15s × batch size 20 → theoretical upper bound if serial worst case ~5 minutes SMTP-bound  
- O-B-05E-R observed ~4s per successful email  

**Staging Job timeout: 5 minutes.**  
Scale-up trigger: consistent near-timeout or backlog growth → increase timeout/CPU or reduce batch via env.

---

## 23. Resource sizing

| | Staging |
| --- | --- |
| CPU | 0.25 |
| Memory | 0.5 Gi |
| Workload | Low volume synthetic / staging appointments |
| Scale-up | Sustained backlog or timeout pressure |

Production sizing: future.

---

## 24. Cost

Drivers: ACA Job execution-seconds, ACR storage, Log Analytics, Key Vault ops, possible NAT egress, DB egress (usually small).

**PRICING REQUIRES CURRENT AZURE VERIFICATION.**  
No purchases in O15-P.

---

## 25. Deployment sequence (future O15-S — do not execute)

1. Register `Microsoft.App` + `Microsoft.ContainerRegistry`  
2. Confirm/reuse `rg-dr-vandana-staging`  
3. Create ACR  
4. Create user-assigned MI  
5. Create Container Apps Environment  
6. Grant MI Key Vault Secrets User + AcrPull  
7. Resolve PG firewall / egress (static egress if required)  
8. Build/push worker image (Dockerfile authorized in O15-S)  
9. Create Container Apps Job + schedule + env/secret refs  
10. Manual test execution (non-schedule)  
11. Enable schedule  
12. Synthetic E2E (authorized)  
13. Security verification  
14. Rollback drill  

---

## 26. Verification (after future provisioning)

1. Job starts and exits 0 on empty/idle outbox  
2. Environment = staging; DB host/db names match staging  
3. KV access works without embedded secrets  
4. SMTP config loads (no unnecessary send)  
5. Schedule fires  
6. Controlled synthetic outbox processes once  
7. Second run does not duplicate SENT  
8. Failure path leaves RETRY/DEAD coherently  
9. Logs free of secrets  
10. Production resources untouched  

Evidence: Job execution records, sanitized logs, DB outbox status counts, optional synthetic appointment public id.

---

## 27. Rollback

1. Disable schedule / stop Job  
2. Revert image tag to previous `staging-<sha>`  
3. Preserve outbox rows  
4. Confirm no unintended duplicate SENT  
5. Resume schedule  
6. Never use `notifications:process` under `NODE_ENV=production`

---

## 28. Failure modes

| Failure | Expected | Recovery |
| --- | --- | --- |
| Job fail | Outbox retained | Fix image/config; rerun |
| PG down | Exit non-zero | Restore PG; backlog drains later |
| SMTP down | App RETRY/DEAD | Fix SMTP; monitor DEAD |
| KV down | Boot fail | Restore KV/MI RBAC |
| Image pull fail | Job cannot start | Fix ACR/MI |
| Credential expiry | AUTH failures | Rotate KV; refresh refs |
| Region issue | Jobs unavailable | Manual CLI staging drain only if authorized; RPO/RTO broader Option B |

---

## 29. Production separation

Separate RG/Job/MI/ACR-or-repo/KV/DB/SMTP/logs. No shared credentials. **Not provisioned.**

---

## 30. Legal dependencies

O10 retention, O11 privacy copy, O18 residency/processors remain **OPEN**.  
India region ≠ legal residency guarantee. SMTP + Azure worker are processors for legal review.

---

## 31. Open conditions (must clear before/during O15-S)

1. Explicit **O15-S authorization**  
2. Register Azure providers `Microsoft.App`, `Microsoft.ContainerRegistry`  
3. Dockerfile creation authorized + `tsx`/transpile strategy  
4. Egress IP / firewall or private networking decision  
5. Confirm ACA Jobs availability in India South Central for subscription  
6. Interim `NODE_ENV≠production` accepted for staging CLI image  
7. Optional: least-privilege DB role design (recommended, not blocking first Job if using existing staging app URL secret with documented risk)  

---

## 32. Provisioning authorization boundary

| O15-P | O15-S (future) |
| --- | --- |
| Plan only | May create staging resources **only if explicitly authorized** |
| No RBAC changes | May assign MI RBAC |
| No image push | May build/push |
| No Job create | May create Job + schedule |
| No worker run | May run verification executions |

**READY WITH CONDITIONS ≠ permission to provision.**

---

## Change control

| Item | Status |
| --- | --- |
| Azure creates/modifies | **NONE** |
| Secrets created | **NONE** |
| App/DB changes | **NONE** |
| Email/outbox | **NOT EXECUTED** |
| Git commit | **NONE** |

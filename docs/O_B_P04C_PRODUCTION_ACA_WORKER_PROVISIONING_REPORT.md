# O-B-P04C Production ACA Worker Provisioning — Report (Retry PASS)

**Document type:** Task completion report  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Retry trigger:** Operator created `production-app-smtp-username`

```text
O-B-P04C DECISION = PASS WITH CONDITIONS
WORKER EXECUTION = SUCCEEDED (dry run, claimed=0)
SECRET LEAKAGE = NONE DETECTED
EMAIL = NOT SENT
```

---

## 1. Executive summary

O-B-P04C **retry succeeded** after operator closed the O-B-P04B SMTP username gap. Production worker infrastructure was provisioned in **Central India** with Key Vault–referenced secrets, immutable image `production-7974175`, and scheduled ACA Job `caj-drv-notif-prod`.

**Dry-run executions succeeded** with `claimed=0`, `sent=0` — no outbox processing, no email. Initial executions failed until Production PostgreSQL firewall allowed Azure services egress (documented condition, same pattern as staging O15-S).

---

## 2. Phase 0 — Key Vault preflight (READ-ONLY)

All required secret **names** **PRESENT** and **ENABLED**:

| Secret | Status |
| --- | --- |
| `production-app-database-url` | PRESENT / ENABLED |
| `production-app-auth-session-secret` | PRESENT / ENABLED |
| `production-app-smtp-server` | PRESENT / ENABLED |
| `production-app-smtp-port` | PRESENT / ENABLED |
| `production-app-smtp-username` | **PRESENT / ENABLED** (retry unblock) |
| `production-app-smtp-password` | PRESENT / ENABLED |
| `production-app-smtp-from-email` | PRESENT / ENABLED |
| `production-app-smtp-from-name` | PRESENT / ENABLED |

Secret values **not retrieved** into reports.

---

## 3. Production Dockerfile

| Item | Value |
| --- | --- |
| File | `Dockerfile.worker.production` (**NEW**) |
| Staging `Dockerfile.worker` | **UNCHANGED** |
| `NODE_ENV` | `production` |
| `NOTIFICATION_WORKER_EXECUTION_PROFILE` | `production-hosted-v1` |
| Command | `npm run notifications:process:production` |
| Batch-and-exit | **YES** |

---

## 4. Image security

| Check | Result |
| --- | --- |
| `.dockerignore` excludes `.env*` | **YES** |
| Secrets in image layers | **NONE** |
| Tag | `production-7974175` (immutable SHA tag) |
| `latest` | **NOT USED** |
| Digest | `sha256:83c29a92a944cbb595a1fdc75770bf40c4a6160aa6647ed3988956e314f642a6` |

Built via `az acr build` (cloud build — no local secret exposure).

---

## 5. Application tests

| Gate | Result |
| --- | --- |
| `npm test` | **378/378 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (2 pre-existing warnings) |
| `npm run build` | **PASS** |

---

## 6. Infrastructure provisioned

| Resource | Name | Region | Status |
| --- | --- | --- | --- |
| Resource group | `rg-dr-vandana-prod-worker` | Central India | **CREATED** |
| Log Analytics | `law-dr-vandana-prod-worker` | Central India | **CREATED** |
| ACR | `acrdrvandanawkrprod` | Central India | **CREATED** |
| Managed identity | `id-dr-vandana-prod-worker` | Central India | **CREATED** |
| Container Apps Environment | `cae-dr-vandana-prod` | Central India | **CREATED** |
| Container Apps Job | `caj-drv-notif-prod` | Central India | **CREATED** |

### Regional split

| Component | Region |
| --- | --- |
| ACA / ACR / MI / LAW | Central India |
| PostgreSQL / Key Vault | India South Central |

CAE static IP: `4.187.177.211`

---

## 7. Managed Identity RBAC

| Identity | Role | Scope |
| --- | --- | --- |
| `id-dr-vandana-prod-worker` | Key Vault Secrets User | `kv-dr-vandana-prod` |
| `id-dr-vandana-prod-worker` | AcrPull | `acrdrvandanawkrprod` |

Client ID (non-secret): `18fe4de9-a5c8-4415-89c4-872e44a23853`

---

## 8. Key Vault secret references

All 8 worker secrets use **Key Vault references** via user-assigned MI — **no plaintext secrets** in Job env.

| ACA secret name | KV secret | Env var |
| --- | --- | --- |
| `database-url` | `production-app-database-url` | `DATABASE_URL` |
| `auth-session-secret` | `production-app-auth-session-secret` | `AUTH_SESSION_SECRET` |
| `smtp-server` | `production-app-smtp-server` | `SMTP_SERVER` |
| `smtp-port` | `production-app-smtp-port` | `SMTP_PORT` |
| `smtp-username` | `production-app-smtp-username` | `SMTP_EMAIL` |
| `smtp-password` | `production-app-smtp-password` | `SMTP_PASSWORD` |
| `smtp-from-email` | `production-app-smtp-from-email` | `SMTP_FROM_EMAIL` |
| `smtp-from-name` | `production-app-smtp-from-name` | `SMTP_FROM_NAME` |

Plain env: `NODE_ENV=production`, `NOTIFICATION_WORKER_EXECUTION_PROFILE=production-hosted-v1`, `EMAIL_PROVIDER=smtp`, safety flags `false`.

**MFA_ENCRYPTION_KEY:** not injected (web-only).

---

## 9. Database connectivity

| Item | Value |
| --- | --- |
| Target | `pg-dr-vandana-prod` / `dr_vandana_db` |
| TLS | `sslmode=require` (KV metadata) |
| Schema modified | **NO** |
| Migrations | **NOT RUN** |

### Firewall (Production only)

| Rule | IP range | Purpose |
| --- | --- | --- |
| `p04c-aca-worker-20260831` | `4.187.177.211` | CAE static IP |
| `p04c-allow-azure-services-20260831` | `0.0.0.0`–`0.0.0.0` | Azure services (Consumption egress — staging precedent) |

**Condition:** CAE static IP alone was **insufficient**; Azure services rule required for successful DB connectivity (same as O15-S staging).

---

## 10. ACA Job configuration

| Field | Value |
| --- | --- |
| Name | `caj-drv-notif-prod` |
| Schedule | `*/5 * * * *` |
| Parallelism | `1` |
| Replica completion | `1` |
| Replica retry limit | `0` |
| Replica timeout | `300s` |
| Image | `acrdrvandanawkrprod.azurecr.io/dr-vandana-notifications-worker:production-7974175` |

---

## 11. Dry-run execution results

| Execution | Status | Stats (from logs) |
| --- | --- | --- |
| `caj-drv-notif-prod-x192qul` (manual) | **Failed** | DB blocked (pre-firewall fix) |
| `caj-drv-notif-prod-29802580` (scheduled) | **Failed** | DB blocked |
| `caj-drv-notif-prod-7yxi41g` (manual) | **Succeeded** | `claimed=0,sent=0,expanded=0` |
| `caj-drv-notif-prod-29802585` (scheduled) | **Succeeded** | `claimed=0,sent=0` |

Sanitized success log:

```json
{"operation":"notificationsProcessProduction","expanded":0,"claimed":0,"sent":0,"retry":0,"dead":0,"skipped":0}
```

| Activity | Status |
| --- | --- |
| SMTP AUTH / email send | **NOT EXECUTED** |
| Appointments / notifications created | **NO** |
| Synthetic E2E | **NOT PERFORMED** (O-B-P04D) |

Non-fatal log: `identityOtpProvider` / `production_otp_unconfigured` (expected while registration disabled).

---

## 12. Security

| Control | Result |
| --- | --- |
| Secret values in logs | **NONE DETECTED** |
| Staging unchanged | **YES** |
| Production website unchanged | **YES** |
| Registration / WhatsApp | **false** |
| O-B-P04A guard | **PRESERVED** |

---

## 13. Git / application changes

| File | Change |
| --- | --- |
| `Dockerfile.worker.production` | **NEW** |
| `.dockerignore` | Comment update only |
| `Dockerfile.worker` | **UNCHANGED** |
| O-B-P04C docs | Updated |

**GIT COMMIT:** NONE  
**GITHUB PUSH:** NONE

---

## 14. Rollback

1. Disable schedule / stop Job: `az containerapp job stop --name caj-drv-notif-prod --resource-group rg-dr-vandana-prod-worker`
2. Delete Job, CAE, ACR, MI, LAW, RG (optional teardown)
3. Remove firewall rules `p04c-*` from `pg-dr-vandana-prod`
4. Do **not** delete KV or PostgreSQL

---

## 15. Conditions

1. **Azure services firewall rule** on Production PG required for ACA Consumption DB connectivity (documented).
2. **SMTP runtime AUTH** not verified in P04C — deferred to O-B-P04D.
3. **Synthetic notification E2E** not performed — O-B-P04D.

---

## 16. Decision

```text
O-B-P04C DECISION = PASS WITH CONDITIONS
```

**NEXT:** O-B-P04D — Synthetic Production Worker E2E (do not start automatically)

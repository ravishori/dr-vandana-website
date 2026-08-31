# O-B-P04C Production ACA Worker Provisioning Plan

**Document type:** Infrastructure provisioning plan / architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Status:** **PROVISIONED** (O-B-P04C retry — PASS WITH CONDITIONS)

```text
O-B-P04C DECISION = PASS WITH CONDITIONS
INFRASTRUCTURE = PROVISIONED
WORKER DRY RUN = SUCCEEDED (claimed=0)
```

---

## 1. Objective

Provision and verify the Production notification worker on **Azure Container Apps Jobs** (Central India), using the O-B-P04A entrypoint `npm run notifications:process:production`, with Managed Identity → `kv-dr-vandana-prod`, targeting Production PostgreSQL only.

---

## 2. Regional architecture (approved)

| Component | Region | Resource |
| --- | --- | --- |
| PostgreSQL | India South Central | `pg-dr-vandana-prod` |
| Key Vault | India South Central | `kv-dr-vandana-prod` |
| ACA / ACR / MI / LAW | **Central India** | Worker stack (ACA unavailable in India South Central) |

Cross-region latency PG ↔ ACA is acceptable for 5-minute batch schedule.

---

## 3. Phase 0 preflight result — **BLOCKED**

### Verified (PASS)

| Check | Result |
| --- | --- |
| Azure subscription | **PRESENT** (`Azure subscription 1`) |
| `rg-dr-vandana-prod` | **PRESENT** (India South Central) |
| `kv-dr-vandana-prod` | **PRESENT**, RBAC enabled |
| `pg-dr-vandana-prod` | **READY**, PG 17 |
| `production-app-database-url` | **PRESENT**, **ENABLED** |
| DB safe metadata | `pg-dr-vandana-prod.postgres.database.azure.com` / `dr_vandana_db` / `sslmode=require` |
| `production-app-auth-session-secret` | **PRESENT**, **ENABLED** |
| `production-app-mfa-encryption-key` | **PRESENT**, **ENABLED** |
| `production-app-smtp-server` | **PRESENT**, **ENABLED** |
| `production-app-smtp-port` | **PRESENT**, **ENABLED** |
| `production-app-smtp-password` | **PRESENT**, **ENABLED** |
| `production-app-smtp-from-email` | **PRESENT**, **ENABLED** |
| `production-app-smtp-from-name` | **PRESENT**, **ENABLED** |

### Blocker (FAIL)

| Secret | Status | Maps to env |
| --- | --- | --- |
| `production-app-smtp-username` | **MISSING** | `SMTP_EMAIL` (canonical; `SMTP_USER` alias) |

Without this secret, `getSmtpTransportConfig()` / `isSmtpReadyForIdentity()` cannot succeed. The Production worker entrypoint fails closed before processing.

**Hard rule:** No Resource Group, ACR, MI, CAE, or Job may be created while a required secret is missing.

---

## 4. Planned Production worker boundary (when unblocked)

| Resource | Planned name | Region |
| --- | --- | --- |
| Resource group | `rg-dr-vandana-prod-worker` | Central India |
| ACR | `acrdrvandanawkrprod` | Central India |
| Managed identity | `id-dr-vandana-prod-worker` | Central India |
| Log Analytics | `law-dr-vandana-prod-worker` | Central India |
| Container Apps Environment | `cae-dr-vandana-prod` | Central India |
| Container Apps Job | `caj-drv-notif-prod` | Central India |

**Not created in O-B-P04C** (blocked).

---

## 5. Application / image readiness (Phase 1)

| Item | Status |
| --- | --- |
| `npm run notifications:process:production` | **PRESENT** in `package.json` |
| `scripts/process-notifications-production.ts` | **PRESENT** |
| `production-worker-guard.ts` | **PRESENT** — fail-closed |
| Staging CLI guard (`process-notifications.ts`) | **PRESERVED** |
| `Dockerfile.worker` | **STAGING ONLY** — uses `NODE_ENV=development` workaround |
| Production worker Dockerfile | **NOT YET CREATED** — required before image build (separate application change or `Dockerfile.worker.production`) |

Production image requirements (when proceeding):

- `NODE_ENV=production`
- `NOTIFICATION_WORKER_EXECUTION_PROFILE=production-hosted-v1`
- `CMD`: `npm run notifications:process:production`
- No secrets in image; `.dockerignore` excludes `.env*`

---

## 6. ACA Job configuration (planned)

| Field | Value |
| --- | --- |
| Execution model | Scheduled batch-and-exit |
| Command | `npm run notifications:process:production` |
| Schedule | `*/5 * * * *` (every 5 minutes UTC) |
| Parallelism | `1` |
| Replica completion count | `1` |
| Replica retry limit | `0` (app-level retry only) |
| Replica timeout | `300s` (staging reference) |

### Non-secret env

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NOTIFICATION_WORKER_EXECUTION_PROFILE` | `production-hosted-v1` |
| `EMAIL_PROVIDER` | `smtp` |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |

### Secret env (Key Vault references via MI)

| Env | KV secret |
| --- | --- |
| `DATABASE_URL` | `production-app-database-url` |
| `AUTH_SESSION_SECRET` | `production-app-auth-session-secret` |
| `SMTP_SERVER` | `production-app-smtp-server` |
| `SMTP_PORT` | `production-app-smtp-port` |
| `SMTP_EMAIL` | `production-app-smtp-username` |
| `SMTP_PASSWORD` | `production-app-smtp-password` |
| `SMTP_FROM_EMAIL` | `production-app-smtp-from-email` |
| `SMTP_FROM_NAME` | `production-app-smtp-from-name` |

**MFA_ENCRYPTION_KEY:** not injected into worker (web-only).

---

## 7. Managed Identity RBAC (planned)

| Identity | Role | Scope |
| --- | --- | --- |
| `id-dr-vandana-prod-worker` | Key Vault Secrets User | `kv-dr-vandana-prod` |
| `id-dr-vandana-prod-worker` | AcrPull | Production ACR |

No Owner / Contributor / Key Vault Administrator on worker MI.

---

## 8. Database connectivity (planned)

| Field | Value |
| --- | --- |
| Host | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| Port | `5432` |
| TLS | `sslmode=require` |

Firewall: narrowly scoped ACA outbound IPs only if required — never `0.0.0.0/0`.

---

## 9. Dry run (planned — not executed)

When unblocked, validate without notification E2E:

1. Manual Job execution (single replica)
2. Guard authorization logs (sanitized)
3. KV secret resolution via MI
4. DB TLS connectivity
5. SMTP config presence (`isSmtpReadyForIdentity`) — **no SMTP AUTH send** in P04C
6. Clean exit with `claimed=0` if outbox empty

Real synthetic E2E → **O-B-P04D** only.

---

## 10. Operator unblock steps

1. Create **`production-app-smtp-username`** in `kv-dr-vandana-prod` via Azure Portal (Production SMTP auth user — **not** staging value).
2. Re-run O-B-P04C preflight (metadata-only secret list).
3. Add Production Dockerfile (no `NODE_ENV=development`).
4. Proceed with worker stack provisioning.

---

## 11. Rollback (when resources exist)

1. `az containerapp job stop` / disable schedule on `caj-drv-notif-prod`
2. Delete or disable Job before CAE/ACR if full teardown needed
3. Do **not** delete `kv-dr-vandana-prod`, Production PG, or Production secrets

---

## 12. Related documents

- `docs/O_B_P04C_PRODUCTION_ACA_WORKER_PROVISIONING_REPORT.md`
- `docs/O_B_P04C_PRODUCTION_WORKER_INVENTORY.md`
- `docs/O_B_P04C_PRODUCTION_WORKER_SECURITY_REVIEW.md`
- `docs/O15_S_STAGING_WORKER_HOSTING_PROVISIONING_VERIFICATION_REPORT.md` (staging reference)

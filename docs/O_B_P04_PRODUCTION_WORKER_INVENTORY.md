# O-B-P04 Production Worker Inventory

**Date:** 2026-08-31  
**Status:** NOT PROVISIONED (O-B-P04 BLOCKED)

---

## WORKER REQUIRED VARIABLES

| Variable | Purpose | Secret? | Required | Production source | Verification |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL (outbox/deliveries) | YES | YES | KV `production-app-database-url` | **PRESENT** (metadata: prod host/db, sslmode=require) |
| `AUTH_SESSION_SECRET` | Boot `createAppIdentityContext` | YES | YES | KV `production-app-auth-session-secret` | **PRESENT** |
| `EMAIL_PROVIDER` | SMTP mode | NO | YES | Env `smtp` | **MISSING** in KV |
| `SMTP_SERVER` | SMTP host | SENSITIVE | YES | KV (not provisioned) | **MISSING** |
| `SMTP_PORT` | SMTP port | NO | YES | KV (not provisioned) | **MISSING** |
| `SMTP_EMAIL` | SMTP auth user | SENSITIVE | YES | KV (not provisioned) | **MISSING** |
| `SMTP_PASSWORD` | SMTP auth | SECRET | YES | KV (not provisioned) | **MISSING** |
| `SMTP_FROM_EMAIL` | From address | SENSITIVE | YES | KV (not provisioned) | **MISSING** |
| `SMTP_FROM_NAME` | From display | NO | OPTIONAL | KV (not provisioned) | **MISSING** |
| `PATIENT_REGISTRATION_ENABLED` | Safety flag | NO | YES=`false` | Env | **NOT IN KV** (must be `false`) |
| `TWILIO_WHATSAPP_ENABLED` | Safety flag | NO | YES=`false` | Env | **NOT IN KV** (must be `false`) |
| `NODE_ENV` / runtime | Entrypoint guard | NO | YES | Container env | **BLOCKED** — CLI refuses production |
| `NOTIFICATION_*` | Batch/lease/backoff | NO | OPTIONAL | Defaults in code | Defaults OK |

Legacy aliases `SMTP_HOST` / `SMTP_USER` supported by code if canonical names absent.

**MFA_ENCRYPTION_KEY:** Not required for worker (`O_B_P03A` inventory).

---

## Azure resources

| Resource | Expected | Actual |
| --- | --- | --- |
| `rg-dr-vandana-prod` | PG + KV | **EXISTS** |
| `pg-dr-vandana-prod` / `dr_vandana_db` | Worker DB target | **EXISTS** — schema 27/27 |
| `kv-dr-vandana-prod` | Secrets | **EXISTS** — 3 secrets only |
| `rg-dr-vandana-prod-worker` | Worker stack | **NOT PROVISIONED** |
| Production ACA Job | Scheduled worker | **NOT PROVISIONED** |
| Production ACR | Worker image | **NOT PROVISIONED** |
| `id-dr-vandana-prod-worker` | MI | **NOT PROVISIONED** |

---

## Key Vault secrets (metadata only)

| Secret | Status |
| --- | --- |
| `production-app-database-url` | PRESENT, enabled |
| `production-app-auth-session-secret` | PRESENT |
| `production-app-mfa-encryption-key` | PRESENT (web; not worker-critical) |
| `production-app-smtp-*` | **ABSENT** |

---

## RBAC (planned — not assigned)

| Identity | Role | Scope | Result |
| --- | --- | --- | --- |
| `id-dr-vandana-prod-worker` | Key Vault Secrets User | `kv-dr-vandana-prod` | **NOT CREATED** |
| `id-dr-vandana-prod-worker` | AcrPull | Production ACR | **NOT CREATED** |

---

## Container image

| Item | Status |
| --- | --- |
| `Dockerfile.worker` | Exists (staging-oriented) |
| Production image tag | **NOT BUILT** |
| Secrets in image | **NONE** (design OK) |

---

## Database target (sanitized)

| Field | Value |
| --- | --- |
| Server | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| Port | 5432 |
| TLS | Required (KV sslmode=require) |
| Outbox tables | Present (schema verified O-B-P03F-R2) |

---

## Monitoring

| Item | Status |
| --- | --- |
| Log Analytics | **NOT PROVISIONED** |
| ACA execution history | **N/A** |

---

## Rollback procedure

1. Stop/disable Production ACA Job schedule.  
2. Revert to prior image tag if bad deploy.  
3. Do not delete outbox rows.  
4. Do not drop Production database.

---

## Staging separation

| Check | Result |
| --- | --- |
| Staging worker RG | **UNCHANGED** |
| Staging secrets reused | **NO** |
| Staging MI reused | **NO** |

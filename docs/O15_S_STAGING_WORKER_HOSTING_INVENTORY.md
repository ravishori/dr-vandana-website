# O15-S Staging Worker Hosting Inventory

**Document type:** Staging-only Azure resource inventory  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**ManagedBy:** O15-S  

**Secret values are never recorded in this document.**

---

## Region note

Preferred plan region was **India South Central**. Azure Container Apps, ACR Tasks, and Log Analytics workspace creation were **not available** (or not usable for this stack) in India South Central at provision time. The worker compute stack was therefore placed in **Central India**. Staging PostgreSQL and Key Vault remain in **India South Central**.

---

## Inventory

| RESOURCE | TYPE | RESOURCE GROUP | REGION | ENVIRONMENT | PURPOSE | STATUS |
| --- | --- | --- | --- | --- | --- | --- |
| `rg-dr-vandana-staging-worker` | Resource Group | — | India South Central | Staging | Worker infra boundary | **CREATED BY O15-S** |
| `id-dr-vandana-staging-worker` | User Assigned Managed Identity | `rg-dr-vandana-staging-worker` | India South Central | Staging | ACR pull + KV Secrets User (least privilege) | **CREATED BY O15-S** |
| `acrdrvandanastaging` | Azure Container Registry | `rg-dr-vandana-staging-worker` | India South Central | Staging | Attempted ACR (Tasks unsupported in region) | **CREATED BY O15-S** — limited / unused for build |
| `acrdrvandanawkrstg` | Azure Container Registry | `rg-dr-vandana-staging-worker` | Central India | Staging | Staging worker images | **CREATED BY O15-S** — active |
| `law-dr-vandana-staging-worker` | Log Analytics Workspace | `rg-dr-vandana-staging-worker` | Central India | Staging | ACA Job console/system logs | **CREATED BY O15-S** |
| `cae-dr-vandana-staging` | Container Apps Environment | `rg-dr-vandana-staging-worker` | Central India | Staging | Host for staging notification Job | **CREATED BY O15-S** |
| `caj-drv-notif-stg` | Container Apps Job | `rg-dr-vandana-staging-worker` | Central India | Staging | Scheduled batch-and-exit notification worker | **CREATED BY O15-S** |
| `kv-dr-vandana-staging` | Key Vault | `rg-dr-vandana-staging` | India South Central | Staging | Staging secrets SoT | **EXISTING / REUSED** |
| `pg-dr-vandana-staging` / `dr_vandana_db_staging` | PostgreSQL Flexible Server / DB | `rg-dr-vandana-staging` | India South Central | Staging | Staging app DB | **EXISTING / REUSED** |
| Vercel `dr-vandana-website` Preview | Hosting | — | — | Staging Preview | App Preview (unchanged by O15-S) | **EXISTING / REUSED** |
| Production worker / prod CAE / prod ACR | — | — | — | Production | — | **NOT CREATED** |

---

## Image

| Field | Value |
| --- | --- |
| Registry | `acrdrvandanawkrstg.azurecr.io` |
| Repository | `dr-vandana-notifications-worker` |
| Immutable tag | `staging-7974175` |
| Convenience tag | `staging-latest` (not relied on for deploys) |
| Source commit | `7974175` |
| Dockerfile | `Dockerfile.worker` |
| Entrypoint | `npm run notifications:process` |

---

## Job configuration (summary)

| Setting | Value |
| --- | --- |
| Name | `caj-drv-notif-stg` (Azure name length constrained vs plan name) |
| Trigger | Schedule |
| Cron | `*/5 * * * *` (every 5 minutes) |
| Parallelism | 1 |
| Replica completion count | 1 |
| Replica timeout | 300 seconds |
| Replica retry limit | 0 (application owns retry/idempotency) |
| CPU / Memory | 0.25 vCPU / 0.5Gi |
| Identity | UserAssigned `id-dr-vandana-staging-worker` |

---

## Secrets / env (names only)

**ACA Job secrets (values redacted; sourced from staging KV, BOM-stripped at load):**

- `database-url` → env `DATABASE_URL`
- `auth-session-secret` → env `AUTH_SESSION_SECRET`
- `smtp-password` → env `SMTP_PASSWORD`

**Non-secret env:**

- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- `EMAIL_PROVIDER=smtp`
- `NODE_ENV=development` (CLI refuses `production`)
- `PATIENT_REGISTRATION_ENABLED=false`
- `TWILIO_WHATSAPP_ENABLED=false`

Key Vault secret names used as source:

- `staging-app-database-url`
- `staging-app-auth-session-secret`
- `staging-app-smtp-password`
- `staging-app-smtp-server` / `port` / `username` / `from-email` / `from-name`

---

## Networking / firewall (staging PG)

| Rule name | Start | End | Origin |
| --- | --- | --- | --- |
| `o15s-aca-worker-20260830` | `4.224.141.164` | `4.224.141.164` | O15-S (CAE static IP) |
| `o15s-allow-azure-services-20260830` | `0.0.0.0` | `0.0.0.0` | O15-S (Azure services special-case; Consumption egress not a single IP) |
| Prior operator / client rules | various | various | Existing |

Production PostgreSQL firewall: **UNTOUCHED**.

---

## RBAC (staging)

| Principal | Role | Scope |
| --- | --- | --- |
| `id-dr-vandana-staging-worker` | Key Vault Secrets User | `kv-dr-vandana-staging` |
| `id-dr-vandana-staging-worker` | AcrPull | `acrdrvandanawkrstg` (and attempted ISC ACR) |

No Owner/Contributor on worker MI.

---

## Providers registered (subscription)

| Provider | State |
| --- | --- |
| `Microsoft.App` | Registered |
| `Microsoft.ContainerRegistry` | Registered |
| `Microsoft.OperationalInsights` | Registered |
| `Microsoft.ManagedIdentity` | Registered (dependency) |

---

## Cost (high level)

Sizing: Consumption CAE + Job (0.25/0.5Gi, every 5 minutes, short batch), Basic/Standard ACR (Central India), small LAW, UAMI (free).  
**PRICING REQUIRES CURRENT AZURE VERIFICATION** (INR discussion deferred).

---

## Git

| Action | Status |
| --- | --- |
| Commit | **NONE** (policy) |
| Push | **NONE** (policy) |

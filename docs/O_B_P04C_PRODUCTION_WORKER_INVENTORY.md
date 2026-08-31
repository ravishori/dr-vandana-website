# O-B-P04C Production Worker Inventory

**Date:** 2026-08-31  
**Status:** **PROVISIONED** (O-B-P04C retry PASS WITH CONDITIONS)

---

## Azure resources

| Resource | Name | Region | Status |
| --- | --- | --- | --- |
| Worker RG | `rg-dr-vandana-prod-worker` | Central India | **CREATED** |
| ACR | `acrdrvandanawkrprod` | Central India | **CREATED** |
| Managed identity | `id-dr-vandana-prod-worker` | Central India | **CREATED** |
| Log Analytics | `law-dr-vandana-prod-worker` | Central India | **CREATED** |
| CAE | `cae-dr-vandana-prod` | Central India | **CREATED** |
| ACA Job | `caj-drv-notif-prod` | Central India | **CREATED** |

CAE static IP: `4.187.177.211`

---

## Key Vault secrets (metadata)

All 8 worker secrets **PRESENT / ENABLED** in `kv-dr-vandana-prod`.

---

## Container image

| Field | Value |
| --- | --- |
| Registry | `acrdrvandanawkrprod.azurecr.io` |
| Repository | `dr-vandana-notifications-worker` |
| Tag | `production-7974175` |
| Dockerfile | `Dockerfile.worker.production` |

---

## Job runtime

| Field | Value |
| --- | --- |
| Command | `npm run notifications:process:production` |
| Schedule | `*/5 * * * *` |
| Parallelism | `1` |
| NODE_ENV | `production` |
| Profile | `production-hosted-v1` |

---

## Database firewall (Production PG only)

| Rule | Scope |
| --- | --- |
| `p04c-aca-worker-20260831` | CAE static IP |
| `p04c-allow-azure-services-20260831` | Azure services |

---

## Execution evidence

Latest successful dry runs: `claimed=0`, `sent=0`, `expanded=0`.

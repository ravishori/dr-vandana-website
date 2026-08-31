# O-B-P04 Production Worker Provisioning Verification

**Document type:** Worker provisioning architecture & procedure  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
O-B-P04 DECISION = BLOCKED
PRODUCTION WORKER = NOT PROVISIONED
```

---

## 1. Objective

Provision and verify a **Production** notification worker on **Azure Container Apps Jobs** (batch-and-exit, 5-minute schedule, parallelism 1), mirroring O15-S staging architecture but isolated to Production resources.

---

## 2. Staging reference (O15-S — verified)

| Item | Staging value |
| --- | --- |
| RG | `rg-dr-vandana-staging-worker` |
| MI | `id-dr-vandana-staging-worker` |
| ACR | `acrdrvandanawkrstg` (Central India) |
| CAE | `cae-dr-vandana-staging` |
| Job | scheduled ACA Job |
| Image | `dr-vandana-notifications-worker:staging-7974175` |
| Command | `npm run notifications:process` |
| NODE_ENV in container | `development` (workaround for CLI guard) |

---

## 3. Production target architecture (approved, **not provisioned**)

| Resource | Proposed name | Status |
| --- | --- | --- |
| Resource group | `rg-dr-vandana-prod-worker` | **NOT PROVISIONED** |
| Managed identity | `id-dr-vandana-prod-worker` | **NOT PROVISIONED** |
| ACR | `acrdrvandanawkrprod` (or equivalent) | **NOT PROVISIONED** |
| Log Analytics | `law-dr-vandana-prod-worker` | **NOT PROVISIONED** |
| CAE | `cae-dr-vandana-prod` | **NOT PROVISIONED** |
| ACA Job | `caj-dr-vandana-notifications-prod` | **NOT PROVISIONED** |
| Image tag pattern | `dr-vandana-notifications-worker:<commit-sha>` | **NOT BUILT/PUSHED** |

Production PG/KV remain in **`rg-dr-vandana-prod`** (existing).

---

## 4. Worker entrypoint (repository)

| Item | Finding |
| --- | --- |
| npm script | `notifications:process` → `scripts/process-notifications.ts` |
| Core | `processDueNotifications` |
| Production guard | **Refuses** `NODE_ENV=production` and `nodeEnv=production` |
| O15 resolution | Production requires **dedicated hosted entrypoint** — not this CLI as-is |
| `Dockerfile.worker` | Staging-only; sets `NODE_ENV=development` |

**O-B-P04 did not bypass the guard** (task rule §21).

---

## 5. Required environment variables (inventory summary)

See `docs/O_B_P04_PRODUCTION_WORKER_INVENTORY.md`.

**Critical gaps:**

- Production KV lacks **all SMTP secrets**
- No Production worker MI / ACA / ACR
- No Production worker entrypoint authorized in application code

---

## 6. Rollback (when provisioned in future task)

1. Disable ACA Job schedule (`az containerapp job stop` / set replica 0).  
2. Pin previous immutable image tag.  
3. Do **not** truncate outbox tables.  
4. Preserve KV secrets; disable Job only.

---

## 7. Boundaries preserved

- Registration **false**, WhatsApp **false**
- No Production schema changes
- No real patient data
- Staging unchanged
- Public domain unchanged
- No Vercel redeploy in O-B-P04

---

## 8. Next controlled tasks (sequential)

1. **O-B-P04A** — Authorized Production worker entrypoint (application code).  
2. **O-B-P04B** — Production KV SMTP + worker secret ceremony.  
3. **O-B-P04C** — Production ACA Jobs infrastructure + image + dry run.  
4. **O-B-P04D** — Synthetic Production worker E2E (optional, separately authorized).

Do not start automatically.

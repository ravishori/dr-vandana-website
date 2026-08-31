# O-B-P04 Production Worker Provisioning Verification Report

**Document type:** Production worker provisioning report  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
O-B-P04 DECISION = BLOCKED
PRODUCTION WORKER = NOT PROVISIONED
SECRET LEAKAGE = NONE DETECTED
```

---

## 1. Executive summary

O-B-P04 **did not provision** the Production notification worker. **Three critical blockers** prevent safe operation:

1. **Application entrypoint** — `scripts/process-notifications.ts` **refuses Production** (`NODE_ENV=production` / `nodeEnv=production`). Task forbids bypassing guards; O15 resolution requires a **dedicated Production entrypoint** (separate authorized code task).

2. **Production worker infrastructure** — **NOT PROVISIONED** (no `rg-dr-vandana-prod-worker`, ACR, CAE, ACA Job, or Production MI). `rg-dr-vandana-prod` contains only PostgreSQL + Key Vault.

3. **Production SMTP secrets** — **MISSING** from `kv-dr-vandana-prod` (only database URL, auth session, MFA key present). Worker cannot send mail without operator KV ceremony.

Repository audit, Azure inspection, KV metadata, and read-only DB verification were completed. **No infrastructure mutations**, **no worker execution**, **no email**, **no schema changes**.

---

## 2. Phase 1 — Repository audit

| Item | Finding |
| --- | --- |
| Entrypoint | `npm run notifications:process` → `scripts/process-notifications.ts` |
| Guard | Exits on production node env (lines 11–23) |
| Core | `processDueNotifications` → `processNotificationBatch` |
| Dockerfile | `Dockerfile.worker` — staging batch image; `NODE_ENV=development` workaround |
| Tests | 366 unit tests pass; worker E2E proven on **staging CLI** only (O-B-05E-R, O15-S) |

**APPLICATION CHANGES:** NONE (required entrypoint change deferred — BLOCKER)

---

## 3. Phase 2 — Azure Production resources

| Resource | Status |
| --- | --- |
| `rg-dr-vandana-prod` | EXISTS (India South Central) |
| `pg-dr-vandana-prod` | EXISTS |
| `kv-dr-vandana-prod` | EXISTS |
| Production worker RG/ACR/CAE/Job/MI | **NOT PROVISIONED** |
| `Microsoft.App` provider | Registered |
| `Microsoft.ContainerRegistry` provider | Registered |

Staging worker stack (`rg-dr-vandana-staging-worker`) **UNCHANGED**.

---

## 4. Phase 3 — Key Vault

| Secret | Status |
| --- | --- |
| `production-app-database-url` | PRESENT, enabled |
| `production-app-auth-session-secret` | PRESENT |
| `production-app-mfa-encryption-key` | PRESENT |
| SMTP secrets (`production-app-smtp-*`) | **MISSING** |
| Worker MI KV access | **N/A** — MI not created |

---

## 5. Phase 4 — Database safety (read-only)

| Check | Result |
| --- | --- |
| Target | `pg-dr-vandana-prod` / `dr_vandana_db` |
| TLS | PASS (TLSv1.3) |
| PG version | 17.10 |
| Schema | 27/27; outbox tables present |
| Mutations | **NONE** |
| Data | 0 rows aggregate |

---

## 6. Phases 5–13 — Not executed

| Phase | Reason |
| --- | --- |
| Container image build/push | No Production ACR; entrypoint blocked |
| Managed identity | Not created |
| ACA Job | Not created |
| Dry run | Cannot run — CLI guard + no host |
| Synthetic E2E | Not authorized without worker host |
| Idempotency / retry / schedule | N/A |
| Log monitoring | N/A |

---

## 7. Phase 14 — Boundary check

| Control | Status |
| --- | --- |
| Registration | **FALSE** |
| WhatsApp | **FALSE** |
| Real patient data | **NOT USED** |
| Staging | **UNCHANGED** |
| Public domain | `https://drvandana.trinetralab.net/` — unchanged |
| Vercel | Not redeployed |
| DNS | Unchanged |

---

## 8. Phase 15 — Test suite

| Suite | Result |
| --- | --- |
| Tests | **PASS** (366/366) |
| Typecheck | **PASS** |
| Lint | **PASS** (2 pre-existing warnings) |
| Build | **PASS** (O-B-BUILD-01 wrapper) |

---

## 9. Security review

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | **CRITICAL** | Production CLI guard prevents hosted worker without new entrypoint |
| S2 | **CRITICAL** | Production SMTP secrets absent from KV |
| S3 | **CRITICAL** | No Production worker infrastructure |
| S4 | **HIGH** | Using staging NODE_ENV workaround on Production DB would violate architecture |
| S5 | **INFORMATIONAL** | Staging guard + separation preserved; no secrets exposed |

**SECURITY REVIEW: BLOCKED**

---

## 10. Verification matrix (final)

| Gate | Result |
| --- | --- |
| WORKER | **BLOCKED** |
| WORKER HOST | Azure Container Apps Jobs — **NOT PROVISIONED** |
| DATABASE CONNECTIVITY | **PASS** (read-only) |
| TLS | **PASS** |
| KEY VAULT (DB + session) | **PASS** |
| KEY VAULT (SMTP) | **FAIL** — missing |
| MANAGED IDENTITY | **NOT PROVISIONED** |
| ACR / IMAGE | **NOT PROVISIONED** |
| WORKER ENTRYPOINT | **FAIL** — production guard |
| SCHEDULE / EXECUTION | **N/A** |
| SMTP | **NOT EXECUTED** |
| SYNTHETIC EMAIL | **NOT SENT** |
| IDEMPOTENCY | **NOT VERIFIED** |
| SECRET LEAKAGE | **NONE DETECTED** |

---

## 11. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Application changes | **NONE** |
| Infrastructure changes | **NONE** |
| Commit / push | **NONE** |

---

## 12. Rollback

N/A — nothing provisioned. Future rollback: disable ACA Job schedule; revert image tag; preserve outbox data.

---

## 13. Decision

**O-B-P04 DECISION: BLOCKED**

---

## 14. Next controlled tasks (do not auto-start)

| Order | Task | Purpose |
| --- | --- | --- |
| 1 | **O-B-P04A** | Authorized Production worker entrypoint (application code — not guard bypass) |
| 2 | **O-B-P04B** | Production KV SMTP + worker env secret ceremony |
| 3 | **O-B-P04C** | Production ACA Jobs stack (RG, MI, ACR, CAE, Job, image, dry run) |
| 4 | **O-B-P04D** | Synthetic Production worker E2E (optional, separately authorized) |

---

## 15. Related documents

- `docs/O_B_P04_PRODUCTION_WORKER_PROVISIONING_VERIFICATION.md`  
- `docs/O_B_P04_PRODUCTION_WORKER_INVENTORY.md`

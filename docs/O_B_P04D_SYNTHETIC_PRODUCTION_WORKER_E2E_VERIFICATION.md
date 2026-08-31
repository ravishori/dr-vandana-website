# O-B-P04D Synthetic Production Worker E2E Verification

**Document type:** E2E verification plan / architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
O-B-P04D DECISION = PASS WITH CONDITIONS
SYNTHETIC DATA ONLY
SECRET VALUES = NEVER IN THIS DOCUMENT
```

---

## 1. Objective

Close the Production SMTP/runtime E2E gap by proving:

```text
Synthetic appointment → notification/outbox → ACA Job → Production worker
  → SMTP AUTH → email submit → outbox SENT → idempotent second run
```

---

## 2. Synthetic identity strategy

| Identity | Label | Public ID | Email (non-secret) |
| --- | --- | --- | --- |
| Psychologist | O-B-P04D Synthetic Psychologist | `PSY-NAYQE8WN` | `ob04d-synthetic-psychologist@example.test` |
| Patient | O-B-P04D Synthetic Patient | `PAT-PBBNVPYK` | `ravishori+ob04d-synthetic-production@gmail.com` |

Provisioning mechanism: **`runProductionSyntheticE2eSetup`** guarded by:

- `SYNTHETIC_PRODUCTION_E2E_ENABLED=true`
- `O_B_P04D_CEREMONY_PROFILE=production-e2e-v1`
- Production `DATABASE_URL` with `sslmode=require`
- `NODE_ENV !== production` on ceremony CLI (operator workstation)
- Registration / WhatsApp remain **false**

**Not** public registration. **Not** staging identities reused.

---

## 3. Ceremony scripts

| Script | Purpose |
| --- | --- |
| `scripts/ob-p04d-production-e2e-setup.ts` | Provision synthetics + book one appointment |
| `scripts/ob-p04d-production-e2e-verify.ts` | Read-only outbox/delivery verification |
| `scripts/ob-p04d-run-with-prod-kv-env.mjs` | Load KV secrets into child env without printing |

Practice configuration: **`seedTestPracticeConfiguration`** (TEST FIXTURE ONLY labels).

---

## 4. Worker execution

| Item | Value |
| --- | --- |
| Job | `caj-drv-notif-prod` |
| Entrypoint | `npm run notifications:process:production` |
| Trigger | Manual `az containerapp job start` + scheduled runs |
| Guard | O-B-P04A production-worker-guard **PRESERVED** |

---

## 5. Verification boundaries

| Check | Method |
| --- | --- |
| SMTP AUTH / send | Application logs + outbox/delivery DB status |
| Mailbox receipt | **Separate** — not required for PASS WITH CONDITIONS |
| Retry failure path | **NOT VERIFIED** (no destructive SMTP test) |
| Idempotency | Second worker run + delivery count unchanged |

---

## 6. Safety flags (verified)

| Flag | Value |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | **false** |
| `TWILIO_WHATSAPP_ENABLED` | **false** |
| Production schema | **UNCHANGED** |
| Staging | **UNCHANGED** |

---

## 7. Cleanup policy

Synthetic audit trail **retained** in Production DB for verification evidence (1 appointment, 1 outbox, 2 deliveries, 2 synthetic users). No automatic deletion.

---

## 8. Related documents

- `docs/O_B_P04D_SYNTHETIC_PRODUCTION_WORKER_E2E_REPORT.md`
- `docs/O_B_P04D_SYNTHETIC_PRODUCTION_WORKER_E2E_SECURITY_REVIEW.md`
- `docs/O_B_P04C_PRODUCTION_ACA_WORKER_PROVISIONING_REPORT.md`

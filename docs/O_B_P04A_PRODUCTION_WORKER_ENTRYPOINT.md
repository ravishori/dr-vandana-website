# O-B-P04A Production Worker Entrypoint — Architecture & Design

**Document type:** Application architecture / design  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Scope:** Application code only — no Azure provisioning, no SMTP ceremony, no Production execution

---

## 1. Original blocker (O-B-P04)

O-B-P04 discovered that the existing notification CLI:

```text
npm run notifications:process → scripts/process-notifications.ts
```

**exits non-zero** when:

- `process.env.NODE_ENV === "production"`, or
- `loadIdentityConfig().nodeEnv === "production"`

This is intentional. The staging worker (`Dockerfile.worker`) currently works around it with `NODE_ENV=development`, which is **not** acceptable for Production. O-B-P04A adds a **separate, authorized Production entrypoint** without weakening the existing guard.

---

## 2. Current guard (preserved)

| Entrypoint | File | Production behavior |
| --- | --- | --- |
| Staging / local / dev CLI | `scripts/process-notifications.ts` | **BLOCKED** when `NODE_ENV=production` or `nodeEnv=production` |
| Dedicated Production worker | `scripts/process-notifications-production.ts` | **ALLOWED** only when authorization contract satisfied |

**CURRENT INTENDED PURPOSE:** Prevent accidental or ad-hoc Production notification processing via the development/staging CLI path.

**CURRENT STAGING BEHAVIOR:** Unchanged — staging ACA Job continues to use `npm run notifications:process` with interim `NODE_ENV=development` until O-B-P04C updates the Production image command.

**CURRENT PRODUCTION BEHAVIOR (public web):** Vercel Production does not invoke either worker script. The new guard additionally rejects public web platform markers (`VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, `NETLIFY`).

**SAFE EXTENSION POINT:** New module `src/lib/notifications/production-worker-guard.ts` + dedicated script; reuse `processDueNotifications` unchanged.

---

## 3. Design decision

### Separation of entrypoints

| Path | Command | Role |
| --- | --- | --- |
| Dev / staging CLI | `npm run notifications:process` | Local + staging worker (Production **refused**) |
| Production hosted worker | `npm run notifications:process:production` | Azure Container Apps Job only |

### Authorization boundary (not a generic bypass)

Production execution requires **all** of:

1. **`NODE_ENV=production`** — real Production runtime (no development workaround).
2. **`NOTIFICATION_WORKER_EXECUTION_PROFILE=production-hosted-v1`** — fixed profile identifier bound to the ACA Job container env (O-B-P04C). This is **not** a boolean `ALLOW_*` flag.
3. **`DATABASE_URL`** targeting **`pg-dr-vandana-prod`** + **`dr_vandana_db`** with **`sslmode=require`** — fail-closed; rejects staging host/db.
4. **No public web runtime markers** — `VERCEL`, `AWS_LAMBDA_FUNCTION_NAME`, or `NETLIFY` set → refuse.
5. **`PATIENT_REGISTRATION_ENABLED`** not `true`.
6. **`TWILIO_WHATSAPP_ENABLED`** not `true`.
7. Runtime readiness (script layer): usable `AUTH_SESSION_SECRET`, SMTP ready (`isSmtpReadyForIdentity()`), identity context OK.

Authorization is **not** accepted via HTTP headers, query strings, cookies, or request parameters.

### Why this is operationally bound

- The profile constant is meaningless on Vercel (blocked by platform marker check).
- Setting the profile on a developer laptop without Production `DATABASE_URL` still fails on DB target validation.
- Setting Production `DATABASE_URL` without the profile fails on profile check.
- The staging CLI path remains blocked at `NODE_ENV=production` regardless of profile.

Future O-B-P04C will inject `NOTIFICATION_WORKER_EXECUTION_PROFILE` only on the ACA Job container secret/env configuration — not on the public web app.

---

## 4. New files

| File | Purpose |
| --- | --- |
| `src/lib/notifications/production-worker-guard.ts` | Fail-closed authorization + Production DB target validation |
| `scripts/process-notifications-production.ts` | Dedicated Production worker main; calls `processDueNotifications` |
| `src/lib/notifications/production-worker-guard.test.ts` | Unit tests for authorization boundary |
| `package.json` | `"notifications:process:production"` script |

**Unchanged:** `src/lib/notifications/process.ts` (idempotency, retry, SMTP send logic).

---

## 5. Environment behavior matrix

| Runtime | Entrypoint | Result |
| --- | --- | --- |
| ACA Job + profile + prod DB + secrets | `notifications:process:production` | Authorized (when SMTP configured — O-B-P04B) |
| Vercel Production web | Neither script invoked by platform | N/A; guard blocks if mis-invoked |
| Staging ACA Job | `notifications:process` | Unchanged (development NODE_ENV workaround) |
| Local dev | `notifications:process` | Unchanged |
| `NODE_ENV=production` + staging CLI | `notifications:process` | **Blocked** (existing guard) |
| Production CLI without profile | `notifications:process:production` | **Blocked** |

---

## 6. Package command

```bash
npm run notifications:process:production
```

Runs `tsx scripts/process-notifications-production.ts`:

1. Assert Production worker authorization (`production-worker-guard`).
2. Validate session secret and SMTP readiness.
3. `createAppIdentityContext()` → `processDueNotifications(ctx)`.
4. Emit JSON stats to stdout.
5. Exit 0 on success; non-zero on guard/config/processing failure.
6. Batch-and-exit — no HTTP server, no long-running process.

---

## 7. Container compatibility (ACA Jobs)

Compatible with scheduled batch-and-exit:

- Single process, exits after one batch.
- Meaningful exit codes (1 on failure).
- No background daemon.
- Intended ACA Job command (O-B-P04C): `npm run notifications:process:production` with `NODE_ENV=production` and worker env from Key Vault.

---

## 8. Database safety

- No hardcoded credentials.
- Consumes runtime `DATABASE_URL` only.
- Production target enforced: `pg-dr-vandana-prod` / `dr_vandana_db` / TLS `sslmode=require`.
- Staging credentials cannot pass Production worker validation.
- No silent fallback to staging.

---

## 9. SMTP safety (this task)

- No SMTP secrets created.
- No email sent.
- Script fails closed if SMTP not ready (dependency on O-B-P04B).

---

## 10. Rollback

To disable the Production worker entrypoint **without** infrastructure or database changes:

1. Do **not** deploy ACA Job using `notifications:process:production` (O-B-P04C not provisioned yet).
2. Remove or revert `scripts/process-notifications-production.ts`, guard module, package script, and tests in a single application revert.
3. Existing staging CLI guard remains; no staging/DNS/Vercel/registration/WhatsApp changes required.

---

## 11. Remaining dependencies

| Task | Dependency |
| --- | --- |
| **O-B-P04B** | Production KV SMTP secrets + worker secret ceremony |
| **O-B-P04C** | Production ACA Job, ACR, MI, container env with `NOTIFICATION_WORKER_EXECUTION_PROFILE` |
| **O-B-P04D** | Synthetic Production worker E2E verification |

---

## 12. Decision

```text
O-B-P04A DECISION = PASS
```

Dedicated Production entrypoint implemented; existing Production guard preserved; no generic bypass; staging/dev behavior preserved.

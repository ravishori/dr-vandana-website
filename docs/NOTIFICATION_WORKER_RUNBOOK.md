# Notification Worker Runbook

**Status:** Development/test CLI exists. **Production worker hosting is OPEN (O15).**  
**PRODUCTION BLOCKED.** This document does not select a hosting provider.

`npm run notifications:process` **must remain development/test only**. It exits when `NODE_ENV=production`. Do not “make it production-ready” by removing that guard.

---

## What is IMPLEMENTED

- Transactional outbox written with appointment mutations
- Dispatcher: expand → `FOR UPDATE SKIP LOCKED` claim → provider send after commit
- Processing lease, retry/backoff, dead-letter
- Delivery CAS so a late worker cannot overwrite `SENT`
- Outbox rollup will not overwrite `SENT` with `DEAD`
- Failure isolation per delivery
- Appointment success if SMTP/Twilio/worker is down

## What is NOT production ready

- No approved hosting
- No production cron/queue
- No production monitoring of backlog/dead letters
- Twilio/SMTP production activation **OPEN**

---

## Possible hosting approaches (none selected)

| Approach | Notes |
|---|---|
| Scheduled job / platform cron | Periodic `processNotificationBatch`; needs a production entrypoint that is **not** the current CLI guard-bypass |
| Always-on server worker | Loop with sleep; needs process manager and health checks |
| Queue worker | Outbox is already the queue; a worker still has to poll Postgres |
| Managed worker | Vendor-specific; **OPEN HUMAN DECISION** |

Do not implement a provider-specific worker in this milestone.

---

## Worker safety (implemented in code; ops unverified)

| Topic | Code behaviour | Production ops |
|---|---|---|
| Concurrency | `SKIP LOCKED`; multiple workers OK | Unverified |
| Lease | `locked_at` + reclaim after `NOTIFICATION_LEASE_MS` | Defaults documented; production values OPEN |
| Retry | Bounded attempts + backoff | OPEN |
| Dead-letter | `DEAD` after permanent failure or max attempts | Needs alerting |
| Idempotency | Delivery unique `(outbox, channel, role)`; Twilio idempotency token; SMTP has **no** provider idempotency header | Residual duplicate email possible |
| Graceful shutdown | Not implemented as a process protocol | OPEN |
| Restart / recovery | Expired `PROCESSING` rows can be reclaimed | OPEN |
| Deployment | N/A until O15 | OPEN |
| Monitoring | Structured logs only | See monitoring checklist |

Batch size, expand batch, timeouts: env names in `.env.example`. Production values **OPEN**.

---

## Do not claim worker production readiness

Code is **IMPLEMENTED** and **TESTED**. Hosting is **NOT CONFIGURED**. Production dispatch is **BLOCKED**.

# Final Production Go-Live Checklist — Option B

**Date:** 2026-08-31  
**Decision:** **GO WITH CONDITIONS**  
**Public domain:** `https://drvandana.trinetralab.net/`  
**Project:** `dr-vandana-website`

Use this checklist before the **separate** controlled Production deployment task.  
**Do not enable registration or WhatsApp as part of go-live unless a later task explicitly authorizes it.**

---

## A. Pre-deploy confirmations (operator)

- [x] Option B domain is `drvandana.trinetralab.net` (not `trinetra.net`)
- [x] Authoritative project is `dr-vandana-website`
- [x] HTTPS + HSTS observed
- [x] Key Vault Production secrets present/enabled (DB, session, MFA, SMTP set)
- [x] Production DB schema 27/27 + btree_gist + exclusion constraint
- [x] Worker Job `caj-drv-notif-prod` scheduled every 5 minutes, parallelism 1
- [x] Worker uses `notifications:process:production` + `production-hosted-v1`
- [x] Synthetic SMTP E2E (O-B-P04D) PASS; idempotency PASS
- [x] Tests / typecheck / lint / build PASS
- [x] Registration remains **false**
- [x] WhatsApp remains **false**
- [ ] Operator attests Vercel Production `DATABASE_URL` matches KV (target + `sslmode=require`)
- [ ] Review/commit uncommitted Option B application artifacts intended for deploy
- [ ] Accept or schedule: restore drill, mailbox receipt check, content domain string cleanup

---

## B. Controlled deployment (separate task — not this gate)

- [ ] Explicit operator authorization to deploy
- [ ] Deploy only `dr-vandana-website` Production
- [ ] Do **not** change DNS unless authorized
- [ ] Do **not** enable `PATIENT_REGISTRATION_ENABLED`
- [ ] Do **not** enable `TWILIO_WHATSAPP_ENABLED`
- [ ] Post-deploy smoke: `/`, privacy, contact, book-appointment (no form submit)
- [ ] Confirm worker still Succeeding on schedule
- [ ] Confirm no secret leakage in deploy logs

---

## C. Post-deploy monitoring (first 24h)

- [ ] ACA Job executions Succeeded
- [ ] No unexpected outbox growth from real patients (registration still false)
- [ ] Log Analytics free of credential strings
- [ ] Public site HTTP 200 on critical routes

---

## D. Explicitly deferred

- [ ] Patient Dashboard product phase
- [ ] Public registration enablement ceremony
- [ ] WhatsApp enablement
- [ ] Option C clinical features

---

## E. Rollback triggers

Disable Job schedule and/or redeploy prior Vercel Production revision if:

- Public 5xx on critical routes
- Worker targeting wrong DB
- Secret exposure
- Registration/WhatsApp accidentally true

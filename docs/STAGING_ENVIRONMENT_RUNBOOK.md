# Staging Environment Runbook

**Status:** Documentation only. Staging is **NOT CONFIGURED** in this repository. **PRODUCTION BLOCKED.**  
**Date:** 14 August 2026  

Staging exists to prove migrations, constraints, notifications, and smoke tests **without** production data or production secrets.

This runbook does **not** enable patient registration. Registration may be enabled in staging **only** if every safeguard below is satisfied **and** a human explicitly sets the flag in the **staging** secret store. Do not enable it automatically. Do not copy that flag to production.

---

## Hard isolation rules

| Item | Staging | Production |
|---|---|---|
| PostgreSQL | Separate instance / project | Separate instance / project |
| `DATABASE_URL` | Staging secret | Production secret |
| `AUTH_SESSION_SECRET` | Distinct | Distinct |
| `MFA_ENCRYPTION_KEY` | Distinct | Distinct |
| SMTP credentials | Test mailbox / provider sandbox | Production sender |
| OTP credentials | Vendor test/sandbox if any; never production DLT sender by accident | Production |
| Twilio | Test/sandbox WhatsApp **labelled as test**; never production sender SIDs | Production, still disabled until checklist |
| Cookies | Distinct secrets ⇒ distinct sessions | Distinct |
| Notification recipients | Operators / fixture inboxes only | Real patients only after go-live |
| DNS | Staging hostname if used | `drvandana.trinetra.net` — **do not change from this phase** |

**Never reuse production credentials in staging.** Never copy production database dumps containing real patients into an unsecured staging project.

---

## Staging database

When a human creates staging PostgreSQL (O1/O2 still apply to the *choice*, even if staging is a cheaper SKU):

1. Create PostgreSQL **16+** (not production).  
2. Store `DATABASE_URL` only in the staging secret store.  
3. Apply migrations deliberately: `APPLY_IDENTITY_MIGRATION=true npm run db:migrate`.  
4. Verify `btree_gist`.  
5. Verify `appointments_blocking_occupied_excl`.  
6. Verify triggers (`appointment_history_no_update`).  
7. Verify required indexes.  
8. Run `npm run db:verify-production` against **staging** (the command name means “target schema”, not “this is production”).  
9. If `APPOINTMENT_PG_URL` points at **staging**, run PostgreSQL concurrency tests.  
10. Run application smoke tests (public site, registration still false unless explicitly enabled for a controlled test).  

Do not use the production database for these steps.

---

## Staging notification safeguards

- Send email only to operator-controlled addresses.  
- WhatsApp: use Twilio sandbox or a dedicated test sender; keep `TWILIO_WHATSAPP_ENABLED=false` unless a human is performing a labelled test.  
- OTP: never send codes to real patient numbers.  
- Worker: a staging worker may run; do not point it at production outbox.

---

## Controlled staging registration (optional, not automatic)

Only if **all** of the following are true:

1. Staging database is isolated  
2. Secrets are staging-only  
3. Recipients are test identities  
4. Legal copy may still be unapproved — staging testers must be operators, not the public  
5. A human sets `PATIENT_REGISTRATION_ENABLED=true` **only** in staging  

Reset the flag to false after the test unless staging is a long-lived closed beta with the same safeguards.

There is no code path that copies the staging flag to production.

---

## Staging vs production gates

```bash
npm run production:gates
npm run identity:gates
npm run db:verify-production
```

Overall remains **BLOCKED** until production itself is ready. A staging PASS on schema verification is evidence for **staging**, not go-live.

# O-B-03 Staging Rollback Runbook

**Document type:** Staging rollback plan (not executed in O-B-03)  
**Date:** 2026-08-30  
**Baseline:** `7974175`

```text
Prefer forward-fix or restore-based recovery.
Do not invent destructive down-migrations.
Never roll Production from this document.
```

---

## 1. Application deployment rollback

1. Identify last known-good staging deployment artifact/commit.  
2. Redeploy that artifact to staging host.  
3. Confirm `PATIENT_REGISTRATION_ENABLED=false`.  
4. Confirm public site + practice login paths.  
5. Capture deploy logs (no secrets).

---

## 2. Database migration rollback

Repository migrations are **forward** SQL. Automated down-migrations are **not** the supported path.

**Preferred recovery:**

1. Stop writers (app/worker) pointing at damaged staging DB if needed.  
2. Restore staging database from pre-migrate backup to a **new** instance or overwrite **staging only**.  
3. Re-point staging `DATABASE_URL` if restored to new instance.  
4. Re-run `npm run db:verify-production` against staging.  
5. Restart app/worker.

**Not authorized:** restoring Production; deleting Production data.

---

## 3. Configuration rollback

1. Revert staging host env/flags to previous known-good set.  
2. Keep registration false.  
3. Redeploy or restart to pick up env.  
4. Re-run environment gates.

---

## 4. Secret rotation rollback / recovery

If a staging secret is wrong or exposed:

1. Generate new secret.  
2. Update `staging/app/...` name in secret manager.  
3. Redeploy/restart consumers.  
4. Revoke old provider credential where applicable.  
5. For `MFA_ENCRYPTION_KEY`: understand existing MFA ciphertext may not decrypt — follow MFA recovery policy (O12 **OPEN**).  
6. For `AUTH_SESSION_SECRET`: expect session invalidation — acceptable in staging.

---

## 5. Worker rollback

1. Stop staging worker process/cron.  
2. Redeploy previous worker image/command.  
3. Confirm it does **not** use Production `DATABASE_URL`.  
4. Drain/observe staging outbox only.

---

## 6. SMTP / OTP rollback

1. Disable sends if flood/misconfiguration (remove credentials or set provider disabled).  
2. Restore previous staging mailbox/Twilio test config.  
3. Confirm no patient production numbers in allow-list.

---

## 7. DNS rollback

1. If staging DNS change causes outage, revert staging record only.  
2. **Do not** modify Production DNS (`drvandana.trinetra.net`) from staging incidents.

---

## 8. Feature flags

| Flag | Rollback position |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |

---

## 9. Evidence

Record: time, actor role, what was rolled back, verification commands, outcome. Never paste secrets.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Plan only |

# Production Rollback Runbook

**Status:** Documentation only. **Not performed.** No destructive rollback commands were executed in Phase 2I.

## Disabling registration

Set `PATIENT_REGISTRATION_ENABLED` to any value other than the exact string `true` (including unset). Registration fails closed. Existing accounts are not deleted by the flag. There is no alternate activation switch to reverse.

Immediate mitigation for a launch incident: disable the flag, keep SMTP/OTP as-is, do not disable MFA to recover privileged users.

## Application rollback

Redeploy the previous known-good application revision from the host. Identity cookies remain valid if `AUTH_SESSION_SECRET` is unchanged.

## Worker rollback

Stop the production worker (once O15 exists). Appointments continue; outbox rows remain `PENDING`/`RETRY`. Do not bypass the production CLI guard (`npm run notifications:process` refuses `NODE_ENV=production`).

## Notification pause

Operational pause without dropping the flag:

1. Stop the worker (outbox stops draining).  
2. Keep `TWILIO_WHATSAPP_ENABLED=false` or set it back to false.  
3. Optionally remove staging/production SMTP from the worker host so sends fail closed while appointments still commit.  
4. Do not delete outbox rows.

## Database recovery

Prefer **restore-from-backup** over down migrations. Down SQL files exist (`drizzle/*.down.sql`) for disaster recovery. They are **destructive**. Do not run them against production without:

- a verified backup
- an explicit restore plan
- HUMAN DECISION

Phase 2H did **not** rewrite historical forward migrations. `0003` still contains a PGlite-oriented `EXCEPTION WHEN OTHERS` wrapper; production safety is the **post-migrate verification** fail-closed path.

Restore procedure: `docs/PRODUCTION_DATABASE_RUNBOOK.md` (NOT EXECUTED).

## Secret rotation

| Secret | Effect of rotation | Caution |
|---|---|---|
| `AUTH_SESSION_SECRET` | Existing practice sessions become invalid | Plan a re-login window |
| `MFA_ENCRYPTION_KEY` | Stored TOTP secrets will not decrypt | Do not rotate casually; needs a re-encryption plan |
| `SMTP_PASSWORD` | Mail send fails until updated on app + worker | Coordinate both |
| `OTP_API_KEY` | OTP send fails closed until updated | Registration/verify impact |
| `TWILIO_AUTH_TOKEN` | WhatsApp send fails | Keep WhatsApp disabled if unsure |
| `DATABASE_URL` | App/worker cannot connect | Treat as an incident |

Rotate in the **host secret manager**. Never commit new values. Never paste values into tickets or this repository.

## Feature flag rollback

Same as disabling registration above.

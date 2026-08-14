# Production Rollback Runbook

**Status:** Documentation only. **Not performed.**

## Application rollback

Redeploy the previous known-good application revision from the host. Identity cookies remain valid if `AUTH_SESSION_SECRET` is unchanged.

## Database migration rollback

Down SQL files exist (`drizzle/*.down.sql`) for disaster recovery. They are **destructive**. Do not run them against production without:

- a verified backup
- an explicit restore plan
- HUMAN DECISION

Prefer restore-from-backup over down migrations for production incidents.

Phase 2H did **not** rewrite historical forward migrations. `0003` still contains a PGlite-oriented `EXCEPTION WHEN OTHERS` wrapper; production safety is the **post-migrate verification** fail-closed path.

## Notification worker rollback

Stop the production worker (once O15 exists). Appointments continue; outbox rows remain `PENDING`/`RETRY`. Do not bypass the production CLI guard.

## Feature flag rollback

Set `PATIENT_REGISTRATION_ENABLED` to any value other than the exact string `true` (including unset). Registration fails closed. Existing accounts are not deleted by the flag.

## Registration disablement

Immediate mitigation for a launch incident: disable the flag, keep SMTP/OTP as-is, do not disable MFA to recover privileged users.

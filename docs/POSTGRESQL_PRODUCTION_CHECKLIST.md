# PostgreSQL Production Checklist

**Status:** NOT EXECUTED. **PRODUCTION BLOCKED.**  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  

Use this after a human selects a vendor (O1) and region (O2). Do not tick rows from this milestone. Do not put credentials in Git.

Sign-off columns stay empty until an operator completes the check on the **target** database.

| Item | Requirement | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|---|
| PostgreSQL version | 16+ | OPEN | `SELECT version();` on target | HUMAN DECISION | | |
| TLS | Encrypted client connections; verify `sslmode` | OPEN | Vendor TLS setting; no plaintext `postgres://` on public networks | HUMAN DECISION | | |
| Connection pooling | Pooler or PgBouncer sized for Vercel concurrency | OPEN | Pooler URL distinct from direct URL if required | HUMAN DECISION | | |
| Least privilege | App role: DML on app schema only; no superuser; no backup administration | OPEN | Role grants (no passwords recorded) | HUMAN DECISION | | |
| Credentials | `DATABASE_URL` in host secret manager only | NOT CONFIGURED | Secret name, not value | HUMAN DECISION | | |
| Connection limits | Max connections + pool size documented | OPEN | Vendor quota vs app pool | HUMAN DECISION | | |
| Timezone | DB may be UTC; application timezone **Asia/Kolkata**; columns `timestamptz` | OPEN | Confirm no `timestamp without time zone` for occupancy | HUMAN DECISION | | |
| Migrations | `APPLY_IDENTITY_MIGRATION=true npm run db:migrate` on target after backup | NOT EXECUTED | CLI exit 0 | HUMAN DECISION | | |
| `btree_gist` | Extension installed | NOT CONFIGURED | `npm run db:verify-production` | HUMAN DECISION | | |
| Exclusion constraint | `appointments_blocking_occupied_excl` present | NOT CONFIGURED | Same command | HUMAN DECISION | | |
| Indexes | Including `appointments_public_id_uidx`, `booking_idempotency_user_op_key_uidx`, `appointment_delivery_outbox_channel_role_uidx`, listing indexes | NOT CONFIGURED | Same command + `pg_indexes` | HUMAN DECISION | | |
| Triggers | `appointment_history_no_update` | NOT CONFIGURED | Same command | HUMAN DECISION | | |
| Required tables | Identity + appointment + notification tables | NOT CONFIGURED | Same command | HUMAN DECISION | | |
| Backups | Automated, encrypted | OPEN | Vendor backup policy | HUMAN DECISION | | |
| PITR | Enabled if vendor offers it; window recorded | OPEN | Vendor PITR window | HUMAN DECISION | | |
| Restore | Drill onto a **non-production** copy | NOT EXECUTED | Drill log without secrets | HUMAN DECISION | | |
| Monitoring | Connections, disk, replication, CPU | OPEN | Dashboard / alerts | HUMAN DECISION | | |
| Historical 0003 wrapper | Do not treat PGlite `EXCEPTION WHEN OTHERS` as production success | PASS (process) | Post-migrate verification fail-closed | — | | |

Operator commands (never print the URL):

```bash
npm run db:verify-production
npm run production:gates
```

`db:verify-production` returns `PASS` / `FAIL` / `NOT CONFIGURED`. A local PASS is not production readiness.

If `APPOINTMENT_PG_URL` is set on a **staging** database, run PostgreSQL concurrency tests there. Do not point that variable at production from a developer laptop as a habit.

---

## Fail-closed migrate behaviour

`scripts/migrate-identity.ts` must exit non-zero if, after apply:

- `btree_gist` is missing, or
- `appointments_blocking_occupied_excl` is missing

Do not rewrite historical `drizzle/0003_appointment_engine.sql` solely to make PGlite prettier. Production safety is verification after migrate.

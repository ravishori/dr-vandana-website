# Production Database Runbook

**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Status:** Documentation only. **NOT EXECUTED.** **PRODUCTION BLOCKED.**

This is not a backup. It does not create production infrastructure. It does not select a PostgreSQL vendor (O1) or region (O2).

Distinguish:

| Term | Meaning |
|---|---|
| IMPLEMENTED | Application and migration SQL exist |
| TESTED | Automated tests exist |
| CONFIGURED | A named production system is actually set up |
| PRODUCTION READY | Humans verified the target environment |

This repository has **IMPLEMENTED** and **TESTED** schema. Production PostgreSQL is **NOT CONFIGURED**.

---

## Backup requirement

Production must have automated backups of the PostgreSQL database that holds identity, appointments, audit, and notification rows.

- Backup encryption: **required** (how: **OPEN HUMAN DECISION** after vendor choice)
- Backup access control: least privilege; no application role for restore (**OPEN HUMAN DECISION** for who holds restore credentials)
- Off-site / separate-account copies: **OPEN HUMAN DECISION**
- Retention of backups: **OPEN** (O10)

Do not invent a vendor. Do not store backups in Git.

---

## PITR requirement

Point-in-time recovery must be available **where the chosen vendor provides it**. Whether to enable PITR, WAL retention, and restore window is **OPEN HUMAN DECISION** (depends on O1).

---

## RPO / RTO

| Metric | Value |
|---|---|
| RPO (recovery point objective) | **OPEN HUMAN DECISION** |
| RTO (recovery time objective) | **OPEN HUMAN DECISION** |

Do not invent numbers. A backup that has never been restored is not validated.

---

## Restore procedure (NOT EXECUTED)

1. Provision a **clean, non-production** PostgreSQL instance in the chosen region (O2).
2. Restore the selected backup (or PITR target) using the vendor’s documented restore API. Do not restore onto the live production writer until a drill has succeeded on a copy.
3. Confirm TLS to the restored instance.
4. Run `npm run db:verify-production` against the restored instance (`DATABASE_URL` in the operator environment only). Expect `SCHEMA PASS`, including `btree_gist` and `appointments_blocking_occupied_excl`.
5. Confirm required tables, indexes, triggers, and constraints (see verification command output).
6. Run application smoke tests against the restored copy (public site + identity fail-closed + one staged login **only** if explicitly approved).
7. Record the drill (time, operator, backup identifier). **Do not record secrets.**

Cadence: **OPEN HUMAN DECISION**.

Status of this procedure in this milestone: **NOT EXECUTED**.

---

## Migration notes

- Apply migrations **deliberately**: `APPLY_IDENTITY_MIGRATION=true npm run db:migrate`
- The migrate CLI **fails closed** if `btree_gist` or `appointments_blocking_occupied_excl` is missing after apply
- Historical `drizzle/0003_appointment_engine.sql` still wraps extension creation for PGlite tests; production must not treat a skipped exclusion as success
- Down SQL exists for disaster recovery and must not be run against production without a restore plan

---

## Operator commands

```bash
npm run db:verify-production
```

Output is `PASS` / `FAIL` / `NOT CONFIGURED`. It does not print `DATABASE_URL` or credentials. A local `PASS` is **not** production readiness.

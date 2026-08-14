# Backup / RPO / RTO Decision Framework

**Status:** HUMAN DECISION REQUIRED  
**Date:** 14 August 2026  
**PRODUCTION BACKUPS: NOT CONFIGURED**  
**RESTORE DRILL: NOT EXECUTED**

This is a decision **framework** only. It does **not** invent RPO or RTO values.

## HUMAN DECISION REQUIRED

| Metric | Meaning | Value |
|---|---|---|
| **RPO** (recovery point objective) | Maximum acceptable **data loss** measured backward from an incident (for example: how many minutes of bookings may be lost) | **UNSET — do not invent** |
| **RTO** (recovery time objective) | Maximum acceptable **time to restore** service after an incident | **UNSET — do not invent** |

The practice owner must choose both numbers (or qualitative equivalents) after understanding:

- How appointments are created (patients and psychologist)
- Whether lost OTP/session rows are acceptable
- Whether notification outbox loss causes duplicate or missing messages
- Legal/professional expectations for scheduling records (**LEGAL REVIEW** may apply; this file is not legal advice)

---

## What RPO drives technically

| Tighter RPO (less data loss) | Looser RPO |
|---|---|
| PITR or continuous WAL shipping | Daily snapshots may suffice |
| More backup storage / vendor SKU | Cheaper, slower restore granularity |
| More operational cost | Larger potential gap after a crash |

Do not pick a vendor SKU until RPO is stated.

---

## What RTO drives technically

| Tighter RTO (faster recovery) | Looser RTO |
|---|---|
| Documented restore, standby, or fast PITR | Restore from backup onto a new instance when needed |
| On-call person who can run the vendor restore | Restore waits until the operator is available |
| DNS/app `DATABASE_URL` cutover plan | Longer downtime |

Do not claim an RTO until a restore has been **practiced**.

---

## Minimum technical requirements (already locked)

From architecture: production PostgreSQL must have automated backups and PITR **where the vendor provides it**. Encryption of backups is required. Restore credentials must not be the application role.

See `docs/PRODUCTION_DATABASE_RUNBOOK.md` and `docs/POSTGRESQL_PRODUCTION_CHECKLIST.md`.

---

## Questions the owner must answer

1. What is the maximum acceptable loss of appointment rows?  
2. What is the maximum acceptable time the booking portal may be down?  
3. Who is allowed to run a restore?  
4. How often will a restore drill run?  
5. Where do backup copies live (same region vs another region — O18)?  
6. How long are backups retained (O10 — do not invent)?  

Until those are answered: **OPEN**. Production remains **BLOCKED**.

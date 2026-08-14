# Phase 2J — Data Migration Strategy (PR #9 → Phase 1–2)

**Status:** STRATEGY ONLY. No migration executed.  
**Date:** 14 August 2026  

---

## Default recommendation

```text
NO PROTOTYPE DATA MIGRATION UNTIL EXPLICITLY APPROVED.
```

PR #9 data (if any local SQLite snapshots or `data/practice-documents`) is **prototype quality**, not a production system of record.

---

## Is migration necessary?

| Situation | Recommendation |
|---|---|
| PR #9 never used with real patients | **No migration** — start clean on PostgreSQL after C0 |
| Local demo data only | Discard |
| Real PHI somehow entered the prototype | **HUMAN + LEGAL** incident-style handling; do not casually ETL into production |

---

## If a migration were ever approved

| Step | Requirement |
|---|---|
| Source quality | Inventory snapshot rows; detect duplicates; validate emails/mobiles |
| Mapping | Map prototype users → Phase 1 `users` / roles; appointments → Phase 2 statuses (fix `RESCHEDULED` durable status); notes/docs → clinical tables |
| Validation | Dry-run on staging; row counts; ownership invariants; visibility defaults PRIVATE |
| Duplicates | Prefer Phase 1–2 ids if both exist; never merge blindly |
| Security | Encrypt in transit; restrict operator access; no tokens/MFA secrets copied plaintext |
| Documents | Re-upload to object storage; regenerate storage keys; verify checksums |
| Rollback | Keep prototype offline copy; do not delete until sign-off |
| Audit | Record migration actor, batch id, counts — no clinical bodies in tickets |

---

## Explicit non-actions now

- Do not write ETL scripts in this phase  
- Do not import PR #9 SQLite into production  
- Do not commit prototype PHI  

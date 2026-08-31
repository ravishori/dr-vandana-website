# O-B-P03F Production Post-Migration Verification

**Document type:** Post-migration verification procedure & architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)

```text
VERIFICATION AND RELEASE GATE ONLY
NO PRODUCTION SCHEMA MUTATIONS IN P03F
NO DEPLOY / NO SEED / NO WORKER
```

---

## 1. Purpose

Final read-only verification of Production database state after O-B-P03E and assessment of Production runtime configuration readiness for Option B release gating.

---

## 2. Production targets

| Item | Value |
| --- | --- |
| Database server | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Database | `dr_vandana_db` |
| Key Vault | `kv-dr-vandana-prod` |
| DB secret name | `production-app-database-url` |
| Public domain (Option B) | `https://drvandana.trinetralab.net/` |
| Vercel org | `trinetra-digital-lab` |

---

## 3. Vercel project architecture (Option B)

| Project | Role | Production `DATABASE_URL` name |
| --- | --- | --- |
| **`dr-vandana-website`** | Serves public hostname (HTTPS 200) | **PRESENT** (Secret) |
| **`drvandana-psychology`** | Partial PMS infra secrets (O-B-P03A) | **MISSING** |

Local `.vercel/project.json` links to **`drvandana-psychology`**.

**Architecture expectation:** Operator synchronizes `kv-dr-vandana-prod` → Vercel Production on the **authoritative deploy project**. Exact KV→Vercel automation is **manual operator sync** (not auto-wired in repo).

---

## 4. Database verification method

| Mechanism | Result |
| --- | --- |
| Read-only SQL + `verifyPracticeSchema()` with `ssl: "require"` | **PASS** (39/39 checks) |
| `npm run db:verify-production` | **FAIL** — script omits Azure TLS client option |

**Remediation (separate task):** Add `ssl: "require"` to `scripts/verify-production-schema.ts` postgres client — do not weaken TLS.

---

## 5. Schema state (P03F re-verified)

Matches O-B-P03E post-migration expectations:

- 27/27 tables  
- `btree_gist` installed  
- Exclusion constraint present  
- 75 indexes, 30 FKs, 190 CHECK constraints  
- 0 application rows  
- No migration journal table (by design)

---

## 6. Identity catalog

`seedIdentityCatalog()` inserts **roles, permissions, role_permissions only** — no users.

| Table | Rows |
| --- | --- |
| `roles` | 0 |
| `permissions` | 0 |
| `role_permissions` | 0 |

**Runtime impact while `PATIENT_REGISTRATION_ENABLED=false`:** Public site and static flows can operate; registration/provisioning paths require catalog — **CONDITION**, not immediate blocker.

---

## 7. Build failure classification

| Item | Finding |
| --- | --- |
| Failing routes | `/privacy-policy`, `/_global-error` |
| Error | `TypeError: Cannot read properties of null (reading 'useContext')` during prerender |
| Database related | **NO** — static legal page + Next.js global-error prerender |
| Env related | **NO** — reproduces locally without Production credentials |
| Domain related | **NO** |
| Category | **BUILD BLOCKER — SEPARATE CONTROLLED REMEDIATION REQUIRED** |

---

## 8. Boundaries preserved

No migrations, deploy, seed, worker, messaging, DNS, or Staging changes in P03F.

---

## 9. Next tasks (do not auto-start)

1. **Build remediation** — fix `/privacy-policy` / `/_global-error` prerender (controlled code task).  
2. **Vercel DATABASE_URL** — operator sync from KV to authoritative Production project(s); prove target parity.  
3. **Optional:** identity catalog seed when authorized.  
4. **Optional:** verify-script TLS hardening.  
5. **Optional:** restore drill.

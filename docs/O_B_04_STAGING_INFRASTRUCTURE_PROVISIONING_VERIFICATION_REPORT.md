# O-B-04 Staging Infrastructure Provisioning & Verification Report

**Document type:** Staging-only provisioning / verification audit  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
OVERALL STAGING READINESS = READY WITH CONDITIONS
PRODUCTION = NOT MODIFIED
REGISTRATION = OFF
REAL PATIENT DATA IN STAGING = PROHIBITED (patient_profiles count = 0 observed)
Option C = BLOCKED
Worker vendor = DECISION REQUIRED (not invented)
```

---

## 1. Executive Summary

O-B-04 reused the existing Azure staging PostgreSQL Flexible Server (`pg-dr-vandana-staging` / `rg-dr-vandana-staging`) — **no second server created**. Read-only discovery was followed by **one** staging-only networking mutation (operator firewall rule) to enable connectivity verification.

Against staging database `dr_vandana_db_staging`:

| Check | Result |
| --- | --- |
| Connectivity | **VERIFIED** (after OB04-FW-001) |
| PostgreSQL version | **VERIFIED** — `PostgreSQL 17.10` |
| `btree_gist` installed | **VERIFIED** — `YES` (not merely allowlisted) |
| Exclusion constraint | **VERIFIED** — `appointments_blocking_occupied_excl` present |
| `npm run db:verify-production` | **VERIFIED** — `SCHEMA PASS` |
| Migrations re-run | **NOT RUN** (schema already present / verify PASS; drizzle journal table absent) |
| Restore drill | **NOT RUN** |
| Vercel staging project | **NOT CONFIGURED** / **NOT VERIFIED** |
| Secret manager product | **NOT CONFIGURED** |
| SMTP staging mailbox | **NOT VERIFIED** (partial local vars only; values not printed) |
| Twilio OTP staging | **NOT CONFIGURED** / **NOT VERIFIED** |
| Worker host | **NOT PROVISIONED** — vendor still **DECISION REQUIRED** |
| Registration | **OFF** — flag false; no patient profiles created |

**Production resources were not modified.** Production `Environment=Development` tag remains an outstanding metadata issue (documented only).

---

## 2. Authorization

Authorized: staging inspection; staging-only reversible networking mutation; staging DB read-only verification; documentation.

Not authorized / not performed: Production mutation; Production tag fix; worker vendor selection/provisioning; Vercel Production changes; registration enablement; Option C; Git commit/push; restore-over-Production; secret value disclosure.

---

## 3. Git Baseline

| Check | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` |
| Commit | `governance: establish final F4 clinical governance package` |
| Match expected | **YES** |
| Application source modified by O-B-04 | **NONE** (temporary helper script removed) |
| Personal JPEG | Untracked / untouched |

---

## 4. Scope

| In scope | Out of scope |
| --- | --- |
| Staging Azure PG verify/configure as needed | Production Azure PG |
| Staging firewall (documented) | Production firewall/tags |
| Schema / extension verification | Registration enablement |
| Secret **names** contract | Creating/printing secret **values** |
| Document Vercel/SMTP/OTP/worker requirements | Inventing worker vendor; deploying Production |

---

## 5. Existing Staging Inventory

| Resource | Exists | Environment | Region | Current State | Required Action |
| --- | --- | --- | --- | --- | --- |
| Subscription `Azure subscription 1` | YES | N/A | N/A | Enabled | None |
| `rg-dr-vandana-staging` | YES | Staging tags | India South Central | Exists | Reuse |
| `pg-dr-vandana-staging` | YES | Staging tags | India South Central | Ready, PG 17, B1ms, 32 GiB | Reuse — **do not recreate** |
| DB `dr_vandana_db_staging` | YES | Staging | Same | Exists; schema present | Reuse |
| DB `postgres` / system DBs | YES | Staging | Same | Platform defaults | Leave |
| Staging Key Vault | NO | — | — | None listed in subscription scan | **REQUIRES SEPARATE AUTHORIZATION** to provision SM product |
| Staging Vercel project | NO in repo / CLI absent | — | — | **NOT VERIFIED** | Configure when authorized |
| Staging worker resource | NO | — | — | **NOT PROVISIONED** | Vendor **DECISION REQUIRED** |
| Other resources in staging RG | Only Flexible Server | Staging | — | Single resource | No duplicates created |
| `rg-dr-vandana-prod` / `pg-dr-vandana-prod` | YES | Tag: Development (mismatch) | India South Central | Ready | **DO NOT MODIFY** in O-B-04 |

---

## 6. Azure Subscription / Resource Verification

| Item | Evidence |
| --- | --- |
| Account | Authenticated Azure CLI (read + staging firewall create) |
| Staging RG tags | `Environment=Staging`, `Project=DrVandanaPsychology` |
| Staging server tags | `Environment=Staging` |
| Staging FQDN | `pg-dr-vandana-staging.postgres.database.azure.com` |
| Staging admin login name | `drvandanaadminstg` (name only; password not retrieved) |
| Production identity check | Separate RG/server; **read-only**; tag `Environment=Development` unchanged |

---

## 7. Staging PostgreSQL Verification

| Topic | Status | Notes |
| --- | --- | --- |
| Engine | **VERIFIED** | Azure Database for PostgreSQL Flexible Server |
| Version | **VERIFIED** | API major `17`; live `PostgreSQL 17.10` |
| Compute | **CONFIGURED** | Burstable `Standard_B1ms` — acceptable for early staging; **REQUIRES VERIFICATION** under load |
| Storage | **CONFIGURED** | 32 GiB Premium_LRS P4; autogrow Disabled |
| HA | **NOT CONFIGURED** | Disabled — acceptable for staging; not Production-ready posture |
| State | **VERIFIED** | Ready |
| App database | **VERIFIED** | `dr_vandana_db_staging` |
| Schema verify script | **VERIFIED** | `SCHEMA PASS` via `db:verify-production` |

---

## 8. BTREE_GIST Verification

| Layer | Status |
| --- | --- |
| Azure `azure.extensions` allowlist contains `BTREE_GIST` | **CONFIGURED** (Azure parameter) |
| Extension installed in `dr_vandana_db_staging` (`pg_extension`) | **VERIFIED** — `YES` |
| `appointments_blocking_occupied_excl` present | **VERIFIED** — `YES` |
| Constraint definition checks (gist / psychologist / occupied-range / blocking statuses) | **VERIFIED** via schema verifier |
| Installation mutation this task | **NOT EXECUTED** — already installed |

---

## 9. Migration Status

| Item | Status |
| --- | --- |
| Migration files in repo | `drizzle/0001` … `0007` (+ downs) present |
| Migrate command | `npm run db:migrate` (`APPLY_IDENTITY_MIGRATION=true` + staging target guard) |
| Target guard | **VERIFIED** — `assertStagingMigrateTarget` accepts staging host + `dr_vandana_db_staging`; rejects prod |
| `__drizzle_migrations` table | **NOT PRESENT** on staging |
| Public tables / required objects | **VERIFIED** present (27 public tables; identity/appointment/notification objects PASS) |
| Migration execution this task | **NOT RUN** |

**Rationale for NOT RUN:** Schema already satisfies `db:verify-production`. Re-applying migrations without drizzle journal understanding risks duplicate-object errors; rollback would be restore-based. Future deliberate migrate window may reconcile journal tracking — **REQUIRES SEPARATE AUTHORIZATION** if destructive remediation needed.

---

## 10. Backup Verification

| Item | Status |
| --- | --- |
| Automated backup retention | **CONFIGURED** — 7 days |
| Geo-redundant backup | **NOT CONFIGURED** — Disabled |
| Earliest restore date present | **CONFIGURED** indicator of PITR window |
| Backup encryption / ops evidence | Platform default assumed; not independently audited here — **REQUIRES VERIFICATION** |

---

## 11. Restore Verification

| Item | Status |
| --- | --- |
| Restore capability (platform) | **CONFIGURED** capability indicated |
| Restore test executed | **NOT RUN** |
| Restore destination discipline | Must be **new/disposable staging target only** — never Production |
| Claim “restore ready” | **NOT** claimed |

---

## 12. Networking / TLS Verification

| Item | Status |
| --- | --- |
| Public network access | **CONFIGURED** — Enabled (not disabled this task) |
| TLS `ssl` / `require_secure_transport` | **CONFIGURED** — `on` |
| Client TLS connectivity | **VERIFIED** (successful staging connection) |
| Pre-existing firewall rules | 2× `SINGLE_HOST` (historical client IPs) |
| OB04-FW-001 | **CONFIGURED** — added staging `SINGLE_HOST` rule `ob04-operator-202608301911` for current operator IP |
| Allow-all `0.0.0.0–255.255.255.255` | **NOT** observed on staging |
| Private networking / VNet | **NOT CONFIGURED** |
| Production firewall | Read-only count observed; **NOT MODIFIED** |

### Change record — OB04-FW-001

| Field | Value |
| --- | --- |
| CHANGE ID | OB04-FW-001 |
| TARGET | `rg-dr-vandana-staging` / `pg-dr-vandana-staging` firewall |
| ENVIRONMENT | **STAGING** |
| CURRENT STATE | Operator IP not in allowlist; DB connect failed |
| INTENDED CHANGE | Create single-host firewall rule for operator IP |
| AUTHORIZATION | O-B-04 staging networking mutation (documented, reversible) |
| RISK | Expands staging allowlist by one host IP |
| ROLLBACK | `az postgres flexible-server firewall-rule delete --resource-group rg-dr-vandana-staging --server-name pg-dr-vandana-staging --name ob04-operator-202608301911 --yes` |
| VERIFICATION | Staging connect OK; schema verify PASS |
| RESULT | **CREATED** / connectivity **VERIFIED** |

IP addresses intentionally omitted from this document.

---

## 13. Secret Management Verification

| Item | Status |
| --- | --- |
| Naming ceremony | Documented in `docs/O_B_03_STAGING_SECRET_MANAGER_NAMING_CEREMONY.md` |
| Physical secret manager (Key Vault / etc.) | **NOT CONFIGURED** (no Key Vaults listed) |
| Local `.env` (gitignored) | Present; contains staging `DATABASE_URL` host/db markers; **values not printed** |
| `AUTH_SESSION_SECRET` / `MFA_ENCRYPTION_KEY` in local `.env` | **NOT CONFIGURED** (absent) |
| Twilio secrets | **NOT CONFIGURED** |
| SMTP password present locally | Present flag only — **NOT VERIFIED** as dedicated staging mailbox |
| `PATIENT_REGISTRATION_ENABLED` in local `.env` | Absent → treats as not `"true"` → disabled |
| Production secrets accessed | **NO** |
| Secrets committed | **NO** |

Required staging names remain those in the O-B-03 ceremony (`staging/app/...`). Creating vault secrets: **REQUIRES SEPARATE AUTHORIZATION** once SM product chosen.

---

## 14. Vercel Staging Verification

| Item | Status |
| --- | --- |
| Vercel CLI | Not available in this environment |
| Repo `vercel.json` | **Not found** |
| Staging project / env vars | **NOT CONFIGURED** / **NOT VERIFIED** |
| Staging HTTPS hostname | **NOT CONFIGURED** / **DECISION REQUIRED** |
| Production Vercel changes | **NOT PERFORMED** |

**Required before app smoke on Vercel (names only):** inject `staging/app/*` mapped env vars; `PATIENT_REGISTRATION_ENABLED=false`; staging-only `DATABASE_URL`; unique session/MFA secrets; no Production URLs/credentials.

---

## 15. SMTP Staging Verification

| Item | Status |
| --- | --- |
| Nodemailer architecture | **VERIFIED** in repository |
| Dedicated staging mailbox | Owner decision recorded; live mailbox **NOT VERIFIED** |
| Production SMTP modified | **NO** |
| Send test | **NOT RUN** |

---

## 16. Twilio / OTP Staging Verification

| Item | Status |
| --- | --- |
| Adapter compatibility | **VERIFIED** in repository |
| Staging Twilio config present | **NOT CONFIGURED** / **NOT VERIFIED** |
| OTP send test | **NOT RUN** |
| Production OTP modified | **NO** |

---

## 17. Worker Status

| Item | Status |
| --- | --- |
| Architecture class | Separate managed worker/container — **APPROVED WITH CONDITIONS** (prior decision) |
| Exact vendor | **DECISION REQUIRED** — **not selected** in O-B-04 |
| Provisioning | **NOT PROVISIONED** |
| `notifications:process` | Dev/test only; refuses `NODE_ENV=production` — **VERIFIED** in repo |
| Staging worker checklist | See §23 Changes Not Executed |

---

## 18. Environment Separation

| Invariant | Status |
| --- | --- |
| Separate RGs | **VERIFIED** |
| Separate servers | **VERIFIED** |
| Separate DB names (`dr_vandana_db_staging` vs prod naming) | Staging DB name **VERIFIED**; prod DB contents **NOT ACCESSED** |
| Local `.env` points at staging host only | **VERIFIED** (host/db markers; no prod host) |
| Staging credentials ≠ Production credentials | Admin login names differ; password equality **NOT VERIFIED** (not retrieved) |
| Staging restore cannot overwrite Production | Procedural requirement documented; restore **NOT RUN** |
| Vercel cannot point at Production | Vercel **NOT CONFIGURED** — risk remains until env review |

---

## 19. Registration Gate

| Check | Status |
| --- | --- |
| `.env.example` default | `PATIENT_REGISTRATION_ENABLED=false` |
| Runtime flag with env forced false | **VERIFIED** `REG_FLAG_ENABLED=false` |
| Full `registerPatient` against live ctx | **NOT RUN** end-to-end — identity context unavailable without usable `AUTH_SESSION_SECRET` |
| Patient profiles after checks | **VERIFIED** count `0` |
| Enablement this task | **NOT PERFORMED** |

```text
REGISTRATION = OFF
IMPLEMENTED BUT SAFELY DISABLED
```

---

## 20. Synthetic Smoke Tests

| ID | Test | Result |
| --- | --- | --- |
| ST-C01 | Staging DB connectivity | **VERIFIED** (PASS after FW) |
| ST-D01 | Schema verification | **VERIFIED** — `SCHEMA PASS` |
| ST-E01 | btree_gist | **VERIFIED** |
| ST-F01 | Exclusion constraint | **VERIFIED** |
| ST-S01 / gate | Registration disabled flag | **VERIFIED** flag false |
| ST-T01 | Full registerPatient NOT_ENABLED path on live ctx | **NOT RUN** (missing session secret) |
| Auth login/logout | — | **NOT RUN** |
| Appointment CRUD | — | **NOT RUN** |
| Notification SMTP | — | **NOT RUN** |
| OTP | — | **NOT RUN** |
| Worker process | — | **NOT RUN** |
| HTTPS/cookies | — | **NOT RUN** |
| Restore drill ST-W01 | — | **NOT RUN** |
| Application unit suite (348/79) | — | **NOT REQUIRED** / **NOT RUN** (no app source change) |
| Typecheck / lint / build | — | **NOT REQUIRED** / **NOT RUN** |

**Data observation (counts only, no PII printed):** `USER_COUNT=2`, `PATIENT_PROFILE_COUNT=0`, `PSYCHOLOGIST_PROFILE_COUNT=1`, `APPOINTMENT_COUNT=0`, roles SUPER_ADMIN=1 / PSYCHOLOGIST=1. Cannot cryptographically prove users are synthetic vs real from counts alone; **no patient profiles present**.

---

## 21. Security Findings

| ID | Finding | Severity |
| --- | --- | --- |
| F1 | Public network access enabled on staging (and prod observed RO) | **MEDIUM** |
| F2 | Staging allowlist is IP-based; operator IPs churn — manage rules deliberately | **LOW**–**MEDIUM** |
| F3 | Secret manager not provisioned; secrets may live only in local gitignored `.env` | **HIGH** for team staging ops |
| F4 | Missing staging session/MFA secrets blocks safe identity smoke | **MEDIUM** |
| F5 | Production `Environment=Development` tag mismatch | **MEDIUM** — **OUTSTANDING PRODUCTION ENVIRONMENT-METADATA ISSUE** (not fixed here) |
| F6 | Prod `azure.extensions` empty (from O-B-03A-H) — Production readiness gap | **INFORMATIONAL** for O-B-04 (Production not modified) |
| F7 | No Azure diagnostic settings on staging server | **LOW**–**MEDIUM** |
| F8 | Registration remains off | **INFORMATIONAL** (desired) |

No passwords, tokens, connection strings, or API keys are included in this report.

---

## 22. Changes Executed

1. **OB04-FW-001** — Created staging firewall rule `ob04-operator-202608301911` (`SINGLE_HOST`) on `pg-dr-vandana-staging` only.  
2. **Documentation** — Created this report.  
3. **Read-only verification** — Azure inventory; staging DB inspect; schema verify; counts; migrate-target guard; registration flag check.

---

## 23. Changes Not Executed

| Item | Reason |
| --- | --- |
| Create/delete PostgreSQL server | Existing staging server reused |
| `CREATE EXTENSION btree_gist` | Already installed |
| `db:migrate` | Schema already PASS; journal absent — avoid unsafe re-apply |
| Restore drill | Not authorized as mandatory; would need disposable target plan |
| Disable public network / private VNet | Not automatic; architecture still may need controlled public access for Vercel — **REQUIRES SEPARATE AUTHORIZATION** |
| Vercel staging project/env | CLI/access unavailable |
| Key Vault / secret creation | SM product undecided; no secret values created/printed |
| SMTP mailbox provisioning | Not available/verified |
| Twilio staging setup | Not available |
| Worker provisioning | Vendor **DECISION REQUIRED** |
| Production tag correction | Explicitly forbidden in O-B-04 |
| Production extension allowlist | Forbidden |
| Registration enablement | Forbidden |
| Application source changes | Not required |
| Git commit / push | Forbidden |

### Staging worker provisioning checklist (for later authorization)

1. Human selects exact vendor (ACA / Cloud Run / Fly / Render / VM / other).  
2. Confirm always-on or approved entrypoint (not inventing redesign).  
3. Inject staging-only secrets (`staging/app/database-url`, session secrets, SMTP/OTP as needed).  
4. Ensure `PATIENT_REGISTRATION_ENABLED=false`.  
5. Confirm DB role least privilege.  
6. Health logs without secrets.  
7. Do **not** use `notifications:process` under `NODE_ENV=production`.  
8. Rollback: stop worker revision / previous image.

---

## 24. Rollback Readiness

| Change | Rollback |
| --- | --- |
| OB04-FW-001 | Delete firewall rule by name (command in §12) |
| Schema / data | Prefer Azure PITR / restore to **new** staging server — **NOT TESTED** |
| App deploy | N/A this task |
| Production | N/A — untouched |

---

## 25. Remaining Blockers

1. Secret manager product + populate `staging/app/*` (especially session/MFA/DB URL injection for hosts).  
2. Vercel staging project, hostname, HTTPS, env isolation review.  
3. Dedicated staging SMTP mailbox verification + send test.  
4. Twilio staging/test OTP configuration + synthetic OTP test.  
5. Worker **vendor decision** + provision.  
6. Staging restore drill evidence.  
7. Diagnostic/monitoring settings for staging PG (optional but recommended).  
8. Full auth/appointment/notification smoke after secrets exist.  
9. Confirm any non-patient users in staging are synthetic/test (human attestation).  
10. O10/O11 legal gates remain open (not closed by staging).  
11. Production metadata tag remediation (separate task).

---

## 26. Legal / Governance Dependencies

| Item | Status |
| --- | --- |
| O10 retention | **LEGAL REVIEW REQUIRED** / OPEN |
| O11 privacy/terms | **LEGAL REVIEW REQUIRED** |
| O18 residency guarantees | **LEGAL REVIEW REQUIRED** — India South Central location **VERIFIED**; residency **not** claimed as legal compliance |
| Option C / F4 clinical | **BLOCKED** / unchanged |

---

## 27. Staging Readiness Decision

### Staging readiness scorecard

| Gate | Status | Evidence | Remaining Action |
| --- | --- | --- | --- |
| Azure resource | **VERIFIED** | Server Ready, reused | None |
| PostgreSQL | **VERIFIED** | 17.10 | Load testing later |
| BTREE_GIST | **VERIFIED** | Installed + constraint | None for install |
| Migrations | **VERIFIED** schema / journal **NOT PRESENT** | SCHEMA PASS | Optional journal reconcile later |
| Backups | **CONFIGURED** | 7-day retention | Confirm ops runbook |
| Restore | **NOT RUN** | — | Drill |
| TLS | **VERIFIED** | Param on + connect | Keep required |
| Networking | **CONFIGURED** + FW rule | Public access; IP allowlist | Hardening decision later |
| Secrets | **NOT CONFIGURED** (manager) | Ceremony only | Provision SM + values |
| Vercel | **NOT CONFIGURED** | — | Create staging project |
| SMTP | **NOT VERIFIED** | — | Mailbox + test |
| OTP | **NOT CONFIGURED** | — | Twilio staging |
| Worker | **NOT PROVISIONED** | Vendor open | Decide + provision |
| Monitoring | **NOT CONFIGURED** | 0 diagnostic settings | Add settings |
| Registration gate | **VERIFIED** OFF | Flag false; 0 patients | Keep false |
| Environment separation | **VERIFIED** resources | Cred stores incomplete | Complete secret isolation proof |
| Rollback | **PARTIAL** | FW rollback known; restore untested | Restore drill |

### Production safety scorecard

| Production Area | Status |
| --- | --- |
| Production database | **NOT MODIFIED** |
| Production networking | **NOT MODIFIED** |
| Production secrets | **NOT ACCESSED/MODIFIED** |
| Production SMTP | **NOT MODIFIED** |
| Production OTP | **NOT MODIFIED** |
| Production deployment | **NOT PERFORMED** |
| Registration | **NOT ENABLED** |
| Production Environment tag | **OUTSTANDING PRODUCTION ENVIRONMENT-METADATA ISSUE** (`Development`) — documented only |

```text
STAGING READINESS = READY WITH CONDITIONS
(PostgreSQL foundation verified; application/runtime stack incomplete)
```

---

## 28. Independent Review

| Check | Result |
| --- | --- |
| Only STAGING modified? | **YES** (firewall rule only) |
| Production mutation? | **NO** |
| Production credentials exposed? | **NO** |
| Real patient data used? | **NO** patient profiles; human still should attest other users |
| Registration OFF? | **YES** |
| Clinical / Option C? | **NO** |
| Worker vendor invented? | **NO** |
| Provider decision reopened? | **NO** — Azure retained |
| Staging server reused (no duplicate)? | **YES** |
| Migrations handled safely? | **YES** — not blindly re-run |
| Backup/restore claims evidence-based? | **YES** — restore not claimed tested |
| Capability ≠ configuration ≠ verification? | **YES** |
| Mutations documented? | **YES** — OB04-FW-001 |
| Secrets exposed in docs? | **NO** |
| Legal claims invented? | **NO** |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

Conditions: full staging app readiness still blocked on secrets, Vercel, SMTP, OTP, worker vendor, and restore drill.

---

## 29. Git Status

Expected: this report untracked; prior O-B docs / `.env.example` comments unchanged by O-B-04 mutations; HEAD `7974175`; JPEG untracked; **no commit; no push**.

Application tests / typecheck / lint / build: **NOT REQUIRED** / **NOT RUN**.

---

## 30. STOP Statement

```text
O-B-04 COMPLETE — STAGING POSTGRESQL REUSED AND VERIFIED (SCHEMA PASS, BTREE_GIST INSTALLED).
ONE STAGING FIREWALL RULE ADDED (OB04-FW-001). NO PRODUCTION MODIFICATIONS.
NO REGISTRATION ENABLEMENT. NO WORKER VENDOR SELECTED. NO OPTION C.
NO GIT COMMIT. NO GITHUB PUSH.
STAGING READINESS = READY WITH CONDITIONS.
DO NOT START O-B-05 AUTOMATICALLY.
STOP.
```

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Staging verify + OB04-FW-001 only |

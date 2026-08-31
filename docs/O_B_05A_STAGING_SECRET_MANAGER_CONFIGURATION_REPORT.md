# O-B-05A Staging Secret Manager Configuration Report

**Document type:** Staging-only Azure Key Vault foundation (names / metadata — **no secret values**)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05A STATUS = PARTIAL / READY WITH CONDITIONS
Azure Key Vault STAGING = CONFIGURED (resource + RBAC)
Secret VALUES = NOT PROVIDED (VALUE REQUIRED — NOT PROVIDED)
Production Key Vault = NOT CREATED
SMTP / Twilio / Vercel deploy / Worker = OUT OF SCOPE
REGISTRATION = DISABLED
Secret values exposed = NO
```

---

## 1. Executive Summary

Azure Key Vault is the approved **STAGING** secret-manager product for this task. A staging-only vault was provisioned:

| Item | Value |
| --- | --- |
| Name | `kv-dr-vandana-staging` |
| Resource group | `rg-dr-vandana-staging` |
| Location | `indiasouthcentral` (India South Central) |
| SKU | standard |
| RBAC authorization | **Enabled** |
| Soft delete | **Enabled** |
| Purge protection | **Enabled** (90-day retention) |
| Public network access | **Enabled** — private networking **TECHNICAL DECISION REQUIRED** |
| Tags | `Environment=Staging`, `Project=DrVandanaPsychology`, `ManagedBy=O-B-05A` |
| Secret entries with values | **0** — intentionally not invented |

Logical O-B-03 names (`staging/app/...`) map to Azure-legal secret names (`staging-app-...`) because Key Vault disallows `/` in secret names.

**No Production Key Vault.** No Production secrets accessed. SMTP/Twilio/Vercel deployment not configured. Registration remains disabled. Application source unchanged.

---

## 2. Authorization

CONTROLLED STAGING-ONLY SECRET-MANAGEMENT. Forbidden items (Production, registration enablement, Option C, SMTP/Twilio config, worker, secret value printing/commit) were not performed.

---

## 3. Repository Baseline

| Check | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| App source modified | **NO** |
| Personal JPEG | Untracked |

---

## 4. Repository Inspection

| Source | Finding |
| --- | --- |
| `.env.example` | Canonical vars; `PATIENT_REGISTRATION_ENABLED=false`; forbids committing secrets |
| `.gitignore` | `.env*` ignored (keeps `.env.example`) |
| O-B-03 naming ceremony | Logical `staging/app/<kebab>`; physical SM product was open — **now Azure Key Vault for staging** |
| O-B-05 inventory | Required staging secrets listed; values missing |
| `NEXT_PUBLIC_*` PMS secrets | Not used for identity/DB/SMTP/Twilio secrets |
| Vercel project config | Absent — boundary unchanged |

---

## 5. Environment Separation

| Environment | Key Vault | Status |
| --- | --- | --- |
| STAGING | `kv-dr-vandana-staging` in `rg-dr-vandana-staging` | **CONFIGURED** |
| PRODUCTION | — | **NOT CREATED** / **NOT TOUCHED** |
| LOCAL | `.env` / `.env.local` gitignored | Not in Key Vault |

Staging PostgreSQL (`pg-dr-vandana-staging` / `dr_vandana_db_staging`) remains the only approved DB target for future `DATABASE_URL` secret population.

---

## 6. Azure Key Vault Decision

```text
SECRET MANAGER PRODUCT (STAGING) = Azure Key Vault
Provider selection NOT reopened (no material incompatibility)
```

Prerequisite executed: registered Azure resource provider `Microsoft.KeyVault` on the subscription (**OB05A-KV-000**) so staging vault create could proceed. This does **not** create a Production vault.

---

## 7. Key Vault Resource Findings

### Changes executed

| CHANGE ID | Action | Target | Result |
| --- | --- | --- | --- |
| OB05A-KV-000 | Register `Microsoft.KeyVault` provider | Subscription capability | **Registered** |
| OB05A-KV-001 | Create Key Vault | `rg-dr-vandana-staging` / `kv-dr-vandana-staging` | **CREATED** |
| OB05A-KV-002 | Role assignment | Scope = staging vault only; role = **Key Vault Secrets Officer**; principal = signed-in operator user | **CREATED** |

### Rollback (staging only)

| Change | Rollback |
| --- | --- |
| OB05A-KV-002 | `az role assignment delete` for that assignment on vault scope |
| OB05A-KV-001 | `az keyvault delete -n kv-dr-vandana-staging -g rg-dr-vandana-staging` (soft-delete; purge is intentional/separate and protected) |
| OB05A-KV-000 | Leave registered (harmless); unregistering not required |

Vault URI host (non-secret): `kv-dr-vandana-staging.vault.azure.net`

---

## 8. RBAC / Identity Findings

| Identity | Role / need | Status |
| --- | --- | --- |
| Operator (signed-in user) | Key Vault Secrets Officer on staging vault | **CONFIGURED** |
| Staging application identity (Vercel / managed identity) | Future get-secret access | **STAGING APPLICATION IDENTITY REQUIRED** |
| Future worker identity | Future get-secret access | **DECISION REQUIRED** (worker vendor still open) |
| Production identities | — | **NOT GRANTED** / **NOT TESTED** |

Least privilege: role scoped to the staging vault resource, not subscription-wide Contributor for secrets.

---

## 9. Secret Inventory — NAMES ONLY

Azure Key Vault physical names use hyphens (no `/`).

| Logical (O-B-03) | Azure KV secret name | App env var | Class | Staging required? | Value status | Consumer | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `staging/app/database-url` | `staging-app-database-url` | `DATABASE_URL` | SECRET | YES | **VALUE REQUIRED — NOT PROVIDED** | App / migrate / worker | **DECISION REQUIRED** |
| `staging/app/auth-session-secret` | `staging-app-auth-session-secret` | `AUTH_SESSION_SECRET` | SECRET | YES | **VALUE REQUIRED — NOT PROVIDED** | Identity | **DECISION REQUIRED** |
| `staging/app/mfa-encryption-key` | `staging-app-mfa-encryption-key` | `MFA_ENCRYPTION_KEY` | SECRET | YES if MFA | **VALUE REQUIRED — NOT PROVIDED** | MFA | **DECISION REQUIRED** |
| `staging/app/smtp-password` | `staging-app-smtp-password` | `SMTP_PASSWORD` | SECRET | YES for mail | **SMTP SECRET REQUIRED — O-B-05C** | Email | **DECISION REQUIRED** |
| `staging/app/twilio-auth-token` | `staging-app-twilio-auth-token` | `TWILIO_AUTH_TOKEN` | SECRET | YES for OTP | **TWILIO SECRET REQUIRED — O-B-05D** | OTP | **DECISION REQUIRED** |
| `staging/app/twilio-account-sid` | `staging-app-twilio-account-sid` | `TWILIO_ACCOUNT_SID` | SENSITIVE | YES for OTP | **TWILIO SECRET REQUIRED — O-B-05D** | OTP | Account-level |
| `staging/app/upstash-redis-token` | `staging-app-upstash-redis-token` | `UPSTASH_REDIS_REST_TOKEN` | SECRET | RECOMMENDED | **VALUE REQUIRED — NOT PROVIDED** | Rate limit | **DECISION REQUIRED** |
| `staging/app/patient-registration-enabled` | Prefer host env `false` (non-secret) | `PATIENT_REGISTRATION_ENABLED` | NON-SECRET | Must be `false` | Keep **false** outside KV or as non-secret config | Identity | Never `true` without gates |

**No secret objects were created in the vault** (count = 0). Names above are the **authorized naming map** for subsequent population tasks.

Verification method (future): confirm secret **exists** + authorized identity can **get** without displaying value; app boots with injected env.

---

## 10. Database Secret Mapping

| Field | Status |
| --- | --- |
| Target host | `pg-dr-vandana-staging` **only** |
| Target database | `dr_vandana_db_staging` **only** |
| Production host | **FORBIDDEN** |
| KV name | `staging-app-database-url` |
| Value in vault | **NOT PROVIDED** |
| Connection string in this report | **NOT RECORDED** |

---

## 11. Application Secret Mapping

```text
Azure Key Vault (staging)
  → (future) staging runtime injection
  → server-only process.env
  → Next.js server code
```

Must **never** map DB/session/MFA/SMTP/Twilio secrets to `NEXT_PUBLIC_*`.

No application code changes in O-B-05A.

---

## 12. Vercel Boundary

| Item | Status |
| --- | --- |
| Vercel staging project | **UNCHANGED** / still **NOT CONFIGURED** |
| Production Vercel | **UNTOUCHED** |
| Future mapping | Documented only: KV → staging env vars → server runtime |

Actual wiring: **O-B-05B**.

---

## 13. SMTP Boundary

```text
OUT OF SCOPE
SMTP SECRET REQUIRED — O-B-05C
```

No SMTP configuration or sends.

---

## 14. Twilio Boundary

```text
OUT OF SCOPE
TWILIO SECRET REQUIRED — O-B-05D
WhatsApp: not configured
```

---

## 15. Registration Safety

| Check | Result |
| --- | --- |
| `.env.example` | `PATIENT_REGISTRATION_ENABLED=false` |
| Flag set to true | **NOT PERFORMED** |
| Public registration enabled | **NO** |

```text
REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
```

---

## 16. Secret Exposure Audit

| Check | Result |
| --- | --- |
| `.env` / `.env.local` gitignored | **VERIFIED** |
| Tracked `.env` / `.pem` via `git ls-files` | None found |
| Secret values in this report | **NO** |
| Secret values printed to terminal intentionally | **NO** (list returned empty names) |
| Probable secret committed this task | **NO** |

If later population dumps appear in Git: treat as **POTENTIAL SECRET EXPOSURE DETECTED** and rotate.

---

## 17. Gitignore Audit

| Pattern | Status |
| --- | --- |
| `.env*` with `!.env.example` | **Adequate** |
| `*.pem` | Present |
| `.vercel` | Present |
| `.gitignore` modified this task | **NO** |

---

## 18. Security Configuration

| Setting | Status |
| --- | --- |
| RBAC authorization | **CONFIGURED** (`true`) |
| Soft delete | **CONFIGURED** |
| Purge protection | **CONFIGURED** |
| Retention days | **90** |
| Public network access | **Enabled** — hardening / private endpoint = **TECHNICAL DECISION REQUIRED** |
| Diagnostic settings | **NOT CONFIGURED** — **DECISION REQUIRED** |
| Compliance claim | **NOT MADE** |
| O18 data residency | Location India South Central **VERIFIED**; legal residency **LEGAL REVIEW REQUIRED** |

---

## 19. Rotation Findings

| Secret class | Rotation |
| --- | --- |
| All staging secrets | **NOT CONFIGURED** automated rotation |
| Policy period | **DECISION REQUIRED** (do not invent) |
| On exposure | Rotate immediately (ceremony) |

---

## 20. Access Verification

| Check | Result |
| --- | --- |
| Vault exists | **YES** / **VERIFIED** |
| Operator can list secrets | **AUTHORIZED** (empty list) |
| Secret values displayed | **NOT DISPLAYED** |
| Unauthorized identity denial test | **NOT RUN** |
| Application identity get-secret | **BLOCKED** — identity missing |
| Production identity tests | **NOT RUN** / forbidden |

---

## 21. Test Results

| Suite | Status | Reason |
| --- | --- | --- |
| Unit / integration | **NOT RUN** | No application code changes |
| Typecheck | **NOT RUN** | No application code changes |
| Lint | **NOT RUN** | No application code changes |
| Build | **NOT RUN** | No application code changes |
| Azure vault metadata verify | **PASS** | show + empty secret list |

---

## 22. Security Review

| # | Check | Result |
| --- | --- | --- |
| 1 | Production untouched | **PASS** |
| 2 | Production secrets untouched | **PASS** |
| 3 | Staging-only Key Vault | **PASS** |
| 4 | No secret values in Git | **PASS** |
| 5 | No secret values in documentation | **PASS** |
| 6 | No client exposure introduced | **PASS** |
| 7 | Least privilege (vault-scoped role) | **PASS WITH CONDITIONS** (app identity still missing) |
| 8 | Environment separation | **PASS** |
| 9 | Registration disabled | **PASS** |
| 10 | No real patient data | **PASS** |
| 11 | No Option C | **PASS** |
| 12 | SMTP untouched | **PASS** |
| 13 | Twilio untouched | **PASS** |
| 14 | Vercel Production untouched | **PASS** |
| 15 | No accidental secret logging | **PASS** |

```text
SECURITY REVIEW = PASS WITH CONDITIONS
```

---

## 23. Remaining Blockers

1. Populate vault secrets with real staging values (**operator-provided**, never invented) — especially session/MFA/DB URL.  
2. **STAGING APPLICATION IDENTITY REQUIRED** for runtime get-secret / Vercel injection path.  
3. O-B-05B Vercel staging env wiring.  
4. O-B-05C SMTP secrets.  
5. O-B-05D Twilio secrets.  
6. Public network / diagnostics decisions.  
7. Rotation policy periods **DECISION REQUIRED**.  
8. Worker identity after vendor decision.

---

## 24. Production Safety Confirmation

| Question | Answer |
| --- | --- |
| Production accessed | **NO** |
| Production database accessed | **NO** |
| Production secrets accessed | **NO** |
| Production modified | **NO** |
| Production deployment | **NO** |
| Production Key Vault created/modified | **NO** |
| Registration enabled | **NO** |
| Real patient data used | **NO** |
| Clinical functionality implemented | **NO** |
| Option C | **BLOCKED** |

---

## 25. Option C Confirmation

```text
Option C: BLOCKED
F4: NOT MODIFIED
```

---

## 26. Git Status

Expected: this report untracked; prior O-B docs untracked/modified as before; HEAD `7974175`; JPEG untracked; **no secrets staged**.

---

## 27. Commit Status

**NONE**

---

## 28. GitHub Push Status

**NONE**

---

## 29. Independent Review

| Question | Answer |
| --- | --- |
| Only STAGING touched? | **YES** (plus subscription KeyVault provider registration) |
| KV configured vs merely documented? | **CONFIGURED** (resource + RBAC); values **NOT** populated |
| Secret values protected? | **YES** |
| Production resource touched? | **NO** |
| Production secrets accessed? | **NO** |
| Permissions broader than necessary? | Vault-scoped Secrets Officer — acceptable for operator; app ID still open |
| Client-side secrets? | **NO** |
| Registration disabled? | **YES** |
| SMTP/Twilio/Vercel Prod untouched? | **YES** |
| Real patient data avoided? | **YES** |
| Claims evidence-backed? | **YES** |
| Blockers honest? | **YES** |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

---

## 30. Checkpoint Recommendation

```text
CHECKPOINT RECOMMENDED
```

(Documentation + staging KV resource metadata only; no secret values; no Production changes; registration disabled.)

**Do not commit in this task** — stop for explicit human authorization.

---

## 31. Next Controlled Task

```text
O-B-05B — Vercel Staging Environment Configuration
```

(Do not start automatically. Secret **value** population may require a short operator-led substep before or during 05B.)

---

## 32. STOP

```text
O-B-05A STOP — STAGING KEY VAULT CREATED AND RBAC SCOPED.
NO SECRET VALUES STORED OR DISPLAYED.
NO PRODUCTION KEY VAULT.
NO SMTP/TWILIO/VERCEL DEPLOY/WORKER/REGISTRATION/OPTION C.
NO GIT COMMIT. NO GITHUB PUSH.
STOP.
```

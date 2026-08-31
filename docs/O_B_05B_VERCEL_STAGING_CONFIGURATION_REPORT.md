# O-B-05B Vercel Staging Configuration Report

**Document type:** Controlled staging-only Vercel configuration / verification  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05B FINAL STATUS = PASS WITH CONDITIONS / PARTIAL
Vercel Preview staging flags = CONFIGURED + VERIFIED (non-secrets)
Vercel Preview secret VALUES / DB target = NOT VERIFIED (platform cannot pull Secrets)
Azure Key Vault values = still 0 (VALUE REQUIRED — NOT PROVIDED)
Production Vercel project = UNTOUCHED
REGISTRATION ENABLEMENT = NO
Option C = BLOCKED
SMTP / Twilio activation = OUT OF SCOPE
```

---

## 1. Executive Summary

Vercel access **was available**. Two projects exist under `trinetra-digital-lab`:

| Project | URL (metadata) | O-B-05B treatment |
| --- | --- | --- |
| `dr-vandana-website` | `https://drvandana.trinetralab.net` | **Staging/lab** — Preview environment configured |
| `drvandana-psychology` | `https://drvandana.trinetra.net` | **Production** — inspected metadata only; **NOT MODIFIED** |

Local `.vercel` link points at Production project `drvandana-psychology`. Staging mutations used `--project dr-vandana-website` only.

**Mutations (Preview only on `dr-vandana-website`):** set readable Config vars:

- `PATIENT_REGISTRATION_ENABLED=false`
- `IDENTITY_PROVISION_ENABLED=false`
- `TWILIO_WHATSAPP_ENABLED=false`
- `EMAIL_PROVIDER=smtp`
- `APP_BASE_URL=https://drvandana.trinetralab.net`

Verified via isolated `vercel env run` (local `.env*` moved aside; process env cleared): flags match above.

**Not done:** invent/populate secret values; SMTP/Twilio live config; Production env changes; deployment; Key Vault value sync; DB URL target proof for Vercel-hosted Secrets (CLI cannot pull Secret-type values).

---

## 2. Authorization / Scope

AUTHORIZED staging Preview configuration of **non-secret** flags.  
NOT AUTHORIZED: Production mutation, secret invention, SMTP/Twilio setup, worker, registration enablement, Option C, commit/push.

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| `vercel.json` | **Absent** (not invented) |
| Package scripts | `build` = `next build`; Node observed `v24.x` matches Vercel project Node 24.x |
| App source modified | **NO** |

---

## 4. Vercel Project Findings

| Field | `dr-vandana-website` (staging) | `drvandana-psychology` (prod) |
| --- | --- | --- |
| Framework | Next.js | Next.js |
| Root | `.` | `.` |
| Build | `npm run build` / `next build` | same |
| Install | npm/yarn/pnpm/bun default | same |
| Node | 24.x | 24.x |
| Env mutation this task | Preview Config flags | **NONE** |

Environment model used:

```text
LOCAL ≠ Preview(STAGING on dr-vandana-website) ≠ Production(drvandana-psychology + any Production env on lab project)
```

Preview is treated as **staging** for `dr-vandana-website` only. Production env on either project was **not** modified.

---

## 5. Staging Environment Findings

| Item | Status |
| --- | --- |
| Staging project identified | **PASS** — `dr-vandana-website` |
| Preview = staging for this task | **PASS WITH CONDITIONS** (documented; not a separate Vercel “Staging” product tier) |
| Production project untouched | **PASS** |
| Local link vs staging project mismatch | **PASS WITH CONDITIONS** — operators must pass `--project` |

---

## 6. Environment Variable Inventory

See `docs/O_B_05B_VERCEL_STAGING_CONFIGURATION_INVENTORY.md`.

Principle enforced: **SECRET NAME EXISTS ≠ SECRET VALUE VERIFIED**.

---

## 7. Azure Key Vault Integration Status

| Item | Status |
| --- | --- |
| Vault `kv-dr-vandana-staging` | Exists (from O-B-05A) |
| Secret value count | **0** |
| Vercel ↔ Key Vault sync | **NOT CONFIGURED** |
| Integration gap | **DOCUMENTED** — Vercel Preview currently holds its own Secrets; KV naming map unused for values |
| New SM architecture invented | **NO** |

---

## 8. Database Target Verification

| Check | Status |
| --- | --- |
| Preview `DATABASE_URL` secret **name** present | **PASS** (env ls) |
| Preview `DATABASE_URL` value / host markers via CLI | **NOT VERIFIED** — Secret-type values cannot be pulled (`vercel env run` isolated: `HAS_DB_SECRET=false`) |
| Local `.env` staging markers (gitignored) | Points at `pg-dr-vandana-staging` / `dr_vandana_db_staging` (local only; not proof of Vercel Secret) |
| Production DB accessed | **NO** |

```text
BLOCKED — STAGING DATABASE SECRET VALUE / TARGET VERIFICATION REQUIRES CREDENTIAL ACCESS PATH
(not invented; not printed)
```

---

## 9. Registration Safety Verification

| Check | Status |
| --- | --- |
| Preview Config `PATIENT_REGISTRATION_ENABLED` | **PASS** — verified `"false"` |
| Code gate (local) | **PASS** — `REG_ENABLED=false` / runtime false |
| `.env.example` | `false` |
| Enablement performed | **NO** |

```text
REGISTRATION ENABLEMENT: NO
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
```

---

## 10. SMTP Status

```text
OUT OF SCOPE / MISSING — DEPENDENCY TASK O-B-05C
```

SMTP secret **names** exist on Preview; values **NOT VERIFIED**; no mail sent.

---

## 11. Twilio Status

```text
OUT OF SCOPE / MISSING — DEPENDENCY TASK O-B-05D
```

OTP/Twilio secret names present; WhatsApp flag forced `false`; no SMS/WhatsApp sent.

---

## 12. Build Verification

| Check | Status |
| --- | --- |
| `npm run build` | **PASS** (exit 0) |
| Production deployment | **NOT PERFORMED** |
| Staging/Preview deploy this task | **NOT PERFORMED** |

---

## 13. Typecheck

**PASS** — `npm run typecheck` exit 0

---

## 14. Lint

**PASS** — exit 0; 2 pre-existing warnings (unused vars)

---

## 15. Synthetic Smoke Tests

| Test | Status |
| --- | --- |
| Build / typecheck / lint | **PASS** |
| Registration flag on Preview | **PASS** |
| Non-secret Preview flags | **PASS** |
| Live auth/appointment with Vercel Secrets | **BLOCKED** — Secret values not readable / session secret not verified |
| External notifications | **NOT RUN** |
| Unit suite full rerun | **NOT RUN** (no app code change; prior O-B-05 had 1 env-related fail) |

---

## 16. Security Review

| Finding | Severity | Notes |
| --- | --- | --- |
| Local `.vercel` links Production project | **MEDIUM** | Use `--project dr-vandana-website` for staging; consider relink **DECISION REQUIRED** |
| Lab project also has Production `DATABASE_URL` name | **MEDIUM** | Not modified; confirm isolation operationally later |
| Secret-type vars not pullable → target host **NOT VERIFIED** | **HIGH** for go-live smoke | Needs operator verification path |
| CLI `env ls` may show truncated encrypted blobs for Config | **LOW** | Do not paste into docs/chat |
| No secrets committed | **PASS** | `.vercel` gitignored; `.env*` gitignored |
| No `NEXT_PUBLIC_` PMS secrets introduced | **PASS** | |
| Registration not enabled | **PASS** | |

```text
SECURITY REVIEW = PASS WITH CONDITIONS
```

---

## 17. Production Protection Review

| Item | Status |
| --- | --- |
| Production Vercel variables | **NOT MODIFIED** |
| Production deployment | **NOT PERFORMED** |
| Production Azure | **NOT MODIFIED** |
| Production database | **NOT ACCESSED** |
| Production secrets | **NOT ACCESSED** |
| Production registration | **NOT ENABLED** |

---

## 18. Clinical / Option C Protection

```text
Option C: BLOCKED
No clinical schema/API/UI/AI activated
```

---

## 19. Problems Found

1. Staging secrets exist as Vercel **Secret** entries but cannot be CLI-verified for host/value.  
2. Azure Key Vault remains empty — dual store / sync gap.  
3. Repo default Vercel link targets Production project.  
4. `dr-vandana-website` carries Production env names alongside Preview — operational confusion risk.

---

## 20. Blockers

1. **REQUIRES CREDENTIAL** — verify Preview `DATABASE_URL` targets staging only (without printing).  
2. **REQUIRES CREDENTIAL** — confirm `AUTH_SESSION_SECRET` / `MFA_ENCRYPTION_KEY` usable lengths.  
3. Key Vault value population still **VALUE REQUIRED — NOT PROVIDED**.  
4. SMTP → O-B-05C; Twilio → O-B-05D.  
5. Full Preview deploy smoke **NOT RUN**.

---

## 21. Remediation Recommendations

1. Operator verifies Preview DB URL target in Vercel dashboard (staging host/db only).  
2. Populate or sync secrets into `kv-dr-vandana-staging` per O-B-05A map; define Vercel injection path.  
3. Relink local `.vercel` to `dr-vandana-website` **or** document mandatory `--project` usage.  
4. Prefer Config type for non-secret flags (done for registration/provision/WhatsApp/email/base URL).

---

## 22. Independent Review

| Question | Answer |
| --- | --- |
| Modified Production? | **NO** |
| Modified Production DB? | **NO** |
| Exposed secret values in docs? | **NO** |
| Committed secrets? | **NO** |
| Enabled registration? | **NO** |
| Staging against Production DB proven? | **NOT VERIFIED** (Secret pull blocked) |
| Activated SMTP/Twilio? | **NO** |
| Clinical functionality? | **NO** |
| Weakened Option B security? | **NO** |
| Undocumented infra? | **NO** — Preview flags documented |
| VERIFIED vs ASSUMED distinguished? | **YES** |
| Missing credentials marked? | **YES** |
| Rollback possible? | **YES** |

```text
INDEPENDENT REVIEW = PASS WITH CONDITIONS
```

Conditions: secret target verification incomplete; KV still empty; Production project still default link.

---

## 23. Files Created

- `docs/O_B_05B_VERCEL_STAGING_CONFIGURATION_REPORT.md`
- `docs/O_B_05B_VERCEL_STAGING_CONFIGURATION_INVENTORY.md`

## 24. Files Modified

None in application source. Prior uncommitted O-B docs remain as before.

## 25. Application Changes

**NONE**

## 26. Database Changes

**NONE**

## 27. Production Changes

**NONE**

---

## 28. Git Status

HEAD `7974175`; new O-B-05B docs untracked; JPEG untracked; `.vercel` gitignored; no secrets staged.

## 29. Git Commit

**NONE**

## 30. GitHub Push

**NONE**

---

## 31. Checkpoint Recommendation

```text
STAGING CONFIGURATION CHECKPOINT RECOMMENDED
```

(Documentation + Preview non-secret flag changes only; no secret values in Git.)

Do not commit until explicitly authorized.

---

## 32. Next Controlled Task

```text
O-B-05C — Staging Credential Completion & Database Target Verification
```

(Smallest blocker: prove Preview `DATABASE_URL` / session secrets without printing values; optionally begin SMTP as a follow-on if credentials ready. Do **not** start automatically.)

---

## 33. Final STOP Statement

### Rollback

| Change | Rollback |
| --- | --- |
| Preview Config flags on `dr-vandana-website` | `vercel env rm <NAME> preview --project dr-vandana-website` then restore prior values if known |
| Production | **NOT REQUIRED — NO PRODUCTION MUTATION** |
| Application/DB | **NOT REQUIRED — NO MUTATION** |

```text
O-B-05B COMPLETE AS PASS WITH CONDITIONS.
PREVIEW SAFETY FLAGS CONFIGURED.
NO SECRET VALUES INVENTED OR PRINTED.
NO PRODUCTION MODIFICATION.
NO REGISTRATION ENABLEMENT.
NO SMTP/TWILIO ACTIVATION.
NO GIT COMMIT. NO GITHUB PUSH.
DO NOT START O-B-05C AUTOMATICALLY.
STOP.
```

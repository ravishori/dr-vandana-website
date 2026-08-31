# O-B-BUILD-01 Build Prerender Remediation Report

**Document type:** Build remediation report  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`

```text
DECISION = BUILD REMEDIATION SUCCESSFUL — READY FOR VERCEL CONFIGURATION
PRODUCTION INFRASTRUCTURE = UNCHANGED
```

---

## 1. Executive summary

Investigation showed the reported `/privacy-policy` and `/_global-error` `useContext` failure was caused by **`NODE_ENV=development` in the shell during `npm run build`**, not by broken route components. Remediation: **`scripts/run-production-build.mjs`** forces `NODE_ENV=production` for the build child process. Build now **PASS** even when the parent shell has `NODE_ENV=development`.

---

## 2. Original failure (reproduced)

| Item | Detail |
| --- | --- |
| Command | `npm run build` |
| Warning | Non-standard `NODE_ENV` |
| Routes | `/privacy-policy`, `/_global-error` |
| Error | `TypeError: Cannot read properties of null (reading 'useContext')` |
| Trigger | `$env:NODE_ENV='development'` in shell (same class as O-B-P03F test session) |

---

## 3. Investigation findings

| Area | Finding |
| --- | --- |
| React duplicates | **None** — single `react@19.2.8` / `react-dom@19.2.8` |
| `privacy-policy/page.tsx` | Server component; no hooks |
| `LegalDocument` | Server component; static content |
| `global-error.tsx` | Valid client error boundary; not root cause |
| `ThemeProvider` | Client component in root layout; works under correct `NODE_ENV` |
| Clean-env build (no override) | **PASS** before fix |

**Root cause confidence: HIGH**

---

## 4. Remediation applied

| File | Change |
| --- | --- |
| `scripts/run-production-build.mjs` | **Added** — runs `next build` with `NODE_ENV=production` |
| `package.json` | `"build"` → `node scripts/run-production-build.mjs` |

No other source files modified for this task.

---

## 5. Post-fix validation

| Suite | Result |
| --- | --- |
| Build (clean env) | **PASS** |
| Build (`NODE_ENV=development` in shell) | **PASS** |
| `/privacy-policy` | **PASS** (static route in output) |
| `/_global-error` | **PASS** (no prerender error; special error boundary) |
| Typecheck | **PASS** |
| Lint | **PASS** (2 pre-existing warnings) |
| Tests | **PASS** (366/366) |

---

## 6. Production safety

| Item | Status |
| --- | --- |
| Production database | **UNCHANGED** |
| Key Vault | **UNCHANGED** |
| Vercel | **UNCHANGED** |
| DNS | **UNCHANGED** |
| Worker | **UNCHANGED** |
| Registration / WhatsApp | **false** |
| SMTP / OTP | **NOT EXECUTED** |
| Patient data | **NOT USED** |
| Secret leakage | **NONE DETECTED** |

---

## 7. Security review

| Check | Result |
| --- | --- |
| Auth / session / MFA | **No impact** — build wrapper only |
| SSR/client boundaries | **Unchanged** |
| Error disclosure | **Unchanged** |
| XSS | **No new vectors** |

**SECURITY REVIEW: PASS**

---

## 8. Regression review

| Area | Changed? |
| --- | --- |
| Appointments / notifications / outbox | **NO** |
| Authentication / MFA / registration | **NO** |
| Database access | **NO** |
| SMTP / WhatsApp / worker | **NO** |
| Privacy policy content | **NO** |
| Global error UX | **NO** |

**REGRESSION REVIEW: PASS**

---

## 9. Git

| Item | Value |
| --- | --- |
| HEAD | `7974175` |
| Commit | **NONE** |
| Push | **NONE** |

Changed for BUILD-01: `scripts/run-production-build.mjs`, `package.json` (build script only; pre-existing synthetic-patient script line unchanged).

---

## 10. Next controlled task

**O-B-P03F-R — Production Vercel Configuration & DATABASE_URL Reverification** — do not start automatically.

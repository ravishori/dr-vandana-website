# O-B-BUILD-01 Build Prerender Remediation

**Document type:** Build remediation architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)

---

## 1. Problem

O-B-P03F reported `npm run build` **FAIL** with:

```text
TypeError: Cannot read properties of null (reading 'useContext')
```

on `/privacy-policy` and `/_global-error` during static prerender.

---

## 2. Root cause

**Not a defect in `/privacy-policy` or `global-error.tsx` components.**

When the parent shell has `NODE_ENV=development` (or other non-production value), Next.js 16.3.0 emits:

```text
You are using a non-standard "NODE_ENV" value in your environment.
```

and static prerender fails with React `useContext` on null. This occurred after operator/agent sessions that set `NODE_ENV=development` for database script debugging (O-B-P03E/P03F).

With a clean environment (no `NODE_ENV` override), **`next build` already passed** before any code change — confirming routes were not broken.

---

## 3. Remediation

| Change | Purpose |
| --- | --- |
| `scripts/run-production-build.mjs` | Spawn `next build` with `NODE_ENV=production` forced in child env |
| `package.json` `"build"` | Route through wrapper script |

This matches Next.js guidance: do not run production build under a development `NODE_ENV`.

---

## 4. What was not changed

- No changes to `privacy-policy/page.tsx`, `LegalDocument`, or `global-error.tsx`
- No `ignoreBuildErrors`, no dependency upgrades, no dynamic rendering workarounds
- No Production infrastructure touched

---

## 5. Validation

| Check | Result |
| --- | --- |
| `npm run build` (clean env) | PASS |
| `npm run build` (`NODE_ENV=development` in shell) | PASS (after fix) |
| `/privacy-policy` in build output | Static ○ |
| Typecheck | PASS |
| Lint | PASS (2 pre-existing warnings) |
| Tests | PASS (366/366) |

---

## 6. Operator note

After running DB/migration scripts that set `NODE_ENV=development`, either unset it or use `npm run build` (now hardened) before release gate checks.

---

## 7. Next task

**O-B-P03F-R — Production Vercel Configuration & DATABASE_URL Reverification** (do not start automatically).

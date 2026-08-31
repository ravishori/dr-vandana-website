# O-B-RELEASE-01 Pre-Deployment Condition Closure

**Document type:** Pre-deployment condition closure plan / architecture  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
DEPLOYMENT = NOT TRIGGERED
OPTION B = KEEP trinetralab.net
REGISTRATION = FALSE
WHATSAPP = FALSE
```

---

## 1. Purpose

Close safely closable conditions from the Final Production Release Gate before a separately authorized controlled Production deployment. No deploy, no registration/WhatsApp enablement, no schema/infra/secret mutations.

---

## 2. Allowed code change (this task)

Active Option B domain alignment in application source:

| File | Change |
| --- | --- |
| `src/config/site.ts` | `drvandana.trinetralab.net` |
| `src/data/legal.ts` | Privacy intro uses lab domain |
| `src/data/ai/knowledge/*.ts` | Publication citations → lab domain |
| `src/lib/identity/production-gates.test.ts` | Test URLs → lab domain |

Historical `docs/**` references to `trinetra.net` **left unchanged** (audit evidence).

---

## 3. Conditions policy

| May CLOSE with evidence | Remain OPEN CONDITION |
| --- | --- |
| Active domain source alignment | Vercel DATABASE_URL value parity |
| Application quality after fix | Mailbox receipt |
| | Retry failure path |
| | Restore drill |
| | Azure services firewall special-case |
| | Uncommitted tree review before deploy |
| | MFA/SMTP on public Vercel (not required yet) |
| | Synthetic P04D fixtures retained |

---

## 4. Deployment boundary

**DO NOT** run `vercel --prod`, trigger Vercel Production, or enable patient features.  
Next task only if decision is **READY FOR CONTROLLED PRODUCTION DEPLOYMENT**.

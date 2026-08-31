# O-B-03A STAGING PROVIDER SELECTION REPORT

## 1. Executive Summary

Staging provider options were analyzed against repository requirements. A **composite recommendation** is documented (Vercel-compatible app host + managed PostgreSQL 16+ preferably India-capable + separate worker host + Twilio SMS OTP + Nodemailer SMTP + O-B-03 secret names).  

```text
PROVIDER RECOMMENDED — HUMAN APPROVAL REQUIRED
```

Nothing was provisioned. Production was not accessed. Registration remains disabled. Option C remains blocked. No Git commit/push.

---

## 2. Authorization / Scope

Analysis and documentation only. No cloud resources, secrets, DNS, deploy, registration enablement, Option C, or Production.

---

## 3. Repository Baseline

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — matches expected |
| O-B-00…O-B-03 | Present |
| F4 | Checkpointed at `7974175` |

---

## 4. Existing Infrastructure Evidence

Next.js 16; PostgreSQL APPROVED / vendor OPEN; `btree_gist` + exclusion required; Nodemailer; Twilio SMS OTP adapter; outbox worker with Prod CLI refuse; Vercel-style hosting compatibility (not SELECTED); no Dockerfile; CI present; O15 worker hosting OPEN.

---

## 5. O-B-03 Dependency Requirements

Separate staging DB/secrets/SMTP/OTP/worker/hostname; registration false; secret naming ceremony; verification + rollback plans; no Option C pathway.

---

## 6. Candidate Providers

App: Vercel (or equiv.). PG: Neon, Supabase DB-only, RDS, Azure Flexible, Cloud SQL. Worker: always-on/container/cron-entrypoint hosts. Rejected: SQLite PMS, Supabase Auth SoT, Vercel-alone worker, default self-managed VPS.

---

## 7. Comparative Analysis

See matrix in `docs/O_B_03A_STAGING_PROVIDER_SELECTION.md` §22. No single vendor covers app + long-running worker + India PG optimally; **composite** required.

---

## 8. PostgreSQL Analysis

Engine must remain PostgreSQL 16+ with `btree_gist` and exclusion constraints. India preference APPROVED architecturally; vendor OPEN. Staging PII still triggers data-location caution → LEGAL REVIEW if non-India.

---

## 9. Application Hosting Analysis

Vercel-style Next.js hosting is the strongest **repository-evidenced** lean. Equivalent Next PaaS acceptable if human prefers. Serverless alone insufficient for worker.

---

## 10. Secret Management Analysis

O-B-03 naming remains authoritative. Host env and/or cloud SM. No secrets created. No values printed.

---

## 11. SMTP / OTP Analysis

Keep Nodemailer + Twilio SMS. Host must allow egress. Test mailbox / verified numbers only. Not configured in this task.

---

## 12. Worker Analysis

O15 remains blocker. Recommend separate always-on or approved dedicated entrypoint. Do not use `notifications:process` under `NODE_ENV=production`. Do not assume Vercel cron equals production dispatcher without verification.

---

## 13. Backup / Restore Analysis

Prefer managed PG backup/PITR SKUs — VERIFICATION REQUIRED. Staging restore drill required before trust. RPO/RTO UNSET. Not configured.

---

## 14. Security Analysis

TLS, least privilege, env isolation, HTTPS staging, registration false, no Prod credential reuse. No compliance certification claimed.

---

## 15. DNS / HTTPS Analysis

Staging hostname DECISION REQUIRED. Prod DNS untouched.

---

## 16. Observability Analysis

Use existing logs + optional error mail; APM DECISION REQUIRED.

---

## 17. India / Data Location Analysis

```text
REGION AVAILABLE: varies by vendor (see decision pack)
DATA LOCATION VERIFICATION REQUIRED
LEGAL REVIEW REQUIRED (O18) especially if app host processes outside India
```

Do not claim guaranteed Indian data residency.

---

## 18. Cost Analysis

Relative LOW–HIGH bands only. Exact pricing: **PRICING VERIFICATION REQUIRED**.

---

## 19. Production Migration Analysis

Staging composite can migrate toward Production with same Postgres engine and similar app host, but Production remains **NOT AUTHORIZED** and O1/O2 remain OPEN.

---

## 20. Risk Analysis

| Risk | Mitigation |
| --- | --- |
| Choosing Neon without residency review | LEGAL REVIEW for staging PII |
| Vercel-only worker | Explicit separate worker host |
| Premature approval = provision | Keep HUMAN APPROVAL gate |
| Registration flipped for convenience | Keep false; O-B-00 gate |
| Prod credential reuse | Hard isolation checklist |

---

## 21. Decision Matrix

Documented in selection doc §22–25.

---

## 22. Recommendation

**RECOMMENDED composite (HUMAN APPROVAL REQUIRED):**

1. App: Vercel (or equivalent Next.js PaaS)  
2. PG: Supabase PostgreSQL DB-only Mumbai **or** India cloud PG; Neon as alt with legal note  
3. Worker: separate always-on/approved entrypoint host  
4. SMTP: Nodemailer + test mailbox  
5. OTP: Twilio SMS test  
6. Secrets: O-B-03 names  
7. Registration: false  
8. WhatsApp: disabled  

---

## 23. Alternative

Neon+Vercel+worker (speed) or full Azure India stack (cohesion/complexity).

---

## 24. Open Decisions

Exact vendors for app, PG, worker, secret manager, hostname, budget, staging residency acceptance.

---

## 25. Legal Review Requirements

O18 data location if non-India processing; O11/O10 unchanged (not resolved here).

---

## 26. Technical Review Requirements

Confirm btree_gist after any provision; worker entrypoint design; pooling with serverless app.

---

## 27. Provisioning Gate

```text
NOT PROVISIONED
O-B-04 not authorized until human provider decision
```

---

## 28. Registration Gate

```text
Patient registration: IMPLEMENTED BUT SAFELY DISABLED
PATIENT_REGISTRATION_ENABLED: false (unchanged)
```

---

## 29. Option B Protection

Operational Option B stack preserved; no redesign.

---

## 30. Option C Protection

```text
Option C: BLOCKED
Clinical implementation: NOT AUTHORIZED
```

---

## 31. Production Protection

```text
PRODUCTION NOT AUTHORIZED
Production: NOT ACCESSED
```

---

## 32. Files Created

- `docs/O_B_03A_STAGING_PROVIDER_SELECTION.md`
- `docs/O_B_03A_STAGING_PROVIDER_SELECTION_REPORT.md`

## 33. Files Modified

None by O-B-03A.

## 34. Application Changes

None.

## 35. Database Changes

None.

## 36. Production Changes

None.

## 37. Tests

```text
NOT REQUIRED / NOT RUN
```

## 38. Typecheck

```text
NOT REQUIRED / NOT RUN
```

## 39. Lint

```text
NOT REQUIRED / NOT RUN
```

## 40. Build

```text
NOT REQUIRED / NOT RUN
```

## 41. Git Status

New O-B-03A docs untracked; prior O-B working tree unchanged by this task’s modifications; HEAD `7974175`; JPEG untracked.

## 42. Commit

**NO**

## 43. Push

**NO**

## 44. Final Status

```text
PROVIDER RECOMMENDED — HUMAN APPROVAL REQUIRED
```

Statuses used correctly: REPOSITORY VERIFIED / DOCUMENTED / RECOMMENDED / NOT PROVISIONED / DECISION REQUIRED / LEGAL REVIEW REQUIRED / NOT AUTHORIZED / BLOCKED.

Recommended next task:

```text
O-B-03A-H — Human Provider Decision
```

(Do not start O-B-04 until human selects/approves the composite.)

## 45. STOP

---

### Independent review checklist

| Question | Answer |
| --- | --- |
| Selected without evidence? | No — recommendation grounded in decisions/runbooks; still HUMAN APPROVAL |
| Invented pricing? | No — bands + PRICING VERIFICATION REQUIRED |
| Invented regions? | Used decision-pack dated notes + VERIFICATION REQUIRED |
| Claimed compliance/residency guarantee? | No |
| Production accessed? | No |
| Cloud resource created? | No |
| Secret created/exposed? | No |
| App/DB/registration/F4/Option C changed? | No |
| Tests falsely claimed? | No |
| Confused recommend vs approve vs provision? | Explicitly separated |

```text
O-B-03A COMPLETE — STAGING PROVIDER OPTIONS ANALYZED, RECOMMENDATION DOCUMENTED, INDEPENDENT REVIEW COMPLETED. NO INFRASTRUCTURE PROVISIONED, NO PRODUCTION ACCESS, NO REGISTRATION ENABLEMENT, NO CLINICAL IMPLEMENTATION, NO GIT COMMIT, AND NO GITHUB PUSH. HUMAN PROVIDER DECISION REQUIRED. STOP.
```

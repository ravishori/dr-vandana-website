# O-B-03A Staging Provider Selection

**Document type:** Provider evaluation & recommendation (not approval, not provisioning)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Companion report:** `docs/O_B_03A_STAGING_PROVIDER_SELECTION_REPORT.md`

```text
RECOMMENDED ≠ APPROVED ≠ PROVISIONED ≠ PRODUCTION AUTHORIZED
PATIENT_REGISTRATION_ENABLED=false (must remain)
Option C: BLOCKED
Production: NOT AUTHORIZED
```

---

## 1. Purpose

Evaluate and recommend a **staging** provider architecture for Option B that fits repository requirements (Next.js, PostgreSQL 16+, `btree_gist`, exclusion constraints, SMTP, OTP, outbox worker, secrets, HTTPS), without provisioning or Production access.

---

## 2. Authorization

O-B-03A analysis/documentation only. No cloud resources, secrets, DNS, deploy, registration enablement, Option C, or Git checkpoint.

---

## 3. Repository baseline

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` |
| Prior docs | O-B-00…O-B-03 present |
| F4 | Checkpointed; clinical **BLOCKED** |

---

## 4. Current Option B architecture (evidence)

| Layer | Evidence | Status |
| --- | --- | --- |
| App | Next.js App Router (`package.json` next 16) | REPOSITORY VERIFIED |
| Hosting lean | “Next.js / Vercel-style deploy” (`PATIENT_PRACTICE_DECISIONS.md`) | REPOSITORY EVIDENCE — compatibility, **not** vendor SELECTED |
| DB engine | PostgreSQL managed **APPROVED**; vendor **OPEN** | REPOSITORY VERIFIED |
| Extensions | `btree_gist`, GiST exclusion, `tstzrange` | REPOSITORY VERIFIED |
| Auth | Server sessions, MFA TOTP, OTP SMS adapter (Twilio) | REPOSITORY VERIFIED |
| Notify | Outbox + dispatcher; CLI refuses Prod | REPOSITORY VERIFIED |
| SMTP | Nodemailer | REPOSITORY VERIFIED |
| Worker O15 | Hosting **OPEN**; serverless request/response **not** substitute | REPOSITORY VERIFIED |
| Secrets | Host secret manager; no `NEXT_PUBLIC_*` secrets | REPOSITORY VERIFIED |
| Docker | None in repo | REPOSITORY VERIFIED |
| CI | GitHub Actions verify + PG job | REPOSITORY VERIFIED |

---

## 5. O-B-03 requirements (summary)

From O-B-03 plan/ceremony: separate staging DB/secrets/SMTP/OTP/worker/hostname; registration false; naming `staging/app/*`; verification matrix; restore-based rollback; no Option C.

---

## 6. Provider candidates

| ID | Category | Candidate | Basis |
| --- | --- | --- | --- |
| A | App PaaS | **Vercel** (or equivalent Next.js PaaS) | REPOSITORY EVIDENCE: Vercel-style compatibility |
| B | Managed PG | **Neon** | Compared in `DECISION_POSTGRESQL.md` — **NOT SELECTED** there |
| C | Managed PG | **Supabase PostgreSQL (DB only)** | Same — Mumbai region noted; Auth **not** RBAC SoT |
| D | Managed PG | **AWS RDS / Aurora PostgreSQL** | Same — India regions exist (verify) |
| E | Managed PG | **Azure Database for PostgreSQL Flexible Server** | Same — India regions (verify PG 16) |
| F | Managed PG | **Google Cloud SQL PostgreSQL** | Same — Mumbai/Delhi (verify) |
| G | Worker host | **Always-on / container / managed job** (Render, Fly.io, Railway, Azure Container Apps, Cloud Run, small VM) | ARCHITECTURAL INFERENCE from O15 + worker runbook |
| H | Full VPS | Self-managed app+Postgres on single VPS | Possible; **not recommended as default** in Postgres decision pack |
| I | Reject | SQLite / JSON / filesystem for PMS | **APPROVED forbidden** for prod appointment/identity data |

SMTP mailbox and Twilio remain **external** to app host (Nodemailer + Twilio adapters) — not replaced by PaaS choice.

---

## 7. Evaluation methodology

Sources labeled:

- **REPOSITORY EVIDENCE** — decisions, runbooks, code  
- **ARCHITECTURAL INFERENCE** — fit to known constraints  
- **EXTERNAL PROVIDER INFORMATION** — from `DECISION_POSTGRESQL.md` dated notes (re-verify before purchase)

Statuses: YES / NO / PARTIAL / UNKNOWN / VERIFICATION REQUIRED / DECISION REQUIRED  
No invented prices; cost as LOW/MEDIUM/HIGH + **PRICING VERIFICATION REQUIRED**.

---

## 8. Application compatibility

| Need | Implication |
| --- | --- |
| Next.js 16 build/start | Prefer Node PaaS with SSR |
| Server Actions / middleware | Standard Node host |
| No Dockerfile | PaaS git deploy OK; containers optional |
| Connection pooling | Critical if serverless app + Postgres |

---

## 9. PostgreSQL compatibility

Must support PG 16+, TLS, `btree_gist`, GiST exclusion, migrations, backups/restore testing.

| Candidate | btree_gist / exclusion | India region (per decision pack notes) | Staging fit |
| --- | --- | --- | --- |
| Neon | Expected on real PG — **VERIFICATION REQUIRED** after provision | India **not listed** (Aug 2026 notes) | Strong ops/Vercel fit; residency **LEGAL REVIEW** if staging holds PII |
| Supabase PG | Expected — **VERIFICATION REQUIRED** | Mumbai listed | Strong if India preferred |
| RDS / Cloud SQL / Azure Flexible | Expected — **VERIFICATION REQUIRED** | India options listed | Strong residency; higher ops |

Self-managed VPS PG: technically YES with higher backup/PITR burden — not default.

---

## 10. Secret management

| Approach | Fit |
| --- | --- |
| Vercel encrypted env for app | PARTIAL — good for app inject; map O-B-03 names; auditability varies |
| Azure Key Vault / AWS Secrets Manager / GCP Secret Manager | YES for enterprise audit — **DECISION REQUIRED** |
| Worker host env | Must mirror `staging/app/*` contract separately |

Unified secret manager preferred if multi-host (app ≠ worker).

---

## 11. SMTP / OTP

| Concern | Finding |
| --- | --- |
| SMTP | Provider-agnostic Nodemailer; outbound TLS from app/worker host required |
| OTP | Twilio SMS adapter implemented; needs outbound HTTPS to Twilio |
| Firewall | Host must allow SMTP submission + Twilio API |
| Test strategy | Operator mailbox + verified test numbers only |

Host choice must not block egress. **Do not configure** in O-B-03A.

---

## 12. Worker hosting

```text
REPOSITORY EVIDENCE: notifications:process refuses NODE_ENV=production;
Vercel request/response is not a substitute for the dispatcher loop (O15 / runbook).
```

| Option | Long-running / poll SKIP LOCKED | Verdict |
| --- | --- | --- |
| Vercel serverless only | PARTIAL / poor fit for continuous poll | Not sufficient alone |
| Platform cron invoking a **dedicated** staging entrypoint | PARTIAL if interval/timeout adequate — **VERIFICATION REQUIRED** | Possible with design |
| Always-on container/VM/worker PaaS | YES | **RECOMMENDED class** |
| Redesign worker to queue product | Out of scope | Rejected for O-B-03A |

---

## 13. Backup / restore

Managed PG candidates generally offer automated backups / PITR by SKU — **VERIFICATION REQUIRED** per vendor. Staging must support restore-to-copy drill. RPO/RTO remain **UNSET**. Backups **NOT CONFIGURED**.

---

## 14. Security

Least privilege DB role, TLS, secret isolation, HTTPS staging host, no Prod credential reuse, registration false. Compliance claims: **not made**.

---

## 15. HTTPS / DNS

Staging hostname **DECISION REQUIRED**. TLS certificate via host (e.g. Vercel) or DNS provider. Production DNS **not** modified.

---

## 16. Logging / monitoring

App structured logs + optional error email exist. APM provider **OPEN**. Host log drains recommended — **DECISION REQUIRED**.

---

## 17. India / data-location

| Topic | Status |
| --- | --- |
| India PG preference | APPROVED preference (architecture) |
| Staging PII (test accounts) | Still personal data — treat carefully |
| App host may process outside India even if PG in Mumbai | O18 — **LEGAL REVIEW REQUIRED** |
| Guarantee of “Indian data residency” | **NOT CLAIMED** |

Use: REGION AVAILABLE / DATA LOCATION VERIFICATION REQUIRED / LEGAL REVIEW REQUIRED as applicable.

---

## 18. Cost category

| Stack element | Relative cost | Note |
| --- | --- | --- |
| Vercel staging | LOW–MEDIUM | PRICING VERIFICATION REQUIRED |
| Neon / Supabase staging SKU | LOW–MEDIUM | PRICING VERIFICATION REQUIRED |
| RDS/Azure/Cloud SQL | MEDIUM–HIGH | Higher ops |
| Always-on worker | LOW–MEDIUM | Small instance |
| Twilio trial / SMTP mailbox | LOW | Provider limits apply |

Exact ₹ amounts: **PRICING VERIFICATION REQUIRED**.

---

## 19. Operational complexity

| Stack | Complexity |
| --- | --- |
| Vercel + Neon + separate worker PaaS | LOW–MEDIUM |
| Vercel + Supabase Mumbai + worker PaaS | LOW–MEDIUM |
| Full Azure/AWS | MEDIUM–HIGH |
| Single VPS all-in-one | MEDIUM (ops burden on backups/TLS) |

---

## 20. Production migration path

Staging choices should not block Production. Prefer same **engine** (Postgres) and similar app host family. Production remains **NOT AUTHORIZED**. O1/O2 still OPEN for Production even if staging picks a vendor.

---

## 21. Vendor lock-in

| Choice | Lock-in |
| --- | --- |
| Next.js on Vercel | MEDIUM (portable with effort) |
| Managed Postgres | LOW–MEDIUM if standard PG + drizzle migrations |
| Twilio / SMTP | MEDIUM (adapters exist) |
| Avoid Supabase Auth / proprietary Data API as SoT | Already forbidden — reduces lock-in |

---

## 22. Provider comparison matrix

| Criterion | Vercel (app) | Neon (PG) | Supabase PG | RDS/Azure/Cloud SQL | Always-on worker PaaS | All-in-one VPS |
| --- | --- | --- | --- | --- | --- | --- |
| PostgreSQL | N/A (app) | YES* | YES* | YES* | N/A | PARTIAL (self-manage) |
| btree_gist | N/A | VERIFICATION REQUIRED | VERIFICATION REQUIRED | VERIFICATION REQUIRED | N/A | YES if installed |
| Secrets | PARTIAL (env) | N/A | PARTIAL | Better with cloud SM | PARTIAL (env) | PARTIAL |
| Worker | PARTIAL alone | N/A | N/A | N/A | YES | YES |
| SMTP egress | YES typically | N/A | N/A | N/A | YES | YES |
| OTP egress | YES | N/A | N/A | N/A | YES | YES |
| Backup/PITR | N/A | VERIFICATION REQUIRED | VERIFICATION REQUIRED | YES typical | N/A | DIY |
| HTTPS staging | YES | N/A | N/A | N/A | OPTIONAL | DIY |
| India PG region | N/A | NO/unclear (notes) | YES (Mumbai notes) | YES (verify) | N/A | DIY |
| Cost | LOW–MED | LOW–MED | LOW–MED | MED–HIGH | LOW–MED | LOW–MED |
| Complexity | LOW | LOW | LOW | MED–HIGH | LOW–MED | MED |
| Prod path | YES | YES | YES | YES | YES | WEAKER |
| Lock-in | MED | LOW–MED | LOW–MED† | LOW–MED | LOW | LOW |

\*Expected on real PostgreSQL — verify after provision.  
†Database only; do not use Supabase Auth as RBAC SoT.

---

## 23. Recommended provider (composite)

### RECOMMENDED — STAGING COMPOSITE (HUMAN APPROVAL REQUIRED)

| Layer | Recommendation | Evidence type |
| --- | --- | --- |
| Application | **Vercel** staging/preview project (or equivalent Next.js PaaS if budget/policy prefers) | REPOSITORY EVIDENCE (Vercel-style compatibility) |
| PostgreSQL | **Primary recommendation:** Managed PostgreSQL 16+ with India option — **Supabase PostgreSQL (database only) in Mumbai** *or* RDS/Azure/Cloud SQL India if practice already prefers that cloud | REPOSITORY EVIDENCE (decision pack) + India preference |
| PostgreSQL alternative | **Neon** if staging residency waived after **LEGAL REVIEW** and ops simplicity prioritized | Decision pack + inference |
| Secrets | Map O-B-03 names into host env **and/or** cloud secret manager; never Git | O-B-03 ceremony |
| Worker | **Separate always-on or approved cron entrypoint host** (not Vercel-only; not `notifications:process` in production mode) | O15 / worker runbook |
| SMTP | Existing Nodemailer + **test mailbox** (vendor OPEN) | REPOSITORY VERIFIED |
| OTP | **Twilio SMS** staging/test credentials (adapter exists) | REPOSITORY VERIFIED |
| WhatsApp | Keep **disabled** (`TWILIO_WHATSAPP_ENABLED=false`) | REPOSITORY VERIFIED |
| Registration | **`PATIENT_REGISTRATION_ENABLED=false`** | O-B-00 / O-B-03 |

This is **RECOMMENDED**, not **APPROVED**, not **SELECTED** as binding, not **PROVISIONED**.

---

## 24. Alternative provider

**Alternative A — Neon + Vercel + worker PaaS:** fastest staging path; accept non-India PG pending LEGAL REVIEW for staging PII.

**Alternative B — Full Azure (App Service/Container Apps + Flexible Server India + Key Vault):** stronger single-cloud residency/IAM story; higher complexity/cost.

---

## 25. Rejected options

| Option | Why |
| --- | --- |
| SQLite / filesystem PMS DB | Forbidden for appointment/identity SoT |
| Supabase Auth as authorization source | Forbidden — architecture |
| Vercel alone for notification worker | O15 / runbook: insufficient for dispatcher loop |
| Self-managed VPS as default | Higher backup/PITR/ops burden (decision pack) |
| Enabling registration to “test staging” | Not authorized in O-B-03A |
| Assuming Production = staging choice | Production NOT AUTHORIZED; O1/O2 remain OPEN |

---

## 26. Open questions

1. Exact app host product (Vercel vs other Next PaaS)?  
2. Exact Postgres vendor for staging (Supabase Mumbai vs Neon vs RDS/Azure/GCP)?  
3. Worker host product?  
4. Secret manager product (Vercel env vs Key Vault / ASM)?  
5. Staging hostname?  
6. Staging data-location acceptance if PG outside India?  
7. Budget ceiling?  

---

## 27. Required approvals

| Decision | Owner status |
| --- | --- |
| Technical stack approval | **UNRESOLVED** |
| Security review of stack | **UNRESOLVED** |
| Legal/data-location (O18) | **UNRESOLVED** / LEGAL REVIEW REQUIRED |
| Budget | **UNRESOLVED** |
| Final provider approval | **UNRESOLVED** |

---

## 28. Provisioning prerequisites

Before any O-B-04 provisioning authorization:

- Human approval of composite (or alternate)  
- Written staging hostname  
- Confirm registration remains false  
- Confirm no Production credentials  
- Confirm Option C remains blocked  

---

## 29. Non-authorized actions

No account creation, billing activation, provisioning, DNS, secrets, SMTP/OTP config, deploy, Production access, registration enable, clinical work, Git commit/push in this task.

---

## 30. Final decision status

```text
PROVIDER RECOMMENDED — HUMAN APPROVAL REQUIRED
```

Composite recommendation above. Individual SKUs still **DECISION REQUIRED**.  
**NOT APPROVED. NOT PROVISIONED. PRODUCTION NOT AUTHORIZED.**

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Recommendation only |

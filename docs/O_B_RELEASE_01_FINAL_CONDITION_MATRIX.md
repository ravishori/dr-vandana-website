# O-B-RELEASE-01 Final Condition Matrix

**Date:** 2026-08-31  
**Decision:** **READY FOR CONTROLLED PRODUCTION DEPLOYMENT** (conditions remaining are non-blockers)

| # | CONDITION | STATUS | EVIDENCE | SEVERITY | RELEASE IMPACT | RECOMMENDED FOLLOW-UP |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Vercel Production DATABASE_URL target parity | **OPEN CONDITION** | Name PRESENT on `dr-vandana-website`; value unreadable; KV metadata host/db/`sslmode=require` verified | CONDITION | Operator attestation before registration enablement | Operator attest sync with KV |
| 2 | Mailbox receipt | **OPEN CONDITION** | O-B-P04D: NOT VERIFIED | CONDITION | Accept for deploy with registration false | Optional inbox check |
| 3 | Retry failure path | **OPEN CONDITION** | O-B-P04D: NOT VERIFIED | CONDITION | Accept | Non-destructive drill later |
| 4 | Restore drill | **OPEN CONDITION** | 7-day backup + PITR metadata; no restore executed | CONDITION | Accept | Schedule restore drill |
| 5 | Active `site.ts` / `legal.ts` (and related) still `trinetra.net` | **CLOSED** | Updated to `drvandana.trinetralab.net`; `src/` has zero `drvandana.trinetra.net` | — | Closed | Deploy this code in controlled deploy |
| 6 | MFA/SMTP on public Vercel | **OPEN CONDITION** | Absent on `dr-vandana-website` Production names; worker uses KV | CONDITION | Not required while registration false | Add only when web MFA/mail authorized |
| 7 | Azure services firewall special-case | **OPEN CONDITION** | `p04c-allow-azure-services-20260831` retained; no `/0` | CONDITION | Required for ACA connectivity | Keep; redesign networking later if desired |
| 8 | Uncommitted Option B artifacts | **OPEN CONDITION** | Large INTENDED dirty tree; JPEG UNRELATED | CONDITION | Review/commit before deploy | Controlled commit (not this task) |
| 9 | Synthetic P04D fixtures retained | **OPEN CONDITION** (intentional) | Audit evidence policy | CONDITION | Retain | No auto-delete |

**BLOCKERS:** NONE

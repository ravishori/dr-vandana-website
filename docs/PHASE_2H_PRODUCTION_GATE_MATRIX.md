# Phase 2H Production Gate Matrix

**Date:** 14 August 2026  
**Overall: PRODUCTION BLOCKED**

Owner is **HUMAN DECISION** unless a named operator is later assigned. This matrix does not invent business owners.

A gate is **not** PASS because code, documentation, a mock, a test provider, or an environment variable exists. External systems must be verified in the **target** environment.

| Gate | Status | Category | Evidence | Owner | Required Action |
|------|--------|----------|----------|-------|-----------------|
| PostgreSQL vendor | BLOCKED | HUMAN DECISION | O1 unset | HUMAN DECISION | Select vendor |
| PostgreSQL region | BLOCKED | HUMAN DECISION | O2 unset | HUMAN DECISION | Select region / residency |
| DATABASE_URL | NOT CONFIGURED | CONFIGURATION | Production URL must not live in Git | HUMAN DECISION | Host secret store |
| btree_gist | NOT CONFIGURED | INFRASTRUCTURE | Target DB unverified; CI PG job will check when `APPOINTMENT_PG_URL` is set | HUMAN DECISION | `npm run db:verify-production` on target |
| exclusion constraint | NOT CONFIGURED | INFRASTRUCTURE | `appointments_blocking_occupied_excl`; migrate CLI fails closed if missing | HUMAN DECISION | Verify after migrate |
| OTP | BLOCKED | PROVIDER | `OTP_VENDOR_ADAPTER_IMPLEMENTED=false` | HUMAN DECISION | Select vendor; implement adapter |
| SMTP | NOT CONFIGURED | CONFIGURATION | Production SMTP unverified | HUMAN DECISION | Configure + DNS auth |
| Twilio | BLOCKED | PROVIDER | `TWILIO_WHATSAPP_ENABLED=false` | HUMAN DECISION | Production account, not sandbox |
| WhatsApp sender | BLOCKED | PROVIDER | Unset | HUMAN DECISION | Approved sender |
| WhatsApp templates | BLOCKED | PROVIDER | Content SIDs empty in example env | HUMAN DECISION | Approve templates |
| WhatsApp opt-in | BLOCKED | LEGAL | Checkbox exists; wording unapproved | HUMAN DECISION | Legal review |
| MFA recovery | BLOCKED | HUMAN DECISION | O12; backup codes only; no email bypass | HUMAN DECISION | Select A–D |
| Privacy | BLOCKED | LEGAL | Informational-site language | HUMAN DECISION | Update before registration |
| Terms | BLOCKED | LEGAL | No account/appointment terms | HUMAN DECISION | Update before registration |
| Disclaimer | BLOCKED | LEGAL | Must stay consistent with accounts | HUMAN DECISION | Review |
| Consent | BLOCKED | LEGAL | Registration + WhatsApp copy | HUMAN DECISION | Review |
| Data residency | BLOCKED | HUMAN DECISION | O18 unset | HUMAN DECISION | Processor map |
| Retention | BLOCKED | HUMAN DECISION | O10 unset | HUMAN DECISION | Policy |
| Backups | BLOCKED | INFRASTRUCTURE | None in repo | HUMAN DECISION | Vendor backups + encryption |
| Restore | BLOCKED | INFRASTRUCTURE | NOT EXECUTED | HUMAN DECISION | Restore drill |
| Monitoring | BLOCKED | CONFIGURATION | Logs ≠ monitoring | HUMAN DECISION | Select provider + alerts |
| Worker | BLOCKED | HUMAN DECISION | O15; CLI refuses production | HUMAN DECISION | Hosting design |
| Secrets | BLOCKED | CONFIGURATION | Example file empty; production store unverified | HUMAN DECISION | Secret manager + rotation owners |
| CI | PASS | CODE | `verify` + `appointment-pg-concurrency` | — | Keep PG schema test in the PG job |
| Deployment | BLOCKED | CONFIGURATION | No production deploy from this milestone | HUMAN DECISION | Follow deployment runbook |
| Security review | BLOCKED | SECURITY REVIEW | 2G/2H are code audits | HUMAN DECISION | Review deployed env |
| PATIENT_REGISTRATION_ENABLED | PASS (code default false) | CODE | Only exact `"true"` enables; must stay false | HUMAN DECISION | Keep false until every gate is genuinely green |

`npm run production:gates` prints PASS / BLOCKED / NOT CONFIGURED / HUMAN DECISION / LEGAL REVIEW (and FAIL when the registration flag is true). It must not be treated as a production go-live certificate. Phase 2I updates status labels so human and legal rows are not disguised as infrastructure BLOCKED-only. Env var presence still never proves SMTP, OTP, Twilio, or backup delivery.

Authoritative remaining decisions: `docs/PHASE_2I_PRODUCTION_DECISION_REGISTER.md`.

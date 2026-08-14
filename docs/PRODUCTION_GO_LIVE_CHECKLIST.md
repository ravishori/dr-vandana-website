# Production Go-Live Checklist

**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Date:** 14 August 2026  
**Overall: PRODUCTION BLOCKED**

This checklist is **unsigned**. Do not invent sign-offs, dates, or owners beyond **HUMAN DECISION** / **LEGAL REVIEW**. Completing this file in Git is not a launch.

`PATIENT_REGISTRATION_ENABLED` stays **false** until section W.

Every row uses:

| Field | Meaning |
|---|---|
| STATUS | PASS / BLOCKED / NOT CONFIGURED / HUMAN DECISION / LEGAL REVIEW / OPEN / DEFERRED |
| EVIDENCE | Where an operator would look — never secrets |
| OWNER | HUMAN DECISION until named |
| DATE | Empty until performed |
| SIGN-OFF | Empty until a human signs |

---

## A. Code

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Phase 2 identity + appointments + notifications implemented | PASS (code) | Source; tests | HUMAN DECISION | | |
| Clinical records absent | PASS (code) | No clinical tables | HUMAN DECISION | | |
| Registration flag default false | PASS | `.env.example`; `production:gates` | HUMAN DECISION | | |
| No production deploy from this branch merge | BLOCKED | Do not merge main from this phase | HUMAN DECISION | | |

## B. Database

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Vendor selected (O1) | HUMAN DECISION | `docs/DECISION_POSTGRESQL.md` | HUMAN DECISION | | |
| Region selected (O2) | HUMAN DECISION | Same | HUMAN DECISION | | |
| PostgreSQL 16+ provisioned | NOT CONFIGURED | Vendor console (no creds) | HUMAN DECISION | | |
| Migrations applied | NOT EXECUTED | `db:migrate` | HUMAN DECISION | | |
| `btree_gist` | NOT CONFIGURED | `db:verify-production` | HUMAN DECISION | | |
| Exclusion constraint | NOT CONFIGURED | Same | HUMAN DECISION | | |
| Indexes / triggers | NOT CONFIGURED | Same | HUMAN DECISION | | |

## C. Authentication

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| `AUTH_SESSION_SECRET` in secret manager | NOT CONFIGURED | Secret **name** | HUMAN DECISION | | |
| Server-side sessions | PASS (code) | `sessions` table | HUMAN DECISION | | |
| Production provision CLI refused | PASS (code) | `db:provision` | HUMAN DECISION | | |
| First privileged users (O19) | HUMAN DECISION | Written ceremony | HUMAN DECISION | | |

## D. MFA

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| TOTP mandatory for psychologist / Super Admin | PASS (code) | MFA tests | HUMAN DECISION | | |
| `MFA_ENCRYPTION_KEY` stored | NOT CONFIGURED | Secret name | HUMAN DECISION | | |
| Backup codes only; no email bypass | PASS (code) | `docs/DECISION_MFA_RECOVERY.md` | HUMAN DECISION | | |
| Recovery policy A–D (O12) | HUMAN DECISION | Signed choice | HUMAN DECISION | | |

## E. Appointments

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Booking + exclusion constraint | PASS (code) / NOT CONFIGURED (prod DB) | Tests; schema verify | HUMAN DECISION | | |
| Hours / duration values | HUMAN DECISION | O7/O8 | HUMAN DECISION | | |
| Cancellation / reschedule policy values | HUMAN DECISION | O9 | HUMAN DECISION | | |
| Super Admin cannot operate appointments | PASS (code) | Lifecycle tests | HUMAN DECISION | | |

## F. Notifications

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Outbox + dispatcher | PASS (code) | Tests | HUMAN DECISION | | |
| Worker hosting (O15) | HUMAN DECISION | `docs/NOTIFICATION_WORKER_RUNBOOK.md` | HUMAN DECISION | | |
| Production CLI guard | PASS (code) | `notifications:process` refuses production | HUMAN DECISION | | |

## G. OTP

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Vendor (O4) | HUMAN DECISION | `docs/DECISION_OTP_PROVIDER.md` | HUMAN DECISION | | |
| Adapter implemented | BLOCKED | `OTP_VENDOR_ADAPTER_IMPLEMENTED=false` | HUMAN DECISION | | |
| DLT / sender | HUMAN DECISION | Vendor | HUMAN DECISION | | |
| Production fail-closed | PASS (code) | OTP tests | HUMAN DECISION | | |

## H. Email

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| SMTP vendor | HUMAN DECISION | `docs/DECISION_SMTP_PROVIDER.md` | HUMAN DECISION | | |
| SMTP configured | NOT CONFIGURED | Secret names | HUMAN DECISION | | |
| SPF/DKIM/DMARC | HUMAN DECISION | DNS — do not change from this phase | HUMAN DECISION | | |

## I. WhatsApp

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Twilio direction | PASS (architecture) | Adapter exists; activation OPEN | HUMAN DECISION | | |
| Production enabled | BLOCKED | `TWILIO_WHATSAPP_ENABLED=false` | HUMAN DECISION | | |
| Sender / templates / SIDs | NOT CONFIGURED | Twilio checklist | HUMAN DECISION | | |
| Opt-in wording | LEGAL REVIEW | `docs/LEGAL_REVIEW_REQUIRED.md` | LEGAL REVIEW | | |

## J. Backups

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Automated encrypted backups | HUMAN DECISION / BLOCKED | Vendor | HUMAN DECISION | | |
| PITR | HUMAN DECISION | Vendor SKU | HUMAN DECISION | | |
| RPO / RTO values | HUMAN DECISION | `docs/DECISION_BACKUP_RPO_RTO.md` | HUMAN DECISION | | |
| Restore drill | NOT EXECUTED | Drill log | HUMAN DECISION | | |

## K. Monitoring

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Provider selected | HUMAN DECISION | `docs/PRODUCTION_MONITORING_CHECKLIST.md` | HUMAN DECISION | | |
| Alerts for 5xx, worker DEAD, DB | NOT CONFIGURED | Alert rules | HUMAN DECISION | | |

## L. Worker

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Always-on or approved cron entrypoint | HUMAN DECISION | O15 | HUMAN DECISION | | |
| Staging worker proven | NOT EXECUTED | Staging logs | HUMAN DECISION | | |

## M. Security

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Code audits 1B/2G/2H | PASS (code audits) | Audit docs | HUMAN DECISION | | |
| Deployed-environment review | BLOCKED | Not performed | HUMAN DECISION | | |
| IDOR/RBAC/MFA tests | PASS (automated) | `npm test` | HUMAN DECISION | | |
| Patient 403 vs 404 (O17) | HUMAN DECISION | Decision register | HUMAN DECISION | | |

## N. Privacy

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Processor list | LEGAL REVIEW | `docs/DECISION_DATA_RESIDENCY.md` | LEGAL REVIEW | | |
| WhatsApp consent | LEGAL REVIEW | Legal review doc | LEGAL REVIEW | | |

## O. Legal

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Privacy Policy | LEGAL REVIEW | `src/data/legal.ts` | LEGAL REVIEW | | |
| Terms | LEGAL REVIEW | Same | LEGAL REVIEW | | |
| Disclaimer | LEGAL REVIEW | Same | LEGAL REVIEW | | |
| Registration checkbox meaning | LEGAL REVIEW | `/patient/register` | LEGAL REVIEW | | |

## P. Data Residency

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| O18 processor map approved | HUMAN DECISION + LEGAL REVIEW | `docs/DECISION_DATA_RESIDENCY.md` | LEGAL REVIEW | | |

## Q. Retention

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| O10 periods set | LEGAL REVIEW | `docs/DECISION_DATA_RETENTION.md` | LEGAL REVIEW | | |
| Deletion workflow | NOT IMPLEMENTED | — | HUMAN DECISION | | |

## R. Secrets

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Host secret manager | NOT CONFIGURED | Names in `.env.example` | HUMAN DECISION | | |
| No secrets in Git | PASS (repo scan this phase) | Secret scan | HUMAN DECISION | | |
| Rotation owners | HUMAN DECISION | Environment checklist | HUMAN DECISION | | |

## S. CI/CD

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| GitHub Actions verify + PG job | PASS (code) | `.github/workflows/ci.yml` | HUMAN DECISION | | |
| Production deploy pipeline | NOT a go-live from this phase | Do not merge main | HUMAN DECISION | | |

## T. Deployment

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Follow `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` | NOT EXECUTED | Runbook | HUMAN DECISION | | |
| DNS unchanged from this phase | PASS (not modified) | — | HUMAN DECISION | | |

## U. Smoke Tests

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Staging smoke | NOT EXECUTED | Staging runbook | HUMAN DECISION | | |
| Production smoke with registration still false | NOT EXECUTED | Public site + fail-closed identity | HUMAN DECISION | | |

## V. Rollback

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| Rollback runbook reviewed | OPEN | `docs/PRODUCTION_ROLLBACK_RUNBOOK.md` | HUMAN DECISION | | |
| Registration disable understood | PASS (code) | Flag ≠ `true` | HUMAN DECISION | | |
| Destructive down migrations not used as first resort | PASS (docs) | Prefer restore | HUMAN DECISION | | |

## W. Registration Activation

| Item | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|
| All prior sections genuinely green | BLOCKED | This checklist | HUMAN DECISION | | |
| Final human approval | HUMAN DECISION | Written | HUMAN DECISION | | |
| `PATIENT_REGISTRATION_ENABLED=true` | FORBIDDEN until then | Host secret store only | HUMAN DECISION | | |

---

## Final registration activation sequence

Never automate the last step.

1. Infrastructure approved  
2. Database created  
3. Database migrated  
4. Schema verified  
5. `btree_gist` verified  
6. Exclusion constraint verified  
7. Backups configured  
8. Restore tested  
9. SMTP configured  
10. OTP configured (vendor + adapter)  
11. Twilio configured **if** WhatsApp will be enabled  
12. Notification worker deployed  
13. Monitoring enabled  
14. Secrets verified  
15. Legal documents approved  
16. Privacy/consent approved  
17. MFA recovery approved  
18. Security review completed (deployed environment)  
19. Staging tests completed  
20. Production smoke test completed (registration still false)  
21. Final human approval  
22. **ONLY THEN:** `PATIENT_REGISTRATION_ENABLED=true`  

There is no other activation switch.

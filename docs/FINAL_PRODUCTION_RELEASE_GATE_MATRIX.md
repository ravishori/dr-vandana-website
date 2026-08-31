# Final Production Release Gate — Matrix

**Date:** 2026-08-31  
**Decision:** **GO WITH CONDITIONS**  
**Secret values:** never recorded

| CATEGORY | RESULT | SEVERITY | EVIDENCE | RELEASE IMPACT |
| --- | --- | --- | --- | --- |
| Domain | PASS | PASS | HTTP 200 `drvandana.trinetralab.net` | None |
| DNS | PASS | PASS | CNAME → Vercel DNS | None |
| HTTPS | PASS | PASS | TLS via Vercel | None |
| HSTS | PASS | PASS | `max-age=63072000; includeSubDomains; preload` | None |
| Vercel project alignment | PASS | PASS | `dr-vandana-website` → lab URL; psychology → trinetra.net | None |
| Vercel env names | PASS WITH CONDITIONS | CONDITION | DATABASE_URL/AUTH/APP_BASE present; MFA/SMTP missing on public project | Accept while registration false |
| Vercel DATABASE_URL target parity | NOT VERIFIED | CONDITION | Secret unreadable; KV target verified | Operator attestation recommended |
| Database | PASS | PASS | Ready, PG 17.10 | None |
| Database target | PASS | PASS | KV metadata host/db | None |
| Database TLS | PASS | PASS | sslmode=require + TLSv1.3 session | None |
| Schema | PASS | PASS | 27/27 tables | None |
| BTREE_GIST | PASS | PASS | Extension installed | None |
| Exclusion constraint | PASS | PASS | `appointments_blocking_occupied_excl` | None |
| Backup | PASS | PASS | 7-day retention | None |
| PITR | PASS | PASS | earliestRestore metadata present | None |
| Restore drill | NOT VERIFIED | CONDITION | No restore executed | Accept or schedule drill |
| Firewall | PASS WITH CONDITIONS | CONDITION | CAE IP + Azure services `0.0.0.0`–`0.0.0.0`; no `/0` | Documented Consumption pattern |
| Key Vault | PASS | PASS | RBAC, soft-delete, purge protection | None |
| Secrets inventory | PASS | PASS | 9 Production secrets enabled | None |
| Authentication | PASS | PASS | AUTH_SESSION_SECRET present KV + Vercel name | None |
| MFA | PASS WITH CONDITIONS | CONDITION | KV 32-byte hex; Vercel MFA key missing | Block MFA enroll until configured |
| SMTP config (KV/worker) | PASS | PASS | All smtp-* secrets present | None |
| SMTP E2E | PASS | PASS | O-B-P04D claimed=2 sent=2 | None |
| Mailbox receipt | NOT VERIFIED | CONDITION | P04D | Operator optional check |
| Retry | NOT VERIFIED | CONDITION | P04D non-destructive | Accept |
| Worker | PASS | PASS | Job Succeeded; recent executions OK | None |
| ACA Job schedule | PASS | PASS | `*/5`, parallelism 1 | None |
| Worker image | PASS | PASS | `production-7974175` | None |
| Worker MI / KV / AcrPull | PASS | PASS | Role assignments verified | None |
| Worker monitoring | PASS | PASS | LAW + execution history | None |
| Application tests | PASS | PASS | 378/378 | None |
| Typecheck | PASS | PASS | tsc --noEmit | None |
| Lint | PASS | PASS | 2 pre-existing warnings | None |
| Build | PASS | PASS | next build via wrapper | None |
| Public website | PASS | PASS | Critical routes 200 | None |
| Privacy | PASS | PASS | `/privacy-policy` content present | None |
| SEO | PASS WITH CONDITIONS | CONDITION | Live robots/sitemap lab OK; `site.ts` still trinetra.net | Content alignment task |
| Registration | FALSE | PASS | Default + worker env | Must stay false |
| WhatsApp | FALSE | PASS | Default + worker env | Must stay false |
| Staging isolation | PASS | PASS | Not modified | None |
| Secret leakage | NONE DETECTED | PASS | Scan + gitignore | None |
| Rollback | DOCUMENTED | PASS | P04C/P04D + this report | None |
| Git hygiene | CONDITIONS | CONDITION | Large uncommitted Option B tree | Commit before deploy |
| Patient Dashboard | OUT OF SCOPE | PASS | Not this release | None |
| Deployment | NOT TRIGGERED | PASS | Audit only | Separate task |

**BLOCKERS:** none  
**HIGH unresolved security issues:** none (Vercel DB parity remains CONDITION, not blocker while registration false and worker KV path proven)

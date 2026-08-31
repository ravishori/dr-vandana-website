# Option B — Production Release Readiness Master Report

**Document type:** Master controlled release assessment (preparation — not deployment)  
**Date:** 2026-08-31  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`  
**Companion checklist:** `docs/OPTION_B_PRODUCTION_RELEASE_CHECKLIST.md`

```text
RELEASE DECISION = NOT READY
GATE A (O15-S) = PASS WITH CONDITIONS (reuse evidence)
GATE B (Production infra) = NOT READY
GATE C (O10/O11/O18) = OPEN — registration launch BLOCKED
GATES D–F = NOT STARTED (blocked by A–C gaps)
PATIENT REGISTRATION = IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP = DISABLED
OPTION C = BLOCKED
PRODUCTION MUTATIONS THIS TASK = NONE
GIT COMMIT = NONE
GITHUB PUSH = NONE
```

**Secret values are never recorded. Use `[PRESENT — VALUE REDACTED]` where presence is known.**

---

## 1. Executive Summary

Option B staging capability is substantially proven (registration gate, staging DB/KV/SMTP, appointment→outbox→ACA Job→SMTP E2E, idempotency). **Production is not ready** for a controlled Option B release: there is **no Production Key Vault**, Production PostgreSQL lacks the `BTREE_GIST` extension allowlist required for the appointment engine, Production Vercel (`drvandana-psychology`) lacks core Option B secrets (`DATABASE_URL`, `AUTH_SESSION_SECRET`, registration/WhatsApp flags, OTP/MFA), **no Production worker** exists, and **O10 / O11 / O18** remain open (blocking patient-account enablement).

This task **did not** enable registration, WhatsApp, Option C, or mutate Production. Staging worker evidence from O15-S was **reused**, not repeated.

**Recommendation:** Close P0 Production infrastructure blockers, then run a Production Release Candidate (Gate D) with registration still `false`. Patient registration enablement remains a **separate final authorization**.

---

## 2. Current Project State

| Area | State |
| --- | --- |
| Public domain (authoritative) | `https://drvandana.trinetra.net` (repo + Vercel Production project linkage) |
| Staging lab domain | `https://drvandana.trinetralab.net` (`dr-vandana-website` Preview) |
| Staging DB | `pg-dr-vandana-staging` / `dr_vandana_db_staging` |
| Staging KV | `kv-dr-vandana-staging` |
| Staging worker | ACA Job `caj-drv-notif-stg` (Central India) |
| Production DB resource | `pg-dr-vandana-prod` exists (India South Central) |
| Production KV | **ABSENT** (only staging vault listed in subscription) |
| Production worker | **NOT PROVISIONED** |
| Registration | Code complete; flag must stay `false` |
| Option C | Deferred / blocked |

---

## 3. Completed Evidence (reused — not re-executed)

| Evidence | Result | Source |
| --- | --- | --- |
| Registration capability | Implemented; fail-closed when flag false | O-B-00 |
| Privacy/retention posture docs | Clarified; legal still required | O-B-01 |
| External dependency map | Blockers inventoried | O-B-02 |
| Staging Azure PG provisioned | Verified | O-B-03 / O-B-04 |
| Provider decision (Azure PG) | Owner-selected; APPROVED WITH CONDITIONS | O-B-03A-H |
| Staging SMTP AUTH + synthetic send | PASS | O-B-05D-R2 |
| Staging appointment→outbox→CLI worker→SMTP | PASS WITH CONDITIONS | O-B-05E-R |
| Worker hosting architecture | ACA Jobs batch-and-exit | O15 / O15-P |
| Staging hosted worker provision + E2E | **PASS WITH CONDITIONS** | **O15-S** |

---

## 4. O15 Status (Gate A)

| Item | Result |
| --- | --- |
| O15 architecture | RESOLVED WITH CONDITIONS — ACA Jobs |
| O15-P plan | READY WITH CONDITIONS |
| O15-S provisioning | **PASS WITH CONDITIONS** (2026-08-30) |
| Job | `caj-drv-notif-stg` — schedule `*/5 * * * *`, parallelism 1 |
| Entrypoint | `npm run notifications:process` |
| Synthetic E2E on ACA | `APT-5N7XVZYN` → EMAIL SENT (patient + psychologist) |
| Idempotency | Second run `claimed=0` |
| Conditions retained | Central India CAE (not ISC); BOM on staging DB URL; Azure-services PG firewall special-case; mailbox receipt NOT VERIFIED |

**Gate A: CLOSED ENOUGH** for staging worker hosting (with documented conditions). Production worker remains Gate B/D.

---

## 5. Production Database

| Check | Result |
| --- | --- |
| Resource | `pg-dr-vandana-prod` in `rg-dr-vandana-prod` |
| Region | India South Central |
| Version | PostgreSQL **17** |
| State | Ready |
| SKU | Standard_B1ms (Burstable) — **unsuitable as unverified Production posture** (O-B-03A-H) |
| Tags | `Environment=Development` on RG **and** server — **mismatch** vs prod naming |
| Public network | Enabled |
| TLS | `require_secure_transport=on` |
| `azure.extensions` | **Empty** (staging has `BTREE_GIST`) — **P0** for appointment exclusion |
| Schema / migrations | **NOT VERIFIED** this task (no Prod DB credential path via KV; no destructive migrate) |
| Exclusion / indexes | **NOT VERIFIED** on Production |
| Data copy from staging | **NOT PERFORMED** (forbidden) |

**PRODUCTION DATABASE: PRESENT — NOT READY** (extensions + schema + sizing/tags).

---

## 6. Production Key Vault

| Check | Result |
| --- | --- |
| Expected | Separate Production vault |
| Live inventory | Only `kv-dr-vandana-staging` found |
| Production KV | **ABSENT** |

**Required dependency:** Create and govern a Production Key Vault (separate secrets from staging). Do not share staging DB/session/SMTP/OTP secrets with Production.

**PRODUCTION KEY VAULT: ABSENT — P0**

---

## 7. Production Vercel

| Check | Result |
| --- | --- |
| Project | `drvandana-psychology` (`.vercel/project.json` linked) |
| Staging project (separate) | `dr-vandana-website` Preview |
| Production env names present | SMTP_* / SMTP_USER / APPOINTMENT_* / ERROR_* / UPSTASH_* only |
| `DATABASE_URL` | **ABSENT** on Production env list |
| `AUTH_SESSION_SECRET` | **ABSENT** |
| `MFA_ENCRYPTION_KEY` | **ABSENT** |
| `APP_BASE_URL` | **ABSENT** (must be set to Production URL when wiring) |
| `PATIENT_REGISTRATION_ENABLED` | **ABSENT** as named Production var — must be explicitly `false` before Option B wiring |
| `TWILIO_WHATSAPP_ENABLED` | **ABSENT** — must be explicitly `false` |
| OTP / Twilio Production secrets | **ABSENT** |
| Points at staging PG? | **NOT VERIFIED** (no Production `DATABASE_URL` name present) |
| Values | Never pulled / never printed |

**PRODUCTION VERCEL: PARTIAL (legacy enquiry SMTP/Upstash) — Option B PMS secrets NOT READY**

---

## 8. Production SMTP

| Check | Result |
| --- | --- |
| Code path | Nodemailer / EmailService — repository READY |
| Staging evidence | Must **not** be treated as Production verification |
| Production Vercel SMTP names | Present (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, from fields) |
| Production AUTH / synthetic send | **NOT VERIFIED** |
| Dedicated Production mailbox / synthetic recipient | **REQUIRED** before any Production notification smoke |
| Real patient email | **FORBIDDEN** in prep/smoke |

**PRODUCTION SMTP: CONFIG NAMES PRESENT — VERIFICATION NOT RUN**

---

## 9. Production OTP

| Check | Result |
| --- | --- |
| Code | Twilio SMS OTP provider + rate limits — repository READY |
| Production Vercel OTP secrets | **ABSENT** |
| Staging/test Twilio | Must not be promoted blindly |
| Production OTP | **NOT CONFIGURED / NOT VERIFIED** |

**PRODUCTION OTP: NOT READY**

---

## 10. Production Worker

| Check | Result |
| --- | --- |
| Architecture | Azure Container Apps Jobs (batch-and-exit) — decided |
| Staging Job | `caj-drv-notif-stg` only |
| Production Job / MI / ACR / CAE | **NOT PROVISIONED** |
| Separation | Must use separate identity, KV, secrets, DB, config |

**PRODUCTION WORKER: NOT PROVISIONED**

CLI `notifications:process` refuses `NODE_ENV=production` — Production hosting needs an approved Production entrypoint strategy (separate from this prep task’s mutations).

---

## 11. Backups

| Check | Result |
| --- | --- |
| Azure backup retention | **7 days** on `pg-dr-vandana-prod` |
| Geo-redundant backup | Disabled |
| Earliest restore date | Present (PITR capability indicated by platform) |
| RPO / RTO policy | **UNSET** (`DECISION_BACKUP_RPO_RTO.md`) |
| Restore drill | **RESTORE DRILL NOT VERIFIED** |
| Destructive restore | Not performed |

**BACKUPS: PLATFORM CAPABILITY PRESENT — POLICY/DRILL NOT READY**

---

## 12. DNS

| Check | Result |
| --- | --- |
| `drvandana.trinetra.net` A/AAAA | Resolves (e.g. `76.223.54.146`, `13.248.169.48`) |
| Apex `trinetra.net` TXT SPF | `v=spf1 -all` (observed) |
| `_dmarc.trinetra.net` | Observed TXT is **not** a standard `v=DMARC1` record in this probe — treat DMARC as **NOT VERIFIED / operator action** |
| DKIM for Production SMTP sender | **NOT VERIFIED** (do not invent DNS values) |

**DNS: DOMAIN RESOLVES — EMAIL AUTH (SPF/DKIM/DMARC for transactional mail) REQUIRES OPERATOR/LEGAL REVIEW**

---

## 13. HTTPS

| Check | Result |
| --- | --- |
| Authoritative URL | `https://drvandana.trinetra.net` |
| Live TLS handshake from this operator network | **NOT VERIFIED** (`curl` HTTP_CODE=000) |
| Expected hosting | Vercel custom domain + certificate |
| Cookie `secure` | Code sets `secure` when `NODE_ENV=production` |

**HTTPS: EXPECTED — LIVE PROBE NOT VERIFIED FROM THIS NETWORK**

---

## 14. Security

| Control | Repository | Production live |
| --- | --- | --- |
| Security headers (HSTS, CSP, XFO, nosniff, Referrer-Policy) | `next.config.ts` | Deployed header verification **NOT VERIFIED** this session |
| HttpOnly / SameSite=Lax practice cookies | Implemented | Live **NOT VERIFIED** |
| CSRF patterns | Server actions + session model | Repo evidence |
| Secrets in Git / image | Worker Dockerfile excludes `.env` | OK for staging image pattern |
| Prod/staging separation | Separate PG servers verified | KV/worker/Vercel PMS wiring incomplete |

**SECURITY: REPOSITORY STRONG — PRODUCTION DEPLOYED VERIFICATION INCOMPLETE**

---

## 15. Authentication

| Item | Result |
| --- | --- |
| Login / password hashing | Repository verified (prior gates/tests) |
| Session handling / expiry | Implemented |
| Rate limiting | Code + Upstash names on Production |
| Production account wiring | Blocked until DB + session secret present |

**AUTHENTICATION: CODE READY — PRODUCTION WIRING NOT READY**

---

## 16. MFA

| Item | Result |
| --- | --- |
| MFA + recovery code paths | Implemented in repository |
| `MFA_ENCRYPTION_KEY` on Production Vercel | **ABSENT** |
| O12 recovery policy | Still open in prior audit posture |

**MFA: CODE READY — PRODUCTION KEY NOT PRESENT**

---

## 17. Appointment Security

| Item | Result |
| --- | --- |
| Ownership / psychologist authorization | Repository + staging E2E evidence |
| Isolation / audit | Repository verified previously |
| Clinical records | Not introduced |
| Production appointment path | Requires Prod DB schema + app secrets + worker |

**APPOINTMENTS: CODE/STAGING READY — PRODUCTION NOT WIRED**

---

## 18. Notifications

| Item | Result |
| --- | --- |
| Templates / privacy-safe payloads | Repository |
| Staging E2E | PASS (O-B-05E-R + O15-S) |
| Production | SMTP names only; end-to-end **NOT VERIFIED** |

**NOTIFICATIONS: STAGING VERIFIED — PRODUCTION NOT VERIFIED**

---

## 19. Outbox

| Item | Result |
| --- | --- |
| Transactional outbox + SKIP LOCKED | Repository + staging verified |
| Production outbox processing | Needs Production worker + DB |

**OUTBOX: STAGING VERIFIED — PRODUCTION NOT READY**

---

## 20. Monitoring (minimum Production definition)

Required minimum (not a SIEM project):

1. Application errors (Vercel / error-mailer if enabled)  
2. Authentication / MFA failure signals  
3. Appointment mutation failures  
4. Notification / SMTP failures  
5. Worker Job success/failure + exit  
6. Database connectivity failures  
7. Outbox backlog / DEAD depth  
8. Abnormal traffic / rate-limit breaches  

**Current:** Staging LAW for ACA Job exists; Production monitoring wiring **NOT CONFIGURED** as an Option B release package.

**MONITORING: DEFINED — NOT IMPLEMENTED FOR PRODUCTION**

---

## 21. Rollback

Documented plan (execute only under release authorization):

1. **Vercel:** Instant rollback to prior Production deployment  
2. **Worker:** Disable schedule / stop Job; revert image tag; preserve outbox  
3. **Database:** No automated down-migrations — restore-oriented recovery from Azure backups/PITR after practice-owner approval  
4. **Configuration:** Revert Vercel/KV secret references; keep registration `false`  
5. **DNS:** Avoid speculative DNS changes; reverse only if a controlled DNS change was made  
6. **Registration:** Ensure `PATIENT_REGISTRATION_ENABLED=false`  
7. **Audit / outbox:** Do not truncate audit or outbox during rollback  

**ROLLBACK: DOCUMENTED**

---

## 22. O10 (Retention)

**Status: OPEN** — periods UNSET; deletion not implemented; LEGAL REVIEW REQUIRED.  
**Impact:** Patient-account / registration enablement **BLOCKED**.

---

## 23. O11 (Privacy)

**Status: OPEN** — LEGAL / PROFESSIONAL REVIEW REQUIRED. Public legal copy still informational; account disclosures not counsel-approved.  
**Impact:** Registration enablement **BLOCKED**. Site may operate with registration disabled subject to counsel.

---

## 24. O18 (Residency)

**Status: OPEN** — HUMAN DECISION + LEGAL REVIEW REQUIRED.  
Azure India South Central ≠ automatic legal residency compliance.

---

## 25. Registration

**IMPLEMENTED BUT SAFELY DISABLED.**  
Do not set `PATIENT_REGISTRATION_ENABLED=true` until separate explicit authorization after O10/O11 and Production RC.

---

## 26. WhatsApp

**DISABLED.** Keep `TWILIO_WHATSAPP_ENABLED=false`.

---

## 27. Option C

**BLOCKED.** No clinical notes, assessments, clinical AI, clinical messaging, safety detector, break-glass, or clinical vault in this release path.

---

## 28. Release Blockers

### P0 — Release stopping (Option B Production capabilities)

| ID | Issue | Evidence | Owner | Action | Dependency | Impact |
| --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Production Key Vault absent | Azure KV list | Cloud / Ops | Create Prod KV; RBAC; secret ceremony | Subscription | Cannot govern Prod secrets |
| P0-02 | `azure.extensions` empty on Prod PG | Azure parameter | DBA / Ops | Allowlist `BTREE_GIST` (staging pattern) | Prod PG | Appointment exclusion cannot migrate/verify |
| P0-03 | Prod schema / migrations unverified | No KV/credential path; verify script unused | DBA | Read-only `db:verify-production` after secrets | P0-01/02 | Unknown Prod schema |
| P0-04 | Vercel Production missing Option B secrets | `vercel env ls production` | App / Ops | Add DB/session/MFA/flags/APP_BASE_URL from Prod KV | P0-01 | Portal cannot run |
| P0-05 | Production worker not provisioned | Only staging Job listed | Cloud | Separate ACA Job stack after secrets/DB | P0-01–04 | Notifications will not drain |
| P0-06 | Prod SMTP/OTP not Production-verified | Names ≠ verification | Ops | Synthetic/admin-only Production smoke | P0-04 | Auth/notify risk |

### P1 — Must close before patient-account launch

| ID | Issue | Evidence | Owner | Action |
| --- | --- | --- | --- | --- |
| P1-01 | O11 privacy/terms for accounts | LEGAL_REVIEW_REQUIRED / O-B-01 | Legal + Practice Owner | Counsel-approved copy |
| P1-02 | O10 retention/deletion | DECISION_DATA_RETENTION | Legal + Practice Owner | Set periods + deletion approach |
| P1-03 | O18 residency/processors | DECISION_DATA_RESIDENCY | Legal + Practice Owner | Decide + document |
| P1-04 | RPO/RTO + restore drill | DECISION_BACKUP_RPO_RTO; Azure 7d backup | Ops + Owner | Set objectives; non-Prod restore drill |
| P1-05 | Prod tag `Environment=Development` | Azure tags | Ops | Correct tags after confirmation |
| P1-06 | Burstable B1ms Production posture | O-B-03A-H | Cloud | Capacity decision |
| P1-07 | Email DNS SPF/DKIM/DMARC for sender | DNS probe | Ops + Email admin | Configure for chosen SMTP identity |
| P1-08 | MFA encryption key + O12 recovery | Vercel absences / audit | Security + Owner | Provision + policy |
| P1-09 | Production OTP credentials | Vercel absences | Ops | Separate Twilio Production config |

### P2 — Can safely defer

| ID | Issue | Notes |
| --- | --- | --- |
| P2-01 | WhatsApp channel | Ship with email; keep disabled |
| P2-02 | Geo-redundant PG backup | After RPO decision |
| P2-03 | HA mode | After capacity decision |
| P2-04 | O15-S Central India regional compromise | Staging-only; Prod region decision at Prod worker provision |
| P2-05 | Staging DB URL UTF-8 BOM in KV | Fix in staging secret hygiene |
| P2-06 | Full SIEM | Out of scope |

---

## 29. Release Candidate Checklist

See `docs/OPTION_B_PRODUCTION_RELEASE_CHECKLIST.md` (Gate D items). **Not green** until P0 closed.

---

## 30. Security Review

| Severity | Finding |
| --- | --- |
| CRITICAL | No Production KV; Prod Vercel lacks PMS secrets while SMTP secrets exist — incomplete/unsafe Option B wiring risk if partially enabled |
| HIGH | Prod PG missing `BTREE_GIST` allowlist |
| HIGH | No Production worker while appointments would enqueue outbox if DB wired |
| MEDIUM | `Environment=Development` tags on prod-named resources |
| MEDIUM | Public PG + narrow firewall (good vs 0.0.0.0/0) but Vercel/ACA egress path undefined for Prod |
| MEDIUM | Staging/Production secret separation incomplete (Prod KV absent) |
| LOW | Live HTTPS header probe failed from operator network |
| INFORMATIONAL | SPF `-all` on apex may conflict with future custom-domain mail — operator review |

No secrets printed. No real patient data used. Production not mutated.

**SECURITY REVIEW: PASS WITH CONDITIONS** (assessment integrity); **release security posture: NOT READY**

---

## 31. Independent Review

| Check | Result |
| --- | --- |
| Staging work not unnecessarily repeated | PASS (O15-S reused) |
| Production isolation preserved | PASS (no Prod mutations; staging Job only) |
| No secret exposure in docs | PASS |
| No real patient data | PASS |
| No Option C | PASS |
| Registration remains disabled | PASS |
| WhatsApp remains disabled | PASS |
| O10/O11/O18 preserved OPEN | PASS |
| Backups marked honestly | PASS (capability vs drill) |
| Rollback documented | PASS |
| Worker architecture preserved | PASS |
| Blockers clearly identified | PASS |

**INDEPENDENT REVIEW: PASS** (for this preparation assessment)

---

## 32. Production Deployment Plan (future — not authorized now)

**Phase 1 — Website / Option B dark launch (registration=false)**  
1. Close P0-01…P0-05 as needed for intended surface  
2. Set Production flags explicitly `false`  
3. Deploy Vercel Production build  
4. Do **not** enable public registration  

**Phase 2 — Controlled Production smoke**  
Synthetic/admin identities only; designated synthetic mailbox; no real patients.

**Phase 3 — Security review of live Production**  
Headers, cookies, DB target markers (no secret print), worker logs, outbox.

**Phase 4 — Practice-owner approval**  

**Phase 5 — Registration enablement**  
Separate explicit authorization after O10/O11/O18 and RC.

---

## 33. Registration Enablement Plan

Separate from deployment:

1. O11 counsel-approved legal copy live  
2. O10 retention/deletion approach decided  
3. O18 residency/processors decided  
4. Production RC green with registration still false  
5. Practice-owner written approval  
6. Only then consider `PATIENT_REGISTRATION_ENABLED=true`  

---

## 34. Remaining Conditions

- Staging O15-S conditions remain for staging ops  
- Production CLI worker entrypoint vs Production `NODE_ENV` gate needs explicit Prod hosting design at provision time  
- Do not treat Azure India region as O18 closure  

---

## 35. Final Readiness Decision

**NOT READY**

Rationale: Gate B Production infrastructure and Gate C legal/governance are open. Staging success does not authorize Production Option B release.

---

## 36. Next Task

**CLOSE REMAINING P0 / P1 RELEASE BLOCKERS** (start with Production Key Vault + `BTREE_GIST` allowlist + Vercel Production secret matrix with registration=false).  

Do **not** automatically start: patient dashboard, registration enablement, or Production worker deploy without explicit authorization.

---

## Git Status (end of task)

| Item | Value |
| --- | --- |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` |
| Commit | NONE |
| Push | NONE |
| Production changes | NONE |
| Docs added | This report + checklist |

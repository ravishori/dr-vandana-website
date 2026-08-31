# O-B-02 PRODUCTION INFRASTRUCTURE & EXTERNAL DEPENDENCY READINESS

**Document type:** Infrastructure / external-dependency readiness audit (+ low-risk docs remediation)  
**Date:** 2026-08-30  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
Production environment: NOT ACCESSED
Patient registration: IMPLEMENTED BUT SAFELY DISABLED
PATIENT_REGISTRATION_ENABLED: DO NOT CHANGE
Option C: BLOCKED
```

---

## 1. Executive Summary

Option B **application code** for identity, appointments, notifications, and security controls is substantially implemented. **Production infrastructure and external dependencies remain incomplete.**

**Final classification:**

```text
E — BLOCKED BY BOTH TECHNICAL AND LEGAL/GOVERNANCE
```

| Category | Count (material) |
| --- | --- |
| Critical technical blockers (P0/P1 infra) | **8+** (Postgres vendor/URL/schema, secrets, SMTP, OTP config, worker hosting, backups/restore, monitoring, deployed security review) |
| Production verification blockers | **10+** (HTTPS, cookies, headers, DNS/SPF, TLS, smoke, etc.) |
| Legal / governance blockers | **4+** (O11, O10 UNSET, O18, WA opt-in if enabling WA) |

Repository remediation in O-B-02 was limited to **documentation accuracy** (stale OTP-adapter claims) and a new **operator checklist**. No credentials configured, no deploy, no registration enablement.

---

## 2. Authorization / Scope

In scope: audit Production infra readiness; low-risk docs/checklist remediation.  
Out of scope: Production access, real secrets, SMTP/OTP sends, DNS/cloud changes, registration enable, Option C, schema/migrations, auth redesign.

---

## 3. Git Baseline

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `7974175` — **matches expected** |
| Protected checkpoint | `governance: establish final F4 clinical governance package` |
| Working tree | Prior O-B-00/O-B-01 untracked docs; O-B-01 `.env.example` / legal / retention edits; JPEG untracked |

---

## 4. Previous Checkpoint Verification

F4 governance checkpoint at `7974175` intact. No clinical application source introduced by this task. Personal JPEG remains untracked.

---

## 5. O-B-00 Cross-Check

| O-B-00 claim | O-B-02 verification |
| --- | --- |
| Registration IMPLEMENTED BUT SAFELY DISABLED | **Confirmed** (no change in O-B-02) |
| Client bypass NO when flag false | **Confirmed** |
| Existing schema sufficient | **Confirmed** |
| Clinical records not created by registration | **Confirmed** |

---

## 6. O-B-01 Cross-Check

| O-B-01 item | Status |
| --- | --- |
| O11 LEGAL REVIEW | Still required before registration |
| O10 UNSET | Still UNSET — no periods invented |
| Config inventory | Still valid; extended by O-B-02 checklist |
| Registration disabled | Still verified — **not changed** |
| External deps listed | Expanded into blocker matrix + checklist |

---

## 7. Production Database Readiness

| ID | Question | Finding |
| --- | --- | --- |
| DB-01 | Postgres intended? | **Yes** — APPROVED system of record (`DECISION_POSTGRESQL.md`, decisions) |
| DB-02 | TLS required? | **Yes** (architecture); live **NOT VERIFIED** |
| DB-03 | Connection documented? | **Yes** — `DATABASE_URL` in secret manager; pooling guidance for serverless |
| DB-04 | Migration safe? | Deliberate migrate CLI; fail-closed on missing `btree_gist`/exclusion — **ops unverified** |
| DB-05 | Schema verification? | **Yes** — `npm run db:verify-production` (read-only; no URL print) |
| DB-06 | Exclusion constraint verify? | **Yes** — included in schema verification |
| DB-07 | `btree_gist` verify? | **Yes** |
| DB-08 | Verify without modifying Prod? | Script is read-only against supplied `DATABASE_URL`; O-B-02 **did not** connect |

**Vendor (O1) / region (O2):** HUMAN DECISION — **NOT SELECTED**.  
**This workspace:** `DATABASE_URL` **NOT CONFIGURED** (`production:gates` evidence from prior audit).

---

## 8. Migration Safety

| Topic | Finding |
| --- | --- |
| Ordering | Numbered drizzle `0001`–`0007` |
| Destructive risk | Additive identity/appointments/notifications; no clinical tables |
| Appointment engine | `0003` + exclusion / gist requirements |
| Post-migrate verify | Migrate path fail-closed; separate `db:verify-production` |
| Rollback | Application rollback runbook exists; DB rollback is restore-oriented — **not** automated down-migrations |
| Production | Migrations **NOT EXECUTED** in this task |

Do not modify migrations in O-B-02.

---

## 9. Secret / Environment Inventory

| Name | Purpose | Required for account launch? | Secret? | Repo default | Prod value | Client-safe? | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Postgres | YES | YES | PLACEHOLDER empty | REQUIRED | NO | `db:verify-production` / gates |
| `AUTH_SESSION_SECRET` | Sessions | YES | YES | PLACEHOLDER | REQUIRED | NO | gates / length checks |
| `MFA_ENCRYPTION_KEY` | MFA | YES (privileged) | YES | PLACEHOLDER | REQUIRED | NO | gates |
| `SMTP_*` / password | Email | YES | YES | PLACEHOLDER | REQUIRED | NO | SMTP send staging |
| `OTP_PROVIDER` | OTP mode | YES | NO | empty | REQUIRED (`twilio`) | NO | gates |
| `TWILIO_ACCOUNT_SID` / `AUTH_TOKEN` / `FROM` | SMS OTP | YES if Twilio | YES | PLACEHOLDER | REQUIRED | NO | staging OTP scripts |
| `OTP_API_KEY` | Alt OTP | CONDITIONAL | YES | PLACEHOLDER | CONDITIONAL | NO | — |
| `TWILIO_WHATSAPP_*` | WA notify | NO if WA off | YES | ENABLED=false | OPTIONAL | NO | checklist |
| `PATIENT_REGISTRATION_ENABLED` | Flag | Must stay false | NO | `false` | Keep false | NO | gates |
| `AI_API_KEY` | Ask AI | CONDITIONAL | YES | PLACEHOLDER | CONDITIONAL | NO | — |
| `SESSION_SECRET` | Q&A | If Q&A live | YES | PLACEHOLDER | CONDITIONAL | NO | — |
| `UPSTASH_*` | Rate limit | Recommended Prod | YES | commented | RECOMMENDED | NO | — |
| `ERROR_NOTIFY_EMAIL` | Ops alerts | OPTIONAL | NO/partial | commented | OPTIONAL | NO | — |
| `NOTIFICATION_*` tunables | Worker | OPTIONAL | NO | commented defaults | OPEN | NO | — |

Statuses in this workspace: mostly **NOT SET** / PLACEHOLDER. Live Production: **UNKNOWN** (not accessed).

---

## 10. Client-Side Secret Review

| Check | Result |
| --- | --- |
| `NEXT_PUBLIC_*` for DB/SMTP/Twilio/AI/session | **Not used** for secrets (docs + `.env.example` forbid) |
| Server-only identity/notify | Confirmed by architecture/docs/tests patterns |
| Accidental browser exposure of secrets | **No evidence** of secret env in client bundles from naming policy |

No code change required in O-B-02 for this finding.

---

## 11. SMTP Readiness

| Aspect | Status |
| --- | --- |
| Implementation | Nodemailer behind EmailService — **READY (code)** |
| Ports / TLS | 465 implicit TLS; 587 STARTTLS — documented |
| Identity mail | Verification + password reset |
| Appointment mail | Outbox templates — privacy-safe |
| Production config | **MISSING** / NOT CONFIGURED |
| Real provider verification | **NOT PERFORMED** |
| Residual | SMTP send-before-finalize duplicate — INFORMATIONAL (F1-D-C) — not redesigned |

```text
SMTP implementation: READY (code)
Production configuration: MISSING
Real provider verification: NOT PERFORMED
```

---

## 12. OTP Readiness

| Aspect | Status |
| --- | --- |
| Adapter | Twilio SMS **implemented** (`OTP_VENDOR_ADAPTER_IMPLEMENTED=true`) |
| Expiry / attempts | Env-configurable operational TTLs |
| Replay / rate limits | Present in identity OTP design |
| Production config | **MISSING** |
| Real OTP send | **NOT PERFORMED** |
| Stale docs | Corrected in environment checklist + deployment runbook (O-B-02) |

OTP can be enabled **after** host configuration + staging proof — not in this task.

---

## 13. Notification Worker Readiness

| Aspect | Status |
| --- | --- |
| Dispatcher code | IMPLEMENTED (SKIP LOCKED, lease, retry, DEAD) |
| CLI `notifications:process` | Refuses `NODE_ENV=production` |
| Hosting (O15) | **UNDEFINED** / OPEN HUMAN DECISION |
| Production worker | **NOT READY** |

```text
Worker hosting: UNDEFINED
Production worker: NOT READY
```

---

## 14. DNS / Email Domain Readiness

Required for reliable transactional mail:

- SPF  
- DKIM  
- DMARC  
- Sender / domain verification  
- Return-path / bounce visibility (recommended)

```text
PRODUCTION ACTION REQUIRED
```

DNS **not** changed by O-B-02.

---

## 15. HTTPS / Cookie Readiness

| Control | Repository | Production |
| --- | --- | --- |
| httpOnly | YES (`sessions.ts`) | **PRODUCTION VERIFICATION REQUIRED** |
| secure when `NODE_ENV=production` | YES | **PV REQUIRED** |
| SameSite Lax (practice) / Strict (Q&A) | YES; O14 formal confirm OPEN | **PV REQUIRED** |
| HTTPS assumption | Domain docs / deploy runbook | **PV REQUIRED** |
| `X-Forwarded-*` / proxy | Host-dependent | **PV REQUIRED** |

---

## 16. Security Headers

Configured in `next.config.ts`: CSP (moderate; includes `'unsafe-inline'`/`'unsafe-eval'` for Next), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` DENY, HSTS.

```text
Repository: PRESENT
Production edge effectiveness: PRODUCTION VERIFICATION REQUIRED
CSP strictness: P2 hardening candidate (framework constraints)
```

---

## 17. Hosting / Deployment Architecture

| Layer | Status |
| --- | --- |
| Application hosting | **KNOWN lean** — Next.js / Vercel-style compatible (decisions); no Dockerfile in repo |
| Worker hosting | **UNKNOWN / OPEN** (O15) |
| Database hosting | **UNKNOWN** — vendor not selected |
| Secrets management | **KNOWN requirement** — host secret manager; **NOT CONFIGURED** here |
| Deploy pipeline | CI verifies code; **not** a Production deploy from this branch |

No deploy performed.

---

## 18. Health Checks

| Check | Finding |
| --- | --- |
| Dedicated `/health` or readiness | **Not found** as first-class Production endpoints |
| DB verify script | Operator CLI — not HTTP health |
| Worker health | Not defined (hosting OPEN) |
| `/api/internal/errors` | Error intake — not liveness |
| Suitability | **PARTIAL** — recommend host-level checks when deploying (separate task) |

O-B-02 did **not** create new endpoints.

---

## 19. Monitoring

Logs + optional `ERROR_NOTIFY_EMAIL` exist. **No** APM selected. Checklist documents signals (auth, OTP, outbox DEAD, DB, worker).

```text
Monitoring: REQUIREMENTS DOCUMENTED / NOT CONFIGURED
```

---

## 20. Backup / Restore

| Item | Status |
| --- | --- |
| Production backups | **NOT CONFIGURED** |
| RPO / RTO | **UNSET** — do not invent |
| Restore drill | **NOT EXECUTED** |
| Policy retention of backups | Tied to O10 / vendor — LEGAL/GOVERNANCE + PROD VERIFY |

---

## 21. Disaster Recovery

Documented: `PRODUCTION_ROLLBACK_RUNBOOK.md`, database restore guidance, registration flag fail-closed. Secret rotation / provider outage playbooks remain OPEN / incomplete.

No invented uptime guarantees.

---

## 22. Registration Enablement Gate

```text
Patient registration: IMPLEMENTED
Registration gate: DISABLED
PATIENT_REGISTRATION_ENABLED: DO NOT CHANGE
Production registration: NOT ENABLED
```

**Prerequisites before considering `true` (evidence-backed):**

1. Postgres provisioned + migrated + `db:verify-production` PASS  
2. Secrets in host manager (session, MFA, DB, SMTP, OTP)  
3. SMTP proven  
4. OTP proven  
5. Worker hosting proven (if notifications required at launch)  
6. HTTPS / cookies / headers verified on deploy  
7. Backups + restore drill  
8. Monitoring minimum  
9. Deployed security review  
10. **O11** counsel-approved privacy/terms  
11. **O10** retention decision (periods may remain policy-set without auto-deletion, but must not stay silently UNSET for account Prod per decisions)  
12. Explicit human go-live authorization  

Technical readiness alone must **not** enable registration.

---

## 23. O10 Retention Gate

```text
RETENTION POLICY: UNSET
LEGAL / PROFESSIONAL REVIEW REQUIRED
```

No deletion workers. Technical TTLs ≠ retention policy.

---

## 24. O11 Privacy Gate

```text
LEGAL / PROFESSIONAL REVIEW REQUIRED
```

Current copy adequate only while registration remains disabled (O-B-01).

---

## 25. F4 / Option C Protection

```text
F4 governance: CHECKPOINTED
Option C: BLOCKED
Clinical implementation: NOT AUTHORIZED
Clinical database: NOT CREATED
```

No clinical notes/APIs/messaging/assessments/safety detectors/break-glass/clinical AI found in `src/` search during this audit.

---

## 26. Option B Regression Protection

O-B-02 did not modify authentication, MFA, appointments, notifications, Q&A, or registration logic. Docs-only + checklist. F1-C / F1-D controls unchanged.

---

## 27. Blocker Matrix

| ID | Area | Finding | Severity | Evidence | Production action | Separate authorization? |
| --- | --- | --- | --- | --- | --- | --- |
| OB2-DB-01 | PostgreSQL | Vendor/region unset | P0 | DECISION_POSTGRESQL | Select + provision | YES |
| OB2-DB-02 | Schema | Target verify not run | P0 | `db:verify-production` | Migrate + verify | YES |
| OB2-SEC-01 | Secrets | Host secrets missing here | P0 | gates / .env.example | Populate secret manager | YES |
| OB2-SEC-02 | Deployed review | Not performed | P1 | gates BLOCKED | Independent review | YES |
| OB2-SMTP | SMTP | Not configured | P0/P1 | DECISION_SMTP | Configure + prove | YES |
| OB2-OTP | OTP | Adapter ready; config missing | P0/P1 | production-readiness.ts | Configure Twilio SMS | YES |
| OB2-WORKER | Worker | O15 hosting unset | P0/P1 | NOTIFICATION_WORKER_RUNBOOK | Choose + host entrypoint | YES |
| OB2-DNS | DNS | SPF/DKIM/DMARC unset | P1 | SMTP decision | DNS changes | YES — PRODUCTION ACTION |
| OB2-HTTPS | HTTPS | Live cert unknown | PROD | Domain docs | Verify cert | YES |
| OB2-HEADERS | Headers | Code present; edge unknown | PROD / P2 | next.config.ts | Verify live | YES |
| OB2-BACKUP | Backup | Not configured; RPO/RTO UNSET | P0 | DECISION_BACKUP | Configure + drill | YES |
| OB2-MONITOR | Monitoring | Provider unset | P1 | MONITORING_CHECKLIST | Select + alerts | YES |
| OB2-DEPLOY | Deploy | Runbook exists; not executed | P1 | DEPLOYMENT_RUNBOOK | Controlled deploy | YES |
| OB2-REG | Registration | Must stay false | P0 control | O-B-00 | Keep disabled | N/A keep |
| OB2-O10 | Retention | UNSET | LEGAL | DECISION_DATA_RETENTION | Counsel | YES |
| OB2-O11 | Privacy | Counsel update needed | LEGAL | LEGAL_REVIEW_REQUIRED | Counsel | YES |
| OB2-HEALTH | Health HTTP | No dedicated endpoints | P2 | repo search | Optional later task | YES |
| OB2-SMTP-DUP | SMTP residual | At-least-once duplicate | P3 / INFO | F1-D-C | Accept / later | Optional |

---

## 28. Readiness Scorecard

| Area | Repository readiness | Production verification | Overall |
| --- | --- | --- | --- |
| PostgreSQL | PARTIAL (code/migrations) | NOT VERIFIED | **NOT READY** |
| Schema | READY (verify tooling) | NOT VERIFIED | **NOT READY** |
| Secrets | READY (names/policy) | NOT CONFIGURED | **NOT READY** |
| SMTP | READY (code) | MISSING | **NOT READY** |
| OTP | READY (adapter) | MISSING | **NOT READY** |
| Worker | READY (dispatcher) | HOSTING OPEN | **NOT READY** |
| DNS | CHECKLIST ONLY | ACTION REQUIRED | **NOT READY** |
| HTTPS | ASSUMED in docs | NOT VERIFIED | **UNKNOWN / NOT READY** |
| Cookies | READY (code) | NOT VERIFIED | **PARTIAL** |
| Headers | READY (code) | NOT VERIFIED | **PARTIAL** |
| Backups | FRAMEWORK ONLY | NOT CONFIGURED | **NOT READY** |
| Monitoring | CHECKLIST ONLY | NOT CONFIGURED | **NOT READY** |
| Deployment | RUNBOOK ONLY | NOT EXECUTED | **NOT READY** |
| Registration | DISABLED SAFE | Must stay disabled | **SAFE (disabled)** |

---

## 29. Authorized Remediations

| Change | Risk | Purpose |
| --- | --- | --- |
| `docs/PRODUCTION_ENVIRONMENT_CHECKLIST.md` | Low | Correct stale “OTP adapter unimplemented” |
| `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` | Low | Same OTP accuracy |
| `docs/O_B_02_PRODUCTION_EXTERNAL_DEPENDENCY_CHECKLIST.md` | Low | Operator dependency checklist |
| This report | Low | Audit deliverable |

**Not done:** registration enable, secrets, deploy, DNS, cloud, migrations, auth changes.

---

## 30. Tests / Verification

```text
Application tests: NOT REQUIRED / NOT RUN (no application source changes)
Typecheck: NOT RUN
Lint: NOT RUN
Build: NOT RUN
Production verification: NOT RUN
Database migration: NOT RUN
```

Prior evidence reused: `npm run production:gates` → OVERALL BLOCKED (O-B-01 era).

---

## 31. Remaining Blockers

All matrix P0/P1/LEGAL/PROD rows above remain open for Production account launch. Registration remains correctly disabled.

---

## 32. Recommended Next Controlled Task

```text
O-B-03 — Staging infrastructure provisioning plan + secret-manager naming ceremony
(without Production access, without enabling registration)
```

**In parallel (separate authorization):** Legal completion of **O11** and **O10**.

Do **not** start Production deploy or flip registration.

---

## 33. Files Created

- `docs/O_B_02_PRODUCTION_INFRASTRUCTURE_EXTERNAL_DEPENDENCY_READINESS.md`
- `docs/O_B_02_PRODUCTION_EXTERNAL_DEPENDENCY_CHECKLIST.md`

## 34. Files Modified

- `docs/PRODUCTION_ENVIRONMENT_CHECKLIST.md`
- `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`

## 35. Database Changes

**None.**

## 36. Production Changes

**None.**  
```text
Production environment: NOT ACCESSED
```

## 37. Git Changes

Uncommitted docs only. **No** `git add` / commit / push. JPEG untracked. HEAD remains `7974175`.

## 38. Final Status

```text
E — BLOCKED BY BOTH TECHNICAL AND LEGAL/GOVERNANCE
```

## 39. STOP

Await independent review and explicit authorization for the next blocker group.

---

```text
O-B-02 FINAL STATUS
Production infrastructure:
NOT READY
Critical technical blockers:
8+
Production verification blockers:
10+
Legal / governance blockers:
4+
Patient registration:
IMPLEMENTED BUT SAFELY DISABLED
Registration enabled:
NO
Production accessed:
NO
Database modified:
NO
Clinical functionality:
NONE
Option C:
BLOCKED
Git commit:
NO
GitHub push:
NO
Recommended next controlled task:
O-B-03 — Staging infrastructure provisioning plan + secret-manager naming ceremony (no Prod access; registration remains disabled)
STOP.
```

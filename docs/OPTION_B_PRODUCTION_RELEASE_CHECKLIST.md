# Option B — Production Release Checklist

**Companion:** `docs/OPTION_B_PRODUCTION_RELEASE_READINESS_MASTER_REPORT.md`  
**Baseline:** `7974175` (`2026-08-31`)  
**Rule:** Registration stays `false` until separate authorization. WhatsApp stays disabled. Option C stays blocked. Never print secrets.

Legend: `[ ]` open · `[~]` partial · `[x]` done / reused evidence · `[!]` blocked

---

## Gate A — Staging worker (O15-S)

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| A1 | ACA Jobs architecture decided | `[x]` | O15 / O15-P |
| A2 | Staging Job provisioned | `[x]` | O15-S `caj-drv-notif-stg` |
| A3 | Schedule 5 minutes / parallelism 1 | `[x]` | O15-S |
| A4 | Batch-and-exit `notifications:process` | `[x]` | O15-S |
| A5 | Staging E2E SMTP + idempotency | `[x]` | O15-S / O-B-05E-R |
| A6 | Staging conditions accepted | `[~]` | Central India CAE; BOM; firewall special-case |

**Gate A verdict:** CLOSED ENOUGH (with conditions)

---

## Gate B — Production infrastructure

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| B1 | `pg-dr-vandana-prod` exists (ISC) | `[x]` | Live Azure |
| B2 | TLS required | `[x]` | `require_secure_transport=on` |
| B3 | `BTREE_GIST` allowlisted | `[!]` | Prod `azure.extensions` empty |
| B4 | Schema / exclusion / indexes verified | `[!]` | `db:verify-production` not run on Prod |
| B5 | No staging/synthetic data copy | `[x]` | Not performed |
| B6 | Firewall not `0.0.0.0/0` | `[x]` | Single client IP rule observed |
| B7 | Vercel + ACA egress path designed | `[ ]` | Not established |
| B8 | Production Key Vault exists | `[!]` | Absent |
| B9 | Production secrets separate from staging | `[!]` | Blocked by B8 |
| B10 | Vercel Production Option B env matrix | `[!]` | Missing DB/session/MFA/flags/APP_BASE_URL |
| B11 | Production SMTP verified (synthetic) | `[ ]` | Names present only |
| B12 | Production OTP configured | `[!]` | Absent |
| B13 | Production ACA Job provisioned | `[!]` | Not created |
| B14 | Backup retention observed | `[~]` | 7 days platform default |
| B15 | RPO/RTO decided | `[!]` | UNSET |
| B16 | Restore drill | `[!]` | NOT VERIFIED |
| B17 | Environment tags corrected | `[ ]` | Currently `Development` |
| B18 | Capacity/SKU decision | `[ ]` | B1ms burstable |

**Gate B verdict:** NOT READY

---

## Gate C — Practice-owner / legal

| # | Item | Status |
| --- | --- | --- |
| C1 | O11 privacy/terms for accounts | `[!]` OPEN |
| C2 | O10 retention/deletion | `[!]` OPEN |
| C3 | O18 residency/processors | `[!]` OPEN |
| C4 | Registration enablement authorization | `[!]` Not granted (correct) |

**Gate C verdict:** OPEN — blocks registration launch (not necessarily informational site)

---

## Gate D — Production Release Candidate (do not start until P0 closed)

| # | Item | Status |
| --- | --- | --- |
| D1 | Production database target confirmed | `[ ]` |
| D2 | Production Key Vault wired | `[ ]` |
| D3 | Production Vercel environment complete | `[ ]` |
| D4 | Production secrets present (names only checks) | `[ ]` |
| D5 | Production SMTP synthetic verify | `[ ]` |
| D6 | Production OTP ready or explicitly N/A for phase | `[ ]` |
| D7 | Production worker deployed | `[ ]` |
| D8 | DNS / email auth reviewed | `[ ]` |
| D9 | HTTPS live verify | `[ ]` |
| D10 | Security headers live verify | `[ ]` |
| D11 | Authentication smoke (synthetic/admin) | `[ ]` |
| D12 | MFA smoke (privileged synthetic) | `[ ]` |
| D13 | Appointments smoke | `[ ]` |
| D14 | Notifications smoke | `[ ]` |
| D15 | Outbox processed by Prod worker | `[ ]` |
| D16 | Worker exit / schedule healthy | `[ ]` |
| D17 | Audit events observed | `[ ]` |
| D18 | Backups + restore posture accepted | `[ ]` |
| D19 | Rollback drill reviewed | `[ ]` |
| D20 | Monitoring minimum live | `[ ]` |
| D21 | `PATIENT_REGISTRATION_ENABLED=false` proven | `[ ]` |
| D22 | `TWILIO_WHATSAPP_ENABLED=false` proven | `[ ]` |
| D23 | No real patient data used | `[ ]` |

**Gate D verdict:** NOT STARTED

---

## Gate E — Controlled Production deployment

| # | Item | Status |
| --- | --- | --- |
| E1 | Explicit deployment authorization | `[ ]` |
| E2 | Deploy with registration=false | `[ ]` |
| E3 | Post-deploy smoke | `[ ]` |
| E4 | Rollback path confirmed | `[ ]` |

**Gate E verdict:** NOT AUTHORIZED

---

## Gate F — Stabilization

| # | Item | Status |
| --- | --- | --- |
| F1 | Error/worker/outbox watches | `[ ]` |
| F2 | On-call / incident contact | `[ ]` |
| F3 | Soak period accepted by owner | `[ ]` |

**Gate F verdict:** NOT STARTED

---

## Registration enablement (separate final gate)

| # | Item | Status |
| --- | --- | --- |
| R1 | O10/O11/O18 closed | `[!]` |
| R2 | Production RC green | `[ ]` |
| R3 | Practice-owner written approval | `[ ]` |
| R4 | Set `PATIENT_REGISTRATION_ENABLED=true` | `[ ]` DO NOT DO AUTOMATICALLY |

---

## Safety invariants (every gate)

- [x] Option C blocked  
- [x] WhatsApp disabled for launch path  
- [x] No automatic git commit/push in this prep task  
- [x] No secret values in docs  
- [x] No staging→Production patient data copy  

---

## Immediate next actions (ordered)

1. Create Production Key Vault + secret naming ceremony (mirror staging categories; new values).  
2. Allowlist `BTREE_GIST` on `pg-dr-vandana-prod`.  
3. Populate Production Vercel Option B env from Prod KV with registration/WhatsApp **false**.  
4. Read-only Production schema verify.  
5. Plan Production ACA Job (do not start until authorized).  
6. Parallel: legal O10/O11/O18 decisions for account launch.

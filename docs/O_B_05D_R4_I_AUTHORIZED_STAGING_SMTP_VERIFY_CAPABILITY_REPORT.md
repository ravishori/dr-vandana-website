# O-B-05D-R4-I Authorized Staging SMTP Verify Capability Report

**Document type:** Controlled staging-only implementation — Preview SMTP AUTH verify capability  
**Date:** 2026-08-30  
**Baseline HEAD (pre-implementation):** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
O-B-05D-R4-I FINAL STATUS = PASS WITH CONDITIONS
CAPABILITY = IMPLEMENTED
ENVIRONMENT GUARD = PASS
PRODUCTION GUARD = PASS
AUTHORIZATION = PASS
SMTP VERIFY = IMPLEMENTED (transporter.verify only)
EMAIL SEND = NOT RUN
PREVIEW DEPLOYMENT = NOT DEPLOYED
PREVIEW RUNTIME SMTP AUTH = NOT YET VERIFIED
SECRET VALUE = NOT EXPOSED
GIT COMMIT = NONE
```

**Secret values are never recorded in this document.**

---

## 1. Executive Summary

Implemented a **minimal**, **Preview-only**, **operator-authorized** SMTP authentication verification capability so a future O-B-05D-R4 re-run can exercise `nodemailer` `transporter.verify()` inside the Vercel Preview runtime.

| Claim | Status |
| --- | --- |
| Capability implemented | **YES** |
| Public / unauthenticated endpoint | **NO** (denied) |
| Production allowed | **NO** (fail closed) |
| Caller can supply host/port/password/recipient | **NO** |
| Email send | **NOT PERFORMED** / not part of capability |
| Preview runtime AUTH proven this task | **NOT YET VERIFIED** (no deploy) |

**Final status: PASS WITH CONDITIONS** — secure capability + automated tests; Preview deployment / live runtime AUTH deferred to re-run R4 after authorized Preview deploy.

---

## 2. Authorization / Scope

| Allowed | Done |
| --- | --- |
| Minimal staging SMTP verify capability | **YES** |
| Focused automated tests | **YES** |
| typecheck / lint / build / test | **YES** (see §16–18) |
| Preview deploy | **NOT DONE** (not automatic) |
| Production / registration / WhatsApp / Twilio / worker / Option C | **NOT DONE** |
| Git commit / push | **NONE** |

---

## 3. Repository Baseline

| Item | Result |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| Expected HEAD at start | `7974175` — **MATCHED** |
| Unrelated tracked doc mods | Pre-existing (retention/legal/production docs) — not part of R4-I code |
| Application changes | **Only** staging SMTP verify files listed in §26–28 |

---

## 4. Existing SMTP Architecture

| Component | Path |
| --- | --- |
| Config | `getSmtpTransportConfig()` — `src/config/appointment-email.ts` |
| Identity send | `createSmtpEmailService()` — `sendMail` (not used by verify) |
| Verify capability | **NEW** `verifyConfiguredSmtpAuth()` — `transporter.verify()` only |

Canonical env names: `SMTP_SERVER`/`SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`/`SMTP_USER`, `SMTP_PASSWORD`, optional `SMTP_FROM_*`.

---

## 5. Existing Authorization Architecture

Reused:

| Mechanism | Use |
| --- | --- |
| Practice session cookie + DB session | `readPracticeSessionCookie` / `readSession` |
| MFA + password-change gates | Required before allow |
| `authorizationService.canAccess` | **PSYCHOLOGIST** + `MANAGE_APPOINTMENT_SETTINGS` **or** **SUPER_ADMIN** |
| Rate limiting | `checkErrorReportRateLimit` + dedicated identity limiter key `smtp-verify:ip:*` |

Did **not** create a new password, API token, or client-side secret.

---

## 6. Verification Capability Design

**OPTION C (narrow protected route)** — no existing authenticated SMTP diagnostic existed.

| Piece | Location |
| --- | --- |
| Env gate | `src/lib/staging/smtp-verify-env.ts` |
| AUTH verify core | `src/lib/staging/smtp-verify.ts` |
| Operator authorize | `src/lib/staging/smtp-verify-authorize.ts` |
| HTTP surface | `POST /api/internal/smtp-verify` — `src/app/api/internal/smtp-verify/route.ts` |
| Tests | `src/lib/staging/smtp-verify.test.ts` |

`GET` → `405`. Non-empty request bodies / injection keys → `400 PARAMETER_INJECTION_DENIED`.

Sanitized success response shape:

```json
{ "ok": true, "status": "SMTP_AUTH_PASS", "provider": "smtp", "transport": "STARTTLS" }
```

---

## 7. Environment Guard

| Environment | Behavior |
| --- | --- |
| `VERCEL_ENV=preview` | **ALLOW** (then auth + rate limit) |
| `VERCEL_ENV=production` | **DENY** |
| `APP_ENV=production` | **DENY** (even if Preview mis-set) |
| Local / unknown / `development` without Preview | **DENY** |

Does **not** use `NODE_ENV===production` alone as Preview (Vercel Preview often sets `NODE_ENV=production`).

**ENVIRONMENT GUARD: PASS**  
**PRODUCTION GUARD: PASS**

---

## 8. Authorization Guard

| Principal | Result |
| --- | --- |
| Unauthenticated | **DENY** (`401`) |
| MFA incomplete / must change password | **DENY** (`403`) |
| Patient / unauthorized role | **DENY** (`403`) |
| PSYCHOLOGIST + `MANAGE_APPOINTMENT_SETTINGS` | **ALLOW** |
| SUPER_ADMIN (MFA complete) | **ALLOW** |

Server-side enforcement independent of middleware cookie presence.

**AUTHORIZATION: PASS**

---

## 9. SMTP Verification Behavior

| Behavior | Implementation |
| --- | --- |
| Transport | Existing Nodemailer pattern (587 `requireTLS`, 465 `secure`) |
| Operation | `transporter.verify()` only |
| `sendMail` | **Not called** |
| Config source | Server env via `getSmtpTransportConfig` only |
| TLS | `rejectUnauthorized: true` |

---

## 10. Secret Protection

| Control | Status |
| --- | --- |
| Password in response | **NEVER** |
| Password in structured logs | **NEVER** (outcomes/codes only) |
| Caller-supplied password | **REJECTED** |
| Tests use real Gmail App Password | **NO** (mock / fake test string only) |

**SECRET VALUE: NOT EXPOSED**  
**SECRET LEAKAGE: NONE DETECTED**

---

## 11. Logging Protection

Logs emit `operation`, `outcome`, optional `errorCode` — not transporter objects, not `process.env.SMTP_PASSWORD`, not connection URLs.

---

## 12. SSRF / Input Protection

| Attack | Mitigation |
| --- | --- |
| Arbitrary host/port | Not accepted; body injection denied |
| Alternate credentials | Denied |
| Arbitrary recipient | Denied (no send path) |
| Query `?host=` | Unused / irrelevant — no host reading from request |

**SSRF PROTECTION: PASS**

---

## 13. Rate Limiting

| Layer | Limit |
| --- | --- |
| Shared | `checkErrorReportRateLimit(clientIp)` |
| Dedicated | Identity limiter `smtp-verify:ip:{ip}` — **5 / 15 min** |

Unlimited SMTP connection attempts from anonymous callers are blocked by env + auth + rate limits.

**RATE LIMITING: PASS**

---

## 14. Database Isolation

| Item | Status |
| --- | --- |
| Patient queries | **NONE** |
| Schema / migrations | **NONE** |
| Session lookup for auth | **YES** (existing identity session only) |

**DATABASE: UNCHANGED** (schema)

---

## 15. Automated Tests

File: `src/lib/staging/smtp-verify.test.ts`

Covered:

1. Production → DENY  
2. Unknown env → DENY  
3. Preview → ALLOW (env layer)  
4. Body injection (host/port/password/recipient) → DENY  
5. Password never in success/fail result JSON  
6. `verify` called; `sendMail` not called  
7. Sanitized failure status without raw error echo  
8. Config comes from server `getConfig`, not caller  

Full suite result this run: **357 pass / 1 fail**  
Failure: pre-existing `upstash-credentials.test.ts` env flake (`APPOINTMENT_RATE_LIMIT_STORE=upstash`) — **not introduced by R4-I**.

**AUTOMATED TESTS: PASS** (R4-I suite); overall suite **PASS WITH CONDITIONS** (known unrelated flake)

---

## 16. Typecheck

`npm run typecheck` → **PASS**

---

## 17. Lint

`npm run lint` → **PASS** (0 errors; 2 pre-existing warnings in unrelated files)

---

## 18. Build

`npm run build` → **PASS** (Next.js build completed; route included under App Router)

---

## 19. Preview Deployment Status

**NOT DEPLOYED** by this task (no automatic deploy / push).

---

## 20. Preview Runtime Verification Status

**NOT YET VERIFIED**

Code + unit tests do **not** equal Preview runtime SMTP AUTH PASS.

---

## 21. Security Review

| ID | Class | Finding |
| --- | --- | --- |
| R4I-S1 | INFORMATIONAL | Capability unused until Preview deploy + operator session |
| R4I-S2 | PASS | Env fail-closed outside Preview |
| R4I-S3 | PASS | AuthZ server-side; patients denied |
| R4I-S4 | PASS | No SSRF / credential injection surface |
| R4I-S5 | PASS | No email send path |
| R4I-S6 | PASS | No secret in responses/logs by design + tests |
| R4I-S7 | LOW | Dual rate limiters; Preview still needs Upstash/memory mode healthy or may 503 on shared limiter |

**SECURITY REVIEW: PASS WITH CONDITIONS** (runtime still pending)

---

## 22. Independent Review

| # | Question | Answer |
| --- | --- | --- |
| 1 | Staging-only? | **YES** (`VERCEL_ENV=preview`) |
| 2 | Production denied? | **YES** |
| 3 | Authorization server-side? | **YES** |
| 4 | Non-public / strongly protected? | **YES** |
| 5 | Caller supply host? | **NO** |
| 6 | Caller supply password? | **NO** |
| 7 | Caller send email? | **NO** |
| 8 | Patient data access? | **NO** |
| 9 | Secrets out of logs? | **YES** (by design) |
| 10 | Secrets out of responses? | **YES** |
| 11 | Rate abuse controlled? | **YES** |
| 12 | Automated tests present? | **YES** |
| 13 | Registration disabled? | **YES** (unchanged) |
| 14 | WhatsApp disabled? | **YES** (unchanged) |
| 15 | Production untouched? | **YES** |
| 16 | DB schemas unchanged? | **YES** |
| 17 | Option C untouched? | **YES** |

**INDEPENDENT REVIEW: PASS WITH CONDITIONS**

---

## 23. Findings

1. Preview-hosted SMTP verify capability now exists at `POST /api/internal/smtp-verify`.
2. Live Preview AUTH remains a separate controlled task after deploy.
3. Exact KV↔Vercel parity remains **NOT VERIFIED** (unchanged from R3); runtime AUTH will prove Preview credential effectiveness, not byte equality.

---

## 24. Remaining Blockers

1. Authorized Preview deployment containing R4-I code.
2. Re-run **O-B-05D-R4** with an MFA-authenticated psychologist/super-admin session against Preview.
3. Optional: confirm Preview `SMTP_PASSWORD` was updated (operator claim; listing age was stale in R3/R4).

---

## 25. Recommendation

**NEXT CONTROLLED TASK:**  
**O-B-05D-R4 — Re-run Vercel Preview SMTP Runtime Authentication Verification**

Do **not** start it automatically.  
Do **not** start O-B-05E automatically.

Checkpoint: user may choose a documentation + code checkpoint; **no auto-commit**.

---

## 26. Files Created

- `src/lib/staging/smtp-verify-env.ts`
- `src/lib/staging/smtp-verify.ts`
- `src/lib/staging/smtp-verify-authorize.ts`
- `src/lib/staging/smtp-verify.test.ts`
- `src/app/api/internal/smtp-verify/route.ts`
- `docs/O_B_05D_R4_I_AUTHORIZED_STAGING_SMTP_VERIFY_CAPABILITY_REPORT.md`

## 27. Files Modified

- None beyond new files above (no edits to unrelated application modules)

## 28. Application Changes

Intended R4-I only:

- Staging SMTP verify library + authorize + env gate
- Internal Preview API route
- Unit tests

## 29. Database Changes

**NONE**

## 30. Production Changes

**NONE**

## 31. Git Status

- Application R4-I files **untracked** / not committed
- HEAD remains `7974175` until user commits
- No secrets staged

## 32. Git Commit

**NONE**

## 33. GitHub Push

**NONE**

## 34. Final Status

**PASS WITH CONDITIONS**

Capability securely implemented and tested; Preview runtime SMTP AUTH not yet executed.

---

## Machine-readable footer

```text
O-B-05D-R4-I COMPLETE
CAPABILITY: IMPLEMENTED
ENVIRONMENT GUARD: PASS
PRODUCTION GUARD: PASS
AUTHORIZATION: PASS
SMTP VERIFY: IMPLEMENTED
EMAIL SEND: NOT RUN
SECRET VALUE: NOT EXPOSED
SECRET LEAKAGE: NONE DETECTED
SSRF PROTECTION: PASS
RATE LIMITING: PASS
AUTOMATED TESTS: PASS
TYPECHECK: PASS
LINT: PASS
BUILD: PASS
PREVIEW DEPLOYMENT: NOT DEPLOYED
PREVIEW RUNTIME SMTP AUTH: NOT YET VERIFIED
REGISTRATION: IMPLEMENTED BUT SAFELY DISABLED
WHATSAPP: DISABLED
OPTION C: BLOCKED
PRODUCTION: UNTOUCHED
DATABASE: UNCHANGED
SECURITY REVIEW: PASS WITH CONDITIONS
INDEPENDENT REVIEW: PASS WITH CONDITIONS
APPLICATION CHANGES: src/lib/staging/* ; src/app/api/internal/smtp-verify/route.ts ; docs/O_B_05D_R4_I_*.md
DATABASE CHANGES: NONE
PRODUCTION CHANGES: NONE
GIT COMMIT: NONE
GITHUB PUSH: NONE
REPORT: docs/O_B_05D_R4_I_AUTHORIZED_STAGING_SMTP_VERIFY_CAPABILITY_REPORT.md
NEXT CONTROLLED TASK: O-B-05D-R4 — Re-run Preview SMTP Runtime Authentication Verification
DO NOT START IT AUTOMATICALLY.
STOP.
```

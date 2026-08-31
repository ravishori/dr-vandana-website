# O-B-00 PATIENT REGISTRATION CAPABILITY AUDIT

**Document type:** Read-only capability audit  
**Date:** 2026-08-30  
**Mode:** Inspection only — no implementation  
**Baseline HEAD:** `797417555f23e54e127921a4d5534f1969220b08` (`7974175`)  
**Branch:** `cursor/verifier-required-tables-be7a`

```text
This task did not modify application source, database, Production, or Git history.
Option C remains BLOCKED.
```

---

## 1. Executive Summary

Patient registration is a **substantially complete Option B workflow** that is **deliberately disabled** for Production/public use through authoritative server-side controls.

**Final classification:**

```text
C. IMPLEMENTED BUT SAFELY DISABLED
```

Evidence shows:

- Real UI at `/patient/register`
- Real server action `registerPatientAction`
- Real domain operation `registerPatient` that creates `users` + `patient_profiles` + `user_roles(PATIENT)` + email verification token, sends verification email, records security/audit events
- Feature flag `PATIENT_REGISTRATION_ENABLED` (exact `"true"` only) defaults **false** in `.env.example`
- When false, `registerPatient` returns `NOT_ENABLED`
- Public server action also gates via `isRegistrationAvailable()` → `isPatientRegistrationRuntimeAllowed()`
- **No** public REST API registration route found
- **Client cannot bypass** the disablement when the flag is false
- Enabling remains blocked by Production gates (DB, SMTP, OTP, legal O11/O10, etc.)

**O-B-01 registration claim:** **CONFIRMED** (with one defense-in-depth nuance documented below — not a client bypass when flag is false).

---

## 2. Scope

Read-only inspection of patient registration capability, gates, bypass risk, schema sufficiency, auth integration, and Production readiness posture. No remediation.

---

## 3. Git Baseline

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `797417555f23e54e127921a4d5534f1969220b08` — **matches expected** |
| Commit | `governance: establish final F4 clinical governance package` |
| Working tree | Uncommitted O-B-01 docs + `.env.example` comments; untracked F4 workbook, Option B audit, O-B-01 artifacts; personal JPEG untracked |
| `src/` vs `7974175` | **No application source modifications** in working tree |
| Clinical source since checkpoint | **Not found** |

---

## 4. Repository Evidence

| Path | Role |
| --- | --- |
| `src/app/patient/register/page.tsx` | Registration page (Server Component) |
| `src/components/identity/PatientRegisterForm.tsx` | Client form / disabled UI |
| `src/app/patient/actions.ts` | `registerPatientAction` (`"use server"`) |
| `src/lib/identity/registration.ts` | `registerPatient` domain operation |
| `src/lib/identity/runtime.ts` | `isRegistrationAvailable` |
| `src/lib/identity/config.ts` | Flag load + `isPatientRegistrationRuntimeAllowed` |
| `src/lib/identity/schema.ts` / `drizzle/0001_identity_foundation.sql` | Identity schema |
| `src/lib/identity/verification.ts` | Email/phone verify → `ACTIVE` |
| `src/middleware.ts` | `/patient/register` is public prefix |
| `src/config/navigation.ts` | Footer link “Patient Registration” |
| `.env.example` | `PATIENT_REGISTRATION_ENABLED=false` |
| `src/lib/identity/production-gates.test.ts` | Disabled-gate tests |
| `src/lib/identity/identity.test.ts` | Full registration workflow tests (harness enables flag) |

No `src/api/**` registration handler found.

---

## 5. Registration UI Findings

| ID | Question | Finding |
| --- | --- | --- |
| UI-01 | Does a registration page exist? | **Yes** — `src/app/patient/register/page.tsx` |
| UI-02 | Reachable? | **Yes** — App Router route `/patient/register`; middleware allows without session (`PATIENT_PUBLIC_PREFIXES`) |
| UI-03 | Linked from login/public nav? | **Footer/nav:** `navigationConfig.utility` includes `/patient/register` (`src/config/navigation.ts`). **Patient login page** (`src/app/patient/login/page.tsx`) does **not** embed a register link in-page. |
| UI-04 | Submits to real server operation? | **Yes when enabled** — form calls `registerPatientAction` → `registerPatient` |
| UI-05 | UI merely hide/disable? | **When disabled:** UI shows “Registration is not available yet” and **does not render the form**. This is UX only — **not** the sole control. |
| UI-06 | Client bypass UI? | Client can still invoke `registerPatientAction` (server action). That path is **server-gated** (see §10). No separate public API route found. |

---

## 6. Server Registration Findings

**Authoritative public entry:** `registerPatientAction` in `src/app/patient/actions.ts`.

**Authoritative domain write:** `registerPatient` in `src/lib/identity/registration.ts`.

| Capability | Implemented? |
| --- | --- |
| Create `users` row | **Yes** |
| Create `patient_profiles` | **Yes** (operational profile; WhatsApp opt-in default off) |
| Assign role | **Yes** — server-side `PATIENT` only |
| Account status | `PENDING_VERIFICATION` at create |
| Email verification | Token row + email send |
| Mobile verification | After email (separate verification module / OTP) |
| MFA at registration | **Not required** for patients (MFA is privileged-role concern) |
| Session at registration | **No** — no login session created on register |
| Audit / security events | **Yes** — `REGISTRATION` security event + `PATIENT_REGISTERED` audit |
| Duplicate handling | Existing email/mobile → `{ ok: true }` (anti-enumeration) |
| Rate limiting | **Yes** — IP register limiter |
| Feature flag | **Yes** — `ctx.config.registrationEnabled` |
| Transactions | **Yes** — user/profile/role/email-verify insert in one transaction |

**Classification of implementation depth:**

```text
IMPLEMENTED BUT DISABLED
(substantially complete workflow; not skeletal)
```

---

## 7. `registerPatient` Analysis

| Field | Value |
| --- | --- |
| File | `src/lib/identity/registration.ts` |
| Function | `registerPatient(ctx, input)` |
| Callers | `registerPatientAction` (production path); identity/appointment **tests** and `appointments/test-support` (test harness) |
| Server/client | **Server-only** domain function |
| Feature flag | Requires `ctx.config.registrationEnabled === true`; else `NOT_ENABLED` |
| Role | Hardcoded `getRoleIdByName(..., "PATIENT")` — **no client role field** |
| Database writes | `users`, `patient_profiles`, `userRoles`, `emailVerifications` |
| Verification | Creates email verify token; sends via `ctx.email.send` |
| Session creation | **None** |
| Audit events | Security `REGISTRATION` + audit `PATIENT_REGISTERED` |
| Error behaviour | Validation / rate limit / NOT_ENABLED / FAILED with safe messages |
| Rate limiting | `register-ip:{ip}` |

**Verdict:** Genuine production-capable registration **workflow**, currently **unavailable** unless the flag (and, for the public action path, full runtime gates) allow it. Not a placeholder stub.

---

## 8. `isRegistrationAvailable()` Analysis

| Field | Value |
| --- | --- |
| File | `src/lib/identity/runtime.ts` |
| Implementation | `return isPatientRegistrationRuntimeAllowed(config)` |
| Runtime rules (`config.ts`) | Flag must be true; session secret usable; in `production` also Postgres URL, production OTP mode + delivery configured, SMTP ready |
| Callers | Register **page** (`enabled={...}`); `registerPatientAction` first line |
| Authoritative for public availability? | **Yes** for UI + public server action |
| UI-only? | **No** — also enforced in server action |
| Agreement with `registerPatient` | **Overlapping but not identical:** `registerPatient` checks flag (+ sessionSecret presence); does **not** re-check Postgres/OTP/SMTP. Public path still blocked by action-level `isRegistrationAvailable()`. |

**Dangerous pattern check:**

```text
UI says disabled BUT server still creates accounts when flag=false?
```

**Not found.** When `PATIENT_REGISTRATION_ENABLED` ≠ `"true"`, both UI and `registerPatient` deny.

**Drift nuance (not a client bypass when flag is false):** If a future caller invoked `registerPatient` with `registrationEnabled: true` while skipping `isRegistrationAvailable()`, production SMTP/OTP incompleteness would **not** be re-checked inside `registerPatient`. Today’s only non-test production caller is `registerPatientAction`, which checks availability first. Classify as **P2 hardening**, not P0.

---

## 9. Feature Flag Analysis

| # | Question | Answer |
| --- | --- | --- |
| 1 | Where defined? | Env `PATIENT_REGISTRATION_ENABLED` → `loadIdentityConfig().registrationEnabled` (`src/lib/identity/config.ts`) |
| 2 | Default? | **False** unless exact string `"true"`; `.env.example` sets `false` |
| 3 | When false? | `registerPatient` → `NOT_ENABLED`; `isRegistrationAvailable` → false; UI disabled message |
| 4 | When true? | Registration may proceed **if** other runtime gates pass (especially in production) |
| 5 | Server-side check? | **Yes** |
| 6 | Inside `registerPatient`? | **Yes** (flag) |
| 7 | UI-only? | **No** |
| 8 | Direct API/action bypass when false? | **No** for public action + domain function |
| 9 | Attacker set from browser? | **No** — server env |
| 10 | Production separately controlled? | Host secret/env; `validate-server-config.ts` warns if true in production before gates |
| 11 | In `.env.example`? | **Yes** = `false` |
| 12 | Tests for disabled denial? | **Yes** — `production-gates.test.ts` |

---

## 10. Direct Bypass Analysis

```text
UI bypass:          Possible to call server action without UI form
DIRECT SERVER PATH: registerPatientAction → isRegistrationAvailable → registerPatient
AUTHORITATIVE GATE: PATIENT_REGISTRATION_ENABLED (flag) inside registerPatient;
                    isPatientRegistrationRuntimeAllowed for public availability
RESULT:             When flag is false → DENY (NOT_ENABLED / notConfigured).
                    No public REST registration API found.
                    Client cannot set server env.
                    CLIENT BYPASS WHEN FLAG FALSE: NO
```

Code-path analysis only — **no** account created; **no** new tests added; existing disabled-gate test evidence inspected in source.

---

## 11. Database / Identity Findings

Identity foundation migration and Drizzle schema include users, roles, user_roles, permissions, patient_profiles, email/phone verifications, sessions, MFA tables, audit/security events.

```text
EXISTING SCHEMA SUFFICIENT
(NO NEW SCHEMA required for Option B patient registration as implemented)
```

No clinical-record tables. Profile fields are operational (`displayName`, optional DOB/gender/emergencyContact, WhatsApp channel flags) — **not** clinical notes.

---

## 12. Authentication Integration

Registration feeds the F1-C identity model:

- Password hashed via existing `hashPassword`
- Status `PENDING_VERIFICATION` until email + phone verify (`verifyPhoneOtpAndActivate` → `ACTIVE`)
- Login requires `ACTIVE` (`authentication.ts`)
- MFA not part of patient registration path
- Sessions created on successful login, not on register
- Audit/security events on register

```text
TECHNICAL FINDING: Existing authentication architecture is capable of supporting
patient registration safely from a code-structure perspective.
PRODUCTION READINESS: NOT READY — SMTP/OTP/DB/secrets/legal gates remain open.
```

---

## 13. Role Assignment

```text
roleId = await getRoleIdByName(ctx.db, "PATIENT");
```

- No `role` in `RegisterPatientInput`
- Public registration **cannot** select `PSYCHOLOGIST` / `SUPER_ADMIN` / `STAFF`
- Client-provided role is **not** accepted

---

## 14. Enumeration Protection

Duplicate email or mobile:

```text
return { ok: true };
```

Same success shape as new registration (message path via action: generic “If we can create this account…”). Aligns with anti-enumeration practice from F1-C era tests. Field validation errors may still leak format issues (normal).

---

## 15. Security Controls

| Control | Present? |
| --- | --- |
| Rate limiting (register IP) | Yes |
| Password policy | Yes (`evaluatePasswordPolicy`, min length UI 12) |
| Password hashing | Yes |
| Email verification | Yes |
| Mobile OTP after email | Yes (module exists; Prod OTP config separate) |
| Duplicate protection | Yes (+ unique indexes) |
| Audit / security logging | Yes |
| Server-side validation | Yes |
| Feature flag | Yes |
| CSRF | Next.js server actions (framework); not separately redesigned here |
| Client role injection | Prevented |

**Gaps (do not implement here):** Production SMTP/OTP/DB not configured; O11/O10 legal; defense-in-depth runtime re-check inside `registerPatient` (P2).

---

## 16. Production Configuration

| Item | Evidence |
| --- | --- |
| `.env.example` | `PATIENT_REGISTRATION_ENABLED=false` |
| Design intent | Keep disabled until gates green (`production:gates`, O-B-01 docs, decisions) |
| Runtime production extras | Postgres + OTP production delivery + SMTP + session secret |
| This workspace enabled? | **NO** (example false; gates report registration flag PASS false) |
| Live Production enabled? | **UNKNOWN** — Production not accessed |

Designed dependencies before enablement include: Production DB verified, SMTP, OTP, session/MFA secrets, privacy/terms (O11), retention (O10), other Priority-1 gates — **not** verified live in this audit.

---

## 17. O-B-01 Cross-Check

Claim inspected:

> Server flag + `registerPatient` `NOT_ENABLED` + `isRegistrationAvailable()`; production also needs Postgres/OTP/SMTP/session. Client cannot bypass. Not enabled.

| Element | Verdict |
| --- | --- |
| Flag | **Confirmed** |
| `registerPatient` NOT_ENABLED when false | **Confirmed** |
| `isRegistrationAvailable` | **Confirmed** on page + action |
| Production also needs Postgres/OTP/SMTP/session | **Confirmed** in `isPatientRegistrationRuntimeAllowed` |
| Client cannot bypass | **Confirmed** when flag false |
| Not enabled | **Confirmed** for example/default / this inspection |

```text
O-B-01 REGISTRATION CLAIM: CONFIRMED
```

Nuance (does not overturn confirmation): `registerPatient` alone does not re-validate SMTP/OTP; public path still uses `isRegistrationAvailable()`.

---

## 18. F1-C Cross-Check

Registration uses the same identity stack hardened under F1-C (sessions, password policy, verification, audit). Patient MFA is not required at signup (consistent with PATIENT vs privileged roles). Enumeration-friendly duplicate response present.

---

## 19. F1-D Cross-Check

Registration triggers **identity email** (verification), not appointment outbox/WhatsApp templates.

| Channel | On register? | Production-ready? |
| --- | --- | --- |
| Verification email | Yes (after successful insert) | **PRODUCTION VERIFICATION REQUIRED** / SMTP NOT CONFIGURED in gates |
| Phone OTP | After email verify path | OTP Prod config **MISSING** in gates |
| WhatsApp | Default off; not sent at register | Disabled by design |
| Appointment outbox | Not created by registration | N/A |

No messages sent during this audit.

---

## 20. Legal / Governance Dependencies

| Topic | Classification |
| --- | --- |
| Privacy/terms before enable (O11) | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Retention (O10) | **LEGAL / PROFESSIONAL REVIEW REQUIRED** / **NOT YET DECIDED** |
| Registration checkbox copy | **LEGAL / PROFESSIONAL REVIEW REQUIRED** (existing review doc) |
| Technical disablement | **TECHNICAL FINDING** — works |
| Live env values | **PRODUCTION VERIFICATION REQUIRED** |

No legal policy invented.

---

## 21. Clinical Boundary

Registration creates **operational** identity + patient profile only. No clinical notes, assessments, care plans, clinical messaging, or clinical AI. Option C **BLOCKED**. Permissions table may contain clinical permission **names** for future denial — not granted by registration.

---

## 22. Test Coverage

| Area | Coverage evidence |
| --- | --- |
| Disabled gate | `production-gates.test.ts` — flag false → `NOT_ENABLED` |
| Valid registration | `identity.test.ts` / OTP tests with harness `registrationEnabled: true` |
| Invalid input | identity tests |
| Duplicate account | identity tests (ok:true anti-enum) |
| Role isolation | Hardcoded PATIENT in code; no client role tests specifically named in this pass |
| Verification | identity verification tests |
| Session on register | Not created (by design) |
| Rate limiting | identity tests for register IP |
| Direct public action vs domain | Action wrapper inspected; tests hit domain function |

```text
Application tests: NOT RUN — read-only capability audit
Typecheck: NOT RUN
Lint: NOT RUN
Build: NOT RUN
Database migration: NOT RUN
Production verification: NOT RUN
```

---

## 23. Documentation Consistency

| Source | Statement | Code |
| --- | --- | --- |
| Legal pages | Production portal not currently offered | Consistent **while flag false** |
| O-B-01 | Gate verified disabled | **Consistent** |
| Footer link to `/patient/register` | Link always enabled in nav config | Page reachable but shows **disabled** UX — not a silent enable |
| Decisions / gates | Keep registration false until green | **Consistent** |

No contradiction of the form “docs say unavailable but flag-false server creates accounts.”

---

## 24. Final Registration Classification

```text
C. IMPLEMENTED BUT SAFELY DISABLED
```

A substantially complete workflow exists; Production/public use is deliberately disabled through authoritative server-side controls (`PATIENT_REGISTRATION_ENABLED` + public `isRegistrationAvailable()`).

Not A (exists), not B (complete enough), not D (not enabled here), not E (no client bypass when disabled).

---

## 25. O-B-01 Claim Verdict

```text
O-B-01 REGISTRATION CLAIM: CONFIRMED
ACTUAL REGISTRATION STATUS: C — IMPLEMENTED BUT SAFELY DISABLED
AUTHORITATIVE GATE: src/lib/identity/registration.ts :: registerPatient
                     (+ src/lib/identity/runtime.ts :: isRegistrationAvailable for public path)
CLIENT BYPASS: NO
PRODUCTION ENABLED: UNKNOWN (Production not accessed); repository default/example: NO
PRODUCTION READINESS: NOT READY
```

---

## 26. Findings / Severity

| ID | Finding | Severity | Evidence | Impact | Recommended next controlled task |
| --- | --- | --- | --- | --- | --- |
| F-01 | Registration fully implemented but disabled | INFO | `registration.ts`, UI, tests | Expected safe state | None for enablement until gates |
| F-02 | Client cannot create accounts when flag false | INFO | Action + domain gates | Gate holds | Keep flag false |
| F-03 | `registerPatient` does not re-check full production runtime gates | P2 | Only checks `registrationEnabled` (+ sessionSecret) | Future caller risk if action wrapper skipped | Optional O-B-02 hardening |
| F-04 | Nav exposes `/patient/register` even when disabled | P3 | `navigation.ts` | Shows “not available” page | Polish / optional hide link |
| F-05 | Enablement still blocked by O11/O10/infra | P0/P1 (release) | O-B-01 / audit / gates | Must not enable yet | Continue blocker groups + legal |
| F-06 | SMTP/OTP required for successful end-to-end register when enabled | P1 | Email send + phone OTP path | Incomplete Prod experience if flag flipped early | Group 2+ provider config (when authorized) |

**No P0 client-bypass defect found for `PATIENT_REGISTRATION_ENABLED=false`.**

---

## 27. Remediation Recommendations

Do **not** implement in this task.

1. Keep `PATIENT_REGISTRATION_ENABLED=false` until Priority-1 gates + O11/O10 close.  
2. Optional later hardening: call `isPatientRegistrationRuntimeAllowed` inside `registerPatient` (defense in depth).  
3. Optional UX: hide or relabel nav link when unavailable.  
4. Do not enable registration as a shortcut around legal/infra blockers.

---

## 28. Next-Step Recommendation

```text
O-B-01 Group 1 complete; proceed to Group 2
```

(plus parallel **Legal/professional review required** for O11/O10 — not registration re-implementation)

**No registration implementation required.**  
**O-B-01 registration remediation required:** **No** (claim confirmed).  
**O-B-02 registration hardening:** optional later (P2), not blocking this classification.

---

## 29. Files Inspected

Including but not limited to: `registration.ts`, `runtime.ts`, `config.ts`, `actions.ts` (patient), `PatientRegisterForm.tsx`, `register/page.tsx`, `middleware.ts`, `navigation.ts`, `schema.ts`, `constants.ts`, `verification.ts`, `authentication.ts`, `production-gates.test.ts`, `identity.test.ts`, `.env.example`, `validate-server-config.ts`, `operator-production-gates.ts`, `drizzle/0001_identity_foundation.sql`, O-B-01 reports, Option B audit, LEGAL_REVIEW_REQUIRED excerpts.

## 30. Files Created

`docs/O_B_00_PATIENT_REGISTRATION_CAPABILITY_AUDIT.md`

## 31. Files Modified

**None** (application and prior docs untouched by this audit).

## 32. Database Changes

**None.**

## 33. Production Changes

**None.** Production **not accessed**.

## 34. Git Changes

Report file untracked only (when written). No commit. No push. JPEG remains untracked. HEAD unchanged at `7974175`.

## 35. Final Status

See block below.

## 36. STOP

---

```text
O-B-00 FINAL STATUS
Registration implementation:
IMPLEMENTED BUT SAFELY DISABLED
Authoritative server-side gate:
src/lib/identity/registration.ts :: registerPatient
(+ public path: src/lib/identity/runtime.ts :: isRegistrationAvailable /
 src/app/patient/actions.ts :: registerPatientAction)
Client bypass:
NO
Production enabled:
UNKNOWN (not accessed); repository default/example NO
O-B-01 registration claim:
CONFIRMED
Release impact:
INFORMATIONAL (capability); enablement remains P0/P1 blocked by other gates
Recommended next controlled task:
O-B-01 Group 1 complete; proceed to Group 2
Option B:
PROTECTED
Option C:
BLOCKED
Production:
NOT ACCESSED
Database:
NOT MODIFIED
GitHub:
NO COMMIT / NO PUSH
STOP.
```

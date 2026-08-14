# Phase 1B Security Audit — Identity Foundation

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase1-identity-d73b`  
**PR:** https://github.com/ravishori/dr-vandana-website/pull/12  

**Overall status: PRODUCTION BLOCKED**

This document is a code-level security and production-readiness review of the Phase 1 identity foundation. It is **not** legal advice. It does **not** claim DPDP, HIPAA, medical-record, or professional-ethics compliance.

Phase 1B does **not** implement appointments, WhatsApp, clinical records, staff UI, child accounts, Super Admin configuration, or a website CMS.

Passing tests are necessary and not sufficient for production security.

---

## Executive Summary

The Phase 1 identity foundation is architecturally aligned with the approved Option B direction: PostgreSQL/Drizzle, hashed secrets, server-side sessions, RBAC with `SUPER_ADMIN ≠ ALL_DATA_ACCESS`, mandatory TOTP for privileged roles, fail-closed OTP in production, and gated patient registration.

A code-level review found several **real defects** that were corrected in this audit:

- Single-use verification, OTP, password-reset, and MFA recovery tokens were not consumed atomically.
- OTP verification and account activation were not one transaction.
- Public email/OTP APIs leaked account existence through cooldown and provider-error responses.
- Authenticated account pages could be statically prerendered at build time.
- Patient login trusted `ACTIVE` status without requiring both verifications.
- TOTP codes could be replayed inside the 30-second window.
- Email verification ran automatically on GET, which email scanners can prefetch.
- HMAC hashes for different token types shared one unkeyed namespace.

After those fixes, the remaining production decision is still **PRODUCTION BLOCKED**. PostgreSQL vendor/region, OTP vendor, SMTP, privacy/terms/consent review, MFA enrollment/recovery policy, security review, and deployment verification are unresolved. `PATIENT_REGISTRATION_ENABLED=false` remains the safe default.

No Critical in-code vulnerability remains that this review could both prove and safely fix without inventing an unsafe recovery or provider.

---

## Scope

In scope:

- `src/lib/identity/*`
- `src/app/patient/*`
- `src/app/psychologist/practice/*`
- `src/app/super-admin/*`
- `src/middleware.ts`
- `drizzle/0001_identity_foundation.sql`
- `drizzle/0002_mfa_replay_guard.sql`
- `.github/workflows/ci.yml`
- `.env.example`
- `src/data/legal.ts`
- Identity-related cookies, CSRF assumptions, RBAC, audit logs, and tests

Out of scope (not built, not audited as a product):

- Appointment engine, slots, calendar, availability
- WhatsApp
- Clinical records, notes, documents
- Payments and teleconsultation
- Child accounts and staff functionality
- Super Admin configuration dashboard
- Website CMS

The existing HMAC psychologist question portal (`drvandana_portal_session`) was checked only to confirm it was not weakened.

---

## Methodology

Each identity operation was traced:

```text
Browser
 ↓
Route / Server Action
 ↓
Validation
 ↓
Authentication
 ↓
Authorization
 ↓
Database
 ↓
Response
```

Static searches covered `console.log`, passwords, OTP, tokens, secrets, sessions, cookies, `authorization`, `dangerouslySetInnerHTML`, and `eval(`. Findings were reviewed manually.

Baseline before remediation:

- 82 tests passing
- lint passing
- typecheck passing
- build passing
- `npm audit --omit=dev`: 0 vulnerabilities

---

## Security Findings

### F1 — Non-atomic single-use tokens

- **Severity:** HIGH
- **Location:** `verification.ts`, `otp.ts`, `password-reset.ts`, `mfa.ts` (pre-fix)
- **Risk:** Concurrent requests could consume the same email token, OTP, reset token, or recovery code twice.
- **Evidence:** Read-then-update without `used_at IS NULL` / hash / expiry in the `UPDATE … RETURNING` predicate.
- **Recommendation:** Consume with a conditional update that returns a row only for the winner.
- **Status:** FIXED

### F2 — OTP verify and activation were separate

- **Severity:** HIGH
- **Location:** `verifyPhoneOtpAndActivate` (pre-fix)
- **Risk:** An OTP could be marked verified while the user remained `PENDING_VERIFICATION`, or activation could proceed without a durable consume under race.
- **Evidence:** `verifyPhoneOtp` then `completePhoneVerificationAndActivate` on separate statements.
- **Recommendation:** One transaction; activate only `PENDING_VERIFICATION`.
- **Status:** FIXED

### F3 — Public cooldown / provider errors enumerated accounts

- **Severity:** HIGH
- **Location:** `resendEmailVerification`, `requestPhoneOtpForPendingUser` (pre-fix)
- **Risk:** Attackers could distinguish registered vs unknown emails because only existing pending accounts returned `RATE_LIMITED` / `COOLDOWN` / provider failure.
- **Evidence:** Generic success for missing users; typed failures only after a user row was loaded.
- **Recommendation:** Public identifier APIs return the generic success message for cooldown and provider failure. IP-wide limits may still say “wait”. Direct `OtpService` still returns `COOLDOWN` when `userId` is already known.
- **Status:** FIXED

### F4 — Authenticated pages could be statically prerendered

- **Severity:** HIGH
- **Location:** `/patient/account`, `/super-admin/signed-in` (build output)
- **Risk:** Cookie-backed pages prerendered at build time because `cookies()` was not reached when identity context failed closed.
- **Evidence:** Next.js build listed those routes as static (`○`).
- **Recommendation:** `export const dynamic = "force-dynamic"` on patient, practice, and Super Admin layouts. Server-side session checks remain mandatory.
- **Status:** FIXED

### F5 — Patient login trusted `ACTIVE` without verification timestamps

- **Severity:** HIGH
- **Location:** `loginWithPassword` (pre-fix)
- **Risk:** A patient row forced to `ACTIVE` without `emailVerifiedAt` and `mobileVerifiedAt` could sign in.
- **Evidence:** Status check only; no PATIENT verification defense in depth.
- **Recommendation:** PATIENT login requires both verification timestamps.
- **Status:** FIXED

### F6 — TOTP replay inside the validation window

- **Severity:** HIGH
- **Location:** `mfa_credentials` / `verifyMfaChallenge` (pre-fix)
- **Risk:** The same TOTP could be accepted twice within the 30s step (and adjacent window).
- **Evidence:** Successful validation reset failure counts but did not store the accepted time-step.
- **Recommendation:** Persist `last_verified_step`; reject `step <= last_verified_step`. Additive migration `drizzle/0002_mfa_replay_guard.sql`.
- **Status:** FIXED

### F7 — Email verification consumed on GET

- **Severity:** HIGH
- **Location:** `src/app/patient/verify-email/page.tsx` (pre-fix)
- **Risk:** Mail scanners and prefetch can hit the link and consume a single-use token before the patient confirms.
- **Evidence:** Server page called `verifyEmailAction(token)` during render.
- **Recommendation:** Show a confirm control; consume only from a Server Action POST.
- **Status:** FIXED

### F8 — MFA session completion was not bound to the user

- **Severity:** MEDIUM
- **Location:** `markSessionMfaCompleted` (pre-fix)
- **Risk:** A session id that did not belong to the authenticating user could be marked MFA-complete.
- **Evidence:** Update filtered only by `sessions.id`.
- **Recommendation:** Require matching `userId` and `revoked_at IS NULL`; fail the MFA attempt otherwise.
- **Status:** FIXED

### F9 — Hash namespace collision across token types

- **Severity:** MEDIUM
- **Location:** `hashWithSecret` (pre-fix)
- **Risk:** Session, OTP, email, reset, recovery, IP, and user-agent values hashed with the same HMAC key and no purpose prefix could theoretically collide.
- **Evidence:** `HMAC(secret, value)` with no purpose.
- **Recommendation:** `HMAC(secret, purpose + ":" + value)` with explicit purposes.
- **Status:** FIXED

### F10 — Password reset did not invalidate prior unused tokens

- **Severity:** MEDIUM
- **Location:** `requestPasswordReset` (pre-fix)
- **Risk:** Older unused reset links remained valid after a newer request.
- **Evidence:** Insert-only; no supersede of unused rows.
- **Recommendation:** Mark previous unused tokens used, then insert the new hash.
- **Status:** FIXED

### F11 — OTP resend left previous unused codes valid

- **Severity:** MEDIUM
- **Location:** `sendPhoneVerification` (pre-fix)
- **Risk:** Verify used the latest row only, but older unused hashes remained until expiry.
- **Recommendation:** Expire previous unused OTP rows on successful resend.
- **Status:** FIXED

### F12 — Registration hashed the password after duplicate lookup

- **Severity:** MEDIUM
- **Location:** `registerPatient` (pre-fix)
- **Risk:** Duplicate identifiers returned faster than new accounts, a minor timing oracle.
- **Recommendation:** Hash first, then look up; unique constraints still catch races with a generic failure.
- **Status:** FIXED

### F13 — MFA routes reachable without a practice cookie

- **Severity:** MEDIUM
- **Location:** `src/middleware.ts` (pre-fix)
- **Risk:** `/psychologist/practice/mfa` and `/super-admin/mfa` skipped cookie presence. Pages still had to authorize, but middleware was inconsistent.
- **Recommendation:** Require `drv_practice_session` like other private routes. Middleware remains a hint; server authorization is mandatory.
- **Status:** FIXED

### F14 — Hash compare used `===`

- **Severity:** MEDIUM
- **Location:** OTP verify (pre-fix)
- **Risk:** Variable-time string compare of HMAC hex.
- **Recommendation:** Consume by SQL equality on the stored hash (no extra JS compare), keep `tokensMatch` available.
- **Status:** FIXED

### F15 — Verification / reset tokens in query strings

- **Severity:** MEDIUM
- **Location:** Email links; `/patient/verify-email?token=`; `/patient/reset-password?token=`
- **Risk:** Tokens may appear in access logs, Referer, browser history, and analytics. Prefetch is mitigated for email verify (F7). Reset still requires a POST with the new password.
- **Recommendation:** Keep hashed storage and short TTL. Do not log query strings. Referrer policy is `strict-origin-when-cross-origin`. A future one-time POST-only flow can be considered; do not put tokens in client analytics.
- **Status:** ACCEPTED with mitigations; remaining production hygiene

### F16 — MFA recovery if authenticator and all codes are lost

- **Severity:** HIGH (operational) / not a silent bypass
- **Location:** Policy O12; `docs/PHASE_1_IMPLEMENTATION.md`
- **Risk:** Dr. Vandana may be the only psychologist. There is **no** production MFA bypass flag, env bypass, or hidden route. Lost device **and** lost recovery codes require a reviewed break-glass procedure that does not exist as a product flow.
- **Evidence:** `isPrivilegedProvisionAllowed` is false in production; no disable-MFA action.
- **Recommendation:** Do **not** invent an unsafe recovery. Keep O12 OPEN. Document offline recovery with backup, identity verification, and audit. A second Super Admin recovery UI is deferred.
- **Status:** OPEN — production gate

### F17 — Production providers and privacy copy

- **Severity:** HIGH (release blocker)
- **Location:** Config, legal copy, decision register
- **Risk:** Enabling registration without PostgreSQL, OTP, SMTP, and reviewed privacy/terms would process patient data without approved processors or notices.
- **Evidence:** `OTP_PROVIDER` production path fails closed; `PATIENT_REGISTRATION_ENABLED` defaults false; `src/data/legal.ts` marks patient-account copy **REQUIRES REVIEW**.
- **Recommendation:** Keep registration disabled until gates in this document and `PHASE_1_IMPLEMENTATION.md` are cleared by humans.
- **Status:** OPEN — PRODUCTION BLOCKED

### F18 — scrypt cost vs latest OWASP Argon2id guidance

- **Severity:** LOW / INFORMATIONAL
- **Location:** `src/lib/question-portal/password.ts`
- **Risk:** Node default scrypt `N=16384, r=8, p=1` is below some current OWASP Argon2id recommendations. It is the existing psychologist-portal algorithm, uses a 16-byte random salt, 64-byte key, and `timingSafeEqual`.
- **Evidence:** Switching to Argon2id requires a native dependency and a dual-hash verifier. Decision O13 is OPEN.
- **Recommendation:** Do not switch in Phase 1B. Parameters are now explicit so they cannot drift. Revisit Argon2id with a migration plan when O13 is approved.
- **Status:** ACCEPTED — O13 remains OPEN

### F19 — Account lockout policy

- **Severity:** INFORMATIONAL
- **Location:** Login rate limits; MFA `mfaMaxFailures` / `mfaLockoutMs`
- **Risk:** Permanent password lockout from trivial brute force would create a denial-of-service against the sole psychologist.
- **Evidence:** Login uses IP + email rate limits (8 / 15 minutes). MFA uses temporary lockout (8 failures / 15 minutes). No permanent password lockout.
- **Recommendation:** Keep this behaviour. Document it.
- **Status:** ACCEPTED

### F20 — CSRF depends on framework origin checks plus SameSite=Lax

- **Severity:** INFORMATIONAL / MEDIUM residual
- **Location:** Next.js Server Actions; `drv_practice_session` SameSite=Lax
- **Risk:** SameSite=Lax does not stop all CSRF, especially some cross-site GET landings and older browsers. Mutations use Server Actions, which Next.js 16 checks against the Origin of the action request. Cookies are httpOnly (not readable by XSS as easily as localStorage, but XSS can still submit same-origin forms).
- **Evidence:** No custom CSRF token. Cookie is Lax so email-link GET navigation can set/keep a session. Question portal cookie remains Strict.
- **Recommendation:** Do not weaken Lax. Do not assume SameSite alone is sufficient. Keep mutations on Server Actions. Future admin POSTs should keep the same pattern. O14 remains OPEN for formal confirmation.
- **Status:** ACCEPTED with documentation

### F21 — Multiple concurrent sessions

- **Severity:** LOW
- **Location:** `createSession`
- **Risk:** Stolen cookies remain valid until idle/absolute expiry or password reset (which revokes all sessions).
- **Evidence:** Login creates a new session and does not revoke others. Password reset revokes all.
- **Recommendation:** Acceptable for Phase 1. Optional later “sign out everywhere”.
- **Status:** ACCEPTED

### F22 — Dev-only `drizzle-kit` advisory

- **Severity:** LOW
- **Location:** `npm audit` (dev)
- **Risk:** Moderate esbuild advisory via `drizzle-kit`. Not in the production dependency set.
- **Recommendation:** Do not blindly upgrade. `npm audit --omit=dev` is clean.
- **Status:** ACCEPTED

---

## Authentication Review

Patient registration validates name, email, Indian mobile, password policy, confirmation, and terms acknowledgement. Email and mobile are normalized. Duplicates return a generic failure. Passwords are scrypt-hashed before insert. Accounts start as `PENDING_VERIFICATION` with null verification timestamps. No session is created at registration.

Email verification hashes a 32-byte opaque token (`base64url`), stores only the HMAC, expires, and is single-use under a conditional update. Resend invalidates unused prior tokens and is IP rate-limited. Public resend is enumeration-safe.

Mobile OTP uses `crypto.randomInt`, 10-minute TTL, 5 attempts, 60-second resend cooldown, IP and account throttles, hashed storage, and a test-only provider that production refuses. Public send-by-email is generic. Direct service cooldown still exists for known `userId`.

Login verifies password with `timingSafeEqual`, rejects unverified / suspended / disabled accounts, checks expected role, and issues a **new** opaque session (not a reused pre-login token). PATIENT additionally requires both verification timestamps. Privileged roles get `mfaCompleted=false` until TOTP or a recovery code succeeds.

Password reset is enumeration-safe, hashed, expiry-bound, single-use, rate-limited, supersedes older unused tokens, and revokes all sessions. It does not authenticate the user.

There is no public Super Admin or psychologist registration. Provisioning is refused when `NODE_ENV=production`.

---

## Session Review

Session identifiers are `generateOpaqueToken(32)` (256 bits, base64url), HMAC-SHA256 hashed with purpose `session`, unique-indexed, and not derived from user id, email, or time.

Cookie `drv_practice_session`:

| Flag | Value |
|---|---|
| HttpOnly | yes |
| Secure | production only |
| SameSite | Lax (email-link GET landings; O14 still OPEN) |
| Path | `/` |
| Domain | unset (host-only) |
| Max-Age | idle window |

Idle and absolute timeouts:

| Role | Idle | Absolute |
|---|---|---|
| PATIENT | 12h | 24h |
| PSYCHOLOGIST | 30m | 8h |
| SUPER_ADMIN | 15m | 4h |

Server-side validation checks hash, revocation, idle expiry, and absolute expiry, then slides idle expiry up to the absolute cap.

The question-portal cookie `drvandana_portal_session` remains SameSite=Strict and was not weakened.

Session fixation: login always inserts a new row and cookie value. MFA completion cannot attach to another user’s session.

---

## RBAC Review

Authorization is `Authentication + Role + Permission + Ownership` in `AuthorizationService`. Hidden UI, URL shape, and cookies are not sources of truth. Session rows do not store role names.

`SUPER_ADMIN` receives practice/platform permissions only. Clinical permissions exist in the catalog and are granted to nobody. `grantPermissionToRole` refuses clinical grants. Patients cannot assign `SUPER_ADMIN` to themselves. Super Admin cannot assign extra roles to themselves through `assignRole`.

IDOR: Patient A is denied Patient B’s profile with `forbidden` (not a distinct existence oracle beyond “forbidden”). Password-reset and verification tokens are unguessable hashes, not patient ids. Server pages load the session user, not a client-supplied patient id.

Middleware redirects unauthenticated private routes and sets `X-Robots-Tag: noindex, nofollow`. It is not a substitute for server checks.

---

## MFA Review

Password login for PSYCHOLOGIST and SUPER_ADMIN cannot complete privileged actions until `mfaCompletedAt` is set. TOTP secrets are AES-256-GCM at rest. Invalid codes fail. Replay is blocked by `last_verified_step`. Recovery codes are HMAC-hashed, single-use, and consumed atomically with session ownership.

There is no production MFA disable flag. Enrollment confirm requires `enrolled_at IS NULL`.

Lost authenticator: remaining unused recovery codes can complete MFA. Lost authenticator **and** lost codes: **no in-app recovery**. That gap is intentional and OPEN (O12). Do not add an environment bypass.

---

## OTP Review

| Control | Behaviour |
|---|---|
| Generation | `randomInt` 6-digit |
| Storage | HMAC purpose `otp` |
| TTL | 10 minutes |
| Attempts | 5 |
| Resend cooldown | 60 seconds |
| IP / account throttles | yes |
| Test provider | `testOnly: true`; production forbidden |
| Production without vendor | fail closed |
| Replay | `verified_at` conditional update |
| Enumeration (public API) | generic success |

Provider errors do not include vendor text in the browser.

---

## Database Review

`drizzle/0001_identity_foundation.sql` is additive: PKs, FKs, unique email/mobile/public id/token hashes, indexes, no clinical tables. Cascades delete identity children with the user; role catalog uses restrict where appropriate. Down file exists for disaster recovery and must not be run in production without a restore plan.

`drizzle/0002_mfa_replay_guard.sql` adds nullable `last_verified_step`. Not destructive.

The application does not auto-migrate on boot. Apply with `APPLY_IDENTITY_MIGRATION=true`.

Transactions cover: user+profile+role+email token on register; email consume+`emailVerifiedAt`; OTP consume+activate; password hash+token consume+session revoke; MFA enroll+recovery hashes; recovery consume+session MFA flag.

---

## Privacy Review

`src/data/legal.ts` still describes an informational website and states that production patient accounts are **not** currently offered. A marker section says copy **REQUIRES REVIEW** before public registration. That is accurate and is **not** DPDP/HIPAA compliance.

Sitemap and robots do not list `/patient`, `/psychologist`, or `/super-admin`. Private layouts set `robots: noindex`. Patient pages render only the signed-in user’s display name and public id after a server session check.

Do not claim legal compliance from this audit.

---

## Dependency Review

Production (`npm audit --omit=dev`): 0 vulnerabilities at audit time.

Dev: moderate esbuild advisory via `drizzle-kit`. Not upgraded blindly.

Next.js 16 App Router: identity mutations are Server Actions / server modules. Password hashes, MFA secrets, and raw tokens are not passed into client components except the email-link token the user already received (confirm form / reset form).

---

## Test Results

Final validation for this audit revision:

```text
npm test        86/86 passing
npm run lint    passing
npm run typecheck passing
npm run build   passing
```

Identity tests: 28. Other suites: 58.

Build: `/patient/*`, `/psychologist/practice/*`, and `/super-admin/*` are dynamic (`ƒ`). Cookie-backed account pages are no longer static.

`npm audit --omit=dev`: 0 vulnerabilities at audit time. Dev-only `drizzle-kit` / esbuild moderate advisory was not upgraded.

---

## Production Blockers

Keep `PATIENT_REGISTRATION_ENABLED=false` until all of the following are done by humans:

1. PostgreSQL provider and region (**PRODUCTION PROVIDER CONFIGURATION REQUIRED** — O1, O2)
2. OTP / SMS provider with production credentials (O4) — code fails closed today
3. SMTP production configuration
4. MFA enrollment and recovery verification for psychologist and Super Admin; O12 recovery policy
5. Privacy policy, terms, and consent review (**REQUIRES REVIEW** — O11)
6. Independent security review of the deployed environment
7. Deployment verification (migrations applied deliberately, secrets set, no provision script in production)
8. No default Super Admin password (already true; keep it that way)

---

## Recommended Remediation

Completed in Phase 1B (this change set):

- Atomic token / OTP / recovery consume
- OTP + activation transaction
- TOTP replay guard + migration 0002
- HMAC purpose prefixes
- Enumeration-safe public resend/OTP responses
- Password hash-before-lookup
- PATIENT verification timestamps at login
- MFA session ownership
- force-dynamic private layouts
- MFA cookie required in middleware
- Email verify confirm (no GET consume)
- Explicit scrypt parameters
- Stronger audit metadata stripping
- Regression tests

Still required before production, not implemented here:

- Vendor selection and contracts
- Legal copy
- MFA lost-device policy
- Hosted environment hardening (WAF, log redaction of query strings, backup/PITR)

---

## Environment variable classification

From `.env.example` (names only; never commit values):

### Required security secret

- `AUTH_SESSION_SECRET`
- `MFA_ENCRYPTION_KEY`
- `SESSION_SECRET` (existing question portal; separate from practice sessions)
- `PSYCHOLOGIST_PASSWORD_HASH` (existing portal)
- `SMTP_PASSWORD`
- `OTP_API_KEY` (when a vendor exists)
- `AI_API_KEY` (unrelated to identity)
- `UPSTASH_REDIS_REST_TOKEN` (when used)

### Provider configuration

- `DATABASE_URL`
- `OTP_PROVIDER`
- `EMAIL_PROVIDER`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- `APP_BASE_URL`
- `AI_PROVIDER`, `AI_API_BASE_URL` (unrelated)

### Feature flag

- `PATIENT_REGISTRATION_ENABLED` — safe default **false**
- `IDENTITY_PROVISION_ENABLED` — safe default **false**; ignored in production provisioning script
- `ERROR_EMAIL_ENABLED`

### Development-only variable

- `PROVISION_ROLE`, `PROVISION_EMAIL`, `PROVISION_PASSWORD`, `PROVISION_DISPLAY_NAME`, `PROVISION_MOBILE`
- Test OTP provider names (`test` / `mock` / `dev`) — refused in production

### Migration control

- `APPLY_IDENTITY_MIGRATION` — must be explicit; never auto on boot

Production cannot accidentally run `PROVISION_PASSWORD` seeding: `scripts/provision-identity-user.ts` exits when `NODE_ENV=production`, and `isPrivilegedProvisionAllowed` is hard-false in production.

---

## Document control

| Field | Value |
|---|---|
| Audit | Phase 1B identity security |
| Implementation | `docs/PHASE_1_IMPLEMENTATION.md` |
| Decisions | `docs/PATIENT_PRACTICE_DECISIONS.md` (statuses unchanged unless noted) |
| Next | Human review of findings. Do not start Phase 2 from this document. |

# Step-Up Authentication - Threat Model for Independent Security Review

**Status: PROPOSED, not approved.** The 10-minute window in `guard.ts` (`DEFAULT_STEP_UP_MAX_AGE_MS`) is retained for now and is a proposal for the owner and an independent reviewer. This document describes what exists, what is assumed and what is missing. Nothing here has been independently reviewed.

## 1. What exists today
- The guard asks an injected `AccessFactsResolver` for `stepUpVerifiedAt(principal)`. A step-up is accepted only if the timestamp is a valid date, not in the future, and at most `stepUpMaxAgeMs` (default 10 minutes) old. Otherwise `step_up_required`.
- Required for: `sign`, `export`, `release` on Category A, and `export` on Category B (policy matrix, Doc 10, still DRAFT).
- Callers cannot assert step-up; no resolver exists yet.
- The session table has `mfa_completed_at` but no dedicated step-up column and no step-up endpoint. A real implementation needs a migration (not authorised).

## 2. Sensitive actions that should require step-up (proposal, owner to confirm)
Signing a clinical note or addendum; exporting or printing records; releasing a document to a patient; changing guardian/representative access; closing a safety concern; changing the prioritisation scheme or practice holidays; changing MFA devices or recovery codes; disclosure to a third party. Reading ordinary Category A records during a consultation does not require step-up (proposal).

## 3. Assets and actors
Assets: signed records, exports, disclosure releases, access to patient data. Actors: the legitimate psychologist; an attacker with a stolen session cookie; an attacker with the password only; malware or XSS in the browser; a person with physical access to an unlocked device; a malicious insider with database access.

## 4. Threats and proposed controls
| # | Threat | Control (proposed) | Status |
|---|---|---|---|
| S1 | Stolen session cookie used for a sensitive action | step-up requires a fresh TOTP code, which the thief lacks; step-up record bound to the session id | needs implementation |
| S2 | Step-up reused by another session or user | store `step_up_verified_at` on the session row (session id + user id), never in a cookie or client claim | needs migration |
| S3 | Replay of a captured TOTP code | existing TOTP replay guard (single use per time step, migration 0002) applied to step-up codes; rate limit and lockout on failures | partly exists |
| S4 | Window extended by activity or reused for unrelated actions | absolute expiry from verification (no sliding); decision needed between a time window and single-use per action | open |
| S5 | Expiry between check and commit on a long operation | re-check freshness at commit inside the same transaction as the access-log write | to design |
| S6 | Client asserts "step-up done" | guard resolves it server side only (done); static test blocks exporting the raw policy (done) | done |
| S7 | Revocation not honoured | step-up invalidated on logout, session revocation, password change, MFA reset, role change, care-relationship end, account suspension; guard re-reads facts on every call (done: no caching) | partly done |
| S8 | Recovery codes used as step-up | decision needed: recovery codes should not satisfy step-up (proposal) | open |
| S9 | Brute force of the step-up prompt | same rate limiting as login, per user and per session, with security events | to implement |
| S10 | Shared or unlocked device | short window, idle timeout, visible step-up status, explicit "end step-up" action | to design |
| S11 | CSRF triggering a sensitive action inside a valid window | CSRF token and SameSite=Strict on action endpoints; sensitive actions need an explicit confirmation field | to implement |
| S12 | XSS in an authenticated page performs actions during the window | CSP, output encoding; sensitive actions require a fresh nonce, so the window alone is not enough (open design point) | open |
| S13 | Clock skew or manipulated timestamps | server time only; future-dated or invalid timestamps rejected (done) | done |
| S14 | Idempotency: double submission of a sensitive action | idempotency key on sign/export/release | to implement |
| S15 | Audit gaps | step-up success, failure and expiry as security events; sensitive action log includes whether step-up was satisfied | to implement |

## 5. Questions for the independent reviewer
Is a time window acceptable for signing, or should it be single use? Is 10 minutes appropriate? Should step-up be per action class? How should step-up interact with long exports? Are recovery codes acceptable? Is TOTP alone adequate for a single-clinician practice, or is a hardware key advisable?

## 6. Residual risk
Until a step-up endpoint, session column, rate limiting and tests exist, the guard can only deny sensitive actions (fail closed): no resolver returns a timestamp, so `sign`, `export` and `release` cannot succeed. That is the safe default.

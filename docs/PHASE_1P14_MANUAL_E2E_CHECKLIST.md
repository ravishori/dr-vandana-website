# Phase 1P.14 — Manual E2E Authentication & Persistence Checklist

Use Preview only. Do not modify Production. Do not record passwords, OTPs, TOTP codes, or recovery codes in tickets or chat.

Preview baseline (update after redeploy): use the latest Preview URL from the 1P.14 report.

## Prerequisites

- [ ] Preview deployment READY
- [ ] Staging OTP provider configured (Twilio SMS) — if ABSENT, mark mobile recovery RUNTIME NOT VERIFIED
- [ ] Provisioned psychologist and admin accounts available to the operator
- [ ] Authenticator app available for TOTP

## A. Psychologist — first login / must_change_password

1. Open `/psychologist/practice/login`
2. Sign in with email or mobile + temporary password
3. Complete MFA enroll/verify
4. Complete mandatory password change (≥12 characters)
5. Confirm practice dashboard loads
6. Confirm temporary password no longer works
7. Confirm TOTP still required on next login

## B. Psychologist — session & private routes

1. Visit Patients, Appointments, Settings
2. Sign out
3. Open `/psychologist/practice`, `/psychologist/practice/patients`, `/psychologist/practice/settings` in a new session
4. Expect redirect to login

## C. Mobile password recovery (psychologist)

1. Forgot password → enter verified mobile
2. Expect generic eligibility message (no account-existence leak)
3. Enter SMS OTP (never paste OTP into tickets)
4. Set new password
5. Sign in with new password + TOTP
6. Confirm MFA still required (no session from OTP alone)

## D. Email password recovery (psychologist or admin)

1. Forgot password → email
2. Use reset link from email
3. Set new password
4. Sign in with password + TOTP

## E. Administrator

1. `/super-admin/login` → password → TOTP
2. Forced password change if still flagged
3. Mobile and/or email recovery as above
4. Confirm no clinical data screens beyond configuration placeholder

## F. Patient registration & persistence (fictional data only)

Example identity: `Test Patient A` — disposable email/mobile only.

1. Register → complete verification if enabled
2. Login → open account/profile
3. Save a harmless non-clinical field (e.g. display name)
4. Logout → close browser session
5. New session → login → open profile
6. **PASS only if saved data remains** (WRITE → LOGOUT → NEW SESSION → LOGIN → READ)

## G. Appointment persistence

1. As Test Patient A, create a clearly fictional appointment
2. Logout → new session → login → My Appointments → appointment still listed
3. As psychologist, confirm patient and appointment visible under authorization

## H. Patient isolation

1. Create Test Patient B (fictional)
2. Confirm A cannot open B’s appointment/account URLs (FORBIDDEN / NOT_FOUND)
3. Confirm B cannot open A’s

## I. Privacy smoke

1. Confirm private routes absent from public nav/sitemap intent
2. Confirm unauthenticated private URLs redirect
3. Confirm Ask AI still returns educational answers without patient data

## J. Legacy login note

- `/psychologist/login` (Q&A HMAC) vs `/psychologist/practice/login` (password + TOTP)
- Report separately; do not delete either in this phase

## Result recording

For each section mark: PASS / FAIL / BLOCKED (reason) / NOT RUN  
Never attach secrets.

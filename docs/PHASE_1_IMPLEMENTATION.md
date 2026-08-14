# Phase 1 Implementation — Identity Foundation

**Status:** Implemented in code; **not** a production launch  
**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.

This document describes the Phase 1 identity foundation. It is **not** legal advice and does **not** claim DPDP or professional-ethics compliance.

**Phase 1 does not implement appointments, WhatsApp, clinical records, or a Super Admin configuration dashboard.**

---

## Architecture implemented

- PostgreSQL as the identity system of record, accessed through **Drizzle ORM** (`postgres.js` in app runtimes; **PGlite** for isolated tests only).
- Provider-agnostic connection via `DATABASE_URL`.
- **PRODUCTION PROVIDER CONFIGURATION REQUIRED** — no PostgreSQL vendor or region was selected.
- Serverless-safe connection reuse (`max: 1`, `prepare: false`, module singleton). Database credentials are server-only.
- Existing public website and HMAC psychologist question portal are unchanged.

Existing HMAC cookie `drvandana_portal_session` remains for `/psychologist` Q&A. New practice sessions use cookie `drv_practice_session` and the `sessions` table. Unifying those logins is a later migration.

---

## Database setup

### Local PostgreSQL (recommended)

The repository does not include Docker Compose. For local development:

```bash
# Example only — choose your own local credentials. Do not commit them.
docker run --name drv-postgres \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=drvandana \
  -p 5432:5432 -d postgres:16
```

Or install PostgreSQL locally and create a database.

Set:

```text
DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:5432/drvandana
```

### Apply migrations (never automatic in production)

1. **Backup** the database (and confirm restore procedure).
2. Review `drizzle/0001_identity_foundation.sql`.
3. Apply only with an explicit flag:

```bash
APPLY_IDENTITY_MIGRATION=true DATABASE_URL=postgres://... npm run db:migrate
```

4. **Verify** tables, indexes, and role catalog (`roles`, `permissions`, `role_permissions`).
5. **Rollback / recovery:** restore from backup, or review `drizzle/0001_identity_foundation.down.sql` before any drop. Do not run down migrations in production without a recovery plan.

The application **does not** auto-migrate on boot.

Additive follow-up: `drizzle/0002_mfa_replay_guard.sql` adds `mfa_credentials.last_verified_step` so a TOTP code cannot be replayed inside the validation window. Apply after 0001 with the same explicit flag. Not destructive.

Appointment tables are additive in `drizzle/0003_appointment_engine.sql` (Phase 2). Apply only after 0001 and 0002, with a backup, and the same `APPLY_IDENTITY_MIGRATION=true` flag. See `docs/PHASE_2_APPOINTMENT_ENGINE.md`. **Not a production launch.**

A Phase 1B code-level review is recorded in `docs/PHASE_1B_SECURITY_AUDIT.md`. **Status: PRODUCTION BLOCKED.**

Phase 1C production-gate preparation is recorded in `docs/PHASE_1C_PRODUCTION_GATE_REGISTER.md`. It does **not** enable registration, select vendors, or deploy. Operator YES/NO snapshot (no secret values): `npm run identity:gates`.

---

## Environment variables (names only)

```text
DATABASE_URL
AUTH_SESSION_SECRET
MFA_ENCRYPTION_KEY
OTP_PROVIDER
OTP_API_KEY
PATIENT_REGISTRATION_ENABLED
IDENTITY_PROVISION_ENABLED
EMAIL_PROVIDER
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME
APP_BASE_URL
APPLY_IDENTITY_MIGRATION
PROVISION_ROLE
PROVISION_EMAIL
PROVISION_PASSWORD
PROVISION_DISPLAY_NAME
PROVISION_MOBILE
```

Never commit values. Production identity operations fail closed if `AUTH_SESSION_SECRET` is missing or too short. MFA enrollment fails closed if `MFA_ENCRYPTION_KEY` is not a 32-byte key (64 hex chars or 32-byte base64).

---

## Authentication flow

### Patient

```text
/patient/register
 → email verification (/patient/verify-email)
 → mobile OTP architecture (/patient/verify-phone)
 → ACTIVE
 → /patient/login
 → server session cookie
 → /patient/account
```

Logout revokes the server-side session, then clears the cookie.

Password reset: `/patient/forgot-password` and `/patient/reset-password`. Responses do not reveal whether an email exists. Successful reset revokes sessions. Email verification and password reset use **GET → confirm/form → POST consume** so mail prefetch does not consume tokens. Tokens still appear in emailed URLs (**MEDIUM — ACCEPTED FOR CURRENT PHASE**; see Phase 1B F15 and the Phase 1C register).

Registration remains gated by `PATIENT_REGISTRATION_ENABLED` (safe default `false`; only the string `true` turns it on) and production configuration checks. There is no alternate production bypass.

### Psychologist (new practice identity)

Provisioned only (no public registration). Login: `/psychologist/practice/login`. MFA is mandatory. Existing `/psychologist/login` HMAC portal is unchanged.

### Super Admin

Provisioned only. **No** `/super-admin/register`. Login: `/super-admin/login`. MFA is mandatory. There is **no** configuration dashboard in this phase.

Local provisioning:

```bash
IDENTITY_PROVISION_ENABLED=true \
PROVISION_ROLE=PSYCHOLOGIST \
PROVISION_EMAIL=... \
PROVISION_PASSWORD=... \
PROVISION_DISPLAY_NAME=... \
npm run db:provision
```

This script **refuses** `NODE_ENV=production`.

---

## RBAC

Roles: `SUPER_ADMIN`, `PSYCHOLOGIST`, `STAFF` (reserved, no permissions), `PATIENT` (ownership only).

Super Admin receives practice/platform permissions **without** clinical permissions.

Psychologist receives a subset of practice permissions, not `MANAGE_SYSTEM_SETTINGS`, `MANAGE_ROLES`, `MANAGE_USERS`, or `MANAGE_PUBLIC_SITE_SETTINGS`.

Clinical permissions exist in the catalog and are **granted to nobody**. Option C remains deferred. Granting clinical permissions is refused in code.

`AuthorizationService` enforces authentication, role, permission, ownership, and MFA completion on the server.

---

## Session model

- Opaque 32-byte token in httpOnly cookie `drv_practice_session` (not derived from user id, email, or timestamp)
- SHA-256 HMAC hash stored server-side with purpose prefix `session:` (also `otp`, `email-verify`, `password-reset`, `mfa-recovery`, `ip`, `user-agent`)
- Idle + absolute expiry (shorter for psychologist and Super Admin)
- Revocation timestamp
- MFA completion timestamp for privileged roles; completion requires the session to belong to that user and not be revoked
- Cookie flags: `HttpOnly`, `Secure` in production, `Path=/`, host-only (no Domain), **`SameSite=Lax`**

**SameSite decision (O14 still OPEN in the decision register; Phase 1 implementation choice):** Lax, so email verification and password-reset links can complete a top-level GET without dropping a just-established session. The existing question-portal HMAC cookie remains `SameSite=Strict`. CSRF for mutations relies on Next.js Server Action origin checks plus httpOnly cookies (not localStorage). SameSite alone is not treated as a complete CSRF control.

Private identity layouts set `dynamic = "force-dynamic"` so cookie-backed pages are not statically prerendered.

---

## Password hashing

Existing scrypt helper (`src/lib/question-portal/password.ts`) is reused with **explicit** Node parameters `N=16384, r=8, p=1`, 16-byte random salt, 64-byte key, and `timingSafeEqual`. These match Node’s historical defaults and the psychologist portal hashes. **Argon2id remains OPEN** (decision O13). Phase 1B did not switch algorithms: a dual-hash migration would be required, and scrypt here is not a weakening. Dual-hash migration is not implemented because the algorithm did not change.

Policy: minimum 12 characters, reject a short common-password list, reject passwords containing the email local-part.

---

## MFA

TOTP via `otpauth` (SHA1, 6 digits, 30s). Secrets stored with AES-256-GCM using `MFA_ENCRYPTION_KEY`. Recovery codes are hashed, one-time, shown only at enrollment. The last accepted TOTP time-step is stored so the same code cannot be reused in-window.

Email verification is **not** consumed on GET. The patient confirms via a Server Action so mail scanners cannot prefetch the single-use link.

There is **no** production MFA bypass flag or hidden URL.

Passwords are **not** permanently locked out by brute force. Login uses IP + account rate limits. MFA uses a temporary lockout (8 failures / 15 minutes). That is intentional, to avoid locking the sole psychologist out with trivial attempts.

### Lockout recovery (sole psychologist)

If Dr. Vandana loses the authenticator **and** recovery codes:

1. Do not disable MFA in production via environment flags.
2. A second Super Admin, if provisioned, may perform a future controlled recovery (not implemented as a dashboard in Phase 1).
3. Break-glass: restore from a known-good backup after identity verification, or use a documented offline procedure to replace `mfa_credentials` / recovery hashes through a reviewed database change with backup first.

Final MFA recovery policy remains **OPEN** (O12).

---

## OTP abstraction

`OtpDeliveryProvider` + `OtpService`. The domain service generates cryptographically random 6-digit codes, hashes them, enforces expiry, attempts, and cooldowns.

- `test` / `dev` providers are marked **TEST ONLY**.
- Production refuses test/mock/dev providers and does not return `{ ok: true }` without a configured production provider.
- No production SMS vendor was selected. **PRODUCTION PROVIDER CONFIGURATION REQUIRED**.

---

## Email

Identity mail goes through `EmailService` wrapping existing Nodemailer SMTP. Verification mail contains a link only — no clinical content.

---

## Security controls

- Rate limits on register, login, reset, email resend, OTP send/verify, MFA verify (memory in development/tests; Upstash in production when the existing appointment rate-limit store is `upstash`; fail-closed if production is misconfigured)
- Enumeration-safe messages for registration, login, password reset, and public email/OTP resend (cooldown and provider failure do not disclose whether an account exists; IP-wide limits may still ask the client to wait)
- Single-use email, OTP, password-reset, and MFA recovery values are consumed with conditional updates so concurrent requests cannot win twice
- Append-only `audit_logs` and `security_events` (no passwords, OTPs, tokens, or clinical notes; metadata keys matching password/otp/token/secret/cookie/authorization/recovery are stripped)
- No Super Admin UI for unrestricted database manipulation
- Private routes send `X-Robots-Tag: noindex, nofollow`, `robots.ts` disallows `/patient`, `/psychologist`, `/super-admin`, and those layouts set `robots: noindex`
- Existing security headers in `next.config.ts` are unchanged

---

## Testing

Identity tests use an isolated in-memory PGlite database and apply the SQL migration. No real patient data.

Covered: registration, email verification, OTP, login, password reset, sessions, RBAC/IDOR, MFA, rate limits, injection-as-data, session fixation, forged/expired/revoked sessions, concurrent token consume, OTP/TOTP replay, public OTP enumeration, PATIENT verification defense in depth.

---

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs:

```text
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Tests use mocks/PGlite. Production secrets are not required.

---

## Production gates

Patient registration must **not** be treated as production-ready until:

- PostgreSQL vendor/region approved and `DATABASE_URL` configured (**PRODUCTION PROVIDER CONFIGURATION REQUIRED**)
- Privacy policy updated (**REQUIRES REVIEW**)
- Terms updated (**REQUIRES REVIEW**)
- Consent wording approved (**REQUIRES REVIEW**)
- OTP provider approved and configured (**PRODUCTION PROVIDER CONFIGURATION REQUIRED**)
- SMTP configured
- MFA enrolled for psychologist and Super Admin, recovery verified
- Security review completed (`docs/PHASE_1B_SECURITY_AUDIT.md` records the code review; environment/provider review is still required)
- Deployment verified
- `PATIENT_REGISTRATION_ENABLED` remains `false` until those gates pass
- MFA recovery policy if the authenticator **and** backup codes are lost (O12)

WhatsApp is **not implemented**.

---

## Known limitations

- No appointment engine
- No production OTP vendor
- No WhatsApp
- No clinical records
- No Super Admin configuration dashboard / `PracticeConfigService`
- Question portal still uses HMAC env credentials
- Child accounts deferred
- Staff UI not built
- Argon2id not adopted
- Public site privacy copy still describes an informational website; a marker section was added as **REQUIRES REVIEW**

---

## Phase 2 recommendation

**Phase 2 — Appointment Engine**

- Availability
- Working hours
- Appointment slots
- Booking
- Confirmation
- Rescheduling
- Cancellation
- No-show
- Completion
- Appointment history
- Double-booking protection

Do not start Phase 2 from this document automatically.

---

## Phase 1C

Readiness documentation only: `docs/PHASE_1C_PRODUCTION_GATE_REGISTER.md`. Patient registration stays disabled. No production database, OTP, or SMTP credentials are created in that phase.

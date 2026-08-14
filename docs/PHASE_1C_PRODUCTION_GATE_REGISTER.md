# Phase 1C — Production Gate Register

**Date:** 14 August 2026  
**Product:** Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice  
**Tagline:** Your Mental Well-being Matters.  
**Branch:** `cursor/patient-practice-phase1-identity-d73b`  
**PR:** https://github.com/ravishori/dr-vandana-website/pull/12  

**Overall status: PRODUCTION BLOCKED**

This document prepares the identity foundation for a future production decision. It is **not** a deployment. It is **not** Phase 2. It does **not** enable patient registration.

Statuses used here:

```text
READY
BLOCKED
REQUIRES HUMAN DECISION
REQUIRES CONFIGURATION
REQUIRES LEGAL REVIEW
REQUIRES SECURITY REVIEW
DEFERRED
```

This file is **not** legal advice and does **not** claim DPDP, HIPAA, medical-record, or professional-ethics compliance.

No PostgreSQL vendor, OTP vendor, WhatsApp BSP, MFA recovery policy, legal wording, retention policy, data-residency policy, cancellation policy, practice hours, or consultation duration is selected here.

---

## 1. Executive summary

Phase 1 identity code exists. Phase 1B closed the in-code High findings that could be fixed without inventing providers or bypasses. Automated tests pass.

Production activation of patient accounts is still **BLOCKED** because infrastructure, providers, privacy/terms, MFA recovery policy, backups, monitoring, and deployment verification are not decided or configured.

`PATIENT_REGISTRATION_ENABLED=false` remains the safe default. There is no production registration bypass.

Operator check (YES/NO only, no secret values):

```bash
npm run identity:gates
```

---

## 2. Current Phase 1 status

| Item | Status |
|---|---|
| Identity code (register, verify, OTP abstraction, login, reset, sessions, MFA, RBAC, audit) | Implemented; not launched |
| Appointment engine | **DEFERRED** — not this phase |
| WhatsApp | **DEFERRED** / **BLOCKED** on O5 |
| Clinical records | **DEFERRED** / **BLOCKED** (Option C) |
| Super Admin configuration dashboard | **DEFERRED** |
| HMAC psychologist question portal | Unchanged; unification **DEFERRED** |
| Patient registration flag | **READY** (`false`) |

---

## 3. Security status (Phase 1B)

Source: `docs/PHASE_1B_SECURITY_AUDIT.md` (commit `141228b` and this follow-up).

| Class | Status |
|---|---|
| Critical in-code vulnerabilities | 0 remaining |
| High in-code vulnerabilities | 0 remaining (fixed in 1B) |
| Medium remaining | Tokens in email query strings; CSRF relies on Server Action Origin + SameSite=Lax; scrypt vs Argon2id (O13) |
| Low remaining | Concurrent sessions; cookie Path=/; dev-only esbuild advisory |
| Automated tests | See closing report |
| Production | **BLOCKED** |

Email-link hygiene (1B F15): verification is **GET → confirmation UI → POST consume**. Password reset is **GET form → POST consume**. Tokens still appear in the emailed URL. Changing the URL design further would not remove the need for a secret in the link. **MEDIUM — ACCEPTED FOR CURRENT PHASE.**

---

## 4. Infrastructure gates

### 4.1 PostgreSQL

**Status: BLOCKED + REQUIRES HUMAN DECISION + REQUIRES CONFIGURATION**  
Label in code/docs: **PRODUCTION PROVIDER CONFIGURATION REQUIRED**

Must be decided by humans (not selected here):

| Question | Status |
|---|---|
| Provider (Neon / RDS / Supabase Postgres / other) | **REQUIRES HUMAN DECISION** (O1) |
| Region | **REQUIRES HUMAN DECISION** (O2) |
| PostgreSQL major version | **REQUIRES HUMAN DECISION** (local examples may mention Postgres 16; that is not a production choice) |
| TLS for client connections | Required for production; how the vendor exposes TLS is **REQUIRES CONFIGURATION** after vendor choice |
| Connection pooling (PgBouncer, vendor pooler, serverless driver) | **REQUIRES HUMAN DECISION** (depends on vendor + host) |
| Backup policy | **REQUIRES HUMAN DECISION** |
| Point-in-time recovery | **REQUIRES HUMAN DECISION** (availability depends on vendor) |
| Database monitoring | **REQUIRES CONFIGURATION** after vendor choice |
| Database credentials / `DATABASE_URL` | **REQUIRES CONFIGURATION** — do not commit; do not invent |
| Migration procedure | Documented below; must be run deliberately |
| Recovery procedure | **REQUIRES HUMAN DECISION** for owner + vendor runbooks |

Do not create a production database from this document. Do not invent credentials.

Application behaviour today: identity operations require a `postgres://` or `postgresql://` URL. Missing/invalid URLs fail closed (`createAppIdentityContext` → `not_configured`). The public site continues without identity. The app does **not** auto-migrate on boot.

### 4.2 Database region / data residency

**Status: REQUIRES HUMAN DECISION + REQUIRES LEGAL REVIEW** (O2, O18)

Question the project must answer:

> Where should patient identity data be hosted?

Explicitly determine:

- Application hosting region
- Database region
- Whether identity data is intended to remain in India
- Cross-region transfers (app host ↔ database ↔ email/OTP processors ↔ backups)
- Backup storage location
- Processor / subprocessor list and contracts

Mark: **REQUIRES HUMAN + LEGAL/PRIVACY REVIEW**

Do not claim DPDP or other compliance from architecture diagrams.

### 4.3 Hosting / TLS / DNS

**Status: REQUIRES CONFIGURATION + REQUIRES HUMAN DECISION**

The public site already uses HTTPS at `https://drvandana.trinetra.net`. Production identity still needs: TLS to PostgreSQL, SMTP, and the OTP API; no DNS or Vercel/Cloudflare changes in this phase.

---

## 5. Provider gates

### 5.1 OTP / SMS

**Status: BLOCKED + REQUIRES HUMAN DECISION** (O4)  
**PRODUCTION OTP PROVIDER CONFIGURATION REQUIRED**

No vendor is selected. The `OtpDeliveryProvider` abstraction stays. There is **no** production vendor adapter in code (`OTP_VENDOR_ADAPTER_IMPLEMENTED = false`). Even if `OTP_PROVIDER` is set to a non-test name, delivery uses a fail-closed boundary provider.

Requirements for the eventual provider (for human evaluation, not a shortlist):

- India mobile delivery
- OTP (not marketing SMS as the primary use)
- HTTPS API
- Delivery reliability and latency acceptable for login/verify
- Rate limiting (provider-side and application-side)
- Provider logging must not retain OTP plaintext longer than needed
- Data retention and subprocessors documented
- Privacy / data-processing terms **REQUIRES LEGAL REVIEW**
- Cost
- Sender ID / DLT / local sender requirements as applicable
- Failure handling (timeouts, undelivered)
- Production credentials stored only in the host secret store

**OTP production safety (verified in code and tests):**

```text
Production
    ↓
Real OTP provider required
```

Never:

```text
Production
    ↓
Test OTP
```

Confirmed:

- `assertOtpProviderAllowed` rejects `testOnly` providers when `nodeEnv === "production"`
- Missing / test / mock / dev `OTP_PROVIDER` in production → `unconfigured` → fail closed
- No hard-coded OTP
- No MFA/OTP bypass flag
- No environment-variable backdoor that returns `{ ok: true }` for test OTP in production
- `peekLastCode` exists only on the test provider

### 5.2 SMTP

**Status: REQUIRES CONFIGURATION** (and **REQUIRES HUMAN DECISION** for DNS auth)

Required configuration (names only):

| Item | Notes |
|---|---|
| SMTP host | `SMTP_HOST` |
| Port | `SMTP_PORT` (app treats 465 as implicit TLS, 587 as STARTTLS) |
| TLS mode | Tied to port; production must use TLS |
| Authentication | `SMTP_USER` / `SMTP_PASSWORD` |
| Sender address | `SMTP_FROM_EMAIL` |
| Sender name | `SMTP_FROM_NAME` |
| Reply-to | Not a dedicated identity setting today — **REQUIRES HUMAN DECISION** |
| SPF / DKIM / DMARC | **REQUIRES CONFIGURATION** in DNS — not changed in this phase |
| Bounce handling | **REQUIRES HUMAN DECISION** |
| Delivery monitoring | **REQUIRES CONFIGURATION** |

Do not add credentials. Do not modify production DNS from this phase.

Identity mail uses the existing Nodemailer transport. Missing SMTP fails closed for send; it does not print provider errors to the browser.

### 5.3 Identity email content

| Message | Contents | Secrets |
|---|---|---|
| Email verification | Link to `/patient/verify-email?token=` | Token in URL only; no password; no OTP; no clinical text |
| Password reset | Link to `/patient/reset-password?token=` | Token in URL only; no password value; no OTP; no clinical text |
| Mobile OTP | SMS via OTP provider, not email | OTP never emailed |
| MFA recovery | Codes shown once in the authenticated MFA enroll UI, not emailed | Must not add “email me a bypass code” |

### 5.4 Email-link hygiene

**MEDIUM — ACCEPTED FOR CURRENT PHASE**

Current architecture:

```text
GET (email link)
 ↓
display confirmation (verify) or password form (reset)
 ↓
POST Server Action
 ↓
consume token
```

Meaningful prefetch protection is already in place for verification. Further redesign (fragment tokens, app-only deep links) is not required for Phase 1C.

---

## 6. Privacy / legal gates

**Status: REQUIRES LEGAL REVIEW** (O11)  
Production launch of Option B remains **BLOCKED** in the decision register until copy is updated.

This is not a claim of legal compliance.

### 6.1 Pages that must be reviewed before enabling registration

| Page | Path | Why |
|---|---|---|
| Privacy Policy | `/privacy-policy` | Still describes an informational site; enquiry copy says the app does not create a patient database; patient-account section is marked **REQUIRES REVIEW** |
| Terms | `/terms` | “Future patient accounts — REQUIRES REVIEW”; no account-suspension or authenticated-service terms |
| Disclaimer | `/disclaimer` | Educational/emergency/no therapist-client relationship from browsing — must stay consistent with accounts |
| Contact | `/contact` | Public contact channels vs account messages |
| Appointment enquiry | `/book-appointment` | Still the public enquiry channel; must not be confused with authenticated booking |
| Patient registration | `/patient/register` | Terms checkbox exists; legal meaning of that checkbox **REQUIRES LEGAL REVIEW** |
| Patient login / verify / reset | `/patient/*` | Account lifecycle copy |
| Footer/nav legal links | Site chrome | Must keep pointing at reviewed documents |

### 6.2 Wording that requires professional/legal review

Do not treat the following as finished legal text:

- “This public website does not currently offer a production patient portal.”
- “The website application does not create a patient database, patient portal, or clinical record from these submissions.” (conflicts with Option B once accounts exist)
- Terms of account creation, suspension, deletion, and retention (O10)
- Consent for email and mobile OTP
- Processor list (host, database, SMTP, OTP)
- Cross-border transfer language (O18)
- Emergency/crisis disclaimer vs account notifications
- Any future appointment-notification consent (appointments are **DEFERRED**)

Do **not** add statements that the site is DPDP compliant, HIPAA compliant, EHR compliant, or medically compliant.

### 6.3 Consent points before production registration

Final wording: **REQUIRES LEGAL/PRIVACY REVIEW**

Technical hooks that already exist or will be needed:

| Point | Today | Notes |
|---|---|---|
| Terms acceptance | Checkbox on `/patient/register` | Copy **REQUIRES LEGAL REVIEW** |
| Privacy acknowledgement | Linked from registration; privacy page **REQUIRES REVIEW** | |
| Account creation | Registration action | Must match updated privacy/terms |
| Email communication | Verification and reset mail | Purpose limitation **REQUIRES LEGAL REVIEW** |
| Mobile OTP | SMS to the number supplied | Provider terms **REQUIRES LEGAL REVIEW** |
| Appointment-related notifications | Not implemented | **DEFERRED** with Phase 2; do not invent opt-in copy now |
| WhatsApp | Not implemented | **BLOCKED** on O5 |

---

## 7. MFA recovery decision (O12)

**Status: REQUIRES HUMAN DECISION**

Current implemented recovery: hashed, single-use backup codes shown once at TOTP enrollment. Password still required to reach the MFA challenge. There is **no** “forgot MFA, email me a login” flow.

**Forbidden:**

```text
Forgot MFA
+
Send email
=
MFA bypass
```

Whatever option is chosen later must preserve that boundary and must be audited.

### Option A — Controlled Super Admin recovery

A provisioned Super Admin, after authenticating with **their own** MFA, performs a controlled recovery of the psychologist MFA credential (reset secret / issue new recovery codes) through a future, reviewed admin action.

- **Security:** Avoids email-only bypass; depends on Super Admin account hygiene and MFA.
- **Operational:** Needs a second privileged human and a future UI or tightly reviewed procedure (dashboard is **DEFERRED**).
- **Abuse risk:** Compromised Super Admin could reset psychologist MFA. Dual control would reduce this; not designed here.
- **Recovery time:** Hours if the Super Admin is available; longer if not.
- **Audit:** Mandatory `MFA_RECOVERY` / `MFA_ENABLED` events, actor, target, success/failure.

### Option B — Manual identity verification + controlled account recovery

The practice verifies the psychologist’s identity out-of-band (known process, not specified here), then an authorised operator applies a reviewed database or break-glass change.

- **Security:** Strength equals the identity-proofing process. Weak proofing is social engineering.
- **Operational:** Needs a written playbook and two-person integrity **REQUIRES HUMAN DECISION**.
- **Abuse risk:** Helpdesk-style social engineering if proofing is informal.
- **Recovery time:** Same day to several days.
- **Audit:** Written ticket + database change log + application audit after the new enrollment.

### Option C — Offline recovery procedure

Restore from a known-good backup and/or replace `mfa_credentials` / recovery hashes through a reviewed, offline procedure after backup.

- **Security:** High if backups are intact and access is tightly controlled; restore may roll back other identity rows.
- **Operational:** Requires tested backups (see §9). A backup never restored is not fully validated.
- **Abuse risk:** Anyone with backup + DB access could mint MFA state.
- **Recovery time:** Depends on restore drills.
- **Audit:** Backup access log, restore log, post-restore MFA re-enrollment audit.

### Option D — Another formally approved mechanism

Any other mechanism (hardware keys, split recovery, in-person ceremony) only after explicit human approval.

- Must not be email-only MFA bypass.
- Must be documented, audited, and compatible with a sole-psychologist practice.

**Do not select A–D in this document.**

Related: O19 (Super Admin provisioning / who holds backup codes) remains **OPEN**.

---

## 8. Deployment gates

### 8.1 Feature flags

| Flag | Safe default | Production rule |
|---|---|---|
| `PATIENT_REGISTRATION_ENABLED` | `false` | Must stay false until every mandatory gate is green. Only the string `true` enables the flag; any other value is off. Production still requires postgres + OTP adapter + SMTP + session secret. |
| `IDENTITY_PROVISION_ENABLED` | `false` | Ignored in production: `isPrivilegedProvisionAllowed` is hard-false. Script also exits if `NODE_ENV=production`. |
| `APPLY_IDENTITY_MIGRATION` | unset / not `true` | Required only for the migrate CLI. **Never** read at application startup. |

There is no alternate production registration bypass.

### 8.2 Super Admin / psychologist provisioning

**Status: REQUIRES HUMAN DECISION** (O19) for the live procedure.

Production must **not** use:

- Default credentials
- Seed passwords in Git
- `npm run db:provision` against production
- Public `/super-admin/register` (does not exist)
- Passwords in CI logs

Recommended production procedure (not executed here):

1. Create the database and apply migrations as a deliberate deploy step.
2. Create the first Super Admin and psychologist through a reviewed, out-of-band process **after** O19 is decided (not the development script).
3. Choose a strong unique password (policy: 12+ characters; not the email local-part).
4. Sign in at `/psychologist/practice/login` or `/super-admin/login`.
5. Enroll TOTP; store recovery codes offline in a controlled place **REQUIRES HUMAN DECISION**.
6. Confirm a second login with MFA.
7. Confirm recovery-code use in a controlled test **only** if the human recovery policy allows a test consume.
8. Record the action in operational notes (no secrets).

Do not create real production credentials in this phase.

### 8.3 Secret inventory (names only)

| Name | Class |
|---|---|
| `DATABASE_URL` | Provider credential |
| `AUTH_SESSION_SECRET` | Application secret |
| `MFA_ENCRYPTION_KEY` | Encryption key |
| `OTP_API_KEY` | Provider credential |
| `SMTP_PASSWORD` | Provider credential |
| `SMTP_USER` | Provider credential (often not secret-class, still server-only) |
| `SESSION_SECRET` | Application secret (existing question portal; separate) |
| `PSYCHOLOGIST_PASSWORD_HASH` | Application secret (existing portal) |
| `AI_API_KEY` | Provider credential (unrelated to identity) |
| `UPSTASH_REDIS_REST_TOKEN` | Provider credential (rate limit / stores) |
| `OTP_PROVIDER` | Non-secret configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | Non-secret configuration |
| `APP_BASE_URL` | Non-secret configuration |
| `EMAIL_PROVIDER` | Non-secret configuration |
| `PATIENT_REGISTRATION_ENABLED` | Feature flag |
| `IDENTITY_PROVISION_ENABLED` | Feature flag (dev-only effect) |
| `APPLY_IDENTITY_MIGRATION` | Feature flag (CLI only) |
| `PROVISION_*` | Development-only; must not be set in production |

Never prefix identity secrets with `NEXT_PUBLIC_`.

### 8.4 Secret rotation (planning only)

**Status: REQUIRES HUMAN DECISION** for owners and tooling. No secret manager is added in this phase.

| Secret | After rotation |
|---|---|
| `AUTH_SESSION_SECRET` | Existing practice sessions become invalid (HMAC no longer matches). Users sign in again. |
| `MFA_ENCRYPTION_KEY` | Stored TOTP secrets will not decrypt unless re-encrypted with a planned migration. **Do not rotate casually.** Procedure **REQUIRES HUMAN DECISION**. |
| `DATABASE_URL` / DB password | Update host config; recycle pools. |
| `OTP_API_KEY` / SMTP password | Update host config; send a test message. |
| `SESSION_SECRET` (question portal) | Existing HMAC portal cookies fail; separate from practice sessions. |

Emergency compromise: revoke sessions (password reset already revokes all practice sessions for that user); rotate `AUTH_SESSION_SECRET` to invalidate all practice cookies; rotate provider keys; **do not** disable MFA to recover.

Who controls secrets: **REQUIRES HUMAN DECISION** (practice owner vs hosting operator).

### 8.5 Deployment checklist (before enabling registration)

1. Production database configured (vendor/region decided)
2. TLS verified (site, database, SMTP, OTP API)
3. Migrations reviewed and applied deliberately (not on boot)
4. Backup verified **and restore-tested**
5. SMTP verified (test verification mail, no secrets in logs)
6. OTP provider verified (real adapter + India delivery test)
7. MFA configured for psychologist and Super Admin; recovery policy decided
8. Secrets configured in the host secret store (names above)
9. Privacy/terms/consent approved
10. Security review of the **deployed** environment completed (Phase 1B was code-only)
11. Deployment smoke test completed (public site + identity fail-closed + one staged registration **only** if explicitly approved)
12. **Registration remains OFF** until final approval (`PATIENT_REGISTRATION_ENABLED=false`)

Do not execute this list against production from Phase 1C.

### 8.6 Private routes

| Area | AuthN | AuthZ | Dynamic | noindex | Sitemap |
|---|---|---|---|---|---|
| `/patient/*` (account) | Practice session | PATIENT + verified | `force-dynamic` | layout + middleware `X-Robots-Tag` | excluded |
| `/psychologist/practice/*` | Practice session + MFA for privileged actions | PSYCHOLOGIST | `force-dynamic` | yes | excluded |
| `/super-admin/*` | Practice session + MFA | SUPER_ADMIN | `force-dynamic` | yes | excluded |
| `/psychologist/login` and Q&A | Existing HMAC cookie | Unchanged | existing | yes | excluded |

`robots.txt` is **not** the security mechanism. Server authorization remains mandatory.

Unified authentication with the HMAC portal remains a **future** task. Do not migrate it in Phase 1C.

---

## 9. Backup / recovery

**Status: REQUIRES HUMAN DECISION + REQUIRES CONFIGURATION**

Production database gate must include:

- Automated backup
- Retention period (**REQUIRES HUMAN DECISION**, related to O10)
- Restore testing (a backup never restored is not fully validated)
- Recovery procedure (RPO/RTO **REQUIRES HUMAN DECISION**)
- Recovery owner **REQUIRES HUMAN DECISION**
- Written recovery documentation stored outside this repo if it contains environment details

Identity migrations `0001` and `0002` are additive. Down files exist for disaster recovery and must not be run in production without a restore plan.

---

## 10. Monitoring and alerting

**Status: REQUIRES CONFIGURATION** (no SIEM in this phase)

### Authentication (log counts/reasons, never secrets)

- Login failures
- MFA failures / lockouts
- OTP failures / provider failures
- Password-reset failures (generic client messages already)
- Registration failures (generic)

Existing tables: `security_events`, `audit_logs` (append-only; metadata stripped of password/otp/token/secret/cookie/authorization/recovery keys).

### Application

- 5xx errors (existing error-reporting path)
- Database connectivity errors
- SMTP send failures (`identityEmailSend`)
- OTP provider failures
- Session secret / MFA key missing (fail closed)

### Events that should later page an operator

- Repeated Super Admin login failures
- Repeated psychologist MFA failures
- Unusual password-reset volume
- OTP/SMTP provider failure spikes
- Database connectivity failures
- Unexpected authentication error spikes

Do not log passwords, OTPs, tokens, MFA secrets, or clinical content. Do not build a SIEM here.

---

## 11. Configuration validation

Operator-only, not a public route:

```bash
npm run identity:gates
```

Reports:

```text
DATABASE configured: YES/NO
SMTP configured: YES/NO
OTP production provider configured: YES/NO
MFA encryption key configured: YES/NO
Session secret configured: YES/NO
Patient registration flag: YES/NO
Patient registration runtime allowed: YES/NO
Privileged provisioning allowed: YES/NO
OTP vendor adapter implemented: YES/NO
```

`OTP production provider configured` stays **NO** until a human-selected vendor adapter exists **and** production credentials are present. The adapter is not implemented.

Fail-closed behaviour (tested):

| Condition | Result |
|---|---|
| Missing/invalid database URL | Identity context `not_configured`; public site still builds |
| Missing/short session secret | Identity context `not_configured`; auth does not run insecurely |
| Missing MFA encryption key | Enrollment/verify fail closed; no password-only privileged access |
| Missing production OTP / test provider in production | OTP send fails closed |
| Development provisioning in production | Refused in code and script |

---

## 12. Migration safety

Startup **never** reads `APPLY_IDENTITY_MIGRATION`.

Deliberate CLI only:

```bash
# After backup, and only when a human intends to migrate:
APPLY_IDENTITY_MIGRATION=true DATABASE_URL=postgres://... npm run db:migrate
```

Process:

1. **Backup** and confirm the backup is restorable.
2. Review `drizzle/0001_identity_foundation.sql` and `drizzle/0002_mfa_replay_guard.sql`.
3. Apply with the flag above (not during `next start`).
4. **Verify** tables, indexes, role catalog.
5. Smoke-test identity fail-closed and public pages.
6. **Rollback** = restore from backup. Down SQL is last-resort and not for casual use.

Do not run this against production from Phase 1C.

---

## 13. Dependency gate

Recorded at Phase 1C authoring time; re-run before any launch.

| Scope | Expected |
|---|---|
| `npm audit --omit=dev` | 0 vulnerabilities (confirm at launch) |
| `npm audit` | Dev-only moderate esbuild via `drizzle-kit` — do not `audit fix --force` (installs a breaking old drizzle-kit) |

No unrelated upgrades in this phase.

---

## 14. Public website regression

Identity work must not break the informational site. Covered by existing suites plus sitemap/robots assertions:

- Home, About, FAQ / how counselling works, Contact
- Appointment **enquiry** (not booking)
- Ask Dr. Vandana AI
- Public question form
- Crisis directory
- Privacy, Terms, Disclaimer

HMAC `/psychologist/login` remains the question-portal login.

---

## 15. Production readiness matrix

| Gate | Status | Owner | Evidence | Required before production |
|---|---|---|---|---|
| PostgreSQL vendor/region | **REQUIRES HUMAN DECISION** / **BLOCKED** | Human (O1, O2) | No vendor selected | YES |
| Data residency | **REQUIRES LEGAL REVIEW** | Human/legal (O18) | Question documented | YES |
| OTP provider | **REQUIRES HUMAN DECISION** / **BLOCKED** | Human (O4) | No adapter | YES |
| SMTP | **REQUIRES CONFIGURATION** | Deployment | Env names only | YES |
| Email DNS (SPF/DKIM/DMARC) | **REQUIRES CONFIGURATION** | Deployment | Not changed here | YES |
| Privacy / Terms / consent | **REQUIRES LEGAL REVIEW** | Human/legal (O11) | `src/data/legal.ts` markers | YES |
| Retention | **REQUIRES HUMAN DECISION** | Human (O10) | OPEN | YES |
| MFA recovery policy | **REQUIRES HUMAN DECISION** | Practice owner (O12) | Options A–D; no bypass | YES |
| Super Admin bootstrap | **REQUIRES HUMAN DECISION** | Practice owner (O19) | Dev script refused in production | YES |
| Code security review | **READY** (code) | Engineering | Phase 1B | YES |
| Environment security review | **REQUIRES SECURITY REVIEW** | Security | Not done | YES |
| Deployment | **REQUIRES CONFIGURATION** | Engineering | Checklist §8.5 | YES |
| Backups + restore drill | **REQUIRES CONFIGURATION** | Infrastructure | None yet | YES |
| Monitoring / alerting | **REQUIRES CONFIGURATION** | Engineering | Events exist; paging does not | YES |
| Secret management / rotation | **REQUIRES HUMAN DECISION** | Owner + operator | Names documented | YES |
| Patient registration flag | **READY** | Engineering | default `false` | YES (must stay false until go) |
| OTP fail-closed | **READY** | Engineering | tests | YES |
| Automated tests | **READY** | Engineering | 97/97 at Phase 1C authoring | YES |
| Appointment engine | **DEFERRED** | — | Phase 2 not started | NO (not in Phase 1) |
| WhatsApp | **DEFERRED** / **BLOCKED** | Human (O5) | — | NO for identity-only |
| Clinical / CMS / staff UI | **DEFERRED** | — | — | NO |
| Question-portal unification | **DEFERRED** | Engineering | HMAC still live | NO for identity-only |
| Argon2id (O13) | **OPEN** | Human | scrypt retained | Not a launch blocker if scrypt accepted |
| Cookie SameSite (O14) | **OPEN** | Human | Lax implemented | Formal confirmation preferred |

---

## 16. Final go / no-go

**NO-GO** unless every row marked “Required before production = YES” is **READY** (or an explicit human waiver is recorded in the decision register).

Current result: **NO-GO / PRODUCTION BLOCKED**.

Do not set `PATIENT_REGISTRATION_ENABLED=true` in production.

Do not start Phase 2 from this document.

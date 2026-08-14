# Practice Configuration Requirements

**Status:** Requirements only. Super Admin dashboard is **DEFERRED**. Do not implement it in this phase.  
**Date:** 14 August 2026  

Future Super Admin configuration should be **database-backed** (`PracticeConfigService`), audited, and editable by a provisioned Super Admin with MFA — **not** by committing values to Git.

This file lists **what** should eventually be configurable. Values themselves remain **OPEN** (O7, O8, O9). Do not invent hours, duration, or legal wording.

---

## SUPER_ADMIN ≠ ALL_DATA_ACCESS

Super Admin should manage:

- practice configuration
- users / roles (policy still OPEN: O21)
- notifications (non-security-critical)
- audit **viewing**

Super Admin must **not** automatically receive:

- clinical notes
- clinical documents
- clinical assessments

Those permissions exist in the catalog as Option C flags and are **not granted**. Option C remains **DEFERRED**.

---

## CONFIGURABLE PRACTICE DATA

Eventually editable by Super Admin (not implemented now):

| Group | Examples |
|---|---|
| Practice name | Display name of the practice |
| Phone | Public/operational phone |
| Email | Public/operational email |
| Address | Public address lines |
| Location | Map/DIGIPIN/locality as designed |
| Hours | Working hours, breaks, closures (O7 OPEN) |
| Appointment duration | Per appointment type (O8 OPEN) |
| Appointment policies | Buffers, slot granularity, min notice, max advance |
| Cancellation policy | Window, who may cancel (O9 OPEN) |
| Reschedule policy | Notice; patient proposal vs psychologist confirm |
| Notification settings | Channel flags; **not** security-event suppression |
| Public website settings | Selected public fields only — **not** a full CMS |

Security notifications (password/MFA/suspicious login) must **not** be freely disabled.

---

## INFRASTRUCTURE SECRETS

**Never** put the following into the future dashboard, the database, Git, or `NEXT_PUBLIC_*`:

```text
DATABASE_URL
SMTP_PASSWORD
OTP_API_KEY
TWILIO_AUTH_TOKEN
AUTH_SESSION_SECRET
MFA_ENCRYPTION_KEY
```

Also keep out of the dashboard: `SMTP_USER` (if it is a credential), `TWILIO_ACCOUNT_SID` if treated as secret by policy, `SESSION_SECRET` (question portal), `AI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, restore credentials.

Secrets stay in the **host secret manager**.

Forbidden UI (already APPROVED forbidden): SQL console, env viewer, secret viewer, filesystem browser.

---

## Public vs secrets

| Public / operational | Secret / infrastructure |
|---|---|
| Practice phone as shown on the site | SMTP password |
| Working hours | Database URL |
| Appointment duration once chosen | OTP API key |
| “WhatsApp notifications enabled” **feature flag after legal approval** | Twilio auth token |

Hard-coded public contact/hours in `src/data` migrate in a **future** implementation phase, not now.

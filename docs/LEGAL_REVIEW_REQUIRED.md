# Legal Review Required

**Status:** REQUIRES LEGAL REVIEW  
**Date:** 14 August 2026  
This file is **not** legal advice and does **not** rewrite policy as if approved.  
It does **not** claim DPDP, HIPAA, EHR, or medical compliance.

Authoritative public copy lives in `src/data/legal.ts` (pages `/privacy-policy`, `/terms`, `/disclaimer`).

The application now implements (code, **not** production-enabled) patient accounts, authenticated appointments, audit logs, email notifications, and a WhatsApp opt-in checkbox (default off). Public legal language still describes an informational website.

---

## Privacy Policy statements requiring review

| Statement (paraphrase / quote) | Why it needs review |
|---|---|
| “This site is primarily informational and is not used to maintain clinical records.” | Still true that Option C is deferred, but identity + appointment rows are not “informational website only.” |
| “This website is primarily informational. It provides educational content…” | Does not describe patient accounts or authenticated booking. |
| “The website application does not create a patient database, patient portal, or clinical record from these submissions.” | Enquiry form still email-only; **accounts and appointments do create a patient database and portal** when registration is enabled. |
| “This public website does not currently offer a production patient portal.” | Accurate while `PATIENT_REGISTRATION_ENABLED=false`; must be updated **before** enabling registration. |
| “Account registration, if present in a development environment, is not an active public service.” | Same. |
| “Before any patient account feature is enabled… REQUIRES REVIEW.” | Still true; this document is that prompt. |
| Third-party services: hosting and email for enquiries | Must add PostgreSQL, OTP vendor, SMTP for identity, Twilio, Meta/WhatsApp if activated. |
| “This public website does not currently use marketing analytics, advertising pixels, or AI processing of enquiry content.” | AI chat and question portal exist as separate public features; confirm consistency. |

---

## Terms statements requiring review

| Statement | Why |
|---|---|
| “These Terms currently describe a public informational website and enquiry tools. They do not yet describe production patient accounts, account suspension, or authenticated appointment services.” | Direct contradiction once accounts are offered to the public. |
| Heading “Future patient accounts — REQUIRES REVIEW” | Account lifecycle, suspension, deletion, cancellation, reschedule, notifications. |

---

## Disclaimer

Educational / emergency / no therapist–client relationship from browsing must stay consistent with accounts and appointment confirmation (which **does** start a scheduling relationship, not a clinical record). **REQUIRES LEGAL REVIEW.**

---

## Consent copy (do not invent replacements)

| Surface | Current technical hook | Legal status |
|---|---|---|
| Registration checkbox | Terms + privacy acknowledgement | LEGAL REVIEW REQUIRED |
| Appointment enquiry | Public form; not authenticated booking | LEGAL REVIEW REQUIRED (must not be confused with `/patient/appointments/new`) |
| Authenticated booking | Session + type + start; no extra consent screen | LEGAL REVIEW REQUIRED |
| WhatsApp opt-in | Unchecked by default; explicit checkbox; appointment-related; reversible; timestamps stored | Final wording **REQUIRES LEGAL REVIEW** |
| Email verification / OTP | Purpose limitation for account verification | LEGAL REVIEW REQUIRED |

WhatsApp checkbox copy today (not approved legal text):

> “I agree to receive appointment-related notifications from Dr. Vandana through WhatsApp.”

Do not change this wording without approval.

---

## Processor / cross-border wording

Processor list and cross-border transfers (host, PostgreSQL, SMTP, OTP, Twilio, Meta) **REQUIRES LEGAL REVIEW** (O18). Retention **OPEN** (O10).

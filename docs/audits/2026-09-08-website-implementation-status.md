# Website Implementation Status Audit — 2026-09-08

**Production tip audited:** `03d976a` (`fix(appointment): harden enquiry client validation UX (#28)`)  
**Verdict:** **RED** for Doctor Articles + Communications readiness; **AMBER** for adjacent production reliability.

## Executive summary

Production at SHA `03d976a` has **no doctor authentication**, **no durable application database for practice content**, **no articles CMS**, and **no communications inbox**. Appointment enquiries are validated and emailed only — they are not persisted for portal follow-up. Ask Dr. Vandana AI and appointment rate limiting depend on external configuration that commonly fails closed or returns errors in production-like environments.

This audit describes the **pre-implementation** state before Doctor Articles + Communications work on branch `cursor/doctor-articles-communications-382b`.

## Capability matrix (production tip)

| Capability | Status | Notes |
|---|---|---|
| Public marketing / counselling pages | PRESENT | App Router pages under `src/app` |
| Appointment enquiry (Zod + honeypot + SMTP) | PRESENT | Email-only; no durable enquiry store |
| Appointment rate limit (Upstash) | LIKELY BROKEN / fragile | Fail-closed when `APPOINTMENT_RATE_LIMIT_STORE` / Upstash unset in production |
| Ask Dr. Vandana AI | BROKEN / degraded | Commonly returns **503** when provider / vector / rate-limit config incomplete |
| Doctor auth / portal | **NOT BUILT** | No `/doctor/*`, no session cookie, no password hash tooling |
| Articles CMS (draft/publish) | **NOT BUILT** | No article types, store, or public `/articles` routes |
| Communications inbox / reply | **NOT BUILT** | No conversation model; enquiries not threadable from a portal |
| Inbound email webhook | **NOT BUILT** | Provider limitation; out of scope for current milestone |
| EHR / clinical records | ABSENT (intentional) | Site must not claim to be an EHR |

## Verdict detail

### RED — Articles / Communications / Doctor portal

- No `DOCTOR_*` auth env contract, middleware, or HMAC session.
- No article domain model, Redis/file/memory store, or publish pipeline.
- No conversation/message store tied to appointment enquiries.
- Doctor cannot list, reply to, or archive website enquiries from a portal.

### AMBER — Production adjacent systems

- **Ask AI:** pipeline exists in-repo, but live deployments frequently surface **503** when AI keys, embeddings, or rate-limit stores are missing or misconfigured.
- **Appointment rate limiting:** production path requires Upstash and fails closed when misconfigured — behaviour that protects abuse risk but can block legitimate enquiries if credentials are absent.
- **Persistence gap:** even successful appointment emails leave no durable thread for delayed reply if SMTP succeeds but the inbox is missed, or if SMTP fails after validation.

## Architectural constraints for the upcoming build

Reuse conceptual patterns only (do not merge unmerged CMS / question-portal branches):

- HMAC httpOnly cookie sessions (8h TTL)
- Upstash Redis bundle keys with memory/file for non-production; **fail-closed in production**
- Existing SMTP via `getAppointmentEmailConfig` / Nodemailer
- Educational / emergency disclaimers; never market as an EHR

## Out of scope (documented for later)

- Inbound email → conversation webhook (provider-dependent)
- Full EHR, clinical notes, prescriptions, or patient charting
- Multi-doctor RBAC beyond a single `DOCTOR` role

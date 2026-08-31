# O-B-01 Production Configuration Inventory

**Document type:** Safe configuration inventory (no secret values)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Scope:** Option B Production readiness preparation only  
**Does not:** configure Production, deploy, enable registration, or expose secrets

Statuses used:

```text
CONFIGURED
MISSING
UNKNOWN
PRODUCTION VERIFICATION REQUIRED
NOT APPLICABLE
```

Env var **presence in this developer workspace** is recorded from `npm run production:gates` (2026-08-30) and `.env.example` patterns. Host Production may differ — always treat live as **PRODUCTION VERIFICATION REQUIRED**.

---

## Inventory

| Area | Config key / control (name only) | Repo / example | This workspace | Live Production | Notes |
| --- | --- | --- | --- | --- | --- |
| Environment mode | `NODE_ENV` / host env | Documented | UNKNOWN (local) | **PRODUCTION VERIFICATION REQUIRED** | Production fail-closed rules depend on `production` |
| Registration flag | `PATIENT_REGISTRATION_ENABLED` | `.env.example` = `false` | MISSING/false-equivalent (gates: PASS false) | Must remain false until gates green | Exact string `"true"` required to enable |
| Registration runtime gate | `isPatientRegistrationRuntimeAllowed` | Code | CONFIGURED (code) | **PRODUCTION VERIFICATION REQUIRED** | Also requires usable session secret, Postgres, OTP, SMTP in production |
| Database URL | `DATABASE_URL` | Empty placeholder | MISSING | **PRODUCTION VERIFICATION REQUIRED** | Never commit; never `NEXT_PUBLIC_*` |
| DB TLS | Vendor TLS setting | Architecture APPROVED | UNKNOWN | **PRODUCTION VERIFICATION REQUIRED** | External to repo |
| btree_gist / exclusion | Schema verify script | Migrations + `db:verify-production` | NOT CONFIGURED (no target DB here) | **PRODUCTION VERIFICATION REQUIRED** | External |
| Session secret | `AUTH_SESSION_SECRET` | Empty placeholder | MISSING | **PRODUCTION VERIFICATION REQUIRED** | |
| MFA encryption | `MFA_ENCRYPTION_KEY` | Empty placeholder | MISSING | **PRODUCTION VERIFICATION REQUIRED** | |
| OTP provider mode | `OTP_PROVIDER` | Empty; Twilio adapter implemented | MISSING | **PRODUCTION VERIFICATION REQUIRED** | test/mock/dev forbidden in production |
| OTP API / Twilio SMS | `OTP_API_KEY` / `TWILIO_*` SMS | Empty placeholders | MISSING | **PRODUCTION VERIFICATION REQUIRED** | Distinct from WhatsApp |
| SMTP | `SMTP_*` | Empty placeholders | MISSING | **PRODUCTION VERIFICATION REQUIRED** | O-B-01 does **not** configure SMTP |
| WhatsApp | `TWILIO_WHATSAPP_ENABLED` | `false` in example | Disabled (gates) | May stay false at launch | O-B-01 does **not** activate |
| AI provider | `AI_API_KEY` / `AI_PROVIDER` | Empty / auto | UNKNOWN / optional | **PRODUCTION VERIFICATION REQUIRED** if Ask AI live | Educational only |
| Q&A session secret | `SESSION_SECRET` (portal) | Empty placeholder | UNKNOWN | **PRODUCTION VERIFICATION REQUIRED** | Separate from practice session |
| Cookie practice | httpOnly + secure in production + SameSite Lax | Code | CONFIGURED (code) | **PRODUCTION VERIFICATION REQUIRED** | O14 formal confirm OPEN |
| Cookie Q&A | httpOnly + secure in production + Strict | Code | CONFIGURED (code) | **PRODUCTION VERIFICATION REQUIRED** | |
| Worker hosting | O15 | Runbook only | MISSING decision | **PRODUCTION VERIFICATION REQUIRED** | CLI refuses production |
| Backups / RPO / RTO | Vendor + owner decision | Framework UNSET | MISSING | **PRODUCTION VERIFICATION REQUIRED** | O-B-01 does **not** implement |
| Monitoring | APM / alerts | Checklist OPEN | MISSING | **PRODUCTION VERIFICATION REQUIRED** | |
| Privacy / terms | `src/data/legal.ts` | Published pages | CONFIGURED (current copy) | **PRODUCTION VERIFICATION REQUIRED** | O11 legal update still required before registration |
| Retention policy O10 | `docs/DECISION_DATA_RETENTION.md` | Periods UNSET | MISSING (policy) | **NOT APPLICABLE** until legal sets periods | Technical TTLs ≠ policy |

---

## Externally dependent (cannot close in repository alone)

1. Managed PostgreSQL provision + region + TLS + migrations on **target**  
2. Host secret manager values (session, MFA, DB, SMTP, OTP, Twilio)  
3. SMTP mailbox authentication + DNS SPF/DKIM/DMARC  
4. OTP SMS vendor account / DLT as applicable  
5. Notification worker process hosting  
6. Automated backups + restore drill  
7. Monitoring / alerting destination  
8. Counsel-approved privacy/terms/consent (O11)  
9. Counsel retention/deletion decisions (O10)  
10. Deployed-environment security review  

---

## Registration gate (summary)

```text
REGISTRATION GATE VERIFIED — DISABLED.
```

Evidence: `.env.example` forces `false`; `registerPatient` returns `NOT_ENABLED` when flag false; server action uses `isRegistrationAvailable()`; production runtime also requires Postgres + OTP + SMTP + session secret. Client cannot set server env.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | O-B-01 inventory — no secrets |

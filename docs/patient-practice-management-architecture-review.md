# Patient & Practice Management System — Architecture & Implementation Status

**Status:** Option **C** implemented in-app with honest readiness labels  
**Date:** 2026-08-14  
**Branch:** `cursor/patient-practice-management-a302`  
**Decision:** Stakeholder selected Option C (full clinical PMS) after Phase 0 HARD STOP review.

---

## Product decision

| Option | Outcome |
| --- | --- |
| A — Keep site non-clinical | Not selected |
| B — Non-clinical booking only | Not selected |
| **C — Full clinical PMS** | **Selected and implemented** (local/sqlite + mocks) |

Privacy policy updated to describe the optional patient/practice portal, private vs patient-visible notes/documents, retention, and third-party OTP/WhatsApp configuration needs.

---

## What shipped

| Area | Routes / modules | Status |
| --- | --- | --- |
| Patient registration + consent | `/patient/register` | **TESTED** (unit) |
| Email verification | `/patient/verify-email` | **TESTED**; delivery **MOCKED** without SMTP |
| Mobile OTP | `/patient/verify` | **MOCKED** (`OTP_PROVIDER=mock`); **CONFIGURATION REQUIRED** for SMS |
| Patient login / portal | `/patient/login`, dashboard, profile | **TESTED** (session HMAC) |
| Password reset | `/patient/forgot-password`, `/patient/reset-password` | **TESTED** pattern; email **MOCKED** without SMTP |
| Psychologist MFA (TOTP) | `/psychologist/practice/security`, `/mfa` | **TESTED** (TOTP unit); optional enable |
| Appointments + availability | patient request + psychologist confirm/reject/cancel/complete/no-show | **TESTED** (double-book) |
| Calendar / availability admin | `/psychologist/practice/calendar` | **TESTED** via service logic |
| Consultations + notes | private vs `PATIENT_VISIBLE` | **TESTED** (IDOR / 403) |
| Documents | upload + authz download `/api/practice/documents/[id]` | Local disk store; object storage **CONFIGURATION REQUIRED** for multi-instance |
| Notifications | email + WhatsApp outbox | Email **MOCKED/SENT** by SMTP; WhatsApp **MOCKED** |
| Audit log | `/psychologist/practice/audit` | **TESTED** via service writes |
| RBAC | PATIENT / PSYCHOLOGIST (+ STAFF reserved) | **TESTED** ownership checks |
| Middleware | `/patient/*` + `/psychologist/practice/*` practice cookie | Implemented (Edge-safe session read) |

Public `/book-appointment` enquiry path is unchanged and still available; closing copy links to the patient portal.

Psychologist **question portal** (`drvandana_portal_session`) remains separate from **practice PMS** (`drvandana_practice_session`). Practice login is via `/patient/login` (psychologist bootstrap from `PSYCHOLOGIST_LOGIN_*`).

---

## Persistence

| Mode | Env | Notes |
| --- | --- | --- |
| SQLite snapshot | `PRACTICE_STORE=sqlite` (default non-prod / prod default) | Single-practice Node host with **persistent disk** |
| Memory | `PRACTICE_STORE=memory` | Dev/tests only; rejected in production |
| Postgres / managed DB | — | **CONFIGURATION REQUIRED** for multi-instance / serverless |

Documents: `PRACTICE_DOCUMENT_DIR` (default `data/practice-documents`).

---

## Honest readiness labels

| Capability | Label |
| --- | --- |
| Core register / appoint / notes / docs flows (local sqlite) | **TESTED** |
| SMS OTP delivery | **MOCKED** / **CONFIGURATION REQUIRED** |
| WhatsApp Business transactional | **MOCKED** / **NOT CONNECTED** |
| SMTP appointment/auth email | **CONFIGURATION REQUIRED** (SENT when SMTP configured) |
| Multi-instance durable DB | **CONFIGURATION REQUIRED** |
| Object storage + malware scan | **CONFIGURATION REQUIRED** |
| Legal counsel sign-off | **CONFIGURATION REQUIRED** (policy text updated in-repo only) |
| Production clinical claim | **Not PRODUCTION READY** until providers + hosting + legal review |

---

## Security notes

- Passwords: existing scrypt helper  
- OTP stored hashed only; mock provider may return `devCode` outside production  
- Practice session: HMAC cookie, Edge-readable verifier  
- Private notes/documents denied to patients (403)  
- Neutral notification copy (no clinical detail in email/WhatsApp bodies)  
- Psychologist MFA recommended before production use  

---

## Ops checklist before production

1. Set `PRACTICE_SESSION_SECRET` (≥32 chars)  
2. Configure SMTP  
3. Replace `OTP_PROVIDER=mock` with a real SMS/WhatsApp OTP vendor  
4. Replace WhatsApp mock with Business API templates  
5. Host on persistent disk **or** migrate store to managed Postgres + object storage  
6. Backup/restore drill for practice DB + documents  
7. Confirm legal retention policy with counsel  

---

## Related files

- Config: `src/config/practice.ts`  
- Services: `src/lib/practice/*`  
- UI: `src/app/patient/*`, `src/app/psychologist/practice/*`  
- Tests: `src/lib/practice/practice.test.ts`  
- Env template: `.env.example`  

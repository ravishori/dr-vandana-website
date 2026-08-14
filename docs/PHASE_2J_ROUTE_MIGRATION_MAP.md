# Phase 2J — Route Migration Map

**Status:** MAPPING ONLY.  
**Date:** 14 August 2026  

| PR #9 route | Current Phase 1–2 route | Future Option C route | Authorization | Data source |
|---|---|---|---|---|
| `/patient` | — (use `/patient/account` or appointments) | Optional landing | PATIENT session | identity |
| `/patient/login` | `/patient/login` | Keep current | Public → session | identity |
| `/patient/register` | `/patient/register` | Keep current | Flag-gated | identity |
| `/patient/verify` | `/patient/verify-phone` | Keep current naming | Controlled verify | identity |
| `/patient/verify-email` | `/patient/verify-email` | Keep current | Token POST consume | identity |
| `/patient/forgot-password` | same | Keep | Public | identity |
| `/patient/reset-password` | same | Keep | Token POST | identity |
| `/patient/dashboard` | `/patient/account` + appointments | Merge UX concepts into current | PATIENT | appointments |
| `/patient/profile` | `/patient/account` | Extend non-clinical profile only | PATIENT | `users` / `patient_profiles` |
| `/patient/appointments` | `/patient/appointments` | Keep Phase 2 | PATIENT ownership | appointments |
| `/patient/appointments/new` | same | Keep Phase 2 | PATIENT | booking |
| — | `/patient/appointments/[publicId]` | Keep | PATIENT | appointments |
| — | `/patient/appointments/history` | Keep | PATIENT | appointments |
| `/patient/consultations` | **absent** | `/patient/consultations` (future) | PATIENT + visibility | clinical PG |
| `/patient/documents` | **absent** | `/patient/documents` (future) | PATIENT + visibility | metadata PG + object storage |
| `/psychologist/practice` (stats) | `/psychologist/practice` (identity home) | Enhance dashboard **without** PR #9 store | PSYCHOLOGIST + MFA | appointments |
| Embedded appt actions on dashboard | `/psychologist/practice/appointments` | Keep dedicated Phase 2 routes | PSYCHOLOGIST | lifecycle |
| — | `/psychologist/practice/appointments/[publicId]` | Keep | PSYCHOLOGIST | lifecycle |
| `/psychologist/practice/patients` | **absent** | Future patient directory | PSYCHOLOGIST | identity + appointments (+ clinical later) |
| `/psychologist/practice/patients/[id]` | **absent** | Future chart; prefer `publicId` | PSYCHOLOGIST + perms | mixed |
| `/psychologist/practice/calendar` | **absent** (server availability exists) | Future availability UI | PSYCHOLOGIST | appointment settings |
| `/psychologist/practice/audit` | **absent** | Future audit viewer | PSYCHOLOGIST / SUPER_ADMIN view perms | `audit_logs` |
| `/psychologist/practice/security` | MFA via `/psychologist/practice/mfa` | Prefer current MFA flows | PSYCHOLOGIST | identity MFA |
| `/psychologist/practice/mfa` | same | Keep current | PSYCHOLOGIST | identity |
| `/patient/login` for psychologist | `/psychologist/practice/login` | Keep **separate** psychologist login | PSYCHOLOGIST | identity |
| `/api/practice/documents/[id]` | **absent** | Prefer signed-URL mint route, not disk stream | session + authz | object storage |
| Super Admin | `/super-admin/*` placeholder | Keep non-clinical | SUPER_ADMIN | config (deferred) |

**Rule:** Prefer current Phase 1–2 routes wherever they exist. Add Option C routes only after C0.

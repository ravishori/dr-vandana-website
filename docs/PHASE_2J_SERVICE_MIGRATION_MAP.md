# Phase 2J — Service Migration Map

**Status:** MAPPING ONLY.  
**Date:** 14 August 2026  

| PR #9 service / module | Current architecture | Future service | PostgreSQL | Object storage | Notification outbox | Audit |
|---|---|---|---|---|---|---|
| `auth-service.ts` | `src/lib/identity/*` | **Discard PR #9** | `users`, sessions, MFA, verify | — | identity email via SMTP service | `security_events` / `audit_logs` |
| `session.ts` HMAC | Server-side `sessions` | **Discard** | sessions | — | — | session revoke events |
| `appointment-service.ts` | `src/lib/appointments/*` | **Discard PR #9** | appointments + exclusion | — | Phase 2F outbox | appointment audit |
| `clinical-service.ts` consultations | — | `ConsultationService` (future) | `consultations` | — | generic events optional | CONSULTATION_* |
| `clinical-service.ts` notes | — | `ClinicalNoteService` | `clinical_notes` (+ versions) | — | on share only, generic | NOTE_* without body |
| `clinical-service.ts` documents | — | `ClinicalDocumentService` | `clinical_documents` | private bucket | generic on share | DOCUMENT_* |
| `providers.ts` mocks | OTP fail-closed; Twilio adapter disabled | Keep current providers | — | — | dispatcher | — |
| `sqlite-store` / `memory-store` | Drizzle + postgres | **Reject** | all durable state | — | — | — |
| `totp.ts` hand-rolled | `otpauth` + encrypted secrets | Keep current MFA | `mfa_credentials` | — | — | MFA_* |
| Notification queue in auth-service | `src/lib/notifications/dispatcher.ts` | Extend outbox events | outbox tables | — | **same dispatcher** | delivery attempts |
| Patient search in appointment-service | — | PatientDirectory query | users + profiles | — | — | PATIENT_VIEW |
| Audit array in snapshot | `audit_logs` | Extend actions | audit_logs | — | — | append-only |

**Rule:** New clinical services must call the same authorization primitives as appointments (`AuthorizationPrincipal`, permissions, ownership).

# Clinical Platform - Feature Inventory and Implementation Authorisation

Branch base: Lineage B tip `9a87deb` (PR #18 head). Inventory built on 2026-11-16 from route and module listings plus the test suite (407 tests passing locally). "Implemented" means code exists and is covered by tests in this repo; it does not mean approved for production use.

## Owner authorisation (recorded, not inferred)
The owner directed in chat (2026-11-16) that controlled development begins on feature branches, using synthetic data only, with unresolved clinical/legal/infrastructure decisions isolated behind configuration or feature controls, and no merge, deploy, real registration or production clinical activation without separate approval. This addresses gates 16 and 17 of `docs/F4_FINAL_CLINICAL_IMPLEMENTATION_GATE.md` (written scope authorisation and own engineering prompt). **Gates 1-15, 18-19 and 21 of that document remain unsatisfied. Nothing in this branch may be released to real patients until the owner records approval for them.** Clinical features must ship dark (disabled flags).

## Inventory
| Area | Feature | Status | Notes |
|---|---|---|---|
| Public website | pages, SEO, Ask AI (educational), counselling FAQ search, crisis resource directory | implemented | public only; no patient data |
| Identity | users, roles, permissions, DB sessions with hashed tokens, scrypt passwords | implemented | `src/lib/identity` |
| Identity | TOTP MFA + recovery codes, mandatory for PSYCHOLOGIST and SUPER_ADMIN | implemented | no exemption path; regression test added |
| Identity | OTP (email/SMS providers), password reset, rate limiting | implemented | providers configured outside repo |
| Identity | audit_logs, security_events with secret stripping | implemented | not yet per-record read log |
| Patient portal | register (flag off), login, verify, account, appointment list/detail/new/history | partially implemented | registration disabled by default |
| Appointments | availability, booking idempotency, lifecycle state machine, immutable history | implemented | PG concurrency tests |
| Notifications | outbox, dispatcher, email adapter, templates, consent | implemented | WhatsApp/SMS vendors open decision |
| Practice portal | dashboard, patient list/detail/profile edit, appointments, settings | partially implemented | administrative data only |
| Question portal | psychologist question inbox | implemented (legacy) | not a secure clinical channel |
| Clinical access control | category A-D policy, care-relationship check, step-up, fail-closed access log | **implemented in this increment** | policy and log interface only; no DB sink yet |
| Practice schedule | Mon-Sun 9-18 IST, declared holidays, due-time calculator | missing (next increment) | OD-H2 approved; targets OD-H1 proposed |
| Digital intake | versioned questionnaire engine, drafts, immutable submissions, review task | missing | engine buildable now; content blocked (OD-G1) |
| Pre-consultation brief | template-generated factual brief | missing | depends on intake |
| Clinical records | profile history, session notes, MSE, addenda, provenance | missing | needs approved migrations |
| Prioritisation | doctor-assigned attention priorities, history, overdue dashboard | missing | doctor-only writes |
| Care plans / progress | goals, milestones, patient summaries | missing | |
| Secure messaging | patient-doctor messaging with review task | missing, blocked | legal/clinical review (OD-I1, H-series) |
| Document management | released documents, record access workflow | missing | legal review (OD-D3) |
| Encryption | field-level envelope encryption, key provider interface | missing | provider-independent interface buildable; KMS choice open (OD-C3) |
| Multilingual | locale-aware questionnaire/definition structure | missing | English only in V1; structure only |
| Instruments | PHQ-9, GAD-7 | blocked | adoption and licensing not approved; do not deploy |
| Safety assessment | clinician-led safety workflow | deferred | clinician-led by owner decision; no async safety items |
| Minors / other age groups | | deferred | adult-only V1; configuration hooks only |
| Backups / retention | | blocked | OD-B6, OD-D2 |

## Safeguards enforced by tests in this branch
Mandatory MFA (no exemption code or migration), no risk-label/score constructs, no analytics or AI SDK in clinical-access code, fail-closed access logging, patient IDOR denial, restricted-note protection, no private-note exposure to patients.

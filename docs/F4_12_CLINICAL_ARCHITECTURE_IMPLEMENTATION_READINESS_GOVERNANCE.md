# F4-12 CLINICAL ARCHITECTURE, TECHNICAL BOUNDARY & IMPLEMENTATION READINESS GOVERNANCE v1.0

## 1. Executive Summary

F4-12 consolidates F4-A through F4-11 into an **architecture / implementation-readiness gate**.

**Verdict:** The project is **NOT READY** for Option C clinical implementation.

Option B is a hardened operational practice portal (auth, MFA, appointments, notifications, audit/security, educational AI, public crisis resources). Clinical Option C remains **BLOCKED**. This document defines trust boundaries, architectural invariants, decision registers, and production gates — it does **not** authorize engineering, schema, APIs, UI, AI expansion, or Production clinical deployment.

**Document status:** **NOT YET DECIDED** (governance draft awaiting human package review).

---

## 2. Scope

Architecture analysis; readiness scorecard; decision consolidation; Option B protection; Option C implementation gate.

---

## 3. Non-Goals

No clinical tables/migrations/APIs/UI; no AI clinical expansion; no notification redesign; no Q&A auth migration; no Production access; no invented legal/retention periods; no compliance claims; no commits/pushes.

---

## 4. Repository Baseline

| Item | Value |
| --- | --- |
| Branch | `cursor/verifier-required-tables-be7a` |
| HEAD | `b32e1d095e82d84674589b4f6d37542c73fbddeb` (`b32e1d0`) |
| Message | `security: verify notification and outbox controls` |
| Migrations | `drizzle/0001`–`0007` (identity, MFA, appointments, idempotency, notifications, OTP metadata, must-change-password) |
| Workers | `notifications:process` script; Production worker hosting **OPEN** |
| Clinical schema | **None** |
| Untracked | F4-A…F4-11 docs + this doc; personal JPEG excluded |

---

## 5. Governance Inputs

| Doc | Role | Package status |
| --- | --- | --- |
| F4-A Charter | Binding principles | Draft — domains **NOT YET DECIDED** |
| F4-01 Classification | Data taxonomy | Draft |
| F4-02 Private/Shared | Visibility models | Draft; Model A/B/C **DECISION REQUIRED** |
| F4-03 Consent | Purpose/channel/item consent | Draft; O11 **OPEN** |
| F4-04 RBAC/Relationships | Authz hierarchy | Draft; many relationship rules **NOT YET DECIDED** |
| F4-05 Versioning | No silent overwrite | Draft |
| F4-06 Safety | Human authority; no auto escalate | Draft; **LEGAL REVIEW** heavy |
| F4-07 Communication | Channel ≠ content | Draft; clinical messaging **BLOCKED** |
| F4-08 Assessments | Score ≠ diagnosis | Draft; **BLOCKED** |
| F4-09 Retention | Periods **UNSET** | Draft; O10 **OPEN** |
| F4-10 Audit | Audit ≠ clinical record | Draft |
| F4-11 AI | AI ≠ authority; educational Ask boundary | Draft; clinical AI **BLOCKED** |

**Dependency map:**

```text
F4-01 → F4-02 → F4-03 → F4-04 → F4-05
  → F4-06 → F4-07 → F4-08 → F4-09
  → F4-10 → F4-11 → F4-12
```

**Conflicts / tensions (do not silently resolve):**

| Issue | Sources | Status |
| --- | --- | --- |
| Privacy copy vs Option B accounts | Decisions O11 vs implemented accounts | **REQUIRES GOVERNANCE DECISION** / Production **BLOCKED** |
| Appointment history immutability vs erasure | Option B APPROVED history vs F4-09 legal erasure | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Share Model A vs B vs C | F4-02 | **DECISION REQUIRED** |
| Clinical read auditing all vs sample | F4-10 / Charter | **NOT YET DECIDED** |
| Educational Ask vs future clinical AI boundary under unified auth | F4-11 / F4-A | **NOT YET DECIDED** formal policy |

Existence of documents ≠ package approval.

---

## 6. Current Option B Architecture

| Layer | Evidence |
| --- | --- |
| Public site | Marketing/education; crisis resource directory |
| Patient / psychologist practice surfaces | App Router; middleware cookie presence checks |
| Auth | Postgres identity; sessions; MFA for PSYCHOLOGIST/SUPER_ADMIN; OTP |
| Roles | PATIENT, PSYCHOLOGIST, SUPER_ADMIN, reserved STAFF |
| Appointments | Ownership via patientUserId/psychologistUserId; exclusion constraint; history append-only; version concurrency |
| Notifications | Outbox EMAIL+WHATSAPP; server-derived recipients; privacy-safe templates; WhatsApp channel opt-in |
| Audit | `audit_logs`, `security_events`, stripSecrets |
| AI | Educational Ask + Q&A review draft — non-clinical |
| Q&A | Separate HMAC portal session — architectural debt; do not unify here |
| DB | Single Postgres PMS + separate Q&A/crisis stores |
| Deploy | Next.js / Vercel-style compatible; Production go-live separately gated |

---

## 7. Future Option C Boundary

**BLOCKED until gates in §39.** May eventually include private/shared clinical records, assessments, safety workflows, clinical messaging, clinical documents, constrained AI assist — only after approvals. Listing ≠ product commitment.

---

## 8. Trust Boundaries

| Boundary | Untrusted inputs | Authoritative source | Allowed | Prohibited | Authz | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Browser/client | Role, patient ID, visibility, consent flags | Never for authz | UX | Authz decisions | Server only | N/A |
| Public website | Forms/content | Published content | Education | Clinical records | Public | Minimal |
| Patient app | Session cookie + forms | DB session + ACL | Own ops / future shared | CLINICAL_ONLY; others’ data | F4-04 | F4-10 |
| Psychologist app | Session + MFA | DB + relationship | Own patients | Other psych patients | F4-04 | F4-10 |
| Admin surface | Privileged session | Practice permissions | Config/ops | Clinical bodies | Deny clinical | Ops audit |
| Auth service | Credentials | User/role tables | Identity | Clinical ACL | — | Security events |
| Authz/relationship | Claims | Server ACL | Decisions | Client trust | — | DENY/ALLOW events |
| Consent layer | Preferences | Consent evidence | Purpose/channel | Replace authz | F4-03 | Consent events |
| Clinical data service | Future | Clinical store | Governed CRUD | Silent overwrite | F4-02/04/05 | Clinical audit |
| Appointment service | Booking inputs | Appointments DB | Ops scheduling | Auto clinical rows | Ownership | Ops audit/history |
| Notification/outbox | Events | Outbox expansion | Ops notify | Clinical bodies default | Server recipients | Delivery trail |
| AI service | Prompts | Educational corpus / future min data | Assist | Clinical authority | Invoker ACL | AI events |
| Safety service | Signals | Human review | Route/flag | Auto diagnose/escalate | Human | Safety events |
| Assessment service | Responses | Instrument+score versions | Score/assist | Auto diagnosis | F4-08 | Assessment events |
| Audit service | Event metadata | Append-only lean | Accountability | Clinical shadow copy | Restricted read | Self |
| Export/deletion | Requests | Policy + ACL | Governed ops | Silent erase of provenance | Dual control lean | F4-09/10 |
| Document storage | Uploads | Object ACL | Future docs | Public signed permanence | Relationship | Access events |
| Workers | Jobs | Machine identity | Deliver/process | Human clinical authority | Least privilege | Worker events |
| Database | SQL roles | Schema ACLs | Persist | App-role = restore role | DB grants | — |
| External providers | APIs | Contracts | Delivery/AI edu | Assumed deletion/training OK | Keys in secrets | Provider logs out-of-band |

---

## 9. Authentication Architecture

Authn answers “who.” Option B: sessions, MFA for privileged roles, OTP, password recovery. Session validity necessary but insufficient for clinical access (F4-04). Q&A auth remains separate. Do not redesign in F4-12.

---

## 10. Authorization Architecture

```text
identity + role + relationship + resource + classification + visibility
  + purpose + action + consent(where applicable) + session/MFA + audit
```

Preserve: patient isolation; cross-psychologist DENY; tampered publicId DENY; SUPER_ADMIN clinical blindness; no client-side authz trust; public IDs ≠ access.

Future clinical roles (consultant, supervisor, etc.): **NOT YET DECIDED** — F4-04 proposals only.

---

## 11. Relationship Architecture

Pending/active/paused/transferred/ended/historical/temporary — conceptual (F4-04). Appointment ≠ clinical relationship. Termination affects **access**, not automatically **preservation** (F4-09). Worker/cache/link invalidation required conceptually. Exact states: **NOT YET DECIDED**.

---

## 12. Consent Architecture

```text
LOGIN ≠ CONSENT
BOOKING ≠ CLINICAL CONSENT
WHATSAPP OPT-IN ≠ CLINICAL DISCLOSURE AUTHORIZATION
```

Service / purpose / item-share / channel / assessment / AI / third-party remain distinct (F4-03). Consent ≠ authorization; authorization ≠ consent. Storage: not implemented for clinical catalogue.

---

## 13. Data Classification Architecture

| Layer | Owner lean | Visibility | Version | Audit | Retain | Consent | AI | Notify |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Operational / identity | Practice/user | Own/ops | Ops | Yes | **UNSET** | Account/terms OPEN | Edu only | Ops OK |
| Communication (ops) | System | Parties | Event | Delivery | **UNSET** | Channel | No bodies | Ops |
| Wellness | Patient | CONDITIONAL | CONDITIONAL | CONDITIONAL | **UNSET** | Purpose | CONDITIONAL | Minimize |
| Clinical-private | Treating psych | CLINICAL_ONLY | Yes | Yes | **UNSET**/legal | Care | **BLOCKED** | DENY bodies |
| Clinical-shared | Psych+share rules | SHARED_READ | Yes | Yes | **UNSET** | Share | **BLOCKED** | Secure surface |
| Collaborative | Joint rules | SHARED_COLLAB | Yes | Yes | **UNSET** | Collab | **BLOCKED** | Minimize |
| Assessment | Psych/instrument | Per F4-08 | Yes | Yes | **UNSET** | Assess | **BLOCKED** | No scores |
| Safety | Psych/human | Restricted | Yes | Yes | Legal | Exception legal | Signal only later | Generic |
| Documents | Per class | Per class | Yes | Yes | **UNSET** | CONDITIONAL | **BLOCKED** | No attachments ordinary |
| Audit/security | System | Restricted | Append lean | Self | **UNSET**/legal | N/A | Deny train | N/A |
| System metadata | System | Ops | N/A | CONDITIONAL | Ops | N/A | Min | N/A |

---

## 14. Private / Shared / Collaborative Architecture

F4-02: PRIVATE ≠ SHARED ≠ COLLABORATIVE. Share/publish/ack/correction/amend/revoke/historical visibility/termination/transfer — many **DECISION REQUIRED** (esp. Model A/B/C). Prefer governance lean Model B for private→shared transforms (F4-02 recommendation for review — still **NOT YET DECIDED**).

---

## 15. Versioning Architecture

No silent overwrite of authoritative clinical history (F4-05). Record vs version identity; actor/role/relationship/time/source/approval/visibility/amendment/supersession; PROVENANCE UNKNOWN if unknown; AI drafts non-authoritative.

---

## 16. Provenance Architecture

```text
VERSION HISTORY ≠ AUDIT HISTORY
```

Do not fabricate provenance. Imported/AI sources distinct. Technical append-only design: **TECHNICAL DECISION REQUIRED**.

---

## 17. Safety Architecture

Automation ≠ clinical authority. AI must not diagnose, declare safe/unsafe, break-glass, contact emergency services, disclose, or create authoritative safety decisions (F4-06/F4-11). After-hours / minors / caregivers / break-glass: **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No implementation.

---

## 18. Communication Architecture

Channel consent ≠ content authorization. Ordinary notifications must not carry clinical-private bodies by default (F4-07; Option B APPROVED copy pattern). Prefer secure in-app for Level 4–5. Recipients server-derived. Provider copies out-of-band. Clinical messaging **BLOCKED**.

---

## 19. Assessment Architecture

```text
response ≠ score ≠ interpretation ≠ formulation ≠ diagnosis
```

Licensing, score versions, patient visibility models A–D, longitudinal compare — **NOT YET DECIDED** / legal. No instruments/schemas. **BLOCKED**.

---

## 20. Retention Architecture

Retention ≠ access ≠ deletion. Periods **UNSET** (`DECISION_DATA_RETENTION.md` O10 OPEN). Do not invent numbers. Backups NOT CONFIGURED; RPO/RTO UNSET.

---

## 21. Export Architecture

Export ≠ view. Requester/approver/redaction/private-notes/AI/safety/package TTL — **NOT YET DECIDED** / legal. No endpoints.

---

## 22. Deletion Architecture

Withdrawal/revoke/closure/termination ≠ auto-delete. Soft vs hard; backups/providers/exports — **NOT YET DECIDED** / legal. Legal holds — **LEGAL REVIEW**. No workers.

---

## 23. Audit Architecture

Audit ≠ clinical record. No clinical bodies in ordinary metadata (aligns Option B hygiene). Append-only / failure policy / read-audit scope / patient transparency — **NOT YET DECIDED** / technical / legal (F4-10). Do not redesign Option B tables here.

---

## 24. AI Architecture

```text
authorized context → min data → consent/ACL → AI → human review → approval
  → version/provenance → visibility → audit
```

AI ≠ clinical authority; cannot expand human permissions. Educational Ask remains educational; must not become Option C by stealth (F4-11). Clinical AI **BLOCKED**. Kill switch / routing / isolation: **TECHNICAL DECISION REQUIRED** (this domain).

---

## 25. Worker Architecture

Current: notification processor expands outbox; machine identity. Future workers must not inherit human clinical authority; must re-check relationship/consent; avoid stale ACL and AI side-channels. No new clinical workers.

---

## 26. Document Storage Architecture

No clinical document vault today. Future: encryption, ownership, isolation, versioning, signed URL expiry, download authz, export/delete, provider copies, audit — **TECHNICAL DECISION REQUIRED** / **NOT YET DECIDED**. Do not add storage now.

---

## 27. Database Architecture

Option B: Postgres identity+appointments+notifications. Options for clinical: shared DB separate schemas; separate logical domains; separate services/DB; additional tenancy — **TECHNICAL DECISION REQUIRED**. Must not uncontrolled expand schema. No migrations in this task.

---

## 28. Tenant / Practice Boundary

Current: single-practice oriented. Multi-practice tenancy: **NOT YET DECIDED** / **TECHNICAL DECISION REQUIRED**. Patient/psych/admin/worker/AI isolation still mandatory within practice.

---

## 29. Secrets Architecture

Patterns: env/secrets manager for DB, session, SMTP, OTP, Twilio, optional AI keys. Never commit secrets. Restore credentials ≠ app role (backup framework). Do not print .env or access Production secrets.

---

## 30. Observability

Health, authz failures, queue depth, delivery rates — without clinical side-channels. SIEM: **NOT YET DECIDED**. No SIEM build.

---

## 31. Incident Response

Cross-patient/psych; export; AI leakage; notify leakage; break-glass; worker/audit failures — conceptual playbooks only. IR privilege ≠ clinical browse — **NOT YET DECIDED**.

---

## 32. Failure / Fail-Closed Model

| Failure | Lean for critical clinical paths |
| --- | --- |
| Authorization / relationship / consent lookup fail | **DENY** / fail closed |
| Version conflict | DENY write / retry with new version — **TECHNICAL DECISION** |
| Audit write fail | Fail closed vs queue — **NOT YET DECIDED** (F4-10) |
| Safety path ambiguity | HUMAN REVIEW; no auto escalate |
| AI fail | Degrade assist; human continues |
| Notification fail | Appointment may still commit (Option B APPROVED); clinical disclose must not assume delivery |
| Export/delete fail | DENY completion; preserve evidence |

Do not convert unresolved policy into code.

---

## 33. Migration Strategy

```text
Option B stable
  → governance package approved (required domains)
  → legal/professional reviews closed where required
  → F4-12 architecture approved
  → explicit clinical engineering authorization
  → controlled schema/API/UI milestones with tests
  → Production clinical gate
```

Prevent: uncontrolled schema expansion; partial clinical records; migrate without retention/RBAC/audit/consent/versioning/safety.

No migration files now.

---

## 34. Testing Strategy

Future required categories: unit; authz matrix; patient/psych/tenant isolation; consent; version conflict; provenance; audit integrity; safety; break-glass; assessment integrity; communication leakage; AI isolation; prompt injection; worker isolation; export/deletion; notification leakage; regression.

Not implemented in this task.

---

## 35. Production Readiness Gate

Before future clinical Production:

1. Governance approvals (required domains)  
2. Legal/professional reviews where marked  
3. Architecture approval (F4-12)  
4. Security review  
5. Clinical workflow review  
6. Privacy review  
7–15. Classification, consent, RBAC, versioning, safety, assessment (if used), retention, audit, AI (if used) approvals  
16–18. DR / backup / monitoring readiness  
19. Incident response readiness  
20. Independent security review  
21. Full regression  
22. Human acceptance  
23. Explicit Production authorization  

**None of these are claimed satisfied for Option C.** Option B Production also remains separately blocked (registration, retention O10, worker hosting, privacy copy, etc.).

---

## 36. Architecture Decision Register

| ID | Domain | Question | Evidence | Recommended position | Status | Dependency | Owner | Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AR01 | Gate | Authorize Option C now? | F4 package draft | Keep blocked | **BLOCKED** | All F4 | Practice owner | No clinical eng |
| AR02 | Authz | Role alone enough? | F1-B/F4-04 | No — relationship required | Aligns evidence; formal **NOT YET DECIDED** | F4-04 | Owner+security | ACL design |
| AR03 | Share | Model A/B/C | F4-02 | Prefer B for review | **NOT YET DECIDED** | F4-02 | Owner | Schema shape |
| AR04 | Consent | Channel≠clinical | F4-03/07 Option B | Adopt | Aligns APPROVED ops | F4-03 | Owner | Separate flags |
| AR05 | Retain | Periods | DECISION_DATA_RETENTION | Leave UNSET until legal | **LEGAL REVIEW** / O10 | F4-09 | Counsel+owner | Blocks Production |
| AR06 | DB | Clinical co-locate? | Single Postgres now | Separate schema lean | **TECHNICAL DECISION REQUIRED** | F4-12 | Architect | Migrations later |
| AR07 | Tenant | Multi-practice? | Single practice | Defer | **NOT YET DECIDED** | F4-04 | Owner | Tenancy design |
| AR08 | AI | Clinical AI? | F4-11 | Blocked | **BLOCKED** | F4-11 | Owner | No clinical AI |
| AR09 | AI | Educational Ask expand to clinical? | Charter stealth ban | Deny | **BLOCKED** | F4-11 | Owner | Keep edu |
| AR10 | Audit | Fail-closed clinical writes? | F4-10 | Lean fail-closed | **NOT YET DECIDED** | F4-10/12 | Security | Txn design |
| AR11 | Comm | Clinical messaging channels | F4-07 | In-app primary | **NOT YET DECIDED** | F4-07 | Owner | Channel allow-list |
| AR12 | Safety | Break-glass | F4-04/06 | Governed if ever | **LEGAL REVIEW** | F4-06 | Counsel+owner | No impl now |
| AR13 | Q&A | Unify auth with practice? | Separate stack | Defer | **NOT YET DECIDED** | Ops | Architect | Debt remains |
| AR14 | Storage | Clinical object store | None | Decide later | **TECHNICAL DECISION REQUIRED** | F4-09 | Architect | No vault now |
| AR15 | Worker | Clinical workers identity | Notify worker | Machine ≠ human clinical | Binding lean | F4-04/10 | Architect | Separate creds |

---

## 37. Readiness Scorecard

| Area | Current | Evidence | Blocking issue | Required decision | Ready? |
| --- | --- | --- | --- | --- | --- |
| Data classification | Draft | F4-01 | Package unapproved | Owner approve | **Not Ready** |
| Privacy | Partial | O11 OPEN | Copy vs accounts | Legal/copy | **Not Ready** |
| Consent | Draft | F4-03 | Clinical consent unset | Legal+owner | **Not Ready** |
| RBAC | Ops strong; clinical draft | F1-B/F4-04 | Clinical relationships | Owner | **Not Ready** |
| Relationships | Ops appt only | F4-04 | Clinical relationship model | Owner | **Not Ready** |
| Versioning | Ops history only | F4-05 | Clinical version policy | Owner | **Not Ready** |
| Provenance | Concepts | F4-05 | Tech design | Architect | **Not Ready** |
| Safety | Resources only | F4-06 | Legal+SOP | Legal+owner | **Not Ready** |
| Communication | Ops notify | F4-07 | Clinical messaging policy | Owner | **Not Ready** |
| Assessments | None | F4-08 | Instruments/licensing | Legal+owner | **Not Ready** |
| Retention | UNSET | F4-09/O10 | Periods | Legal | **Not Ready** |
| Export | None | F4-09 | Policy | Legal+owner | **Not Ready** |
| Deletion | None | F4-09 | Erasure vs integrity | Legal | **Not Ready** |
| Audit | Ops yes | F4-10 | Clinical catalogue | Owner+security | **Not Ready** |
| AI clinical | Blocked | F4-11 | Approvals | Owner | **Not Ready** |
| Workers | Notify only | Scripts | Clinical worker design | Architect | **Not Ready** |
| Storage | No clinical vault | — | Design | Architect | **Not Ready** |
| Database clinical | None | Drizzle 0001–7 | Separation strategy | Architect | **Not Ready** |
| Tenant isolation | Single practice | — | Multi-tenant if needed | Owner | **Not Ready** / N/A single |
| Secrets | Env patterns | Checklists | Production secrets process | Ops | Partial ops / clinical N/A |
| Observability | Basic logs | — | Clinical monitoring | Security | **Not Ready** |
| Incident response | Conceptual | F4-10 | Playbooks | Security | **Not Ready** |
| Testing clinical | None | — | Suites undefined as gates | Eng | **Not Ready** |
| Migration to C | Blocked | Charter | Approvals | Owner | **Not Ready** |
| Production clinical | Blocked | Decisions | All above | Owner | **Not Ready** |

**Overall Option C readiness: NOT READY.**

Option B security baseline at `b32e1d0` is strong for ops; Production Option B still separately gated.

---

## 38. Option B Protection

F4-12 does **not** authorize changes to: appointments; notifications; authentication; MFA; separate Q&A; educational AI; crisis resources as resources; Option B schema.

This task creates **documentation only** — no clinical schema/API/UI introduced.

---

## 39. Option C Implementation Gate

**OPTION C CLINICAL IMPLEMENTATION IS BLOCKED UNTIL:**

- required governance decisions are approved  
- legal/professional reviews completed where required  
- architecture (F4-12) approved  
- unresolved dependencies closed  
- security / clinical workflow / privacy requirements accepted  
- testing requirements defined  
- implementation scope separately authorized  

**F4-12 ITSELF DOES NOT AUTHORIZE OPTION C IMPLEMENTATION.**

---

## 40. Governance Package Assessment

F4-A…F4-12 form a **coherent draft package** for human review, not an approved clinical policy set.

Missing for readiness: owner approvals; legal closures (O10, O11, minors, safety, instruments, AI processors); technical choices (DB separation, storage, audit fail policy, kill switch); share model; relationship lifecycle; clinical messaging allow-list.

Contradictions: listed in §5 — remain **REQUIRES GOVERNANCE DECISION** / legal.

Implementation blockers: all scorecard **Not Ready** rows; Option C **BLOCKED**.

---

## 41. Outstanding Decisions

Share model; clinical relationship establishment; consent granularity; retention periods; export/deletion rights; read-audit scope; clinical messaging channels; assessment catalogue/licensing; break-glass; AI clinical categories; DB/storage/tenant; Q&A unify; O11 privacy copy; Production Option B ops gates (worker, backups, registration).

---

## 42. Legal / Professional Review Items

Retention/erasure; privacy/terms for accounts; minors/guardians; emergency disclosure; break-glass; supervision; assessment licensing; AI clinical processing/vendors; third-party disclosure; professional documentation duties; after-hours obligations.

Do not invent periods, ages, or compliance claims.

---

## 43. Technical Decisions Required

Clinical DB separation strategy; object storage; append-only/WORM audit; clinical audit fail-closed mechanics; worker identity model; AI trust boundary/kill switch; signed URL design; multi-tenant (if ever); SIEM; cache/session revocation on relationship end.

---

## 44. Binding Architecture Invariants

1. Authentication never equals authorization.  
2. Role never independently grants clinical access.  
3. Relationship is independently enforced.  
4. Patient isolation is mandatory.  
5. Cross-psychologist access is denied by default.  
6. SUPER_ADMIN clinical-body access is denied by default.  
7. Client-provided IDs are never authoritative for authorization.  
8. Consent never replaces authorization.  
9. Authorization never implies consent.  
10. Private clinical content is not automatically shared.  
11. Shared content is not automatically collaborative.  
12. Clinical history is never silently overwritten.  
13. Version history is distinct from audit history.  
14. Provenance cannot be fabricated.  
15. AI output is not automatically authoritative.  
16. AI cannot expand a human’s permissions.  
17. AI cannot autonomously diagnose.  
18. AI cannot autonomously escalate safety events.  
19. AI cannot autonomously disclose protected information.  
20. Ordinary notifications do not carry clinical-private bodies by default.  
21. Revocation does not claim to erase already-viewed information.  
22. Retention periods must never be invented by engineering.  
23. Audit data is not a substitute for clinical records.  
24. Workers do not inherit human clinical authority automatically.  
25. Machine identities are not human clinical identities.  
26. Public identifiers do not confer access.  
27. Security failure on critical authorization paths must fail closed.  
28. Governance decisions must precede implementation.  
29. F4-12 does not authorize Option C.  
30. Production deployment requires a separate explicit gate.  
31. Educational Ask AI must not become Option C by stealth.  
32. Appointment ≠ permanent clinical relationship.  
33. Channel permission ≠ content disclosure permission.  
34. SENT ≠ RECEIVED ≠ READ ≠ ACTED UPON.  
35. WhatsApp opt-in ≠ clinical disclosure authorization.

---

## 45. Final Readiness Decision

| Question | Decision |
| --- | --- |
| Architecturally ready for Option C implementation? | **NO — NOT READY** |
| Governance package ready for human review? | **YES — draft package complete (unapproved)** |
| Option C implementation authorized? | **NO — BLOCKED** |
| F4-12 approval status | **NOT YET DECIDED** |

---

## 46. Recommended Next Step

1. **Independent human review** of the full F4-A…F4-12 draft package (no auto-commit assumed).  
2. Practice-owner decisions on **DECISION REQUIRED** / **NOT YET DECIDED** items.  
3. **Legal / professional review** for flagged domains (esp. O10 retention, O11 privacy, minors, safety, instruments, AI processors).  
4. Close Option B Production blockers separately if go-live desired for appointments only.  
5. Only after approvals: separate **explicit engineering authorization** for a narrowly scoped clinical foundation milestone — not started by this document.

Do **not** begin clinical implementation from F4-12 alone.

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-12 | Architecture readiness consolidation; Option C NOT READY / BLOCKED |

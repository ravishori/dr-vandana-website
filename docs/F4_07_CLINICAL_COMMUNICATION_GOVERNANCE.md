# F4-07 CLINICAL COMMUNICATION GOVERNANCE v1.0

## 1. Executive Summary

This document defines governance for **what** may be communicated, **to whom**, **through which channel**, **for what purpose**, under **what authorization and consent**, with **minimum necessary content**, and with what **auditability and safety controls**.

**Facts vs proposals:** Option B currently supports operational appointment email/WhatsApp (channels `EMAIL`, `WHATSAPP` only), account/security messaging (OTP/reset/verification), and public crisis *resources*. It does **not** implement clinical messaging, clinical SMS/push, safety escalation messaging, or AI-assisted clinical disclosure.

**Binding stance for review:** channel consent ≠ content consent; appointment notification ≠ clinical communication; CLINICAL_ONLY never in ordinary transactional notifications; sent ≠ received ≠ read ≠ acted upon; AI must not autonomously send clinical communication.

**Document status:** **NOT YET DECIDED**

---

## 2. Authorization / Scope

**Authorized:** F4-07 governance/documentation only.

**Forbidden:** clinical communication tables/APIs/UI/chat; clinical notification templates; clinical email/SMS/WhatsApp/push engines; safety notification engines; AI messaging workers; migrations; schema; Production changes; commits; F4-08 start.

Option C remains **BLOCKED**.

---

## 3. Governing Documents

| Input | Role |
| --- | --- |
| F4 Master Charter | Domain F4-07 Patient Communication |
| F4-01 | Data classification for communication categories |
| F4-02 | CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE; ack ≠ agreement |
| F4-03 | Channel vs purpose vs item-share vs clinical consent |
| F4-04 | Role + relationship + resource + action; isolation; admin blindness |
| F4-05 | Provenance; no silent overwrite; AI ≠ approval |
| F4-06 | Safety communication; no 24/7 claim; human clinical authority |
| `PATIENT_PRACTICE_DECISIONS.md` | Option B notification copy **APPROVED**; WhatsApp channel opt-in; Production blocked until privacy copy |
| F1-D-C (`b32e1d0`) | Notification/outbox security verification |

Conflicts → **DECISION REQUIRED**, not silent rewrite of prior docs.

---

## 4. Repository Evidence

| Area | Evidence (verified at `b32e1d0`) | Note |
| --- | --- | --- |
| Channels | `NOTIFICATION_CHANNELS = ["EMAIL","WHATSAPP"]` | **No SMS/push channel** in notification stack |
| Recipients | `PATIENT` / `PSYCHOLOGIST` roles in deliveries | Server-expanded from appointment parties |
| Templates | Appointment lifecycle keys; subject `"Appointment update from Dr. Vandana"` | Forbidden clinical patterns in tests |
| WhatsApp | Opt-in on `patient_profiles`; verified mobile ≠ consent | Trusted-caller consent helper (F1-D-C INFORMATIONAL residual) |
| Outbox | PENDING→PROCESSING→RETRY→SENT/SKIPPED/DEAD | `SENT` = provider accepted — not delivery receipt |
| SMTP residual | At-least-once; possible duplicate after send-then-crash | INFORMATIONAL — do not “fix” in F4-07 |
| Identity | PATIENT / PSYCHOLOGIST / SUPER_ADMIN / reserved STAFF; MFA for psych/admin | Authn ≠ clinical messaging authz |
| Appointment ownership | patientUserId / psychologistUserId checks | Ops isolation — not clinical chat |
| Q&A | Separate question-portal session stack | Architectural boundary/debt — do not redesign here |
| Crisis | Public resource directory | Not clinical crisis messaging |
| `emergency_contact` | Optional profile text | Not disclosure consent |

---

## 5. Current Option B Communication Boundary

| Class | Examples | Clinical? |
| --- | --- | --- |
| Account/security | Email verification, OTP, password reset, MFA | No |
| Appointment/operational | Requested/confirmed/rejected/cancelled/reschedule/completed/no-show emails; WhatsApp if opted in | **No** — operational |
| Administrative | Practice settings contact (ops) | No |
| Public crisis resources | Mental-health support pages | Educational/referral — not patient clinical messaging |
| Q&A | Psychology question portal | Not clinical EHR messaging |

Do **not** reclassify these as clinical communications merely because a patient is involved.

---

## 6. Future Option C Communication Boundary

**GOVERNANCE PROPOSALS ONLY — BLOCKED for implementation:**

- Psychologist ↔ patient clinical messages  
- Therapy-plan / homework / activity communication  
- Assessment invitations/results/interpretation messaging  
- Safety/escalation communication  
- Clinical document availability notifications  
- Clinical care reminders  
- Clinical replies containing clinical information  
- AI-assisted clinical drafts/sends  

Listing ≠ authorization to build.

---

## 7. Communication Taxonomy

| ID | Class | Status | Examples |
| --- | --- | --- | --- |
| C01 | Public information | Exists | Education, public crisis resources, website |
| C02 | Account/security | Exists | OTP, reset, verification, security alerts |
| C03 | Appointment/operational | Exists | Booking, reminder, cancel, reschedule |
| C04 | Administrative | Partial/ops | Practice contact, non-clinical admin requests |
| C05 | Wellness | Future / **NOT YET DECIDED** | Habit reminders; personalized wellness may be sensitive |
| C06 | Clinical shared communication | Future **BLOCKED** | Approved care-plan notices, shared recommendations |
| C07 | Clinical private communication | Future **BLOCKED** | Do not assume patient may receive CLINICAL_ONLY |
| C08 | Assessment communication | Future **BLOCKED** | Invite / reminder / score / interpretation / recommendation — separately |
| C09 | Safety communication | Future **BLOCKED** | Urgent review, emergency contact, referral — F4-06 |
| C10 | AI-assisted communication | Future **BLOCKED** | Draft → review → approve → send |
| C11 | Third-party communication | Future **BLOCKED** | Caregiver, family, referring professional, emergency contact, external provider |

---

## 8. Channel Governance

| Channel | Exists Option B? | Risk | Permitted (current/ops) | Prohibited default | Consent | Authz | Audit | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| In-app / dashboard | Ops dashboards; no clinical inbox | Med | Authn views of own ops data | Clinical without F4-02/04 | Session | Server ACL | CONDITIONAL | F4-09 |
| Email | Yes (appointments + security) | Med–High | C02/C03 transactional | Clinical narrative / Level 4–5 bodies | Account email; clinical email **NOT YET DECIDED** | Server recipient | Yes ops | F4-09 |
| SMS | **Not** in notification channels | High preview | OTP if/when used elsewhere | Clinical bodies | Channel consent ≠ clinical | Server | Yes | F4-09 |
| WhatsApp | Yes (appointment templates) | High shared device | C03 if opt-in | Clinical bodies | Channel opt-in | Server + opt-in | Yes | F4-09 / provider |
| Push | **Not present** | High lock-screen | N/A | Clinical bodies | **NOT YET DECIDED** | — | — | — |
| Phone | Human practice | High | Human clinical judgment offline | Automated clinical phone bot | **LEGAL REVIEW** | Human | Record CONDITIONAL | F4-09 |
| Downloadable document | Not clinical vault | High forward | Future governed | Uncontrolled share | F4-02/03 | ACL | Yes | F4-09 |
| External/third-party | SMTP/Twilio processors | High | Delivery metadata | Clinical narrative in provider payloads | Processor governance | System | Yes | Provider copies |

Confidentiality is **not** equivalent across channels.

---

## 9. Purpose Governance

| Purpose | Auto-authorize other purposes? |
| --- | --- |
| Security | No |
| Appointment | No |
| Administration | No |
| Wellness | No |
| Clinical care | No |
| Assessment | No |
| Safety | No |
| Consent | No |
| Legal/required disclosure (if applicable) | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Research/QI | No — separate basis |
| AI assistance | No |

> Permission for Purpose A does not automatically authorize Purpose B.

---

## 10. Content Classification

**Governance proposal — final categories NOT YET DECIDED:**

| Level | Name | Examples |
| --- | --- | --- |
| 0 | Public | No personal information |
| 1 | Operational | Date/time, appointment public id, practice name |
| 2 | Personal | Account/contact |
| 3 | Sensitive | Personalized wellness / potentially sensitive |
| 4 | Clinical | Patient-specific clinical information |
| 5 | Highly sensitive / safety | Crisis narratives, assessment bodies, private notes, safety determinations |

Ordinary email/SMS/WhatsApp/push: prefer Level 0–1 only unless separately governed.

---

## 11. Minimum Necessary Principle

External channel → **minimal notification** → **authenticated secure surface**.

Illustrative (non-final) pattern:

> “You have a secure message from Dr. Vandana. Please sign in to view it.”

Not approved legal copy. Prefer this over detailed clinical explanation in SMS/email/WhatsApp.

CLINICAL_ONLY must never enter ordinary transactional notifications.

---

## 12. Sender Authority

| Actor | May originate | Notes |
| --- | --- | --- |
| Patient | Replies (future triage) | Not auto clinical record |
| Psychologist | Ops today; clinical future CONDITIONAL | Clinical author |
| Practice staff | Admin ops CONDITIONAL | No clinical body by default |
| SUPER_ADMIN | System/ops config | No clinical messaging access by privilege |
| System / worker | Deliver templates | **Technical sender ≠ clinical author** |
| AI | Draft only if approved | Never author/approver/sender of clinical |

**technical sender ≠ clinical author ≠ approver**

---

## 13. Recipient Authority

Recipients must be **server-derived**. Client-supplied patient ID, email, phone, or recipient role never authorize.

| Recipient | Rule |
| --- | --- |
| Patient | Own communications only |
| Treating psychologist | Own patient relationship |
| Other psychologist | DENY without governed relationship |
| Caregiver / guardian | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Emergency contact | ≠ blanket clinical disclosure (F4-06) |
| Referring professional | Explicit disclosure governance |
| Administrator | Ops metadata CONDITIONAL; clinical body DENY |
| External provider | Processor/minimization rules |

---

## 14. Patient Communication

Patients may receive Option B ops/security messages. Future clinical receive only if SHARED visibility + relationship + purpose + channel rules allow. Login ≠ permission to view every communication.

---

## 15. Psychologist Communication

Future clinical send requires: correct patient; active/authorized relationship; purpose; visibility; provenance; approval; audit (F4-04/F4-05). Cross-psychologist communication: DENY default.

---

## 16. In-App Communication

Separate from external channels. Requires: authenticated identity; valid session; relationship; resource authorization; visibility scope. Future: read/ack/response/correction/share-revoke semantics. No clinical inbox implemented.

---

## 17. Email

| Type | Status |
| --- | --- |
| Transactional (OTP, reset, verification, appointment) | Exists Option B |
| Optional wellness | **NOT YET DECIDED** |
| Future clinical email | **BLOCKED** / **NOT YET DECIDED** + **LEGAL / PROFESSIONAL REVIEW REQUIRED** |

Risks: forwarding, shared inbox, wrong recipient, retention outside platform, attachment leakage. Prefer secure in-app for Level 4–5.

---

## 18. SMS

Not in current `NOTIFICATION_CHANNELS`. OTP/security may exist via OTP adapters separately — **NOT VERIFIED** as general appointment SMS.

Clinical SMS: **DENY** default / **NOT YET DECIDED** with legal review. Risks: preview, shared phone, number reassignment, delivery uncertainty.

---

## 19. WhatsApp

> WhatsApp consent is channel consent, not blanket permission to disclose clinical information.

| Topic | Position |
| --- | --- |
| Opt-in / opt-out | Implemented; default off |
| Verified mobile ≠ consent | Confirmed in tests |
| Clinical content | **DENY** in ordinary templates (Option B pattern) |
| Shared devices / previews | High risk |
| Provider processing | Twilio direction; production activation **OPEN** |
| Legal wording | **OPEN** (O11) |
| Helper redesign | **Not in F4-07** |

Clinical WhatsApp: **BLOCKED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 20. Push

Not implemented. Clinical push: **DENY** default (lock-screen). Any future push: **NOT YET DECIDED**.

---

## 21. Phone

Human-mediated practice communication may occur outside the platform. Platform must not automate clinical phone disclosure. Recording/logging: **NOT YET DECIDED** / legal review. No claim of platform phone crisis line.

---

## 22. Attachments

Future clinical reports/assessments/PDFs/images: visibility, authz, download, forwarding, retention, versioning, audit — all **DECISION REQUIRED**. No document vault in this phase. Prefer no attachments on email/SMS/WhatsApp for Level 4–5.

---

## 23. Clinical Communication

Future clinical message conceptual fields (not schema): sender, recipient, relationship, purpose, communication class, visibility, provenance, timestamp, approval status, version, attachments (if allowed), audit reference.

Requires explicit governance before any implementation. SHARED_READ ≠ arbitrary messaging. SHARED_COLLABORATIVE ≠ assumed chat.

---

## 24. Assessment Communication

Separate: invitation; completion reminder; score/result; interpretation; clinical recommendation. Scores/interpretations must not appear in ordinary notifications. Detail F4-08. Status: **BLOCKED**.

---

## 25. Safety Communication

Integrate F4-06: urgent review; crisis; emergency contact; referral; emergency services.

- No automated crisis communication implementation  
- No 24/7 monitoring claim  
- No AI emergency decisions  
- Who/what/when/authority/record → **LEGAL / PROFESSIONAL REVIEW REQUIRED**  
- Ordinary channels: generic alert + secure login only  

---

## 26. Patient Replies

Future replies may be administrative, wellness, clinical, or safety-sensitive. Require conceptual triage. Patient messages must not silently become authoritative clinical records (F4-05). Classification rules: **NOT YET DECIDED**.

---

## 27. Third-Party Communication

Referring professional, school, employer, insurer, caregiver, emergency services, external provider — each **LEGAL / PROFESSIONAL REVIEW REQUIRED**. Relationship ≠ authorization.

---

## 28. Minors / Dependents

Guardian, dependent, caregiver, assent, confidentiality, emergency communication — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No invented age thresholds. Independent minor accounts **DEFERRED** (Option B).

---

## 29. Read / Acknowledgement Semantics

```text
sent ≠ delivered ≠ failed ≠ opened ≠ viewed ≠ acknowledged ≠ responded ≠ acted upon
```

Option B `SENT` = provider accepted request — not a delivery-receipt webhook.

Acknowledgement ≠ agreement (F4-02). Delivery/read ≠ clinical agreement or safety confirmation.

---

## 30. Consent

Preserve F4-03:

- Channel consent ≠ content/clinical disclosure consent  
- Purpose-specific  
- Item-share separate  
- Material change may require renewed governance  
- Login/booking ≠ blanket communication consent  

---

## 31. Withdrawal / Revocation

| Action | Effect |
| --- | --- |
| Withdraw channel consent | Stop future sends on that channel |
| Withdraw purpose | Stop that purpose |
| Revoke shared record | Future visibility (F4-02) |
| Disable future communication | Forward-looking |
| Delete communication | ≠ automatic; F4-09 |
| Retain audit evidence | Expected |

Withdrawal ≠ automatic deletion. Revocation ≠ erase already-viewed external copies.

---

## 32. Relationship Changes

Termination/transfer/suspension (F4-04) must affect **future** communication authorization. Historical authorship/provenance preserved (F4-05). Cross-psychologist messaging remains DENY without exception.

---

## 33. Versioning / Provenance

Future clinical communication lifecycle: draft → review → approval → send → amendment → correction → supersession. No silent overwrite. AI draft provenance required if used.

---

## 34. Audit

F4-10 dependency. Candidate events: created, approved, sent, delivered, failed, viewed, acknowledged, replied, revoked, corrected, escalated, disclosed, exported.

Do not place sensitive clinical bodies in ordinary audit metadata.

---

## 35. Retention / Export / Deletion

Defer periods to **F4-09**. Analyze conceptually: history, delivery metadata, message body, provider copies, attachments, audit, deletion requests, legal preservation. Never invent durations.

---

## 36. AI-Assisted Communication

```text
AI draft → human review → human approval → send
```

**Forbidden:** AI → autonomous clinical decision / disclosure / emergency action / send / approve.

Detail F4-11. Status: **BLOCKED** until governance + approval.

---

## 37. After-Hours

Integrate F4-06:

- No 24/7 monitoring claim  
- Delivery ≠ clinical review  
- After-hours policy **NOT YET DECIDED**  
- Emergencies may require external resources  
- Clinical duty expectations → **LEGAL / PROFESSIONAL REVIEW REQUIRED**  

---

## 38. Threat Model

| # | Threat | Impact | Governance control | Future technical control | Domain |
| --- | --- | --- | --- | --- | --- |
| 1 | Wrong recipient | Disclosure | Server-derived recipient | Expand from appointment/relationship | F4-04/07 |
| 2 | Cross-patient leakage | Isolation breach | Patient isolation | Authz tests | F1-B |
| 3 | Cross-psychologist leakage | Isolation breach | Relationship ACL | Authz | F4-04 |
| 4 | Client-supplied recipient | Spoof send | Ignore client recipient | Server expand | F1-D-C |
| 5 | Client-supplied patient ID | Wrong patient | Ownership checks | Session bind | F4-04 |
| 6 | Stale relationship | Unauthorized msg | Status checks | ACL recompute | F4-04 |
| 7 | Revoked relationship | Same | Termination rules | Deny send | F4-04 |
| 8 | Wrong channel | Exposure | Channel×content matrix | Allow-lists | F4-07 |
| 9 | Channel consent misuse | Over-disclosure | Channel ≠ content | Separate flags | F4-03 |
| 10 | Clinical content in SMS | Preview leak | DENY Level 4–5 SMS | Template bans | F4-07 |
| 11 | Clinical in email preview | Leak | Minimize subject/body | Secure-message pattern | F4-07 |
| 12 | WhatsApp shared-device | Exposure | Channel consent + content limits | Opt-in + templates | F4-03/07 |
| 13 | AI auto-send | Unauthorized clinical msg | AI never send | Hard deny | F4-11 |
| 14 | AI hallucinated content | Harm | Human approve | Review gate | F4-11 |
| 15 | Worker wrong event | Wrong message | Event-type integrity | Typed outbox | F1-D-C |
| 16 | Outbox tampering | Fraudulent send | DB authz / integrity | Migrations locked | F1-D |
| 17 | Replay | Duplicate/confusion | Idempotency | Delivery keys | F1-D-C |
| 18 | Duplicate delivery | Confusion/fatigue | At-least-once awareness | SMTP residual documented | F1-D-C |
| 19 | Provider compromise | Leak | Minimize payload | No clinical bodies | F4-07 |
| 20 | Attachment leakage | Over-share | Attachment governance | Authz download | F4-09 |
| 21 | Unauthorized caregiver | Wrong party | Distinct roles | Explicit authorize | F4-03/04 |
| 22 | Emergency contact misuse | Over-disclose | F4-06 | Explicit authorize | F4-06 |
| 23 | Admin access | Clinical browse | Admin blindness | Deny bodies | F4-04 |
| 24 | Audit leakage | Sensitive in logs | Strip clinical bodies | Audit design | F4-10 |
| 25 | Export leakage | Over-share | Export authz | F4-09 | F4-09 |
| 26 | Revoked msg resurfacing | Stale access | Visibility events | ACL + link expire | F4-02/07 |

---

## 39. Access Matrix

| Actor | Operational | Shared Clinical | Private Clinical | Assessment | Safety | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Patient | ALLOW own | CONDITIONAL | DENY | CONDITIONAL | CONDITIONAL | DENY |
| Treating Psychologist | ALLOW linked | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL | DENY clinical admin |
| Other Psychologist | DENY | DENY | DENY | DENY | DENY | DENY |
| Supervisor | DENY default | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | DENY |
| Practice Staff | CONDITIONAL | DENY | DENY | DENY | DENY | CONDITIONAL ops |
| SUPER_ADMIN | CONDITIONAL ops | DENY | DENY | DENY | DENY | CONDITIONAL ops |
| System Worker | Deliver ops | DENY body | DENY | DENY | Route only CONDITIONAL | N/A |
| AI | Draft assist **NOT YET DECIDED** | DENY auto | DENY auto | DENY auto | DENY auto | DENY |
| Unauthorized User | DENY | DENY | DENY | DENY | DENY | DENY |

---

## 40. Channel × Content Matrix

| Content | In-App | Email | SMS | WhatsApp | Push | Phone |
| --- | --- | --- | --- | --- | --- | --- |
| OTP | N/A | ALLOW (if used) | CONDITIONAL | DENY default | DENY | N/A |
| Appointment | ALLOW | ALLOW ops | **NOT YET DECIDED** | ALLOW if opt-in | **NOT YET DECIDED** | Human CONDITIONAL |
| Admin | CONDITIONAL | CONDITIONAL | **NOT YET DECIDED** | **NOT YET DECIDED** | **NOT YET DECIDED** | CONDITIONAL |
| Wellness | **NOT YET DECIDED** | **NOT YET DECIDED** | **NOT YET DECIDED** | **NOT YET DECIDED** | **NOT YET DECIDED** | CONDITIONAL |
| Clinical | CONDITIONAL future | **NOT YET DECIDED** / prefer DENY body | DENY default | DENY default | DENY default | **LEGAL REVIEW** |
| Assessment | CONDITIONAL future | Prefer secure link only | DENY scores | DENY scores | DENY | **LEGAL REVIEW** |
| Safety | CONDITIONAL future | Generic alert only | Generic only | Generic only | Generic only | **LEGAL REVIEW** |
| Private clinical | DENY patient | DENY | DENY | DENY | DENY | **LEGAL REVIEW** |

---

## 41. Consent × Channel Matrix

| Channel | Operational / necessary | Channel consent | Purpose consent | Item-share consent | Clinical consent |
| --- | --- | --- | --- | --- | --- |
| Email | Account/appointment transactional | Account email use | Separate for optional/clinical | If sharing item | Required for clinical email if ever allowed |
| SMS | OTP CONDITIONAL | Required for non-OTP | Separate | If sharing | Required; ≠ channel alone |
| WhatsApp | Appointment if opt-in | **Required** (implemented) | Separate | If sharing | Required; channel ≠ clinical |
| In-app | Session auth | Authn ≠ consent | Purpose rules | F4-02 share | Clinical visibility rules |
| Phone | Human practice | **LEGAL REVIEW** | Purpose | If disclose item | **LEGAL REVIEW** |
| Third-party | Processor necessary | Processor notice | Purpose | Item if shared | **LEGAL REVIEW** |

**channel consent ≠ clinical disclosure consent**

---

## 42. Decision Register

| # | Decision | Status |
| --- | --- | --- |
| 1 | Clinical messaging allowed? | **BLOCKED** / **NOT YET DECIDED** |
| 2 | Which channels for clinical? | Prefer in-app; others **NOT YET DECIDED** |
| 3 | In-app mandatory for clinical content? | Recommended lean **YES** — **NOT YET DECIDED** |
| 4 | Email clinical content allowed? | Prefer DENY body / secure link — **NOT YET DECIDED** + **LEGAL REVIEW** |
| 5 | SMS clinical content allowed? | **DENY** default — **NOT YET DECIDED** formal |
| 6 | WhatsApp clinical content allowed? | **DENY** default — **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 7 | Push clinical content allowed? | **DENY** default — **NOT YET DECIDED** |
| 8 | Phone communication policy? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 9 | Patient reply classification? | **NOT YET DECIDED** |
| 10 | Message triage? | **NOT YET DECIDED** |
| 11 | Response expectations / SLAs? | **NOT YET DECIDED** — do not invent |
| 12 | After-hours policy? | **NOT YET DECIDED** / legal |
| 13 | Safety communication? | F4-06 + **LEGAL REVIEW** — **BLOCKED** implement |
| 14 | Emergency contact disclosure? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 15 | Caregiver communication? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 16 | Minor/dependent communication? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 17 | Third-party communication? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 18 | Attachments? | **NOT YET DECIDED** |
| 19 | Clinical message → record conversion? | Conceptual only — **NOT YET DECIDED** |
| 20 | Retention? | **F4-09** — unset |
| 21 | Export? | **F4-09** — **NOT YET DECIDED** |
| 22 | Deletion? | **F4-09** + legal |
| 23 | Correction? | F4-05 — **NOT YET DECIDED** |
| 24 | Audit? | F4-10 — **NOT YET DECIDED** |
| 25 | AI-assisted drafting? | **NOT YET DECIDED** / F4-11 |
| 26 | AI sending? | **DENY** / **BLOCKED** |
| 27 | External providers? | Processor governance — O11 **OPEN** |
| 28 | Delivery failure handling? | Ops + independent ack — **NOT YET DECIDED** for clinical |
| 29 | Duplicate messages? | F1-D-C residual acknowledged — policy **NOT YET DECIDED** |
| 30 | Communication revocation? | **NOT YET DECIDED** |
| 31 | Consent withdrawal? | F4-03 — forward-looking |
| 32 | Relationship termination? | F4-04 — future deny |
| 33 | Cross-psychologist communication? | **DENY** default |
| 34 | Supervisor communication? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 35 | Administrative access to clinical bodies? | **DENY** by default |

Option B appointment email/WhatsApp privacy-safe copy remains **APPROVED** operational pattern (decisions register) — not clinical messaging approval.

---

## 43. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** minors/guardians; emergency disclosures; mandatory reporting (if applicable—do not assume); caregiver communication; third-party disclosure; clinical email/WhatsApp/SMS; external providers; retention/deletion/export; professional response expectations; after-hours obligations; AI-assisted clinical communication.

Do not invent jurisdiction-specific requirements. Do not provide legal advice.

---

## 44. Binding Governance Invariants

1. Communication purpose must be explicit.  
2. Channel permission does not equal clinical disclosure permission.  
3. Recipient must be server-derived.  
4. Patient ID from client cannot establish authority.  
5. Clinical-private content cannot enter ordinary notifications.  
6. SUPER_ADMIN does not gain clinical communication access by privilege alone.  
7. AI cannot autonomously send clinical communication.  
8. Delivery does not imply review.  
9. Acknowledgement does not imply agreement.  
10. Withdrawal does not automatically erase history.  
11. Revocation does not erase already-viewed external copies.  
12. Relationship termination must affect future authorization.  
13. Patient isolation is mandatory.  
14. Cross-psychologist communication requires explicit authorization.  
15. Safety communication requires separate governance (F4-06).  
16. Emergency contact ≠ disclosure consent.  
17. External provider processing must be governed.  
18. Clinical attachments require separate controls.  
19. Communication corrections must preserve provenance.  
20. Communication history must not silently overwrite prior states.  
21. Authentication ≠ authorization to transmit clinical information.  
22. Authorization ≠ consent for every channel.  
23. Appointment notification ≠ clinical communication.  
24. SHARED_READ ≠ unrestricted messaging.  
25. SHARED_COLLABORATIVE ≠ assumed chat.  
26. Sent ≠ received ≠ read ≠ acted upon.  
27. Minimum necessary disclosure applies.  
28. No unsupported 24/7 monitoring claim.  
29. No fabricated legal requirements or retention periods.  
30. Clinical communication implementation remains blocked until governance + explicit engineering authorization.

---

## 45. Dependencies

```text
F4-01 classification → F4-02 visibility → F4-03 consent → F4-04 RBAC
  → F4-05 provenance → F4-06 safety ↔ F4-07 communication
  → F4-08 assessments → F4-09 retention → F4-10 audit → F4-11 AI → F4-12 architecture
```

Also: F1-B isolation; F1-C sessions; F1-D-C outbox/notification controls.

---

## 46. Implementation Restrictions

F4-07 is governance only. Cursor **MUST NOT** create: clinical communication tables/schema/enums; messaging APIs/Server Actions; clinical inbox/chat UI; clinical notification templates; clinical SMS/WhatsApp/email/push engines; AI messaging workers; migrations; production permissions code.

No Option C implementation is authorized.

---

## 47. Outstanding Decisions

Clinical messaging enablement; channel allow-list for clinical; in-app mandatory rule; email/SMS/WhatsApp/push clinical policy; phone policy; reply triage; response SLAs; after-hours; safety messaging playbooks; caregiver/third-party; attachments; message→record conversion; retention/export/delete; AI draft scope; duplicate/failure policy for clinical; O11 privacy/processor copy for Production.

---

## 48. F4-07 Status

**NOT YET DECIDED**

---

## 49. Recommendation for F4-08

Next domain: **F4-08 — Clinical Assessment & Psychometric Data Governance**.  
Do **not** begin F4-08 without explicit authorization.

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-07 | Draft clinical communication governance |

**Q&A debt note:** Separate question-portal authentication remains an architectural boundary; F4-07 does not redesign or migrate it.

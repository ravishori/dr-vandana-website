# F4-06 SAFETY, CRISIS & ESCALATION GOVERNANCE v1.0

## 1. Document Control

| Field | Value |
| --- | --- |
| **Document type** | Governance specification (not implementation; not legal certification) |
| **Phase** | F4-06 |
| **Status** | DRAFT — **NOT YET DECIDED** |
| **Baseline checkpoint** | `b32e1d0` (`security: verify notification and outbox controls`) |
| **Branch** | `cursor/verifier-required-tables-be7a` |
| **Parents** | F4 Master Charter; F4-01 through F4-05 |
| **Option B decisions** | `docs/PATIENT_PRACTICE_DECISIONS.md` |
| **Related public crisis resources** | `docs/crisis-resource-governance.md` (non-clinical resource directory) |

This document is **not** legal advice and does **not** claim regulatory compliance.  
It does **not** promise patient safety outcomes or continuous monitoring.  
**LEGAL / PROFESSIONAL REVIEW REQUIRED** where marked. Retention periods remain **UNSET** (F4-09).

---

## 2. Executive Summary

F4-06 defines governance for any *future* handling of safety-sensitive information, crisis disclosures, escalation, emergency communication, break-glass, after-hours, automation/AI signals, and related audit/privacy constraints.

**None of these clinical safety workflows exist today as Option C capabilities.**  
Option B provides: accounts/appointments/notifications; a public **crisis resource directory** (not patient crisis case management); optional `emergency_contact` profile text; operational security events.

Binding stance for review:

- Humans retain clinical authority; automation/AI are advisory only.
- Concern ≠ crisis ≠ emergency; signal ≠ diagnosis; sent ≠ received ≠ acted.
- Emergency contact ≠ blanket disclosure consent.
- Break-glass ≠ unrestricted access.
- Ordinary notifications must not carry safety narratives.
- Implementation remains **BLOCKED** until governance, legal/professional review, F4-12, and explicit engineering authorization.

**Document approval status:** **NOT YET DECIDED**

---

## 3. Scope

**In scope:** Safety classification; terminology; severity workflow concepts; human authority; automation/AI boundaries; emergency/break-glass/after-hours questions; matrices; threats; invariants; open decisions.

**Out of scope / forbidden:** Clinical/safety/crisis tables; detectors; classifiers; risk scores; escalation APIs; break-glass code; clinical notifications; safety-plan schemas; clinical dashboards; migrations; authz changes; AI implementation; Production access/deploy; commits.

Option C remains **BLOCKED**.

---

## 4. Current Option B Boundary

### 4.1 What exists today (CURRENT OPTION B CAPABILITY)

| Capability | Evidence | Is it clinical crisis management? |
| --- | --- | --- |
| Auth, sessions, MFA (psych/admin) | Identity stack; F1-C | No |
| Patient isolation / appointment ownership | F1-B; lifecycle ownership | No |
| Appointment lifecycle + notifications | Outbox/email/WhatsApp | **Operational only** — not safety escalation |
| Notification copy rules | No diagnosis/notes/assessment in email/WhatsApp | Privacy-safe ops — not crisis workflow |
| WhatsApp channel opt-in | Channel consent only | Not crisis consent |
| SMTP/Twilio reliability residuals | At-least-once; SMTP duplicate window (F1-D-C INFORMATIONAL) | Not safety acknowledgement |
| `patient_profiles.emergency_contact` | Optional text field | Sensitive personal — **not** crisis consent / disclosure auth |
| Q&A / question portal | Separate stack | Not emergency service |
| Public mental-health support / crisis **resource** directory | SQLite/Upstash crisis *resources*; disclaimers | Educational/referral resources — **not** patient clinical crisis records |
| Psychologist crisis-resource admin UI | Manage public resource listings | Not patient safety case management |
| Security/audit events | Login, OTP, appointment ops | Not clinical safety audit |

### 4.2 Explicit non-claims

- Appointment notifications are **not** clinical safety escalation.
- Q&A is **not** an emergency service and is **not** continuously monitored clinical care.
- Crisis resource pages are **not** a substitute for emergency services and are **not** patient-specific clinical escalation.
- `emergency_contact` is **not** authorization to disclose clinical records.
- No suicide/self-harm detectors, risk scores, safety plans as clinical records, break-glass, or clinical crisis messaging exist.

### 4.3 Status labels for Option B items

Public crisis resource directory retention: **APPROVED** (keep) per decisions register.  
Clinical safety escalation: **BLOCKED** / **NOT YET DECIDED** as product policy.

---

## 5. Future Option C Boundary

**FUTURE OPTION C GOVERNANCE PROPOSAL ONLY — NOT IMPLEMENTED**

May eventually include (if separately approved): safety-sensitive self-reports; clinician observations/formulations; safety plans; escalation events; governed emergency communication; break-glass under F4-04/F4-06; human-reviewed AI signals; auditable safety determinations.

Listing here is **not** product commitment and **not** authorization to build.

---

## 6. Safety Data Classification

Proposed categories (governance proposal). Retention: **F4-09 DEPENDENCY — NOT YET DECIDED**.

| # | Category | Meaning | Source | Authority | Sensitivity | Permitted purpose | Patient vis. | Psych vis. | Admin vis. | AI | Notification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ordinary operational | Account/appointment ops | System/user | Ops | Low–Med | Scheduling/comms | Own | Linked | CONDITIONAL | Limited | Ops OK |
| 2 | Patient self-reported concern | Non-crisis concern | Patient | Self-report | Med | Care support | Own | Treating CONDITIONAL | DENY body | Advisory only | No narrative |
| 3 | Safety-sensitive self-report | Harm/crisis-related self content | Patient | Self-report | Critical | Safety review | Own CONDITIONAL | Treating CONDITIONAL | DENY | Advisory | No narrative |
| 4 | Clinician safety observation | Professional observation | Psychologist | Clinical obs | Critical | Care/safety | DENY default | Treating | DENY | Human gate | No narrative |
| 5 | Clinician risk formulation | Professional judgment | Psychologist | Clinical determination | Critical | Care/safety | DENY default | Treating | DENY | Never auto-authoritative | No narrative |
| 6 | Safety plan information | Coping/contacts/plan | Patient/psych | Mixed | High | Safety support | Shared CONDITIONAL | Treating | DENY | Assist draft only | No full plan |
| 7 | Emergency contact information | Contact details | Patient/ops | Ops personal | High personal | Emergency reach | Own | Treating CONDITIONAL | CONDITIONAL metadata | DENY auto-contact | Minimize |
| 8 | Escalation event | Workflow event | System/human | Workflow | High | Escalation | Limited | Treating | Metadata CONDITIONAL | May route | Generic alert only |
| 9 | Crisis communication | Crisis-related message | Human | Clinical/ops | Critical | Crisis response | CONDITIONAL | Treating | DENY body | DENY auto-send | Secure channel preferred |
| 10 | Emergency intervention record | Intervention documentation | Psychologist/external | Clinical/legal | Critical | Recordkeeping | **LEGAL REVIEW** | Treating | DENY | DENY | No narrative |
| 11 | External referral | Referral to external help | Psychologist | Clinical/ops | High | Continuity | CONDITIONAL | Treating | DENY body | Assist only | Minimize |
| 12 | System-generated safety signal | Automated flag | System | Advisory | High | Review routing | DENY default | Treating | DENY | Generator only | Psych alert CONDITIONAL |
| 13 | AI-generated safety suggestion | Model output | AI | Non-authoritative | High | Assist review | DENY | Treating CONDITIONAL | DENY | Source | Never patient as fact |
| 14 | Human-reviewed safety determination | Psychologist decision | Psychologist | Authoritative clinical | Critical | Care/safety | CONDITIONAL | Treating | DENY | Input only | Per F4-07 |
| 15 | Audit/security event | Access/security trail | System | Ops/security | Med | Accountability | Limited | CONDITIONAL | CONDITIONAL | N/A | N/A |
| 16 | Provenance metadata | Who/when/source/state | System | Ops | Med | Integrity | Limited | CONDITIONAL | CONDITIONAL | N/A | N/A |

Audit requirement: categories 3–14 should eventually be auditable (F4-10). Exact event catalogue **NOT YET DECIDED**.

---

## 7. Safety Terminology

**Mandatory distinctions — do not collapse:**

| Must distinguish | Meaning |
| --- | --- |
| Concern ≠ crisis | Worry or priority review ≠ crisis situation |
| Crisis ≠ emergency | Acute distress ≠ immediate life-threatening emergency requiring external services |
| Safety signal ≠ diagnosis | Flag ≠ clinical diagnosis |
| Risk indicator ≠ clinical determination | Hint ≠ psychologist judgment |
| Patient statement ≠ clinician observation | Provenance authority differs |
| Clinician observation ≠ diagnosis | Observation ≠ diagnostic conclusion |
| AI signal ≠ clinical judgment | Advisory ≠ authority |
| Automated detection ≠ emergency confirmation | Detection ≠ confirmed emergency |
| Emergency contact ≠ consent to disclose everything | Contact field ≠ blanket share |
| Consent ≠ authorization | F4-03 vs F4-04 |
| Authorization ≠ clinical judgment | Access ≠ clinical decision |
| Escalation ≠ treatment | Workflow ≠ therapy |
| Notification ≠ confirmation of receipt | Send ≠ receive |
| Notification sent ≠ delivered | F1-D-C residual |
| Delivered ≠ patient seen | Delivery ≠ engagement |
| Patient seen ≠ patient safe | Contact ≠ safety outcome |
| “Urgent” ≠ “emergency” | Workflow priority ≠ emergency declaration |
| Break-glass ≠ unrestricted access | Scoped exception |
| Historical safety record ≠ current safety status | Time-bounded |
| No signal ≠ no risk | Absence of detection ≠ safety |
| Missed check-in ≠ crisis | Pattern may be review signal only |
| Silence ≠ safety | Non-response ≠ reassurance |

---

## 8. Severity/Concern Model

**These are workflow/priority governance concepts, NOT diagnoses.**

Proposed candidate levels — **NOT YET DECIDED** as product policy:

| Level | Meaning | Who assigns | Automation may suggest? | Psych confirmation required? | Patient visibility | Notification | Escalation | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Informational | Non-urgent note | Psych / system meta | CONDITIONAL | No for info only | CONDITIONAL | Minimal | None | CONDITIONAL |
| Concern | Needs awareness | Psych; system may flag | CONDITIONAL | Yes before clinical label | CONDITIONAL | Psych CONDITIONAL | Review queue | Yes |
| Priority review | Timely clinician review | Psych; system suggest | CONDITIONAL | Yes for clinical status | CONDITIONAL | Psych CONDITIONAL | Review | Yes |
| Urgent review | Expedited clinician review | Psych; system suggest | CONDITIONAL | Yes | Limited | Psych CONDITIONAL | Escalation path **NOT YET DECIDED** | Yes |
| Emergency concern | Possible need for emergency pathway | Psych (authoritative); system never alone | Suggest only | **Yes** — human gate | Carefully governed | Generic + secure prompt | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | Yes |

No scoring system is approved. No algorithm may declare definitive risk.

---

## 9. Human Clinical Authority

**Binding principle:**

Automated systems may assist detection, organization, routing, or summarization.

They must **NOT** autonomously:

- diagnose  
- determine definitive risk  
- declare a patient safe or unsafe  
- initiate or terminate treatment  
- make clinical decisions  
- override the psychologist  
- communicate a clinical determination as fact  

AI-generated safety signals must remain distinguishable from patient input, clinician observation, clinician determination, and final clinical decision. Human review is the authoritative clinical gate.

---

## 10. Automated Detection Governance

Possible future inputs and automation stance (**NOT YET DECIDED** for production use; governance candidates):

| Input | Automation may | Notes |
| --- | --- | --- |
| Free-text patient messages | CONDITIONAL (flag/route) | Never auto-diagnose |
| Check-ins | CONDITIONAL | Pattern ≠ crisis |
| Questionnaires / assessments | CONDITIONAL | F4-08 |
| Appointment patterns / missed appointments | CONDITIONAL (review signal) | ≠ crisis |
| Sudden self-report change | CONDITIONAL | Context needed |
| Direct crisis statements | CONDITIONAL (priority flag) | Human review required |

Automation must never silently transform a raw signal into a clinical diagnosis.

Must address: false positives/negatives; ambiguous language; cultural/language variation; sarcasm; metaphor; quoted text; historical text; third-party statements; accidental trigger words; repeated signals; stale signals. Mitigation = human review + clear UX + audit — not “perfect detection.”

---

## 11. False Positive / False Negative

| Type | Risks | Governance |
| --- | --- | --- |
| **False positive** | Distress; inappropriate escalation; privacy exposure; unnecessary emergency contact; trust loss; alert fatigue | Human confirmation before clinical labels/disclosures; minimize narrative in alerts; review thresholds — **NOT YET DECIDED** |
| **False negative** | Missed/delayed review; failed escalation; false reassurance | Never claim zero miss rate; no “you are safe” from automation; design for human review and operational honesty |

Any production safety mechanism requires human governance and professional review. Algorithms cannot eliminate either risk.

---

## 12. Patient Experience

Future UX principles:

- Calm, non-stigmatizing, non-panic language  
- Do not pretend to provide emergency services  
- Distinguish routine support from emergency assistance  
- Avoid false reassurance and continuous-monitoring claims unless true and staffed  
- Communicate service availability limitations clearly  
- Provide appropriate next steps (including public crisis resources where suitable)  

Wording distinctions (must not conflate):

| Message | Means |
| --- | --- |
| “Your message has been received” | System acknowledgement only |
| “Your clinician has reviewed this” | Human review completed |
| “This may require urgent attention” | Workflow priority — not automated diagnosis |

Final copy: clinical/professional review required.

---

## 13. Emergency Communication

| Recipient | Contact conditions | Who authorizes | Min information | Consent | Audit | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Patient | Secure prompts / portal | Practice policy | Minimize | Channel rules | Yes | **NOT YET DECIDED** |
| Psychologist | Safety review alerts | System + policy | Generic + secure login | N/A ops | Yes | **NOT YET DECIDED** |
| Practice staff | Ops support only | Policy | No clinical narrative | Ops | Yes | **NOT YET DECIDED** |
| Emergency contact | Exceptional | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | Minimum necessary | Not automatic from field | Yes | Legal review |
| Caregiver | Distinct from emergency contact | Legal + consent | Minimum necessary | **LEGAL REVIEW** | Yes | Legal review |
| Emergency services | Exceptional | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | Minimum necessary | Exception rules | Yes | Legal review |
| External professionals | Referral | Psych + policy | Minimum necessary | **LEGAL REVIEW** | Yes | Legal review |

Do not invent Indian emergency-law requirements.

---

## 14. Emergency Contact Governance

Existing `emergency_contact` (optional profile text) must **not** automatically be treated as:

- crisis consent  
- disclosure authorization  
- caregiver authorization  
- permission to share clinical records  
- permission to contact for every concern  

Separate concepts:

| Concept | Distinct? |
| --- | --- |
| Emergency contact | Yes |
| Authorized caregiver | Yes |
| Consent recipient | Yes |
| Legal representative | Yes |
| Guardian/dependent representative | Yes |

No schema created in this phase.

---

## 15. Minors / Dependents

Child/adolescent independent accounts: **DEFERRED** (Option B).

Analyze (do not invent age thresholds, rights, or mandatory disclosure rules):

- minors; dependent adults; guardians; caregivers; representatives  
- confidentiality; assent; emergency exceptions; safety escalation  

**LEGAL / PROFESSIONAL REVIEW REQUIRED** for all of the above.

---

## 16. Break-Glass Governance

Governance questions only — **do not implement**. Default: break-glass ≠ unrestricted access.

| Question | Status |
| --- | --- |
| What constitutes an emergency? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Who can activate? | **DECISION REQUIRED** (psych proposed; AI **DENY**; admin **DECISION REQUIRED**) |
| Minimum information available? | Minimum necessary — **DECISION REQUIRED** |
| Purpose / duration? | Purpose-limited; time-bound — **NOT YET DECIDED** durations |
| MFA / step-up? | Proposed stronger auth — **DECISION REQUIRED** (F4-04) |
| Reason mandatory? | Proposed **YES** — **NOT YET DECIDED** |
| Contemporaneous audit? | Proposed **YES** — F4-10 |
| Retrospective review? | Proposed **YES** — **NOT YET DECIDED** |
| Read-only vs broader? | Prefer read-only — **DECISION REQUIRED** |
| Private notes / safety / documents? | Scoped — **DECISION REQUIRED** / legal |
| Delegatable? | Proposed **NO** or tightly limited — **DECISION REQUIRED** |
| AI activate? | **DENY** |
| Admin activate? | **DECISION REQUIRED**; clinical blindness default |

---

## 17. After-Hours Governance

Distinguish: office hours; clinician availability; automated acknowledgement; emergency assistance; delayed response; escalation; unresolved message.

**Never imply 24/7 clinical monitoring unless explicitly implemented and operationally staffed.**

| Topic | Status |
| --- | --- |
| What patient sees | **NOT YET DECIDED** |
| What psychologist sees | **NOT YET DECIDED** |
| What system records | Acknowledgement ≠ review |
| Notifications | Generic; no clinical narrative |
| Operational policy | **NOT YET DECIDED** |

---

## 18. Missed Check-ins / Appointments

```text
Missed check-in ≠ crisis
Missed appointment ≠ crisis
No response ≠ danger
```

Repeated patterns **may** become a **review signal** (system signal → psychologist review):

- no automatic diagnosis  
- no automatic emergency contact without approved governance  

Status: **NOT YET DECIDED** whether pattern signals are enabled.

---

## 19. Safety Plans

Future components (proposal): warning signs; coping strategies; supportive/professional/emergency contacts; preferred escalation path; patient preferences; clinician-authored instructions.

| Topic | Status |
| --- | --- |
| Who creates/edits/approves | **DECISION REQUIRED** |
| Visibility | F4-02 classes — **DECISION REQUIRED** |
| Versioning | F4-05 — yes recommended for amendments |
| Acknowledgement | ≠ clinical approval |
| Revocation / emergency availability | **DECISION REQUIRED** / legal |
| Audit | F4-10 |

No safety-plan schema in this phase.

---

## 20. Crisis Communication

Separate from ordinary transactional notifications.

**Do not allow** clinical crisis narrative in ordinary email/SMS/WhatsApp/push previews.

Prefer: generic alert; action prompt; secure-login prompt; non-sensitive appointment information.

Exceptions: **DECISION REQUIRED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**. Detail F4-07.

---

## 21. Notification Failure

F1-D-C INFORMATIONAL: SMTP send-before-finalize duplicate window; at-least-once semantics. **Do not fix in F4-06.**

Safety-critical future notifications must not assume:

```text
sent = received
received = read
read = acted upon
```

Acknowledgement and escalation must be defined independently of delivery success.

---

## 22. Escalation Lifecycle

**Governance candidates only — not approved state machine / not implemented:**

```text
OBSERVED → FLAGGED → REVIEW_REQUIRED → UNDER_REVIEW → ESCALATED → RESOLVED → CLOSED
```

| State | Enter | Exit | Evidence | Visibility | Audit | Notification | Clinical authority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OBSERVED | Signal/input | System/human | Raw source | Restricted | CONDITIONAL | No | None |
| FLAGGED | Automation/human | Human review | Signal id | Psych | Yes | Psych CONDITIONAL | Advisory |
| REVIEW_REQUIRED | Policy/severity | Psych starts | Flag + context | Psych | Yes | Psych CONDITIONAL | Pending human |
| UNDER_REVIEW | Psych | Psych decision | Review notes | Psych | Yes | Limited | Human |
| ESCALATED | Psych / governed exception | Resolution path | Escalation record | Restricted | Yes | Generic | Human |
| RESOLVED | Psych | Close | Decision | Restricted | Yes | CONDITIONAL | Human |
| CLOSED | Psych/policy | — | Closure | Historical | Yes | Rare | Historical |

Exact names/transitions: **NOT YET DECIDED**.

---

## 23. Escalation Ownership

| Actor | May | Must not |
| --- | --- | --- |
| System | Detect, route, record, notify | Be clinical owner; diagnose; declare safe/unsafe |
| Psychologist | Clinical decisions, escalation | Leave AI as authority |
| Practice staff | Ops support | Clinical determination / narrative access by default |
| Emergency contact | Be contacted under rules | Auto-receive full clinical file |
| External professional | Receive referral under rules | Inherit platform clinical ACL |
| Emergency service | External response | Be “controlled” by this app as dispatcher |

**Never let “system” become clinical owner.**

---

## 24. SLA Governance

Do **not** invent response times.

| Item | Status |
| --- | --- |
| Review SLA | **NOT YET DECIDED** |
| Urgent review SLA | **NOT YET DECIDED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Emergency response expectations | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| After-hours response | **NOT YET DECIDED** |
| Notification retry windows | **NOT YET DECIDED** (ops); F1-D-C residuals apply |

---

## 25. Safety Audit Requirements

Coordinate F4-10. Potential future events:

safety signal created/viewed; severity changed; clinician review started; clinician determination; escalation; escalation acknowledgement; emergency contact disclosure; break-glass activation/access; safety plan created/amended; patient acknowledgement; correction request; resolution; closure.

Audit should record sufficient provenance without unnecessarily duplicating sensitive clinical content. No audit tables here.

---

## 26. Versioning / Provenance

Coordinate F4-05. Safety-sensitive records may require: author, actor, role, relationship, timestamp, source, version, approval state, visibility, amendment reason.

Forbidden: silent overwrite; anonymous clinical determination; AI-as-authority; patient acknowledgement as clinical approval.

---

## 27. Consent Interaction

Coordinate F4-03. Distinguish: consent; authorization; clinical duty; safety escalation; emergency exception.

Consent does not automatically answer every emergency scenario. Withdrawal must not be read as “safety responsibilities disappear” — **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 28. RBAC / Relationship Interaction

Coordinate F4-04. Safety access still requires identity + role + relationship + resource + purpose + visibility + action + audit.

Higher technical privilege ≠ broader clinical access. SUPER_ADMIN clinically blind by default.

---

## 29. Patient Isolation

Patient A must never access Patient B’s safety-sensitive information.  
Psychologist A must not access another psychologist’s patient unless governed relationship/authorization permits.  
Public IDs and client-supplied patient IDs never confer access (F1-B / F4-04).

---

## 30. Data Minimization

Collect only minimum necessary for identified safety purposes. Avoid unnecessary detailed narrative, third-party PII, unrelated medical info, unnecessary location/contacts/history — without inventing “legal minimums.” **LEGAL / PROFESSIONAL REVIEW REQUIRED** for duty-to-document questions.

---

## 31. Location / Geography

Emergency services may depend on location. Analyze known / patient-provided / stale / approximate / no location.

Never assume GPS. Never infer exact location without authoritative evidence. Never promise automatic dispatch of local emergency services.

---

## 32. External Services

| Service type | Disclosure | Consent | Authz | Min necessary | Audit | Reliability | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency services | Exceptional | Exception rules | Human | Yes | Yes | External | **LEGAL REVIEW** |
| Crisis lines | Referral info | Often public resources | Ops | Public resources OK | CONDITIONAL | External | Aligns Option B public resources |
| Hospitals / external clinicians | Referral | **LEGAL REVIEW** | Psych | Yes | Yes | External | **LEGAL REVIEW** |
| Caregivers | Exceptional | Distinct auth | Human | Yes | Yes | Human | **LEGAL REVIEW** |
| Comm providers (SMTP/Twilio) | Delivery metadata | Channel consent | System | No clinical narrative | Yes | At-least-once residuals | F1-D-C / F4-07 |

Do not name unverified legal obligations.

---

## 33. AI Safety Governance

Coordinate F4-11.

**AI may potentially:** summarize; identify candidate signals; organize; suggest review priority; draft clinician-facing summaries.

**AI must NOT:** diagnose; independently determine suicide/self-harm risk; declare emergency as authoritative; contact emergency services autonomously; disclose clinical data autonomously; override psychologist; create authoritative safety records without human approval.

All future AI safety functions require explicit governance and human approval.

---

## 34. AI Failure Modes

| Failure | Risk | Mitigation | Human review | Audit | Status |
| --- | --- | --- | --- | --- | --- |
| False positive | Over-escalation | Confirm before label/disclose | Required | Yes | **NOT YET DECIDED** |
| False negative | Missed review | No zero-miss claim; human pathways | Required | Yes | Same |
| Hallucination | Wrong clinical content | Never auto-authoritative | Required | Yes | Same |
| Contextual misunderstanding | Wrong priority | Clinician context | Required | Yes | Same |
| Stale information | Wrong current status | Time-bound signals | Required | Yes | Same |
| Prompt injection | Manipulated signal | Input hygiene / isolation | Required | Yes | Same |
| Adversarial text | Bypass/trigger | Human gate | Required | Yes | Same |
| Quoted crisis language | False trigger | Context-aware review | Required | Yes | Same |
| Multilingual errors | Misclassify | Language caution | Required | Yes | Same |
| Model drift | Quality drop | Monitoring later | Required | Yes | Same |
| Vendor outage | No AI assist | Fail soft; human ops | Required | Yes | Same |
| Latency | Delayed flag | Do not claim real-time guarantee | Required | Yes | Same |
| Duplicate alerts | Fatigue | Dedup policy **NOT YET DECIDED** | Required | Yes | Same |

Do not implement AI.

---

## 35. Privacy / Confidentiality

Principles: minimum necessary access; private vs shared safety info (F4-02); emergency exceptions (legal review); administrative blindness; notification minimization; audit confidentiality; export/backup/deletion → F4-09.

---

## 36. Corrections / Disputes

Coordinate F4-05:

```text
patient correction request → clinician review → decision → amendment/version → audit
```

No silent overwrite. **LEGAL / PROFESSIONAL REVIEW REQUIRED** where patient access/correction rights apply.

---

## 37. Safety Status vs Labels

Prohibit persistent stigmatizing labels such as “suicidal patient,” “dangerous patient,” “high-risk person” unless a future governance decision explicitly establishes appropriate professional terminology.

Prefer event-based, contextual, time-bounded safety information.

---

## 38. Signal Expiration

Historical concern ≠ permanent current status.

Conceptual timestamps only (no schema): `observed_at`, `recorded_at`, `reviewed_at`, `resolved_at`. Expiry/refresh rules: **NOT YET DECIDED**.

---

## 39. Resolution / Closure

Resolved/closed events should not necessarily disappear. Preserve historical record, provenance, decision, outcome, closure. Retention duration → F4-09.

---

## 40. Communication Language

Avoid: panic; shame; threats; guaranteed safety; guaranteed availability; “we are monitoring you”; “you are safe”; automated “you are at high risk.”

Use clear, compassionate, factual language. Final copy requires clinical/professional review.

---

## 41. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:**

- emergency disclosure  
- minors / guardians / dependents  
- emergency contacts  
- confidentiality exceptions  
- break-glass  
- mandatory reporting (if applicable — do not assume)  
- crisis-service referrals  
- external providers  
- retention / deletion / exports  
- clinician responsibilities  
- after-hours responsibilities  
- AI safety use  
- third-party processors  
- cross-border processing  
- location handling  
- consent withdrawal vs safety duties  

Do **not** answer these from assumption.

---

## 42. Decision Matrix

| ID | Decision | Recommendation | Status | Rationale | Dependency | Legal/Prof Review | Implementation Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | Human clinical authority over automation | Adopt | **NOT YET DECIDED** formal | Charter Safety First | F4-A / F4-11 | Yes for duties | Blocks auto clinical decisions |
| S02 | Crisis resource directory ≠ clinical escalation | Keep distinction | Aligns **APPROVED** keep resources | Option B | Public site | N/A for distinction | No patient crisis EHR from resources |
| S03 | Appointment notify ≠ safety escalation | Adopt | Aligns Option B | F1-D-C | F4-07 | N/A | No reuse of ops templates for crisis narrative |
| S04 | emergency_contact ≠ disclosure consent | Adopt | F4-01/F4-03 | F4-03 | Yes | Blocks auto-dial/disclose |
| S05 | Severity as workflow not diagnosis | Adopt | Non-diagnostic ethics | F4-06 | Yes | No risk-score product without review |
| S06 | AI never authoritative safety determination | Adopt | Charter AI + F4-05 | F4-11 | Yes | No auto emergency declare |
| S07 | No clinical narrative in ordinary channels | Adopt | Option B copy **APPROVED** pattern | F4-07 | CONDITIONAL exceptions | Template allow-lists |
| S08 | Break-glass scoped | Governed if allowed | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-04 | Yes | No unrestricted ACL |
| S09 | After-hours monitoring claims | Forbid unless staffed | **NOT YET DECIDED** policy | Ops | Yes | Honest UX |
| S10 | Missed appt ≠ crisis | Adopt | Prevent false escalation | F4-06 | N/A | Pattern signal optional only |
| S11 | sent ≠ received ≠ acted | Adopt | F1-D-C | F4-07/10 | N/A | Separate ack/escalation |
| S12 | Minors safety escalation | — | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-03/04 | Yes | No minor schema |
| S13 | Response SLAs | — | **NOT YET DECIDED** | Ops | Yes | No invented times |
| S14 | Safety plan product | — | **NOT YET DECIDED** | F4-02/05 | Yes | No schema now |
| S15 | Automated detection in production | — | **BLOCKED** until governance+review | F4-11/12 | Yes | No detectors now |

---

## 43. Safety Access Matrix

| Resource | Patient | Treating psych | Consultant | Supervisor | Former psych | Staff | SUPER_ADMIN | Worker | AI | Emerg. contact | External | Unauthorized |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Safety signal | DENY default | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | DENY default | DENY | DENY | DENY body | CONDITIONAL process | DENY | DENY | DENY |
| Safety narrative | CONDITIONAL own | CONDITIONAL | **NOT YET DECIDED** | **LEGAL REVIEW** | DENY default | DENY | DENY | DENY | DENY auto | DENY | DENY | DENY |
| Safety plan | CONDITIONAL shared | CONDITIONAL | **NOT YET DECIDED** | **LEGAL REVIEW** | DENY default | DENY | DENY | DENY | Draft assist only | DENY | DENY | DENY |
| Emergency contact | Own | CONDITIONAL | DENY default | **NOT YET DECIDED** | DENY | CONDITIONAL | CONDITIONAL | DENY | DENY | N/A self | DENY | DENY |
| Escalation record | Limited | CONDITIONAL | CONDITIONAL | **LEGAL REVIEW** | DENY default | Metadata CONDITIONAL | Metadata CONDITIONAL | Route only | Route assist | DENY | DENY | DENY |
| Audit metadata | Limited | CONDITIONAL | DENY default | CONDITIONAL | DENY | CONDITIONAL | CONDITIONAL | CONDITIONAL | DENY | DENY | DENY | DENY |
| Clinical determination | CONDITIONAL | ALLOW treating | CONDITIONAL | **LEGAL REVIEW** | DENY default | DENY | DENY | DENY | DENY authoritative | DENY | DENY | DENY |

---

## 44. Threat Model

| # | Threat | Impact | Preventive control | Detection | Future technical control | Governance owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | False negative | Missed help | Human pathways; no zero-miss claim | Review gaps | Dual review later | F4-06 | **NOT YET DECIDED** |
| 2 | False positive | Harm/trust | Confirm before escalate | Alert metrics | Thresholds | F4-06 | Same |
| 3 | Unauthorized disclosure | Privacy breach | Min necessary; channel rules | Audit | Authz | F4-03/07 | Same |
| 4 | Cross-patient access | Isolation breach | F1-B | Tests | ACL | F4-04 | Aligns F1-B |
| 5 | Cross-psychologist access | Isolation breach | Relationship | Tests | ACL | F4-04 | Same |
| 6 | Admin clinical browsing | Confidentiality | Admin blindness | Audit | Deny fields | F4-04 | Aligns Option B |
| 7 | Stale safety status | Wrong care | Time-bound signals | Review | Expiry flags | F4-06 | **NOT YET DECIDED** |
| 8 | AI hallucination | Wrong action | Never auto-authoritative | Review | Human gate | F4-11 | Same |
| 9 | AI autonomous escalation | Wrong emergency action | Deny AI activate | Audit | Hard deny | F4-11 | Same |
| 10 | Notification preview leak | Sensitive exposure | No narrative templates | Content tests | Allow-lists | F4-07 | Aligns Option B copy |
| 11 | Emergency contact misuse | Over-disclosure | Distinct consent | Audit | Explicit authorize | F4-03/06 | Legal review |
| 12 | Break-glass abuse | Over-access | Reason/time/audit/review | Audit | Step-up MFA | F4-04/06 | Legal review |
| 13 | Alert fatigue | Missed real events | Dedup/priority | Metrics | Rate policy | F4-06 | **NOT YET DECIDED** |
| 14 | Duplicate alerts | Fatigue | Dedup | Metrics | Idempotency | F4-07/10 | F1-D-C aware |
| 15 | Missed alerts | Delayed review | Independent ack | Outbox health | Monitoring | F4-07 | Ops OPEN |
| 16 | Provider outage | No delivery | Fail soft UX | Health checks | Retries | Ops | OPEN |
| 17 | Worker outage | No process | Ops runbook | Worker health | Hosting | Ops | OPEN |
| 18 | Audit failure | Non-accountability | Append-only design | Integrity | F4-10 | F4-10 | Deferred |
| 19 | Forged safety event | False escalation | Server identity | Audit | Authn | F4-04 | Same |
| 20 | Client-supplied severity | Fake urgency | Server authority | Reject client | Ignore client severity | F4-06 | Binding |
| 21 | Client-supplied emergency status | Fake emergency | Server authority | Reject | Ignore | F4-06 | Binding |
| 22 | Session revocation race | Stale access | F1-C revoke | Tests | Immediate deny | F4-04 | Same |
| 23 | Relationship termination | Stale ACL | F4-04 termination | ACL recompute | Recompute | F4-04 | Same |
| 24 | Patient correction overwrite | History loss | F4-05 amend | Audit | New version | F4-05 | Same |
| 25 | Export leakage | Over-disclosure | Export authz | Audit | F4-09 | F4-09 | Deferred |
| 26 | Backup leakage | Over-disclosure | Ops controls | Ops | Encryption later | Ops/F4-12 | Deferred |

---

## 45. Cross-Domain Dependencies

| Domain | Relationship to F4-06 |
| --- | --- |
| F4-01 | Safety-sensitive (K) classification |
| F4-02 | Visibility of safety content; share/revoke |
| F4-03 | Consent vs emergency exception; channel ≠ disclosure |
| F4-04 | Relationship ACL; break-glass; admin blindness |
| F4-05 | No silent overwrite; provenance of determinations |
| F4-07 | Crisis vs transactional communication |
| F4-08 | Assessment-triggered signals |
| F4-09 | Retention/export/deletion of safety records |
| F4-10 | Safety audit events |
| F4-11 | AI assist boundaries |
| F4-12 | Technical architecture after governance approval |

Unresolved decisions in those domains remain unresolved here.

---

## 46. Binding Governance Invariants

1. Safety data is not automatically clinical diagnosis.  
2. Authentication does not equal clinical authorization.  
3. Role alone does not grant safety access.  
4. Relationship must be considered.  
5. Patient isolation is mandatory.  
6. SUPER_ADMIN clinical blindness remains the default.  
7. Client-supplied severity is never authoritative.  
8. Client-supplied emergency status is never authoritative.  
9. AI output is never automatically authoritative.  
10. Automated detection is advisory unless explicitly governed otherwise.  
11. Human clinical authority remains primary.  
12. Break-glass is not unrestricted access.  
13. Emergency contact is not blanket clinical disclosure consent.  
14. Notification sent does not mean notification received.  
15. Notification received does not mean patient acted.  
16. Missed appointment/check-in does not equal crisis.  
17. Historical concern does not equal current safety status.  
18. No silent overwrite of safety records.  
19. Provenance must be preserved.  
20. Ordinary notifications must not contain sensitive safety narratives.  
21. Safety information must be purpose-limited.  
22. Minimum necessary access applies.  
23. Retention/deletion decisions remain F4-09.  
24. Clinical implementation remains blocked until governance approval.  
25. No autonomous AI emergency action.  
26. No autonomous diagnosis.  
27. No false assurance of continuous monitoring.  
28. No fabricated legal requirements.  
29. No fabricated emergency-service capability.  
30. Safety workflows must be designed around human review and operational reality.

---

## 47. Outstanding Decisions

Severity taxonomy; detection enablement; pattern-signal rules; after-hours policy; break-glass actors/scope; emergency contact disclosure rules; caregiver vs emergency contact; safety-plan product; patient visibility of signals; SLA times; escalation state names; dedup/alert fatigue policy; AI assist scope; location handling; notification exception cases; minors/dependents escalation; mandatory reporting applicability (do not assume); external referral playbooks.

---

## 48. Implementation Gate

**F4-06 governance approval does NOT authorize implementation.**

Clinical/safety implementation requires:

1. Governance domains approved as required  
2. Legal/professional review completed where marked  
3. F4-12 architecture approval  
4. Explicit implementation authorization  
5. Separate Cursor engineering prompt  
6. Security tests  
7. Clinical safety tests  
8. Independent review  
9. GitHub checkpoint  
10. Production gate  

Until then: **BLOCKED**.

---

## 49. Document Approval Status

**NOT YET DECIDED**

---

## Document control footer

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-06 | Draft safety / crisis / escalation governance |

**Recommended next domain:** **F4-07 — Clinical Communication Governance** (do not start without authorization).

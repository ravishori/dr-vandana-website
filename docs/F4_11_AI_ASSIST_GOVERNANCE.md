# F4-11 AI ASSIST GOVERNANCE v1.0

## 1. Executive Summary

This document defines how future AI assistance may or may not be used on the Dr. Vandana platform.

**Central invariant:** AI output is assistance, not clinical authority.

```text
INPUT → AI ASSISTANCE → HUMAN REVIEW → HUMAN DECISION → APPROVAL → OPTIONAL SHARING
```

Never:

```text
INPUT → AI → AUTHORITATIVE CLINICAL RECORD
```

**CURRENT OPTION B reality:** Public **educational** “Ask Dr. Vandana AI” exists (`src/lib/ai/*`, `docs/ASK_DR_VANDANA_AI.md`), with disclaimers that it does not diagnose/treat. Optional psychologist Q&A **educational draft** helper requires review and never auto-sends/publishes. Lexical embeddings are not clinical semantic EHR AI. **No Option C clinical AI** (notes, care plans, assessments-as-clinical, autonomous safety, clinical messaging) is implemented or authorized.

**Status:** **NOT YET DECIDED** for clinical AI expansion. Option C clinical AI remains **BLOCKED**.

---

## 2. Authorization / Scope

**Authorized:** F4-11 governance/documentation only.

**Forbidden:** New AI services/SDKs/packages; clinical AI tables/APIs/UI/workers; autonomous clinical/safety/messaging actions; vendor approval; Production AI config changes; secrets; commits; F4-12 start; invented legal/retention claims.

Do **not** treat this document as authorization to expand Ask AI into clinical Option C.

---

## 3. Governing Principles

1. Human clinical authority remains mandatory for clinical decisions/records.  
2. AI is a machine actor — not psychologist, patient, or admin.  
3. AI cannot self-approve, self-publish, self-escalate, self-diagnose, or self-grant access.  
4. Minimum necessary input; patient/psychologist isolation.  
5. Visibility/consent/RBAC/versioning/audit cannot be bypassed by AI.  
6. SUPER_ADMIN clinical blindness applies to AI side-channels.  
7. Educational AI ≠ clinical AI.  
8. No continuous-monitoring claims.  
9. Fail safely; AI outage must not replace human judgment.  
10. Charter: No Autonomous Clinical AI (F4-A Principle 9).

---

## 4. Repository AI Analysis

| Finding | Classification |
| --- | --- |
| `src/lib/ai/**` Ask pipeline, providers, safety canned answers, retrieval | **Actual AI implementation** — **educational / public**, not Option C clinical EHR |
| `src/config/ai.ts`, OpenAI-compatible HTTP optional | Provider adapter for educational Ask — not clinical PMS |
| `EducationalFallbackProvider` / lexical embeddings | Educational / non-semantic bag-of-words — not psychometric/clinical AI |
| `createAiAssistedDraft` (question portal) | **Actual** optional educational draft for **psychologist review**; never auto-send/publish |
| `EDUCATIONAL_DISCLAIMER` | Disclaimer |
| `docs/ASK_DR_VANDANA_AI.md`, crisis-resource AI notes | Documentation |
| F4-01…F4-10 AI references | Governance documentation |
| Clinical notes/care plans/assessment engines via AI | **None** — not present |
| package.json AI SDK dependency | **Not found** as dedicated SDK package name in prior check; HTTP OpenAI-compatible optional via env |

Charter already: public Ask AI must remain non-clinical and must not become Option C by stealth.

---

## 5. Current Option B AI Boundary

| System | AI today? |
| --- | --- |
| Auth / MFA / sessions | No |
| Appointments / outbox / WhatsApp | No |
| Clinical notes / assessments / care plans | **None** (Option C blocked) |
| Public educational Ask AI | **Yes — educational only** |
| Q&A portal draft assist | **Yes — review-required educational draft** |
| Public crisis resources | Directory + canned crisis routing in Ask safety — **not** clinical crisis case management |

Do not introduce AI into auth/appointments/notifications merely because it could be useful.

---

## 6. Future Option C AI Boundary

**FUTURE OPTION C — PROPOSED categories (all independently evaluated; none approved for clinical impl):**

| Category | Examples | Status |
| --- | --- | --- |
| A Administrative assistance | Scheduling/ops drafts | **NOT YET DECIDED** |
| B Educational assistance | Psychoeducation drafting | Partially exists publicly; clinical expansion **NOT YET DECIDED** |
| C Clinical documentation assistance | Note/care-plan drafts | **BLOCKED** until F4-11+approvals |
| D Assessment assistance | Summaries / clinician-facing support | **BLOCKED** |
| E Safety assistance | Candidate signals → human review | **BLOCKED** / **LEGAL REVIEW** |
| F Communication assistance | Clinician message drafts | **BLOCKED** |
| G Patient-facing clinical AI | Clinical guidance / crisis chat as care | **BLOCKED** |

Listing ≠ approval.

---

## 7. AI Authority Model

| Level | Meaning |
| --- | --- |
| AI suggestion / draft / summary / classification / recommendation | Non-authoritative |
| Human-reviewed AI output | Still non-authoritative until approved |
| Human-approved AI output | May become basis for record under F4-02/05 |
| Authoritative clinical record | Human-governed only |

**AI-generated content MUST NOT automatically equal authoritative clinical content.**

---

## 8. Human-in-the-Loop Model

```text
AI generates → authorized human reviews → human edits if needed → human approves → provenance recorded
```

| Question | Status |
| --- | --- |
| Who may review/approve? | Treating psychologist lean — **NOT YET DECIDED** |
| Creator = approver allowed? | **NOT YET DECIDED** |
| Relationship required? | Yes lean (F4-04) — **NOT YET DECIDED** formal |
| Supervision required? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Patient visibility after approve? | F4-02 — **NOT YET DECIDED** |
| Approval revocable / amend → new version? | F4-05 lean yes — **NOT YET DECIDED** |

Educational Ask / Q&A draft today: human review already required for portal draft; public Ask is educational not clinical record creation.

---

## 9. AI Actor / Provenance Model

Actors: AI service; AI worker; AI model; external provider; local model; imported AI artifact.

```text
generated_by = AI_SERVICE
≠
created_by = PSYCHOLOGIST
```

unless an authorized human adopts/approves. Machine provenance distinct from human (F4-05/F4-10).

---

## 10. AI Input Classification

| Input category | Governance lean |
| --- | --- |
| Public content | Potentially allowed for educational AI |
| Account / appointment metadata | Conditional — purpose-bound; **NOT YET DECIDED** for clinical AI |
| Operational data | Conditional |
| Communication metadata | Conditional; bodies restricted (F4-07) |
| Wellness data | Conditional / consent — **NOT YET DECIDED** |
| CLINICAL_ONLY | Conditional / prohibit default without explicit governance — **BLOCKED** now |
| SHARED_READ / collaborative | Conditional; visibility ≠ AI permission |
| Assessments | Conditional / license — **BLOCKED** |
| Safety-sensitive | **LEGAL REVIEW** / human gate — **BLOCKED** autonomous |
| Clinical documents | Conditional — **BLOCKED** |
| Audit/security metadata | Prefer deny as AI training/input — **NOT YET DECIDED** |

---

## 11. Minimum Necessary Data

AI should receive minimum data for the approved task. Prefer excerpts/structured summaries over full records; opaque IDs over names where possible. Cross-patient exposure prohibited unless separately governed and legally reviewed.

---

## 12. Patient / Psychologist Isolation

AI must not receive Patient B while assisting Patient A. Analyze (do not implement): tenant/patient/psych isolation; prompt construction; retrieval scope; vector search; cache; conversation memory; model memory.

AI cannot create access a human actor does not possess (F4-04).

---

## 13. Private / Shared / Collaborative AI

```text
Patient visibility ≠ AI permission
Psychologist access ≠ AI access
```

CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE each need explicit AI rules — **NOT YET DECIDED**; clinical AI **BLOCKED**.

---

## 14. AI Consent Governance

Separate from service / clinical processing / item share / channel / assessment / safety consent (F4-03).

Whether AI needs specific notice, explicit consent, opt-in/out, per-feature/category, withdrawal — **LEGAL / PROFESSIONAL REVIEW REQUIRED** / **NOT YET DECIDED**.

Public educational Ask: distinct from clinical AI consent; O11 privacy copy tensions remain OPEN for Option B accounts generally.

---

## 15. Third-Party AI Providers

External processing; residency; subprocessors; training use; retention; deletion; logging; incidents; DPAs; controller/processor roles — **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

Do not select or approve a vendor here. Do not assume provider policies.

Existing optional OpenAI-compatible path for educational Ask is **not** clinical vendor approval.

---

## 16. AI Training / Secondary Use

Default lean:

> Clinical patient data must not be repurposed for AI training or secondary use without separately approved governance and legal basis.

Do not claim a statutory prohibition unless verified. Status: **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 17. Prompt Governance

Prompts may contain sensitive information. Govern construction, minimization, secrets, identifiers, injection, tool instructions.

Do not store new production clinical prompt templates via this task. Existing educational system prompts remain educational-scope.

---

## 18. Prompt Injection

Treat patient/clinical text as untrusted. Attacks: instruction injection; role spoofing; fake clinician instructions; malicious docs; retrieval poisoning; tool manipulation.

Untrusted content must never override authorization, role, relationship, visibility, consent, or safety policy. Educational Ask already routes some injection categories to canned answers — that does **not** authorize clinical AI.

---

## 19. Output Validation

Distinguish: extraction; summarization; recommendation; interpretation; diagnosis; treatment advice; risk classification.

Human review must assess accuracy, completeness, context, bias, hallucination, safety, professional suitability. Do not assume accuracy.

---

## 20. Hallucination Governance

Fabricated facts/history/diagnoses/scores/quotes/recommendations/safety status must never silently enter authoritative records. Unknown remains unknown.

---

## 21. Diagnosis Boundary

**AI must NOT autonomously diagnose.** Possible future clinician-facing organization/summarization/differential support only if explicitly approved — **NOT YET DECIDED** / **BLOCKED** for Option C. Educational Ask already refuses diagnostic requests via canned paths.

---

## 22. Treatment Boundary

AI must not autonomously: prescribe; change/terminate treatment; create binding care plans; set therapy frequency; make emergency decisions. Clinician-facing drafting later: **NOT YET DECIDED** / **BLOCKED** now.

---

## 23. Safety / Crisis Boundary

F4-06. AI must not autonomously: declare safe/unsafe; contact emergency/family/caregivers; escalate; activate break-glass; disclose clinical info; create emergency plans.

Potential later: **candidate signal → human review** — **NOT YET DECIDED** / **LEGAL REVIEW**. No 24/7 monitoring claims. Educational Ask crisis canned answers point to resources — not clinical escalation workflows.

---

## 24. Assessment Boundary

F4-08. Separate raw / score / interpretation / formulation / diagnosis / AI suggestion.

AI must not: invent scoring rules; modify raw responses; set diagnostic thresholds; self-approve interpretations; auto-convert scores to diagnosis. Licensing independent. **BLOCKED** for clinical assessment AI.

---

## 25. Clinical Communication Boundary

F4-07. Future: AI draft → psychologist review → approve → authorized send.

AI must not: auto-send; select recipients; override consent; bypass relationship; send emergency disclosures; impersonate psychologist. Recipients server-derived. **BLOCKED** for clinical messaging AI. Q&A draft helper aligns with review-required pattern for **educational** replies only.

---

## 26. Patient-Facing AI

| Type | Status |
| --- | --- |
| Public educational Ask | **CURRENT** educational |
| Navigation / appointment info AI | **NOT YET DECIDED** |
| Clinical guidance / symptom care chat | **BLOCKED** |
| Crisis conversation as clinical care | **BLOCKED** |

Evaluate disclosure, disclaimers, escalation, handoff, minors, hallucination, dependency, anthropomorphism for any expansion.

---

## 27. Dependency / Emotional Reliance

Patients may treat AI as psychologist, delay help, assume monitoring, or confuse confidence with certainty. Content must not encourage inappropriate dependency. No new chatbot UX in this task.

---

## 28. Minors / Dependents

Child/adolescent accounts; guardians; assent; confidentiality; AI access/disclosure; safety — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No invented age thresholds. Minor independent accounts **DEFERRED** (Option B).

---

## 29. AI Memory

Persistent / conversation / patient-specific / clinician-specific / cross-session memory.

**No AI memory should silently become part of the clinical record.** Retention/deletion → F4-09. Educational conversation memory exists for Ask UX — not clinical chart memory.

---

## 30. AI Output Storage

Temporary / draft / clinician workspace / clinical record / shared / audit metadata.

Remain non-authoritative until human approval. No new clinical storage schemas.

---

## 31. Versioning / Provenance

F4-05. Future artifacts: model/service identity; timestamp; task/context; source class; reviewer; approval/rejection; version; amendment. Not stored as clinical schema here.

---

## 32. Auditability

F4-10. Events: invoked; task type; data class; output generated; review; approval; rejection; publish/share; safety review; provider failure.

Audit must not contain full sensitive prompts/clinical outputs by default.

---

## 33. Security

Threats: injection; manipulation; poisoning; cross-patient leakage; unauthorized model access; stolen keys; provider compromise; output tampering; replay; stale context; hidden memory; insecure retrieval; excessive permissions; tool misuse. No security implementation in this task.

---

## 34. Failure Modes

Unavailable; timeout; malformed; hallucination; wrong patient context; incomplete context; unsafe recommendation; bias; outage; model update drift; rate limits; vendor policy change.

Fail safely. AI failure must never prevent necessary human clinical judgment.

---

## 35. Model Change Governance

Model identity/version; provider; config; prompt version; retrieval version; evaluation; approval. **TECHNICAL DECISION — F4-12**. No versioning tech selected here.

---

## 36. Quality / Evaluation

Accuracy; hallucination rate; false ±; bias; language; clinical appropriateness; safety; reproducibility; regression.

Do not invent numbers or claim clinical validation. No benchmarks implemented here.

---

## 37. Bias / Fairness

Consider variation across language, age, style, culture, literacy, disability, gender-related language — without demographic assumptions. Govern evaluation; do not claim fairness.

---

## 38. Human Override

Humans must reject, edit, ignore, request another analysis (if approved), prevent publication/sharing. AI must not override humans.

---

## 39. Patient Transparency

Whether patients are told AI was used, task category, human review, clinical-record inclusion, external processing — **LEGAL / PROFESSIONAL REVIEW REQUIRED** / **NOT YET DECIDED**. Educational disclaimer already present for public Ask.

---

## 40. Consent Withdrawal

If AI consent introduced: distinct from deletion, correction, share revoke, relationship end (F4-03/F4-09). Withdrawal ≠ automatic deletion of historical AI artifacts.

---

## 41. Export / Deletion

F4-09 questions: AI drafts exportable? Approved AI-derived records? Rejected outputs? Prompts? Provider copies? AI audit retention? — **NOT YET DECIDED**. No implementation.

---

## 42. Administrative Boundary

SUPER_ADMIN clinically blind. `Admin → AI summary → clinical information` remains clinical access. No side-channel.

---

## 43. Cross-Psychologist Boundary

AI must not summarize Patient A for Psychologist B without F4-04 authorized underlying access. AI cannot create access humans lack.

---

## 44. External Tools

AI must not auto-call email/WhatsApp/calendar/emergency/document/clinical DB tools without separate governance. Tool authorization ≠ model capability. **DENY** autonomous tool clinical actions.

---

## 45. AI Action Matrix

| AI Action | Default Governance |
| --- | --- |
| Summarize public content | Potentially allowed (educational) |
| Draft educational content | Conditional / exists educationally |
| Summarize clinical record | Conditional / human review — **BLOCKED** now |
| Draft clinical note / care plan | Conditional / human approval — **BLOCKED** |
| Interpret assessment | Conditional / professional — **BLOCKED** |
| Identify possible safety signal | Conditional / human review — **BLOCKED** |
| Diagnose / prescribe / change treatment | **DENY** |
| Contact emergency services | **DENY** |
| Send clinical message autonomously | **DENY** |
| Grant access / approve own output | **DENY** |
| Modify/delete authoritative clinical history | **DENY** |
| Override psychologist | **DENY** |

**Conditional ≠ Approved.**

---

## 46. AI Data Flow

```text
Authorized Human Context
  → Minimum Necessary Data Selection
  → Consent / Purpose / Relationship Check
  → AI Processing
  → AI Output
  → Human Clinical Review
  → Human Decision
  → Versioned Authoritative Record (if approved)
  → Visibility / Sharing Rules
  → Audit Event
```

AI must never bypass authorization, consent, relationship, visibility, versioning, or audit.

---

## 47. Threat Model

| # | Threat | Asset | Actor | Failure | Governance | Future technical | Domain | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Prompt injection | Authz/policy | Attacker/patient text | Override instructions | Untrusted input | Filters/isolation | F4-11 | Binding |
| 2 | Cross-patient context leak | Privacy | Bug/model | Wrong patient data | Isolation | Scoped retrieval | F4-04 | Binding |
| 3 | Cross-psychologist leak | Privacy | Bug | Wrong psych context | Relationship ACL | Scope prompts | F4-04 | Binding |
| 4 | Unauthorized clinical input | Confidentiality | Insider/AI | Private data to model | Input class rules | Allow-lists | F4-01/02 | **BLOCKED** clinical |
| 5 | Unauthorized AI output access | Confidentiality | Insider | See drafts | ACL | Authz | F4-04 | **NOT YET DECIDED** |
| 6 | Hallucination | Care quality | Model | False content | Human review | Validation | F4-11 | Binding |
| 7 | Fabricated diagnosis | Safety/ethics | Model | False label | DENY auto-diagnose | Hard deny | F4-08/11 | Binding |
| 8 | Fabricated safety status | Safety | Model | Wrong urgency | Human gate | No auto escalate | F4-06 | Binding |
| 9 | Fabricated history | Integrity | Model | False chart | Unknown stays unknown | Provenance | F4-05 | Binding |
| 10 | Model bias | Fairness | Model | Unequal quality | Evaluation | Testing later | F4-11 | **NOT YET DECIDED** |
| 11 | Unsafe recommendation | Safety | Model | Harmful advice | Human override | Safety review | F4-06 | Binding |
| 12–15 | Self-approve/publish/send/escalate | Authority | Design | Autonomous clinical act | DENY | Hard deny | F4-11 | Binding |
| 16–17 | Provider retention/training | Privacy | Vendor | Secondary use | Contracts/legal | DPA | Legal | **LEGAL REVIEW** |
| 18–20 | API key / prompt / log leak | Secrets/PII | Ops | Exposure | No secrets in git; strip logs | Vault | F4-10 | Binding lean |
| 21–23 | Memory / retrieval / vector isolation | Privacy | Bug | Cross-context | Isolation | Scoped stores | F4-12 | **TECHNICAL — F4-12** |
| 24–27 | Stale context / update / outage / failure | Reliability | Ops/model | Wrong/outdated | Fail safe | Kill switch | F4-12 | **TECHNICAL — F4-12** |
| 28–30 | Malicious docs / tool misuse / priv-esc | Security | Attacker | Bypass | Tool governance | Deny tools | F4-11 | Binding |
| 31–34 | Admin side-channel / consent / withdrawal / relationship bypass | Authz | Design | Unauthorized | No AI side-channel | Enforce ACL first | F4-03/04 | Binding |
| 35–36 | Provenance confusion / unapproved clinical record | Integrity | Design | Fake authorship | Distinct actors | Approval gate | F4-05 | Binding |
| 37–38 | Over-reliance / false 24/7 | Safety UX | Patient | Delayed help | Disclaimers | Honest UX | F4-06/07 | Binding |
| 39–40 | Minors disclosure / unsafe crisis response | Vulnerable users | System | Harm | Legal review; canned redirect | No auto emergency | F4-06 | **LEGAL REVIEW** |

---

## 48. Decision Register

| ID | Decision | Proposed position | Status | Rationale | Dependency | Legal | Impl consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI01 | AI ≠ clinical authority | Adopt | Aligns F4-A | Charter | F4-A | N/A | Human gate |
| AI02 | Educational Ask remains non-clinical | Keep | Aligns charter stealth ban | F4-A/01 | N/A | No Option C via Ask |
| AI03 | Clinical documentation AI | Human-in-loop if ever | **BLOCKED** | Option C | F4-02/05 | Yes | No schema now |
| AI04 | Assessment AI | Blocked | **BLOCKED** | F4-08 | F4-08 | Yes | No scorers |
| AI05 | Safety AI signals | Candidate→human only | **NOT YET DECIDED** / legal | F4-06 | Yes | No detectors now |
| AI06 | Autonomous diagnose/prescribe/escalate/send | DENY | Binding | Invariants | Multi | N/A | Hard deny |
| AI07 | AI-specific consent | Separate | **LEGAL / PROFESSIONAL REVIEW REQUIRED** | F4-03 | Yes | Consent UX later |
| AI08 | Vendor/processor | Review checklist | **LEGAL REVIEW** | O18 | Yes | No vendor approved |
| AI09 | Training on patient clinical data | Deny default | **LEGAL REVIEW** | Secondary use | F4-09 | Yes | Contractual bans |
| AI10 | Patient-facing clinical AI | Deny | **BLOCKED** | Risk | F4-07 | Yes | Keep educational only |
| AI11 | Q&A educational draft pattern | Review-required OK educationally | Aligns portal docs | Q&A | N/A | Do not auto-send |
| AI12 | Expand Ask to clinical records | Forbidden | **BLOCKED** | Stealth Option C | F4-01 | Yes | None |
| AI13 | Kill switch / suspension | Architecture later | **TECHNICAL DECISION — F4-12** | Safety | F4-12 | N/A | Feature flags later |
| AI14 | Clinical AI implementation now | Forbidden | **BLOCKED** | This task | All | — | Docs only |

---

## 49. Access Matrix

| Actor | Public | Operational | CLINICAL_ONLY | SHARED | Collaborative | Assessment | Safety | Audit/security |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Patient | Educational Ask ALLOW | Own ops | DENY AI clinical | CONDITIONAL later | CONDITIONAL | DENY AI clinical | CONDITIONAL educational crisis info | DENY |
| Psychologist | ALLOW educational tools | Own ops | CONDITIONAL AI assist **BLOCKED** | CONDITIONAL **BLOCKED** | CONDITIONAL | CONDITIONAL **BLOCKED** | CONDITIONAL **BLOCKED** | DENY body |
| Consultant | DENY default | DENY | DENY | Scoped **NOT YET DECIDED** | DENY | DENY | **LEGAL REVIEW** | DENY |
| Supervisor | DENY | DENY | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | DENY |
| Administrator | Ops only | CONDITIONAL | DENY (incl. via AI) | DENY | DENY | DENY | DENY | CONDITIONAL meta |
| Staff | DENY | CONDITIONAL | DENY | DENY | DENY | DENY | DENY | DENY |
| Worker | N/A | Deliver ops | DENY | DENY | DENY | DENY | DENY | Write events |
| AI service | Process public/edu | CONDITIONAL | DENY default clinical | DENY default | DENY default | DENY default | Signal only later | DENY train |
| External provider | If contracted edu | CONDITIONAL | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | DENY |
| Unauthorized | DENY | DENY | DENY | DENY | DENY | DENY | DENY | DENY |

---

## 50. Data Lifecycle

```text
COLLECT → SELECT → TRANSFER → PROCESS → OUTPUT → REVIEW → APPROVE/REJECT
  → STORE/DISCARD → SHARE → RETAIN → DELETE
```

Mapped to F4-01 (class), F4-03 (consent), F4-05 (version), F4-09 (retain/delete), F4-10 (audit). No implementation.

---

## 51. Incident Governance

Hallucination clinical risk; leakage; provider breach; unauthorized invocation; injection; unsafe output; autonomous action; regression; consent violation; cross-patient contamination.

Questions: detection; containment; review; notification; remediation; model suspension; audit preservation. No IR tooling here.

---

## 52. Suspension / Kill Switch

Future suspend by: feature; model; provider; practice; data category; environment. **TECHNICAL DECISION — F4-12**. Not implemented.

---

## 53. Vendor Review

Checklist: privacy; security; retention; training; subprocessors; geography; deletion; contracts; incidents; availability; auditability; isolation; config; model versioning.

No vendor named as approved.

---

## 54. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** clinical AI processing; third-party providers; patient consent/transparency; minors; assessments; diagnosis/treatment recommendations; safety/crisis; emergency decisions; clinical messaging; retention/export/deletion; secondary use/training; processor arrangements; professional accountability.

Do not provide legal conclusions.

---

## 55. F4-12 Architecture Dependencies

Deferred to F4-12: AI service/trust boundaries; deployment; data routing; isolation; secrets; model/version management; human approval architecture; audit architecture; retention; failure handling; workers; provider integration; kill/suspension.

Do not decide those here.

---

## 56. Binding Governance Invariants

1. AI is not clinical authority.  
2. AI cannot self-approve.  
3. AI cannot self-publish.  
4. AI cannot diagnose autonomously.  
5. AI cannot prescribe autonomously.  
6. AI cannot autonomously alter treatment.  
7. AI cannot autonomously escalate emergencies.  
8. AI cannot autonomously disclose clinical information.  
9. AI cannot grant access.  
10. AI cannot override RBAC.  
11. AI cannot override relationships.  
12. AI cannot override consent.  
13. AI cannot override visibility.  
14. AI cannot override versioning.  
15. AI cannot override audit governance.  
16. Human clinical review is mandatory for future clinical AI.  
17. AI input must be minimum necessary.  
18. Patient isolation applies to AI context.  
19. Cross-psychologist isolation applies to AI context.  
20. SUPER_ADMIN clinical blindness applies to AI.  
21. Machine provenance must remain distinct from human provenance.  
22. AI output must be distinguishable from human-authored content.  
23. Unknown information must remain unknown.  
24. AI hallucinations must not silently enter authoritative records.  
25. Ordinary notifications must not contain clinical AI output by default.  
26. AI cannot claim continuous monitoring.  
27. AI cannot create emergency authority.  
28. Third-party processing requires governance.  
29. AI training/reuse requires separate governance.  
30. AI retention follows approved lifecycle governance.  
31. AI artifacts require provenance.  
32. AI changes require version/evaluation governance.  
33. Patient transparency requires governance review.  
34. Minors require legal/professional review.  
35. AI failure must fail safely.  
36. AI convenience cannot weaken security.  
37. AI cannot become an authorization side channel.  
38. AI cannot become an administrative clinical side channel.  
39. AI must remain subordinate to authorized human decision-making.  
40. No clinical AI implementation before explicit governance and engineering authorization.  
41. Public educational Ask AI must not become Option C by stealth.

---

## 57. Outstanding Decisions

Clinical AI category approvals; consent model; vendor selection process; patient transparency wording; safety-signal assist; communication drafts; memory/retention; export of AI artifacts; evaluation program; kill-switch architecture; relationship of educational Ask to future clinical AI boundaries under unified auth.

---

## 58. Implementation Restrictions

Do **not**: install AI SDKs; modify package.json/lockfiles; create clinical AI schemas/APIs/UI/workers; expand Ask into clinical records; configure Production AI secrets via this task; autonomously diagnose/send/escalate; commit/push.

Existing educational Ask / Q&A draft remain as-is; this task does not authorize expansion.

---

## 59. F4-11 Approval Status

**NOT YET DECIDED**

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-11 | Draft AI assist governance; educational Ask documented as non-clinical |

**Recommended next:** **F4-12 — Clinical Architecture, Technical Boundary & Implementation Readiness Governance** (do not start without authorization).

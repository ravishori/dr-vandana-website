# F4-08 CLINICAL ASSESSMENT & PSYCHOMETRIC DATA GOVERNANCE v1.0

## 1. Executive Summary

This document defines governance for any *future* psychological assessments, psychometric instruments, questionnaires, scoring, interpretation, results, sharing, retention, and related clinical data.

**Current fact:** No clinical assessment engine or psychometric data system currently exists in the application.

**Binding distinctions:** questionnaire response ≠ raw assessment data ≠ calculated score ≠ norm comparison ≠ clinical interpretation ≠ clinical formulation ≠ diagnostic conclusion ≠ treatment decision ≠ patient-facing explanation ≠ AI-generated suggestion.

**Status:** **NOT YET DECIDED** (governance draft). Option C assessments remain **DEFERRED / BLOCKED** for implementation (`PATIENT_PRACTICE_DECISIONS.md`).

---

## 2. Authorization / Scope

**Authorized:** F4-08 governance/documentation only.

**Forbidden:** assessment/psychometric tables; scoring algorithms; interpretation engines; assessment UI/APIs/Server Actions; clinical dashboards; AI assessment interpretation; assessment notifications; migrations; copyrighted instrument content; Production changes; commits; F4-09 start.

Option C remains **BLOCKED**.

---

## 3. Governing Documents

| Input | Role |
| --- | --- |
| F4 Master Charter | Domain F4-08 Psychometric / Assessment Governance |
| F4-01 | Classification (assessments clinical by default when as clinical records) |
| F4-02 | CLINICAL_ONLY / SHARED_READ / SHARED_COLLABORATIVE |
| F4-03 | Assessment consent distinct from service/channel consent |
| F4-04 | Role + relationship + resource + action; isolation; admin blindness |
| F4-05 | Versioning/provenance; no silent overwrite |
| F4-06 | Safety-sensitive responses; human authority; no auto diagnosis/risk |
| F4-07 | Assessment communication channel restrictions |
| `PATIENT_PRACTICE_DECISIONS.md` | Psychological assessments **DEFERRED**; Option C **BLOCKED** |

Conflicts → **DECISION REQUIRED**, not silent rewrite of prior docs.

---

## 4. Repository Evidence

| Finding | Classification |
| --- | --- |
| No assessment/response/score tables in Option B PMS schema | **Fact** — no engine |
| Notification tests forbid “assessment” in ops copy | Privacy-safe ops — not assessment system |
| Public educational content / FAQ / legal disclaimers mention “professional assessment” | Educational — not psychometric collection |
| Ask Dr. Vandana / AI educational prompts mention assessment considerations | Educational AI — **not** clinical scoring (`assessmentConsiderations` in case-study knowledge) |
| Embedding “scoring” (bag-of-words) | Retrieval helper — **not** psychometric scoring |
| Crisis resource directory | Public resources — not patient assessment records |
| Decisions register: Psychological assessments **DEFERRED**; Option C **BLOCKED** | Authoritative product boundary |

> No clinical assessment engine or psychometric data system currently exists.

---

## 5. Current Option B Boundary

| Exists | Not assessment data |
| --- | --- |
| Accounts, appointments, ops notifications | Ordinary Option B fields |
| Public mental-health resources / education | Not psychometric instruments |
| Q&A portal | Not clinical assessments |
| `emergency_contact` profile text | Sensitive personal — not assessment |

Do not reclassify Option B fields as psychometric data merely because they relate to a patient.

---

## 6. Future Option C Boundary

**GOVERNANCE PROPOSALS — NOT IMPLEMENTED / BLOCKED:**

assessment catalogue; instrument selection; questionnaire delivery; patient responses; scoring; score storage; interpretation; longitudinal comparison; psychologist review; patient-facing results; assessment attachments; assessment-related communication; safety-related responses; AI-assisted assessment summaries.

---

## 7. Assessment Taxonomy

| ID | Category | Meaning |
| --- | --- | --- |
| A01 | Assessment metadata | Instrument id, version, purpose, language, admin date/context |
| A02 | Instrument content | Questionnaire/test items — copyright/licensing critical |
| A03 | Patient responses | Raw patient answers |
| A04 | Clinician-entered responses | Professional records responses on behalf of patient — source explicit |
| A05 | Calculated scores | Total/subscale/raw/transformed — derived |
| A06 | Normative/reference comparison | If used — do not invent norms |
| A07 | Clinical interpretation | Human professional interpretation |
| A08 | Clinical formulation | Broader clinical reasoning |
| A09 | Diagnostic conclusion | Only where professionally appropriate — never automatic |
| A10 | Patient-facing explanation | Communication layer ≠ raw score/formulation |
| A11 | Assessment status | Assigned/started/completed/etc. — proposed vocabulary only |
| A12 | Assessment provenance | Who created/administered/entered/calculated/interpreted/approved |
| A13 | AI-generated assistance | Draft/suggestion until human-approved |
| A14 | Safety-sensitive responses | May require F4-06 handling |

---

## 8. Assessment Types

Possible future categories (not a product commitment; no instruments prescribed): screening; symptom questionnaires; wellbeing/stress/anxiety/mood measures; personality; behavioural; developmental; child/adolescent; relationship; workplace; outcome/progress measures.

Do **not** prescribe which instruments Dr. Vandana should use. Do **not** reproduce copyrighted instruments. Do **not** invent scoring thresholds. Use `[INSTRUMENT TO BE VERIFIED]` placeholders in future catalogues.

---

## 9. Screening vs Diagnostic

| Concept | Meaning | Must not imply |
| --- | --- | --- |
| Screening | Brief identification of possible concerns | Disorder established |
| Clinical assessment | Broader professional evaluation support | Automatic diagnosis |
| Diagnostic assessment | Professionally governed diagnostic process | Algorithmic diagnosis |
| Outcome / progress measurement | Change over time support | Sole measure of recovery |
| Research / QI assessment | Secondary purpose | Care consent covers it |

Screening result ≠ diagnosis. No invented clinical thresholds.

---

## 10. Purpose Governance

| Purpose | Auto-authorize other? |
| --- | --- |
| Intake / screening / baseline | No |
| Treatment planning / progress / outcome / reassessment / clinical review | No across types |
| Safety support | Separate F4-06 |
| Research / quality improvement | Separate governance |
| Analytics | Separate |

**care purpose ≠ research purpose ≠ analytics purpose**

---

## 11. Consent

Integrate F4-03. Analyze: assessment-specific consent; service consent; optional vs required; purpose disclosure; withdrawal; material changes; reuse; secondary use; research/QI; AI processing; third-party processing.

Do not assume one general consent covers all assessment uses. Status: **NOT YET DECIDED** / **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 12. Patient Participation

Voluntary vs required; refusal; incomplete; withdrawal; impact on care — **NOT YET DECIDED** / professional review. No coercive UX. Do not invent professional policy.

---

## 13. Patient Understanding

Future UX should explain: what it measures; why requested; effort; screening vs clinical; auto-scoring; whether psychologist reviews; limitations; what happens if concerning responses arise. No UI in this phase. Final wording pending legal/professional review.

---

## 14. Instrument Licensing

**Mandatory.** Future instruments require verification of: copyright; licensing; professional use; online administration; scoring; storage; translation; derivative-work; commercial use; redistribution.

Do **not** claim any specific instrument is free/unrestricted without authoritative evidence. Do **not** copy instrument questions into this document.

Placeholders: `[INSTRUMENT TO BE VERIFIED]`.  
**LEGAL / PROFESSIONAL REVIEW REQUIRED.**

---

## 15. Language / Cultural Validity

English / Hindi / Marathi / other — **NOT YET DECIDED**.

Distinguish: translation ≠ validated translation ≠ cultural adaptation ≠ clinician explanation. Do not assume psychometric equivalence. Do not invent validation claims.

---

## 16. Scoring Governance

```text
raw response → validation → calculation → derived score → reference comparison → professional review
```

No implementation. No thresholds. No embedded clinical decision rules. No opaque/hidden scoring as clinical decision mechanism.

---

## 17. Score Provenance

Every future score should be traceable to: instrument; version; response set; calculation method; scoring version; timestamp; actor/system; source. No silent recalculation that destroys historical meaning.

---

## 18. Scoring Versioning

Integrate F4-05. If scoring rules change: preserve prior score; identify scoring version; preserve calculation provenance; distinguish recalculation from original. No overwrite of historical assessment results.

---

## 19. Raw Response Governance

Whether completed raw responses are immutable — **DECISION REQUIRED**.

Consider: correction; patient correction request; clinician correction; incomplete; accidental submission; administrative error.

---

## 20. Corrections

Distinguish: patient correction request; clinician correction; technical correction; scoring correction; interpretation amendment. No silent history rewrite (F4-05).

---

## 21. Clinical Interpretation

```text
score ≠ professional interpretation ≠ clinical formulation ≠ diagnostic conclusion
```

A numerical threshold must never automatically become a diagnosis. Human clinical authority required for interpretation (qualified professional).

---

## 22. Patient-Facing Results

| Model | Description | Advantages | Risks |
| --- | --- | --- | --- |
| A | Raw score only | Transparency of number | Misinterpretation without context |
| B | Score + neutral explanation | Some context | Still may over/under-worry |
| C | Psychologist-approved interpretation | Professional gate | Delay; dependency on review |
| D | Complete assessment report | Full information | Over-disclosure; distress; forwarding |

**Final model: NOT YET DECIDED** (no authoritative decision exists).

---

## 23. Private / Shared Assessment Data

Integrate F4-02:

- CLINICAL_ONLY assessment information (e.g. private interpretation/formulation)  
- SHARED_READ assessment information (intentionally shared results/explanations)  
- SHARED_COLLABORATIVE (if ever allowed — **DECISION REQUIRED**)  

Not every score is patient-visible. Not every interpretation is shared. Private clinical reasoning must not be exposed by default.

---

## 24. RBAC / Relationships

Integrate F4-04. Access = identity + role + relationship + resource + action + visibility + purpose.

SUPER_ADMIN clinical blindness by default. Cross-psychologist DENY without governed relationship. Patient isolation mandatory.

---

## 25. Assessment Actions

assign; view; complete; save draft; submit; score; interpret; approve; share; acknowledge; correct; export; archive; delete — each actor-specific. Do not assume all actors can perform all actions. Matrix §51.

---

## 26. Safety-Sensitive Responses

Integrate F4-06. Concerning responses may require **human review** — not automatic diagnosis, severity assignment, emergency contact, or continuous monitoring claim.

Questions for later policy: human review; practice hours; after-hours; escalation; emergency resources; documentation; **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No detector implementation.

---

## 27. Assessment Abandonment

Incomplete ≠ completed results. Abandoned / partial / expired / duplicate / resumed — handling **NOT YET DECIDED**. Do not treat partial as scored completed assessment without rules.

---

## 28. Longitudinal Tracking

```text
baseline → reassessment → change → interpretation
```

Numerical change ≠ automatic improvement / deterioration / recovery without professional interpretation.

---

## 29. Clinical Progress

Scores may support outcome measurement but must not be the sole measure of progress. Consider: self-report; psychologist observation; functional outcomes; treatment goals; context. Not implemented.

---

## 30. Cross-Instrument Comparison

Scores from different instruments are **not** automatically comparable. Any comparison requires professional justification — **DECISION REQUIRED**.

---

## 31. Normative Data

If used, require: source provenance; population; version/date; applicability; professional review. Do not invent normative populations or thresholds. **LEGAL / PROFESSIONAL REVIEW REQUIRED** for applicability.

---

## 32. Clinical Decision Support

Results may inform decisions but must not automatically trigger: diagnosis; treatment; medication; therapy change; referral; emergency response. Human review remains authoritative.

---

## 33. AI Assistance

```text
raw responses → scoring engine → AI draft summary → psychologist review → approval → patient-visible explanation
```

AI must **NOT**: diagnose; independently interpret as authoritative; determine risk; change treatment; send emergency messages; disclose results; approve its own output. Detail F4-11. **BLOCKED** until approved.

---

## 34. AI Provenance

If later approved: model/service identity; version; input scope; generation timestamp; output; reviewer; approval status; final approved content. AI draft ≠ approved clinical record.

---

## 35. Assessment Documents

Generated / uploaded / scanned / external / referral reports. Distinguish: document ≠ assessment data ≠ clinical interpretation ≠ clinical record version (F4-05). Storage deferred.

---

## 36. Imported Assessments

Preserve: original source; originating professional; date; instrument; version if known; provenance; uncertainty. If unknown: **PROVENANCE UNKNOWN**. Do not fabricate.

---

## 37. Third-Party Assessments

From another psychologist, psychiatrist, physician, school, employer, institution, external testing provider — authorization/disclosure subject to F4-03/F4-04. **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 38. Minors / Dependents

Child/adolescent; parent/guardian; assent; confidentiality; caregiver visibility; safety disclosures; school assessments — **LEGAL / PROFESSIONAL REVIEW REQUIRED**. No invented age thresholds. Guardian access does not automatically include all assessment information. No dependent schemas.

---

## 39. Assessment Communication

Integrate F4-07. Separate: invitation; reminder; completion confirmation; result notification; interpretation communication; safety-related communication. Ordinary notifications must not contain sensitive assessment information by default.

---

## 40. Channel Restrictions

Prefer secure authenticated in-app for sensitive results. Email/SMS/WhatsApp/push: invitation/reminder CONDITIONAL with minimization; scores/interpretations/reports **DENY** in ordinary bodies by default. Phone: **LEGAL REVIEW**. Downloadable reports: **NOT YET DECIDED** with forwarding risk.

---

## 41. Export

Integrate F4-09. Possible export contents: raw responses; scores; interpretations; reports; provenance; version history. Who may export — **DECISION REQUIRED**. No periods; no implementation.

---

## 42. Retention / Deletion

Integrate F4-09. Distinguish: assignment; raw response; score; interpretation; report; audit; consent evidence. Periods **UNSET**. Deletion ≠ automatic erase of required history — legal review.

---

## 43. Analytics / Research

Assessment data must not automatically become analytics or research data. Individual care ≠ practice analytics ≠ QI ≠ research ≠ publication — each separate governance. **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 44. De-identification

Consider direct/indirect identifiers; small populations; free text; dates; rare characteristics. Removing names ≠ anonymous. **LEGAL / PROFESSIONAL REVIEW REQUIRED**.

---

## 45. Search

Clinical-private assessment bodies must not automatically appear in global admin/patient/staff search or AI retrieval. Search authz respects F4-04/F4-02. **NOT YET DECIDED** exact index rules.

---

## 46. Notifications

Integrate F4-07. Avoid scores, interpretations, raw answers, safety responses, private notes in ordinary email/SMS/WhatsApp/push unless separately approved.

---

## 47. Audit

F4-10 dependency. Candidate events: assigned; opened; started; completed; submitted; scored; interpreted; approved; shared; viewed; acknowledged; corrected; exported; revoked; superseded. No audit schema. No sensitive bodies in ordinary audit logs.

---

## 48. Versioning / Provenance

F4-05. Preserve instrument/response/scoring/interpretation versions; approval; sharing; amendments. No destructive overwrites.

---

## 49. Assessment Lifecycle

**Governance concepts only — vocabulary NOT YET DECIDED:**

```text
ASSIGNED → STARTED → COMPLETED → SCORED → REVIEWED → INTERPRETED → APPROVED → SHARED
```

Possible: INCOMPLETE, WITHDRAWN, CORRECTED, SUPERSEDED, REVOKED.

---

## 50. Authority Model

| Data | Source | Authority |
| --- | --- | --- |
| Patient response | Patient | Self-report |
| Clinician-entered response | Psychologist | Clinical documentation |
| Calculated score | System | Derived |
| Norm comparison | System/reference | Derived |
| AI summary | AI | Non-authoritative |
| Clinical interpretation | Psychologist | Human clinical authority |
| Diagnostic conclusion | Qualified professional | Professional authority |
| Patient explanation | Approved communication | Shared information |

---

## 51. Access Matrix

| Actor | Instrument | Raw responses | Scores | Interpretations | Diagnostic | Safety responses | Reports |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Patient | CONDITIONAL assigned | Own CONDITIONAL | **NOT YET DECIDED** | **NOT YET DECIDED** | **LEGAL REVIEW** | CONDITIONAL | **NOT YET DECIDED** |
| Treating Psychologist | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL | CONDITIONAL |
| Consulting Psychologist | CONDITIONAL | **NOT YET DECIDED** | **NOT YET DECIDED** | **NOT YET DECIDED** | **LEGAL REVIEW** | **LEGAL REVIEW** | **NOT YET DECIDED** |
| Supervisor | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** | **LEGAL REVIEW** |
| Former Psychologist | DENY default | DENY default | DENY default | DENY default | DENY default | DENY default | DENY default |
| Practice Staff | DENY body | DENY | DENY | DENY | DENY | DENY | DENY |
| SUPER_ADMIN | DENY body | DENY | DENY | DENY | DENY | DENY | DENY |
| System Worker | Score calc CONDITIONAL | Process CONDITIONAL | Derive | DENY interpret | DENY | Route signal only | DENY |
| AI | Assist CONDITIONAL | Process **NOT YET DECIDED** | Assist **NOT YET DECIDED** | Draft only | DENY | DENY determine | Draft only |
| Unauthorized | DENY | DENY | DENY | DENY | DENY | DENY | DENY |

---

## 52. Patient Visibility Matrix

| Assessment component | Patient visibility |
| --- | --- |
| Assignment | CONDITIONAL — **NOT YET DECIDED** |
| Questions | During completion CONDITIONAL |
| Raw responses | Own CONDITIONAL — **NOT YET DECIDED** after submit |
| Score | **NOT YET DECIDED** (Models A–D) |
| Norm/reference | **NOT YET DECIDED** |
| Psychologist interpretation | SHARED only if approved — **NOT YET DECIDED** |
| Diagnostic conclusion | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| Safety information | CONDITIONAL / F4-06 — **LEGAL REVIEW** |
| Final report | **NOT YET DECIDED** |
| Historical versions | **NOT YET DECIDED** (F4-05) |

---

## 53. Assessment × Channel Matrix

| Assessment content | In-App | Email | SMS | WhatsApp | Push | Phone |
| --- | --- | --- | --- | --- | --- | --- |
| Invitation | ALLOW preferred | CONDITIONAL minimize | CONDITIONAL minimize | CONDITIONAL if opt-in | **NOT YET DECIDED** | CONDITIONAL |
| Reminder | ALLOW preferred | CONDITIONAL | CONDITIONAL | CONDITIONAL if opt-in | **NOT YET DECIDED** | CONDITIONAL |
| Completion | ALLOW | Generic ack only | Generic only | Generic only | Generic only | CONDITIONAL |
| Score | CONDITIONAL | DENY body default | DENY | DENY | DENY | **LEGAL REVIEW** |
| Interpretation | CONDITIONAL shared | DENY body default | DENY | DENY | DENY | **LEGAL REVIEW** |
| Report | CONDITIONAL | Prefer secure link / DENY attach | DENY | DENY | DENY | **LEGAL REVIEW** |
| Safety-related | CONDITIONAL | Generic alert only | Generic only | Generic only | Generic only | **LEGAL REVIEW** |

---

## 54. Threat Model

| # | Threat | Impact | Governance control | Future technical control | Domain |
| --- | --- | --- | --- | --- | --- |
| 1 | Cross-patient assessment leakage | Privacy breach | Isolation | Authz tests | F1-B/F4-04 |
| 2 | Cross-psychologist access | Confidentiality | Relationship ACL | Authz | F4-04 |
| 3 | Patient ID tampering | Wrong record | Server identity | Session bind | F4-04 |
| 4 | Instrument ID tampering | Wrong tool | Server catalogue | Signed assignment | F4-08 |
| 5 | Unauthorized assignment | Unwanted collection | Assign ACL | Role checks | F4-04 |
| 6 | Unauthorized scoring | Integrity | Score ACL | Server-only calc | F4-08 |
| 7 | Score manipulation | Wrong care | Immutable scored versions | Append-only | F4-05 |
| 8 | Threshold manipulation | False severity | No auto clinical rules | Config governance | F4-08/06 |
| 9 | Hidden scoring | Opaque decisions | Transparency principle | Disclose method | F4-08 |
| 10 | Diagnosis inference | Mislabel | Assessment ≠ diagnosis | UI copy rules | F4-08 |
| 11 | AI interpretation leakage | Over-share | Visibility rules | No auto-share | F4-11/02 |
| 12 | AI auto-diagnosis | Harm | AI non-authority | Hard deny | F4-11 |
| 13 | AI auto-escalation | Wrong emergency | F4-06 | Hard deny | F4-06/11 |
| 14 | Wrong patient result | Misattribution | Assignment bind | Authz | F4-04 |
| 15 | Wrong instrument version | Invalid score | Version pin | Provenance | F4-05 |
| 16 | Wrong language/version | Invalid measure | Language governance | Locale pin | F4-08 |
| 17 | Invalid translation | Bias/error | Validated translation only | Review | Legal |
| 18 | Copyright/licensing violation | Legal risk | License verify | No unlicensed store | Legal |
| 19 | Normative-data misuse | Wrong compare | Norm provenance | Versioned norms | F4-08 |
| 20 | Duplicate assessment | Confusion | Dedup policy | Assignment rules | F4-08 |
| 21 | Partial response misread | Wrong score | Incomplete ≠ complete | Status gates | F4-08 |
| 22 | Historical score overwrite | Evidence loss | Immutability | Append-only | F4-05 |
| 23 | Incorrect recalculation | Distortion | Scoring version | Dual store | F4-05 |
| 24 | Interpretation overwrite | Evidence loss | Amend → new version | Append-only | F4-05 |
| 25 | Unauthorized patient result visibility | Distress/privacy | Share model | Visibility flags | F4-02 |
| 26 | SUPER_ADMIN access | Over-privilege | Admin blindness | Deny bodies | F4-04 |
| 27 | Staff access | Over-privilege | Ops only | Deny bodies | F4-04 |
| 28 | Former psychologist access | Stale ACL | Termination | ACL recompute | F4-04 |
| 29 | Export leakage | Over-share | Export authz | F4-09 | F4-09 |
| 30 | Notification preview leakage | Exposure | F4-07 | Template bans | F4-07 |
| 31 | Email forwarding | Secondary disclosure | Minimize / secure link | No score in email | F4-07 |
| 32 | WhatsApp shared-device | Exposure | Channel ≠ content | Opt-in + deny scores | F4-03/07 |
| 33 | Attachment leakage | Over-share | Attachment governance | Authz download | F4-09 |
| 34 | Third-party disclosure | Unlawful share | Explicit authorize | Legal review | F4-03 |
| 35 | Minor/guardian misuse | Confidentiality | Minors governance | Legal review | F4-03/08 |
| 36 | Safety-response suppression | Missed review | F4-06 human review | Audit | F4-06 |
| 37 | False assurance | Harm | No continuous monitor claim | UX copy | F4-06 |
| 38 | Abandonment ambiguity | Wrong use of partial | Status rules | Incomplete flag | F4-08 |
| 39 | Research reuse w/o auth | Purpose creep | Separate consent | Purpose flags | F4-03 |
| 40 | Analytics secondary use | Purpose creep | Separate governance | Deny default | F4-01/03 |
| 41 | AI prompt leakage | Data exfil | Minimize prompts | Redaction | F4-11 |
| 42 | Provider compromise | Leak | Min payload | No bodies to ops notify | F4-07 |
| 43 | Audit-log leakage | Sensitive in logs | Strip bodies | F4-10 | F4-10 |
| 44 | Stale relationship access | Unauthorized view | Status checks | ACL | F4-04 |
| 45 | Revoked result resurfacing | Stale share | Visibility events | Link expire | F4-02 |

---

## 55. Governance Decision Register

| # | Decision | Status |
| --- | --- | --- |
| 1 | Which assessment categories permitted? | **NOT YET DECIDED** |
| 2 | Who selects instruments? | **NOT YET DECIDED** |
| 3 | Who may assign assessments? | Treating psych CONDITIONAL lean — **NOT YET DECIDED** |
| 4 | Optional or required? | **NOT YET DECIDED** / professional |
| 5 | What consent required? | Assessment-specific lean — **LEGAL REVIEW** |
| 6 | Can consent be withdrawn? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 7 | Incomplete assessments? | **NOT YET DECIDED** |
| 8 | Who may see raw responses? | Treating CONDITIONAL; patient **NOT YET DECIDED** |
| 9 | Who may see scores? | **NOT YET DECIDED** |
| 10 | Who may interpret? | Human clinical authority — **NOT YET DECIDED** formal |
| 11 | Who may approve interpretations? | Psychologist lean — **NOT YET DECIDED** |
| 12 | Patients see scores? | Models A–D — **NOT YET DECIDED** |
| 13 | Patients see interpretations? | Shared only — **NOT YET DECIDED** |
| 14 | Patients see raw responses? | **NOT YET DECIDED** |
| 15 | Patients see historical versions? | **NOT YET DECIDED** |
| 16 | Corrections handling? | F4-05 amend — **NOT YET DECIDED** detail |
| 17 | Which instruments permitted? | `[INSTRUMENT TO BE VERIFIED]` — **NOT YET DECIDED** |
| 18 | Licensing verification? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 19 | Translation validation? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 20 | Scoring rules versioned? | Required principle — **NOT YET DECIDED** formal |
| 21 | Norms governed? | Provenance required — **NOT YET DECIDED** |
| 22 | Longitudinal compare? | CONDITIONAL with interpretation — **NOT YET DECIDED** |
| 23 | Cross-instrument compare? | Not automatic — **NOT YET DECIDED** |
| 24 | Safety-sensitive responses? | F4-06 human review — **LEGAL REVIEW** |
| 25 | After hours? | **NOT YET DECIDED** / F4-06 |
| 26 | Results by email? | DENY body default — **NOT YET DECIDED** |
| 27 | SMS? | DENY — **NOT YET DECIDED** |
| 28 | WhatsApp? | DENY scores — **LEGAL REVIEW** |
| 29 | Push? | DENY — **NOT YET DECIDED** |
| 30 | Phone? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 31 | In-app primary secure channel? | Recommended lean YES — **NOT YET DECIDED** |
| 32 | Reports downloadable? | **NOT YET DECIDED** |
| 33 | Assessments exportable? | **NOT YET DECIDED** / F4-09 |
| 34 | Who may export? | **NOT YET DECIDED** |
| 35 | What retained? | **F4-09** unset |
| 36 | What deleted? | **F4-09** + legal |
| 37 | How amended? | New version — F4-05 — **NOT YET DECIDED** |
| 38 | What becomes clinical record? | **NOT YET DECIDED** |
| 39 | Analytics reuse? | DENY auto — **NOT YET DECIDED** |
| 40 | Research use? | Separate — **LEGAL REVIEW** |
| 41 | AI process raw responses? | **NOT YET DECIDED** / F4-11 |
| 42 | AI calculate scores? | Prefer deterministic scorer; AI **NOT YET DECIDED** |
| 43 | AI draft interpretations? | CONDITIONAL future — **NOT YET DECIDED** |
| 44 | AI communicate results? | **DENY** / **BLOCKED** |
| 45 | AI determine safety? | **DENY** / **BLOCKED** |
| 46 | Caregivers see results? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 47 | Minors handling? | **LEGAL / PROFESSIONAL REVIEW REQUIRED** |
| 48 | External assessments? | Provenance + legal — **NOT YET DECIDED** |
| 49 | Assessment documents? | Distinct from data — **NOT YET DECIDED** |
| 50 | Practice-wide analytics? | Separate governance — **NOT YET DECIDED** |

Psychological assessments product implementation remains **BLOCKED** / **DEFERRED** per Option B decisions.

---

## 56. Legal / Professional Review

**LEGAL / PROFESSIONAL REVIEW REQUIRED:** instrument licensing/copyright; professional scope; diagnostic interpretation; minors/guardian access; consent/withdrawal; safety responses; emergency disclosures; third-party assessment sharing; external providers; AI processing; retention/deletion/export; research/analytics; language/translation validity.

Do not invent jurisdiction-specific rules. Do not provide legal advice.

---

## 57. Binding Governance Invariants

1. Assessment ≠ diagnosis.  
2. Score ≠ diagnosis.  
3. Score ≠ interpretation.  
4. Raw response ≠ derived score.  
5. Patient self-report ≠ clinician observation.  
6. AI output ≠ clinical authority.  
7. Human clinical authority is required for interpretation.  
8. Instrument licensing must be verified.  
9. No hidden scoring.  
10. No autonomous diagnosis.  
11. No autonomous treatment changes.  
12. No autonomous safety decisions.  
13. Purpose limitation applies.  
14. Assessment consent is distinct from service consent where appropriate.  
15. Authorization is separate from consent.  
16. Patient isolation is mandatory.  
17. Cross-psychologist access is denied by default.  
18. SUPER_ADMIN does not automatically gain clinical assessment access.  
19. Raw responses must have provenance.  
20. Scores must preserve scoring provenance.  
21. Historical assessment results must not be silently overwritten.  
22. Scoring-rule changes require versioning.  
23. Corrections preserve history.  
24. Patient visibility must be explicit.  
25. Clinical-private information must not enter ordinary notifications.  
26. Assessment results require appropriate channel governance.  
27. Delivery does not imply review.  
28. Assessment change does not automatically imply clinical improvement.  
29. Different instruments are not automatically comparable.  
30. Normative data requires provenance.  
31. AI drafts require human review.  
32. AI cannot approve its own output.  
33. Safety-sensitive responses require F4-06 governance.  
34. Minors require professional/legal review.  
35. Secondary use requires separate governance.  
36. Export requires authorization.  
37. Deletion does not automatically erase required history.  
38. Assessment documents and assessment records are distinct.  
39. Unknown provenance must remain explicitly unknown.  
40. No clinical assessment implementation before governance approval.

---

## 58. Cross-Domain Dependencies

| Domain | Dependency |
| --- | --- |
| F4-01 | Classification of assessment data |
| F4-02 | Private/shared visibility of scores/interpretations |
| F4-03 | Assessment-specific consent |
| F4-04 | Assign/view/interpret ACL |
| F4-05 | Response/score/interpretation versioning |
| F4-06 | Safety-sensitive items; no auto risk |
| F4-07 | Invitation vs result channel rules |
| F4-09 | Retention/export/deletion — **unresolved** |
| F4-10 | Audit events — **unresolved** |
| F4-11 | AI assist — **unresolved** |
| F4-12 | Architecture — after governance approval |

---

## 59. Implementation Restrictions

Cursor **MUST NOT** create: assessment/psychometric/questionnaire/response/score/interpretation tables; APIs; Server Actions; UI/dashboards; scoring/psychometric/threshold/interpretation engines; assessment notifications/workers; AI assessment services; migrations; enums; permissions; seed data; copyrighted assessment content.

No Option C implementation is authorized.

---

## 60. Outstanding Decisions

Instrument catalogue; licensing process; languages; optional vs required; consent model; patient visibility model (A–D); incomplete handling; longitudinal/cross-instrument rules; norms; safety after-hours playbook; channel exceptions; downloads/exports; analytics/research; AI processing scope; minors/caregivers; what enters clinical record; lifecycle vocabulary.

---

## 61. F4-08 Status

**NOT YET DECIDED**

---

## 62. Recommendation for F4-09

Next: **F4-09 — Clinical Data Retention, Export, Deletion & Lifecycle Governance**.  
Do **not** begin F4-09 without explicit authorization.

---

## Document control

| Version | Date | Phase | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-08-30 | F4-08 | Draft clinical assessment / psychometric governance |

**Inconsistency check:** No silent conflict with F4-01–07; aligns assessments DEFERRED/BLOCKED in decisions register; educational “assessment” mentions remain non-clinical.

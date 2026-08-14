# Phase 2J — Legal / Privacy Gates for Option C

**Status:** REQUIRES LEGAL REVIEW. Not legal advice. Do not rewrite copy as approved.  
**Date:** 14 August 2026  

Option C (consultations, clinical notes, clinical documents) remains **DEFERRED / BLOCKED** until privacy policy, BRD, retention, and professional/legal reviews explicitly approve website-hosted clinical records.

---

## Why Option C is blocked today

| Gate | Current state |
|---|---|
| Product decision | Option C **DEFERRED** in `docs/PATIENT_PRACTICE_DECISIONS.md` |
| BRD / ethics boundary | Public site must not become an EHR without review |
| Public legal copy | `src/data/legal.ts` still describes informational site / enquiry-only patient database language |
| PR #9 legal edits | Prototype rewrote portal language — **not** counsel sign-off |

---

## Topics counsel must address before C0 exit

| Topic | Why |
|---|---|
| Patient clinical records on the website database | Product-boundary change |
| Private clinical notes | Confidentiality, access, retention |
| Patient-visible notes | What “sharing” means; consent |
| Clinical documents / object storage | Processors, subprocessors, encryption |
| Retention & deletion / erasure vs integrity | O10; note versioning implications |
| Processors | Host, PostgreSQL, object storage, SMTP, OTP, Twilio/Meta, monitoring |
| Cross-border / residency | O18 |
| WhatsApp / email notifications | Must stay non-clinical by default |
| Access rights | Patient access to shared vs private material |
| Consent artefacts | Registration, privacy ack, clinical-record consent **if** legally appropriate, document handling ack |
| Child/adolescent accounts | Remain DEFERRED — do not mix into Option C V1 |
| Breach notification | Professional + statutory duties |

Do **not** invent legal wording in the application.

---

## Consent surfaces (future — wording OPEN)

| Surface | Status |
|---|---|
| Patient agreement / terms | Exists for Option B registration; Option C needs review |
| Privacy acknowledgement | Same |
| Clinical-record consent | **OPEN** — only if counsel requires |
| Document handling acknowledgement | **OPEN** |
| WhatsApp opt-in | Already Option B concern; still LEGAL REVIEW |

---

## Classification of documentation

| Artifact | Class |
|---|---|
| Phase 2J requirements docs | TECHNICAL DOCUMENTATION |
| `src/data/legal.ts` (current mainline) | LEGAL DOCUMENTATION / **REQUIRES LEGAL REVIEW** |
| PR #9 legal.ts changes | LEGAL DOCUMENTATION / **REQUIRES LEGAL REVIEW** — do not merge as approval |
| This file | REQUIRES LEGAL REVIEW checklist |

---

## Production gate for Option C

Option C is not production-ready until at least:

- legal review  
- privacy review  
- retention decision  
- data residency decision  
- clinical RBAC approval  
- MFA recovery decision (shared with Option B)  
- PostgreSQL production  
- object storage  
- backups + restore  
- monitoring  
- security review  
- staging validation  

Plus Option B production blockers that still apply.

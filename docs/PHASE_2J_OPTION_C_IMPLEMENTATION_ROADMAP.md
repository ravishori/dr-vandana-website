# Phase 2J — Option C Implementation Roadmap

**Status:** FUTURE PLAN ONLY. Do not implement now.  
**Date:** 14 August 2026  

---

## Suggested phases

| Phase | Name | Outcome |
|---|---|---|
| **C0** | Legal + privacy approval | Counsel/BRD/privacy/retention/residency decisions; Option C leaves DEFERRED only after explicit approval |
| **C1** | Clinical schema | PostgreSQL tables PROPOSED in migration blueprint; no UI yet |
| **C2** | Consultation lifecycle | Create/link/close rules after human decisions; no auto-create from Option B booking without approval |
| **C3** | Clinical notes | PRIVATE default; psychologist CRUD; versioning decision applied |
| **C4** | Patient-visible information | Explicit share flows; patient read APIs |
| **C5** | Private document storage | Object storage vendor chosen; signed URLs; upload limits |
| **C6** | Clinical RBAC | Grant clinical permissions to PSYCHOLOGIST only as approved; Super Admin still non-clinical by default |
| **C7** | Clinical audit | Append-only events; no bodies |
| **C8** | Patient consultation portal | History of shared items only |
| **C9** | Psychologist clinical dashboard | Patient list/chart integrating appointments + clinical |
| **C10** | Security testing | IDOR, visibility, signed URL, upload abuse |
| **C11** | Data retention | Implement approved retention/deletion — not before policy |
| **C12** | Staging | Isolated PHI-capable staging |
| **C13** | Production gate | All Option C + Option B blockers green |

---

## Dependency graph

```text
Legal approval (C0)
  → Clinical schema (C1)
  → RBAC grants (C6) ──┐
  → Consultations (C2)─┼→ Notes (C3) → Patient visibility (C4)
  → Object storage ────┴→ Documents (C5)
  → Audit (C7)
  → Patient portal (C8) + Psychologist UI (C9)
  → Security testing (C10)
  → Retention (C11)
  → Staging (C12)
  → Production gate (C13)
```

Notes and documents must not ship to patients before C4/C5 authz and C0 legal.

---

## Explicit non-goals until approved

- Merging PR #9  
- Copying PR #9 store/auth/providers  
- Super Admin clinical access  
- STAFF UI  
- Child accounts  
- Clinical content in Email/WhatsApp/SMS  
- Clinical bodies in audit logs  

---

## Parallel Option B work

Option B production gate closure (Phase 2I) remains independent and still **BLOCKED**. Option C must not be used as a reason to enable registration early.

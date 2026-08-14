# Phase 2J — Option C Threat Model

**Status:** ANALYSIS ONLY.  
**Date:** 14 August 2026  

Assumes future Option C on the **current** Phase 1–2 architecture (PostgreSQL, server sessions, RBAC, outbox, private object storage). PR #9 weaknesses are inputs, not the target design.

| Threat | Description | Mitigation direction |
|---|---|---|
| IDOR | Guess/change consultation, note, document ids | Unguessable public ids; ownership + permission checks; consistent NOT_FOUND policy **OPEN (O17)** |
| Privilege escalation | Patient → psychologist; grant self clinical perms | Server-side role + permission; refuse clinical grants to unauthorized roles |
| Clinical note exposure | Private note returned to patient or leaked | Default PRIVATE; filter every read path; never put body in logs/notify |
| Document exposure | Private file download | Authz before signed URL; no public bucket |
| Signed URL leakage | URL forwarded / logged | Short TTL; no secrets in URL path beyond opaque token; HTTPS; audit minting |
| Public bucket exposure | Misconfigured object storage | Private ACL; monitoring; block public policies |
| Malicious uploads | Malware, polyglots | Allowlist, size limits, magic bytes, optional AV **OPEN** |
| MIME spoofing | Client lies about type | Do not trust `file.type` alone |
| Path traversal | `../` in filenames | Server-generated storage keys only |
| Session theft | Cookie replay | HttpOnly Secure cookies; server sessions; revoke; MFA for privileged |
| Insider access | Staff/Super Admin curiosity | SUPER_ADMIN ≠ clinical; least privilege; audit views |
| Super Admin overreach | “Admin sees all charts” | Forbidden by default; O20 |
| Patient-to-patient access | Cross-account chart | Ownership checks on every resource |
| Psychologist-to-psychologist | Multi-provider leakage | Practice relationship (solo V1 still explicit) |
| Notification leakage | Clinical text in SMS/email/WhatsApp | Generic templates only |
| Audit leakage | Bodies in audit metadata | Strip payloads; schema discipline |
| Backup exposure | Restores contain PHI | Encrypted backups; least privilege restore roles; residency **OPEN** |
| Prototype store revival | Reintroducing SQLite JSON | Reject; gates/docs forbid |

PR #9-specific realizations of several threats are listed in `docs/PHASE_2J_PR9_SECURITY_GAP_MATRIX.md`.

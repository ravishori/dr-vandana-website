# Phase 2J — Document Requirements

**Status:** REQUIREMENTS ONLY. Option C **DEFERRED / BLOCKED**. Object storage vendor **OPEN (O6)**.  
**Date:** 14 August 2026  

---

## PR #9 document behavior

| Aspect | Behavior |
|---|---|
| Upload | Psychologist only → local disk `PRACTICE_DOCUMENT_DIR/{uuid}.bin` |
| Download | `GET /api/practice/documents/[id]` streams bytes after session check |
| Listing | Patient sees `PATIENT_VISIBLE` only; psychologist sees patient chart docs |
| Deletion | Not a first-class product flow |
| Visibility | `PRIVATE` \| `PATIENT_VISIBLE` (default PRIVATE on upload UI) |
| Metadata | title, documentType, mimeType, sizeBytes, storageKey, patientId |
| Size limit | 5 MB (`maxUploadBytes`) |
| MIME allowlist | pdf / jpeg / png / text/plain — **from client `file.type`** |
| Ownership | Patient must match `document.patientId` for patient download |
| Public URLs | None (good concept) |
| Signed URLs | **Absent** — app streams from disk |
| Malware scan | Absent |
| Versioning | Absent |

---

## PR #9 security findings (documents)

| Finding | Severity | Notes |
|---|---|---|
| Local filesystem store | HIGH / CRITICAL for serverless | Unsuitable on Vercel; not a vault |
| Client-supplied MIME trusted | HIGH | MIME spoofing |
| `Content-Disposition` uses title | MEDIUM | CRLF / header injection risk |
| No magic-byte verification | MEDIUM | |
| No malware scanning | MEDIUM | Consideration for future |
| Upload without verifying patient exists | MEDIUM | |
| No object-storage encryption controls | HIGH | |
| Predictable? | LOW | UUID `.bin` names — better than original filenames |

---

## Target architecture (blueprint only)

```text
Patient / Psychologist
  → Authenticated request
  → Role + permission + ownership / practice relationship
  → Server
  → Private object storage
  → Short-lived signed URL
  → Client fetch
```

**Never:**

- Git
- Public web directories
- SQLite / JSON blobs for file bytes
- Permanent public document URLs
- Client-supplied “permission”
- Clinical document names in email/WhatsApp if sensitive (**default: generic notification**)

### Required future controls

| Control | Requirement |
|---|---|
| Private bucket/container | No public ACL |
| Encryption at rest | Vendor/KMS — **OPEN** |
| Signed URLs | Short TTL; single-purpose |
| Server-side authorization | Before minting URL |
| Content-type validation | Allowlist + magic bytes |
| File-size limits | Enforced server-side |
| Safe filenames | Server-generated storage keys; display title sanitized |
| Malware scanning | **OPEN** consideration |
| Audit | upload / view / download / delete / visibility change — no file bytes in audit |
| Versioning | original upload, replacement, version, author, timestamp, deletion status — **PROPOSED** |

Vendor selection remains **OPEN (O6)**. Do not select or provision in this phase.

---

## Classification

| Item | Class |
|---|---|
| Private vs patient-visible docs | A + B |
| Authz before download | A |
| Local disk / `.bin` store | F |
| Streaming from app disk as production vault | F |
| Signed URL pattern | A (reimplement) |
| Object storage vendor | OPEN |

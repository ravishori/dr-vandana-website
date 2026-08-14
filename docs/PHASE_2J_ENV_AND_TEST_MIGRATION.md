# Environment Variables — PR #9 vs Current (Phase 2J)

**Date:** 14 August 2026  
Never copy secrets. Values must not appear in Git.

| Variable (PR #9) | Classification | Notes |
|---|---|---|
| `PRACTICE_STORE` | **REMOVE** | Snapshot store forbidden |
| `PRACTICE_DATABASE_PATH` | **REMOVE** | |
| `PRACTICE_DOCUMENT_DIR` | **REMOVE** | Replace with object-storage config **FUTURE** |
| `PRACTICE_SESSION_SECRET` | **REMOVE** | Use `AUTH_SESSION_SECRET` |
| `OTP_PROVIDER=mock` | **REPLACE** | Current fail-closed OTP; mock forbidden in production |
| `OTP_API_KEY` | **KEEP name / FUTURE** | Still needed when vendor chosen |
| `WHATSAPP_PROVIDER=mock` | **REPLACE** | Current Twilio direction; disabled |
| `WHATSAPP_API_KEY` | **REMOVE** | Use Twilio auth vars |
| `MFA_ISSUER` | **FUTURE / optional** | Current MFA has issuer handling in identity MFA |
| `PRACTICE_RATE_LIMIT_MAX` | **REMOVE** | Decorative in PR #9; use real limiters |
| `PSYCHOLOGIST_LOGIN_*` | **KEEP** for question portal | Practice psychologist uses identity provision |
| `SESSION_SECRET` | **KEEP** question portal | Distinct from practice `AUTH_SESSION_SECRET` |
| `SMTP_*` | **KEEP** | Nodemailer |
| `DATABASE_URL` | **KEEP** (current) | Not in PR #9 practice block |
| `AUTH_SESSION_SECRET` | **KEEP** (current) | |
| `MFA_ENCRYPTION_KEY` | **KEEP** (current) | |
| `PATIENT_REGISTRATION_ENABLED` | **KEEP** false | |
| `TWILIO_*` | **KEEP** (current) | |
| Future object storage keys | **FUTURE** | Vendor-specific; never `NEXT_PUBLIC_` |

---

# Test Migration — PR #9 → Future Option C

| PR #9 assertion theme | Classification |
|---|---|
| Register + email verification queued | KEEP REQUIREMENT — already covered by Phase 1 tests |
| Duplicate email handling | KEEP REQUIREMENT — Phase 1 |
| OTP accept/expire | KEEP REQUIREMENT — Phase 1; discard `devCode` UX |
| Double-book prevention | KEEP REQUIREMENT — Phase 2 PG exclusion tests authoritative |
| Patient denied PRIVATE notes | KEEP REQUIREMENT + SECURITY TEST NEEDED in C10 |
| Patient allowed PATIENT_VISIBLE | KEEP REQUIREMENT |
| Session HMAC round-trip | **DISCARD** — wrong session model |
| TOTP verify | KEEP REQUIREMENT — Phase 1 MFA tests |
| Document IDOR | **SECURITY TEST NEEDED** (missing in PR #9) |
| OTP-by-userId abuse | **SECURITY TEST NEEDED** (must never regress) |
| MIME spoofing | **SECURITY TEST NEEDED** |
| Signed URL expiry | **SECURITY TEST NEEDED** (future) |
| Clinical body absent from notifications | **SECURITY TEST NEEDED** |
| Super Admin lacks clinical perms | KEEP — already in Phase 1 tests |

Prototype tests do **not** establish production security.

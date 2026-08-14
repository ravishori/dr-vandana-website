# Phase 2J — PR #9 Security Gap Matrix

**Date:** 14 August 2026  
**PR #9:** draft `cursor/patient-practice-management-a302` @ `eef4613`  
**Current architecture:** Phase 1–2 on `cursor/patient-practice-phase2-appointments-d73b`

Severities are for the **prototype as written**, not exaggerated. Prototype tests do not close these gaps.

| Finding | Severity | PR #9 Behavior | Current Phase 2 Behavior | Required Future Fix | Status |
|---|---|---|---|---|---|
| Unauthenticated OTP send/verify by `userId` | CRITICAL | Public actions take UUID; registration links `?userId=` | OTP bound to authenticated/verify flows; IP rate-limit before lookup | Never accept bare userId OTP without proof of session/email-verify step | OPEN for Option C design; **do not port** |
| Auth tokens stored in notification bodies | CRITICAL | Verify/reset URLs with raw tokens in `NotificationRecord.body` | Tokens hashed at rest; emails sent via SMTP abstraction; not stored as raw token bodies in outbox | Keep hash-only at rest; outbox non-sensitive | Do not port |
| MFA secret plaintext (`mfaSecretEnc`) | CRITICAL | Secret stored unencrypted | `mfa_credentials` encrypted with `MFA_ENCRYPTION_KEY` | Keep encryption; refuse missing key | Do not port |
| Login without email/mobile verification | HIGH | Full portal after password | Activation requires email + mobile verify before login | Keep Phase 1 gates | Do not port |
| MFA optional + broken `assertPsychologist` | HIGH | `mfaVerified false` still allowed for psychologist services | MFA mandatory for PSYCHOLOGIST / SUPER_ADMIN | Keep mandatory MFA | Do not port |
| MFA enabled before TOTP confirm | HIGH | Secret returned; flag set early | Enrollment begin/confirm with encrypted secret | Keep confirm ceremony | Do not port |
| OTP `devCode` to client | HIGH | Returned when mocked outside production | Test OTP refused in production | Keep fail-closed | Do not port |
| Rate limit config unused | HIGH | `PRACTICE_RATE_LIMIT_MAX` unused | Identity/OTP/appointment rate limits exist | Reuse Upstash/app limits | Do not port decorative env |
| Always-mock OTP/WhatsApp | HIGH | Providers always Mock; can “succeed” as MOCKED | Production mocks forbidden; Twilio disabled; OTP adapter unimplemented | Keep fail-closed | Do not port |
| SQLite JSON snapshot PHI store | HIGH | Full clinical DB in one TEXT blob | PostgreSQL normalized schema | Never use snapshot store | REJECT |
| Local document directory | HIGH | `data/practice-documents` | No clinical docs | Private object storage + signed URLs | OPEN (O6) |
| Client MIME trusted | HIGH | `file.type` allowlist only | N/A (no uploads) | Magic bytes + allowlist | Required in C5 |
| Document title in Content-Disposition | MEDIUM | Unsanitized title | N/A | Sanitize / use storage key filename | Required in C5 |
| Upload without patient existence check | MEDIUM | Accepts any patientId | N/A | FK + existence | Required in C5 |
| Stateless HMAC session (no revoke) | MEDIUM | Cookie-only | Server-side `sessions` + revoke | Keep server sessions | Do not port |
| Cookie path `/` | LOW | Over-broad | Practice session cookie scoped by design | Keep current cookie policy | — |
| Password min length 10 | LOW | Weaker than preferred | Stronger registration rules in Phase 1 | Keep Phase 1 policy | — |
| Sequential-ish public ids | LOW | Short UUID slices / seq patient ids | CSPRNG `PAT-` / `APT-` | Keep CSPRNG | Do not port |
| `RESCHEDULED` as durable status | MEDIUM (domain) | Diverges from Phase 2 | History-only `RESCHEDULED` | Keep Phase 2 state machine | Do not port |
| Patient cancel/reschedule UI unwired | INFORMATIONAL | Incomplete UX | Phase 2E implements patient cancel + request-reschedule | Prefer Phase 2 UX | — |
| No Super Admin role | INFORMATIONAL | Absent | Present; non-clinical | Keep Super Admin boundary | — |
| Legal copy updated in PR as if approved | MEDIUM (governance) | Claims Option C selected | Option C DEFERRED; legal still informational | Counsel review before any Option C launch | E |
| Document IDOR tests missing | MEDIUM | Notes visibility tested; docs less so | Strong appointment IDOR tests | Add document/note IDOR suite in C10 | Required later |
| Audit may be mutable in snapshot | MEDIUM | App-level array | Append-oriented `audit_logs` + future triggers | Append-only | Required in C7 |

Overall: **PR #9 must not be merged.** Useful visibility and booking concepts are requirements only.

# Crisis Resource Governance

Internal policy for the Mental Health Support & Emergency Help directory on
drvandana.trinetra.net.

## Purpose

Provide accurate, source-verified emergency and helpline information for public
safety. This website is a directory and educational platform — it does **not**
operate ERSS 112, Tele-MANAS, Child Helpline, or other external services.

## Source hierarchy (preferred order)

1. Government of India
2. State Government
3. Government department
4. Government hospital / institution
5. Statutory / autonomous government organization
6. Recognized authorized organization
7. Established mental-health organization (last resort; still requires source URL)

Never publish numbers copied from blogs, social media, Reddit, SEO lists, or
user-submitted directories without an official source.

## Verification procedure

1. Locate the official page or gazette/document.
2. Confirm the number, purpose, and coverage wording.
3. Record `officialSourceUrl`, authority, and notes.
4. Set `sourceVerifiedAt` and `nextVerificationDueAt` (30 days for emergency /
   crisis numbers; up to 90 days for slower-changing institutional links).
5. Set status `VERIFIED` and `isActive` only after human review.
6. An audit row is written on status/phone/source changes.

## Who may approve

Until multi-role auth exists, only authenticated Psychologist Portal sessions
(`PSYCHOLOGIST` role) may create or edit crisis records. This is the temporary
equivalent of `MANAGE_CRISIS_RESOURCES`.

## When a number stops working

1. Mark `NEEDS_REVIEW` or `SUSPENDED`.
2. Set `isActive` false so it leaves the public page.
3. Document findings in verification notes and history.
4. Do not auto-delete historical audit rows.

## Overdue verification

Admin tools can flag overdue `VERIFIED` records to `NEEDS_REVIEW`. Do not
auto-deactivate solely because a due date passed unless the practice later
adopts a stricter policy.

## Privacy principles

- No account required to browse the public directory.
- Do not store visitor crisis-search history.
- Avoid sensitive analytics event names (for example `user_searched_suicide`).
- Do not claim confidentiality for third-party helplines.

## Crisis content safety

- No suicide methods, lethality comparisons, or graphic detail.
- Prefer calm, non-judgmental language.
- Escalate: immediate danger → 112; mental-health crisis → Tele-MANAS; child
  protection → 1098; then trusted person / emergency department as appropriate.
- AI chatbot crisis responses must stop normal educational flow and point to
  verified help — never claim to keep the person safe or replace emergency care.

## Local (Mumbai / Maharashtra) expansion

State/district fields exist for future use. Do not invent local hospital numbers.
Each local resource needs its own official source and verification record.

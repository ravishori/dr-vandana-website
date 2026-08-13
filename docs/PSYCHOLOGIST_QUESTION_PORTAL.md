# Psychologist Question Review Portal

Private question submission and review for Dr. Vandana Rajiv Chaudhary's practice.

This is **not** an emergency service, diagnosis tool, or public Q&A feed. Submitted questions stay private until a psychologist explicitly handles them.

## Workflow

Visitor → `/ask-a-question` → server validation → secure store → notification email (no question body) → Psychologist Portal → review / draft / email reply / archive.

## Storage

There was no existing database. This feature adds a repository, not a migration of current data.

| Mode | When |
| --- | --- |
| `sqlite` | Local / Node hosts with a persistent disk (`QUESTION_DATABASE_PATH`) |
| `upstash` | Production when Upstash Redis is already configured |
| `memory` | Tests only (rejected in production) |

Production without Upstash and without an explicit sqlite path **fails closed**.

Schema (SQLite): `question_submissions`, `question_fingerprints`, `question_audit_events`. See `src/lib/question-portal/sqlite-store.ts`.

Public URLs use `public_reference_id` (for example `QV-…`), never internal sequential IDs.

## Authentication

Single psychologist login (role `PSYCHOLOGIST`). No second auth system was added on top of an existing one — the site had none.

Generate a password hash (do not commit the password):

```bash
npx tsx scripts/hash-psychologist-password.ts 'your-long-password'
```

Required environment:

- `PSYCHOLOGIST_LOGIN_EMAIL`
- `PSYCHOLOGIST_PASSWORD_HASH`
- `SESSION_SECRET` (at least 32 characters)

Sessions are HMAC-signed httpOnly cookies (8 hours). Middleware plus every server action re-check authorization.

## Email

Reuses existing SMTP (`SMTP_*`, `APPOINTMENT_TO_EMAIL`).

- `QUESTION_NOTIFICATION_EMAIL` optional override for new-question notices
- `APP_BASE_URL` for the portal link in that notice

Notification mail includes reference, category, and time — **not** the question text.

Response mail is sent only after an explicit confirm step, only if an email exists, and never includes internal notes.

## Routes

| Path | Access |
| --- | --- |
| `/ask-a-question` | Public form |
| `/psychologist/login` | Login |
| `/psychologist` | Dashboard |
| `/psychologist/questions` | Filtered list |
| `/psychologist/questions/{reference}` | Review |

`/psychologist` is disallowed in `robots.ts` and marked `noindex`.

## Future AI drafts

`createAiAssistedDraft` can prepare an **educational draft for psychologist review** using the existing Ask Dr. Vandana AI pipeline. It never auto-sends, never publishes, and is labelled as requiring review.

Publication status (`PRIVATE` → `PENDING_APPROVAL` → `APPROVED_FOR_PUBLICATION`) is stored so de-identified educational Q&A can be added later. Nothing is auto-published.

## Local setup

1. Copy `.env.example` values into `.env.local`
2. Hash a password and set the three auth variables
3. Leave `QUESTION_STORE` unset for local sqlite (`data/question-portal.sqlite`, gitignored)
4. `npm run dev` and open `/ask-a-question` and `/psychologist/login`

## Tests

```bash
npm test
```

Includes public validation, storage of untrusted input, unauthorized access, IDOR prevention, status transitions, password hashing, and session forgery.

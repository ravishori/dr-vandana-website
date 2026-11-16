# Legacy Question Portal - Isolation Findings and Retirement Implications

Scope: `src/lib/question-portal`, `src/components/question-portal`, `src/app/ask-a-question`, `src/app/psychologist/questions`, `src/config/question-portal.ts` on the Lineage B tip (`9a87deb`). Read-only analysis; nothing was changed, deleted or migrated. **No existing record may be deleted without owner approval.**

## What it is
A public "ask a question" form for website visitors and a psychologist inbox. It is not part of the identity system and not a clinical channel.

## Data it collects (type `QuestionSubmissionRecord`, `QuestionStore` tables `question_submissions`, `question_fingerprints`, `question_audit_events`)
Name (optional), email (optional), question free text (up to 4,000 characters by default), category, preferred response method, consent flag, status, priority (LOW/NORMAL/HIGH, set by the doctor), psychologist response, internal notes, AI-assisted draft, publication status, reviewer, timestamps. Visitors can type health information into the free text. These are **visitor enquiries, not clinical records**.

## Access and authentication
- One env-configured account (`PSYCHOLOGIST_LOGIN_EMAIL`, `PSYCHOLOGIST_PASSWORD_HASH`, `SESSION_SECRET`), stateless HMAC cookie (`drvandana_portal_session`, 8 hours), **no MFA, no server-side revocation, no per-record access log**. The same session also protects the crisis-resource directory admin.
- Login failures are rate limited; registration of other users is not possible.

## Storage and retention
- Store resolves to memory, SQLite file (`data/question-portal.sqlite`, git-ignored) or Upstash Redis (`QUESTION_STORE`, auto-selects Upstash when its URL/token exist). **Which store a deployed environment uses is NOT VERIFIED** (no hosting access). A SQLite file on a serverless host is not durable.
- No retention, purge or export logic exists in the code.
- Production lineage (`e5183d3`) does not contain this portal at all, so no production data exists unless Lineage B was deployed with a configured store (its own docs describe a 2026-08-31 CLI deployment; whether the portal was used is NOT VERIFIED).

## Outbound processing
- Email: a notification to the practice contains no question text; a reply email to the visitor contains the doctor's response (SMTP).
- **AI-assisted draft** (`ai-draft.ts`): sends a PII-stripped version of the visitor's question to the AI pipeline, which uses an external provider when one is configured. This conflicts with the principle of no external AI processing of anything that may be clinical. It is optional and doctor-triggered, but the owner should decide whether it stays.

## Coupling found (verified by import scan)
- `src/lib/identity/*` imports `hashPassword`/`verifyPassword` from `@/lib/question-portal/password` (8 files). The portal must be retired only after those helpers move to the identity module.
- `src/middleware.ts` reads the portal session token; `src/lib/crisis/service.ts` uses the portal's session type.
- The portal itself imports **nothing** from identity, appointments, notifications, practice, intake or clinical-access (verified).

## Isolation implemented in this PR
`src/lib/clinical-access/legacy-isolation.test.ts` fails the build if (1) any clinical, intake, appointment, notification, practice or patient-portal file imports the portal, (2) the portal imports any of those, (3) identity imports anything from the portal other than the password helper, or (4) the AI-draft helper is used outside the portal and its admin actions. This keeps visitor free text from entering clinical records or the new patient portal by code path. It is not a runtime control.

## Not done (needs owner approval)
Disabling the form or login, deleting or exporting data, moving the password helpers, removing the AI draft, adding retention.

## Retirement and migration implications (for decision)
1. Inventory the live store and count records (read-only, with owner authorisation).
2. Decide retention for visitor enquiries and any export to the owner; legal review for health information in free text.
3. Replies already sent by email exist outside the portal.
4. Do not migrate visitor questions into patient profiles, intake or clinical records; if a visitor becomes a patient, the practice records that through the normal process.
5. Crisis directory admin currently depends on the same session; it needs its own protected login before the portal is switched off.
6. Remove or relocate the password helpers, update middleware, then retire the routes behind a feature flag before deleting code.
7. Update the privacy policy if the form is kept (existing mismatches already flagged).

## Decisions for the owner
Keep, freeze or retire the form; keep or remove the AI-assisted draft; who may export or delete stored enquiries and when; retention period; replacement for crisis-directory admin login.

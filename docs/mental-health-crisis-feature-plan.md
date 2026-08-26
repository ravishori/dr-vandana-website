# Mental Health Crisis Directory — Implementation Plan

## Existing architecture (audit)

| Area | Finding |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 |
| Backend | Next.js Route Handlers + Server Actions (no separate API framework) |
| Database | No shared ORM/CMS. Question portal uses repository pattern: SQLite (`node:sqlite`) / Upstash Redis / memory |
| Auth | Psychologist portal session cookie (`drvandana_portal_session`), single role `PSYCHOLOGIST` |
| Admin | `/psychologist/*` dashboard for question review |
| Content | Typed modules under `src/data/*` (no MDX blog CMS yet) |
| SEO | Per-page `metadata` + `sitemap.ts` / `robots.ts` |
| Emergency today | Placeholder `src/data/emergency.ts` + `EmergencyBoundary`; AI canned crisis text without specific Indian helpline numbers |
| Design | Brand tokens (sage/teal), `Container`/`Section`/`ButtonLink` |

## Design decisions

1. **Reuse** psychologist auth for crisis admin — no second login. Document that finer `MANAGE_CRISIS_RESOURCES` permission can be added when multi-role auth exists; currently only `PSYCHOLOGIST` sessions may mutate crisis records.
2. **Storage** mirrors question portal: `CRISIS_STORE` = sqlite | upstash | memory, with **static verified fallback** for public page if the store fails (112 / Tele-MANAS / 1098 only).
3. **Public route:** `/mental-health-support`
4. **Admin route:** `/psychologist/crisis`
5. **Seed only verified GoI resources** as `VERIFIED`. NCW helpline seeded as `NEEDS_REVIEW` (not public) until human re-checks `ncw.gov.in`.
6. **Do not** scrape helpline lists. Unverified candidates go in `docs/crisis-resource-research-todo.md`.
7. Update footer / stress emergency boundary / AI crisis canned answers to link to the directory and cite 112 + Tele-MANAS without claiming the practice operates those services.

## Files to add

- `docs/mental-health-crisis-feature-plan.md` (this file)
- `docs/crisis-resource-governance.md`
- `docs/mental-health-crisis-feature-qa.md`
- `docs/crisis-resource-research-todo.md`
- `src/types/crisis.ts`
- `src/data/crisis/seed.ts` (+ static fallback)
- `src/lib/crisis/*` (schema, repository, stores, service)
- `src/app/mental-health-support/page.tsx`
- `src/components/crisis/*`
- `src/app/psychologist/crisis/*`
- `src/lib/crisis/*.test.ts`

## Files to modify

- `src/config/navigation.ts` — Get Help Now + footer link
- `src/data/emergency.ts` — verified messaging, link to directory
- `src/data/stress-wellness.ts` / `EmergencyBoundary` consumers
- `src/components/layout/SiteFooter.tsx`
- `src/lib/ai/safety/canned.ts` — crisis panel with tel links + directory URL
- `src/app/sitemap.ts`
- `src/data/legal.ts` — privacy note on external helplines
- `.env.example`
- `package.json` test script
- Psychologist nav + dashboard summary

## Database

New SQLite tables (when `CRISIS_STORE=sqlite`):

- `crisis_resources` (id, slug, payload JSON)
- `crisis_resource_verifications` (audit trail)
- `crisis_resources_meta`

Upstash keys under `drvandana:crisis:*`.

No migration of existing production clinical data.

## Security

- Mutations only via server actions after `getPsychologistSession()`
- HTTPS-only official URLs
- Public list = `VERIFIED` + `isActive`
- Descriptions rendered as text (no HTML)

## Rollback

Remove `/mental-health-support` route and nav links; restore previous `emergency.ts` placeholder; leave SQLite/Upstash data unused.

## Testing

Unit tests for list/filter, auth, verification transitions, URL validation, fallback, XSS-as-text. Run existing AI + portal tests unchanged.

# Content CMS — Phase 0 Implementation Assessment

**Branch:** `cursor/content-cms-blogs-resources-videos-be7a`  
**Base:** `feature/dr-vandana-production-5d` (`0ad6093`)  
**Date (UTC):** 2026-08-26

## Existing functionality

- Next.js 16 App Router + Tailwind design tokens; calm sage visual system
- Static typed copy under `src/data/` (no CMS)
- Navigation already reserves disabled `/resources`
- Appointment Server Actions + Zod validation pattern
- Upstash Redis available (rate limiting)
- No blog, videos, editorial CMS, rich-text editor, or site-admin auth on production base
- Wellness Assistant FastAPI/admin tables are a **separate** clinical system — not reused for website content editing
- Prior WIP on `cursor/mental-wellness-resource-library-a302` (resources + psychologist portal) is reference-only; not merged into production

## Reusable components

- `Container`, `Section`, `ButtonLink`, `SiteShell`, navigation config
- Metadata / sitemap / robots patterns
- Zod validation + Server Actions style
- Theme tokens (no second design system)

## Missing functionality (this milestone)

- Articles / Resources / YouTube content models + persistence
- Public `/blog`, `/blog/[slug]`, `/resources`, `/videos`
- Admin Content dashboard with CRUD, publish/unpublish/archive
- Content-admin authentication (separate from Wellness Assistant)
- Safe URL validation, YouTube ID extraction, XSS-safe article rendering
- SEO for published articles; sitemap entries for published content only
- Tests for auth boundaries and validation

## Required data / API approach

- **Next.js-native CMS** (marketing site deployable without FastAPI)
- Persistence adapters: memory (tests/dev fallback), file JSON (`data/cms/`), Upstash Redis when configured
- Admin mutations via authenticated Server Actions / Route Handlers only
- Public APIs/pages return **published** content only

## Required frontend changes

- Enable nav links for Blog, Resources, Videos
- Public listing + detail UI
- `/admin/content` dashboard and editors
- CSP updates for YouTube nocookie embeds + optional https image thumbs

## Risks / compatibility

- Do not grant content admins access to Wellness Assistant transcripts
- Do not invent credentials, affiliations, YouTube URLs, or testimonials in seed data
- Domain remains as configured in `siteConfig` (no silent domain change)
- File store is for local/dev; production should set Upstash or accept seed-memory read path until configured
- Untracked `backend/` leftovers from other branches must not be committed on this branch

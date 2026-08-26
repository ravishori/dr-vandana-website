# Content CMS

See `docs/cms/IMPLEMENTATION_ASSESSMENT.md` for Phase 0 audit notes.

## Public routes

- `/blog` — published articles
- `/blog/[slug]` — article detail
- `/resources` — published external resource links
- `/videos` — published YouTube library

## Admin

- `/admin/content/login`
- `/admin/content` — dashboard
- `/admin/content/articles`
- `/admin/content/resources`
- `/admin/content/videos`

Configure credentials via `.env.cms.example` variables.

Draft/archived content is never returned by public listing helpers.

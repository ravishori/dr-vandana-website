# Counselling FAQ — Implementation Plan

## Architecture (audit)

| Area | Finding |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, Tailwind 4 |
| Existing counselling page | `/psychology/counselling` is an AI SEO topic page — leave intact |
| Emergency | Verified crisis directory at `/mental-health-support` + `listPublicCrisisResources` |
| Design | Shared `Container`/`Section`/`ButtonLink`, sage/teal brand tokens |
| Analytics | No marketing analytics tracker present — FAQ search stays client-side only |
| Appointment | Existing `/book-appointment` and `/contact` |

## Decisions

1. **Route:** `/understanding-counselling` (avoids clobbering `/psychology/counselling`)
2. **FAQ content:** typed static module under `src/data/counselling-faq` (no new CMS)
3. **Search/filter:** client-side only — no server logging of query text
4. **Emergency numbers:** load only `VERIFIED`+active crisis resources (same source as crisis directory); never hard-code alternate numbers in FAQ UI
5. **Nav:** footer + primary “FAQ” label; link from stress/child emergency CTAs already exist separately

## Files

- `src/types/counselling-faq.ts`
- `src/data/counselling-faq/*`
- `src/lib/counselling-faq/*`
- `src/components/counselling-faq/*`
- `src/app/understanding-counselling/page.tsx`
- Nav, sitemap, light internal links
- Tests + short QA note in `docs/counselling-faq-qa.md`

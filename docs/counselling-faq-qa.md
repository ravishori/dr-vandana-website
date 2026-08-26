# Counselling FAQ — QA

## Implemented

- Route: `/understanding-counselling`
- Hero, How Counselling Works (5 steps), searchable/filterable FAQ accordion
- Related questions, empty state, confidentiality notice, calm closing CTA
- Emergency card uses **only** verified public crisis resources (112, Tele-MANAS, 1098)
- Client-side search only (no analytics of query text)
- FAQPage JSON-LD for visible non-emergency FAQs
- Nav: primary “FAQ”; footer “Understanding Counselling”

## Content

- **27** published FAQ entries (24 core + online + when-to-seek + emergency)
- Categories from the product brief (only categories with content appear in chips)
- Governance metadata present in data model (not shown publicly)

## Tests

- `src/lib/counselling-faq/search.test.ts`
- Full suite + typecheck + build required before merge

## Professional review needed

- Dr. Vandana should review educational wording before treating as final clinical communication
- Online counselling availability wording is intentionally cautious — confirm current practice options
- Confirm any practice-specific session logistics not covered in the brief

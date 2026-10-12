# Psychology Content Governance

This directory is the editorial source of truth for Dr. Vandana's psychology content planning. It is documentation-only; it does not implement or activate publishing integrations.

## Start here

1. Read [CONTENT_STRATEGY.md](CONTENT_STRATEGY.md) for editorial principles.
2. Read [CONTENT_SECTIONS.md](CONTENT_SECTIONS.md) before assigning content to a series.
3. Search and update [CONTENT_REGISTRY.md](CONTENT_REGISTRY.md) before proposing or drafting a topic.
4. Apply [TOPIC_DEDUPLICATION_RULES.md](TOPIC_DEDUPLICATION_RULES.md) to exact and conceptual overlap.
5. Update [EDITORIAL_CALENDAR.md](EDITORIAL_CALENDAR.md) when a topic is approved, reserved, scheduled or published.
6. Follow [NEWSLETTER_STRATEGY.md](NEWSLETTER_STRATEGY.md) for the proposed *The Psychology Compass* series.

## Minimum workflow

**Check → compare → reserve → draft → clinical/editorial review → publish → reconcile registry.**

Never infer a publication date, public URL, approval or publication status. Use `Unknown` or `Needs verification` until evidence is available. Keep source links and dates only when verified.

## Status vocabulary

- **proposed** — an idea for consideration; not approved or reserved.
- **reserved** — approved topic temporarily held for a named section/issue.
- **draft** — content is being written or edited.
- **in_review** — awaiting scientific, clinical or editorial approval.
- **planned** — approved for future publication; schedule may still need confirmation.
- **published** — publication verified with an actual date and canonical URL or platform record.
- **retired** — intentionally withdrawn from future use.
- **unverified** — a legacy/existing item is known from project discussion, but its current state or publication evidence is missing.

Status changes must be evidence-based. A scheduled post is not considered published until publication is confirmed.

## Registry conventions

- IDs are permanent and unique: `PSY-001`, `PSY-002`, etc. Never reuse an ID.
- Normalize topic titles in sentence case and record meaningful synonyms in related concepts.
- Use ISO dates (`YYYY-MM-DD`) when known; otherwise write `Unknown`.
- Use `Unknown` for unavailable URLs, channels, dates or owners; do not invent values.
- Record a distinct core question and reader outcome for every topic.
- Platform versions of one article are variants, not automatically new topics.
- The registry is manually maintained Markdown. It does not currently perform automated semantic search or block publication.

## Source-of-truth boundaries

- This directory governs editorial planning and deduplication.
- The website repository's technical documentation governs engineering architecture.
- The separate `dr-vandana-social-publisher` project is a publishing prototype. Its documented WhatsApp capability is a placeholder pending verification of supported official APIs; this directory does not imply live integration.
- Keep clinical approval, platform permissions, scheduling and actual publication evidence explicit.

## Before closing a content task

Confirm that the registry, calendar and article/variant links agree; scientific review is recorded; channel-specific copy is approved; and no publication status is claimed without evidence.

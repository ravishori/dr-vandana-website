# Topic Deduplication Rules

## Objective

Prevent exact repetition and materially overlapping psychology content across series, blogs, campaigns, newsletters and platform variants—without blocking useful deeper explanations or distinct applications.

## Required pre-draft check

Before a new topic is reserved or drafted:

1. Search `CONTENT_REGISTRY.md` for the exact title and normalized keywords.
2. Search aliases, synonyms and neighbouring concepts.
3. Compare the reader problem, central question, audience, evidence and intended outcome.
4. Check proposed, reserved, draft, in-review, planned, published and unverified records—not only published posts.
5. Record the nearest existing topic IDs and the decision in the candidate row or editorial notes.
6. If overlap is unclear, pause and request editorial review rather than silently creating a second item.

## Exact duplicate

Treat a candidate as an exact duplicate when it has substantially the same topic, central question and reader outcome as an existing record, even if the wording or title differs.

Examples:
- “Ways to stop overthinking” and “How to reduce overthinking” are likely duplicates if both give the same general advice.
- The same article republished as Facebook and WhatsApp variants is one master topic with separate channel variants, not two topics.

**Default action:** Update or repurpose the existing record; do not allocate a new topic ID.

## Semantic overlap

Score the candidate against the closest existing item across these dimensions:

| Dimension | Questions |
|---|---|
| Reader need | Is the same person trying to solve the same problem? |
| Core question | Would both articles answer essentially the same question? |
| Main concepts | Are the mechanisms, examples and claims substantially the same? |
| Practical outcome | Would readers receive the same advice or takeaway? |
| Audience/context | Is the setting materially different, such as workplace vs. parenting? |
| Depth/purpose | Is this a genuinely different learning outcome, or merely a longer rewrite? |

This is a qualitative editorial check, not a validated numerical or AI similarity score.

### Decision rules

- **High overlap:** Same reader need + substantially same core question + same practical outcome. Reject as a new topic, merge, or treat as a variant.
- **Moderate overlap:** Shared concepts but a potentially distinct context, question or outcome. Keep as `proposed` until the distinction is written down and approved.
- **Low overlap:** Different core question and reader outcome, with sufficient evidence and practical distinction. It may proceed to reservation.
- **Related concepts:** Shared vocabulary alone is not enough to reject a topic. Record the relationship and explain the distinction.

## Required distinction statement

For a related topic to proceed, document:
- Existing topic ID(s).
- New audience or context, if different.
- New central question.
- What evidence or explanation is added.
- Different practical outcome.
- Why a reader would benefit from both pieces.

If these cannot be stated clearly, do not create a separate topic.

## Cross-section examples

- A five-minute explainer defining rumination and a long blog on coping with persistent rumination may coexist only if the blog adds a meaningfully different purpose, depth and practical outcome. Link the records.
- “Phone checking habits” overlaps strongly with “mobile addiction/problematic smartphone use.” It must not proceed as a separate article until the core question and outcome are explicitly narrowed.
- A general article on emotional boundaries and a workplace-specific guide to assertive boundary-setting may coexist if their audience, scenarios and takeaways materially differ.
- A weekly newsletter may curate or expand an existing article. Record the source ID and treat the newsletter as a distribution/editorial variant unless it has a genuinely distinct central question.

## Reservation and release

- Reservation is provisional and must include a section, owner or responsible editor, and review/target date when known.
- Never invent dates. Use `Unknown` if not provided.
- If a reservation is abandoned, change the status to `retired` or `proposed` with a note; do not delete its ID.
- Before publication, rerun the overlap check against newly added records.
- After publication, record the actual date, URL and channels from verified evidence.

## Quality control

A second reviewer should resolve high-impact or ambiguous overlaps. The reviewer must not rely only on title similarity or an automated score. Clinical/scientific review remains separate from deduplication: a unique topic can still contain inaccurate or unsafe claims.

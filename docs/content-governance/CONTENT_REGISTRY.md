# Master Psychology Content Registry

This is the manually maintained index of topics across all psychology sections and channels. Search this file before proposing, reserving, drafting, or scheduling content. It is an editorial record—not a claim that every listed item is live.

## Registry field definitions

- **ID:** Permanent unique identifier; never reuse.
- **Normalized topic:** Canonical topic wording for comparison.
- **Core question:** The specific reader question the content answers.
- **Reader outcome:** What the reader should understand or be able to do.
- **Related concepts / aliases:** Synonyms and concepts that may create overlap.
- **Primary section:** One section from `CONTENT_SECTIONS.md`.
- **Status:** Use the controlled vocabulary in `README.md`.
- **Created / planned / published dates:** ISO date or `Unknown`; do not infer.
- **Channels:** Actual or intended destinations; distinguish them.
- **Canonical URL / source record:** Verified URL or `Unknown`.
- **Evidence / notes:** Source of the record, overlap risks and outstanding verification.

## Topic records

| ID | Normalized topic | Core question / reader outcome | Related concepts / aliases | Primary section | Status | Created date | Planned date | Published date | Channels | Canonical URL / source record | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PSY-001 | Mobile addiction / problematic smartphone use | What patterns of phone use are being discussed, and what practical strategies may help readers manage them? Final framing must be checked against the actual article. | Mobile addiction, smartphone overuse, screen habits, phone checking | Practical Psychology Blogs (provisional; confirm section) | unverified | Unknown | Unknown | Unknown | Unknown; Facebook poster/article work was discussed, actual publication not verified | Unknown | Topic evidenced by project conversation titled “Mobile Addiction Blog status”; the inspected repository tree did not contain article source or publication proof. Verify exact title, section, article file, status, date and URL before treating as published. |
| PSY-002 | Understanding overthinking | Why can a person get stuck replaying thoughts, and what evidence-informed strategies may help? | Rumination, repetitive negative thinking, worry (not identical constructs) | The Psychology Compass (candidate) | proposed | Unknown | Unknown | Unknown | Not assigned | Unknown | Suggested as a candidate topic in planning discussion; not approved or scheduled. |
| PSY-003 | Emotional boundaries | How can people communicate limits while maintaining relationships and respecting their own needs? | Boundaries, assertiveness, interpersonal limits | The Psychology Compass (candidate) | proposed | Unknown | Unknown | Unknown | Not assigned | Unknown | Suggested candidate; not approved or scheduled. |
| PSY-004 | Repeated phone checking | What cues and habits prompt repeated checking, and what changes might interrupt the habit? | Smartphone habits, notifications, checking behaviour, mobile addiction | The Psychology Compass (candidate) | proposed | Unknown | Unknown | Unknown | Not assigned | Unknown | **High overlap risk with PSY-001. Do not reserve or draft until the editor confirms a distinct core question and outcome**, or decide to treat it as a subtopic/variant of PSY-001. |
| PSY-005 | Emotional resilience | How can people respond constructively to everyday setbacks, and what factors support coping? | Coping, adaptation, recovery after stress | The Psychology Compass (candidate) | proposed | Unknown | Unknown | Unknown | Not assigned | Unknown | Suggested candidate; broad topic needs narrowing before reservation. |

## Series and campaign records needing reconciliation

These are programme-level planning references, not individual topic records. They must not be counted as published articles.

| Series / campaign | What is known | Status / verification required |
|---|---|---|
| Psychology Every Day | A monthly topic plan was discussed in project conversations. The exact topic list was not found in the inspected website repository. | Needs verification. Import the actual list and individual topic records before planning more posts. |
| October Mental Health Awareness & Listening Journey 2026 | Project context reports posts scheduled for October 6–31, 2026. Individual titles, schedule export and publication records were not present in the inspected website repository. | Needs reconciliation against the social publisher/scheduling source. Do not infer individual topics or that posts have already published. |
| The Psychology Compass | Proposed weekly psychology newsletter. No implementation or publication proof found in the inspected website repository. | Proposed; see NEWSLETTER_STRATEGY.md. |

## Adding a new record

1. Search exact wording and aliases in this file.
2. Search related concepts and the same reader problem in every section.
3. Read `TOPIC_DEDUPLICATION_RULES.md` and record the comparison.
4. Allocate the next unused ID.
5. Add the row with status `proposed` or `reserved`; do not mark it `planned` until approved.
6. Add a matching calendar entry and update it as status changes.
7. After publishing, add the verified date, actual channels and canonical URL/post reference.

## Registry maintenance log

| Date | Change | Evidence / owner |
|---|---|---|
| 2026-10-12 | Initial governance registry created from repository inspection and available project context. Existing publication details remain unverified where evidence was unavailable. | Repository tree and project discussion; editorial owner to confirm. |

## Known limitation

This Markdown registry has no automated search index, semantic similarity service, validation script or publishing lock. Deduplication currently depends on human review and disciplined updates. Do not claim that the registry guarantees zero duplication.

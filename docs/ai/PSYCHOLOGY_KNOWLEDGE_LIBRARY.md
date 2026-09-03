# Psychology Knowledge & Evidence Library

Architecture for the Ask Dr. Vandana AI **Psychology Knowledge & Evidence Library**.

> **Important:** The initial evidence library (Phase 3) is a **controlled pilot**, not an exhaustive psychology knowledge base. The University of Mumbai M.A. Psychology syllabus is an **internal coverage reference only**. Dr. Vandana's website does not represent the University of Mumbai and does not provide its courses or syllabus.

## Purpose

The library will eventually allow Ask Dr. Vandana AI to answer psychology education and mental-wellness questions using relevant, trustworthy sources such as:

1. Authoritative public-health and professional guidance
2. Peer-reviewed research
3. Systematic reviews and meta-analyses
4. Recognized psychology textbooks and handbooks (metadata and permitted excerpts only)
5. Carefully reviewed educational resources
6. Dr. Vandana's own approved educational and professional content

Core principle:

```
QUESTION → RELEVANT PSYCHOLOGY KNOWLEDGE → GROUNDED ANSWER
```

Never:

```
QUESTION → UNRELATED DOCUMENT → GENERIC/FALLBACK ANSWER
```

## Architecture overview

```
src/types/ai.ts                          — KnowledgeDocument, source tiers, scopes, provenance
src/data/ai/knowledge/                   — Approved knowledge corpora (file-based)
src/lib/ai/knowledge/repository.ts       — Production index (published + approved only)
src/lib/ai/knowledge/library/            — Taxonomy, semantics, coverage map, boundaries
src/lib/ai/retrieval/service.ts          — Lexical retrieval (unchanged in Phase 2)
src/lib/ai/relevance/gate.ts             — Relevance-first gate (unchanged in Phase 2)
```

Phase 2 adds **architecture only**. No large external corpus ingestion, no vector database, and no curriculum routing.

## Source classification (`source_tier`)

Source tier represents **authority/type**, not topical relevance. A Tier 1 source about depression must not outrank a highly relevant Tier 2 source about self-esteem merely because of tier.

| Tier | Meaning | Examples |
| --- | --- | --- |
| `TIER_1_AUTHORITATIVE` | Established guidance | WHO, government/public-health authorities, professional bodies, clinical guidelines |
| `TIER_2_RESEARCH` | Scholarly evidence | Peer-reviewed research, systematic reviews, meta-analyses |
| `TIER_3_ACADEMIC` | Academic reference | Textbooks, handbooks, reference works (metadata/permitted excerpts) |
| `TIER_4_EDUCATIONAL` | Reviewed education | Educational resources, reputable public educational material |
| `TIER_5_DR_VANDANA` | Approved site content | Dr. Vandana's approved educational and professional information |

Implementation: `src/lib/ai/knowledge/library/semantics.ts` — `resolveSourceTier()`.

## Evidence level (`evidence_level`)

Evidence level describes **evidence strength/type** and is distinct from source tier.

| Evidence level | Typical source tier | Meaning |
| --- | --- | --- |
| `guideline` | TIER_1 | Official or professional guidance |
| `systematic-review` | TIER_2 | Systematic review |
| `meta-analysis` | TIER_2 | Meta-analysis |
| `peer-reviewed` | TIER_2 | Peer-reviewed research |
| `academic-reference` | TIER_3 | Textbook/handbook reference (metadata) |
| `public-health-education` | TIER_1 | Public mental-health education |
| `educational` | TIER_4 | General educational synthesis |
| `verified-practice` | TIER_5 | Verified Dr. Vandana practice information |
| `ethics` | TIER_1 | Safety and ethics rules |
| `academic-curriculum` | TIER_3 | Internal curriculum reference (non-indexable) |

Do not fabricate evidence levels. Use only values that match verifiable source types.

## Knowledge scope (`knowledge_scope`)

Knowledge scope separates **what is known about psychology** from **what Dr. Vandana personally does**.

| Scope | Purpose |
| --- | --- |
| `GENERAL_PSYCHOLOGY` | Foundational psychology concepts |
| `MENTAL_WELLBEING` | Stress, anxiety awareness, self-esteem, mindfulness, etc. |
| `CLINICAL_EDUCATION` | Counselling/psychotherapy concepts, case-study teaching |
| `RESEARCH_EVIDENCE` | Research-backed summaries |
| `PROFESSIONAL_GUIDANCE` | Safety, ethics, when to seek help |
| `DR_VANDANA_PRACTICE` | Verified information about Dr. Vandana only |

### Clinical / professional boundary

| Question | Allowed source |
| --- | --- |
| "What is CBT?" | General psychology / clinical education sources |
| "Does Dr. Vandana use CBT?" | `DR_VANDANA_PRACTICE` only — never inferred from syllabus or textbooks |

Knowledge about a therapy approach does **not** imply that Dr. Vandana personally practises that approach.

Implementation: `src/lib/ai/knowledge/library/boundaries.ts`.

## Source provenance (`source_metadata`)

Extended bibliographic and rights metadata is stored in optional `source_metadata` on `KnowledgeDocument`:

- `source_id`, `source_name`, `source_type`, `organization`
- `publication_date`, `last_reviewed`, `publisher`, `journal`, `volume`, `issue`, `pages`
- `doi`, `url`, `license`, `copyright_status`
- `verification_status`, `notes`

**Policy:** If a field is unknown, leave it `undefined`. Never invent DOI, ISBN, edition, authors, URLs, or page numbers.

## Psychology domain taxonomy

Internal taxonomy for organization and coverage planning — **not** a public University of Mumbai curriculum.

Location: `src/lib/ai/knowledge/library/taxonomy.ts`

Domains:

1. **Foundational Psychology** — personality, cognition, emotion, learning, memory, motivation, etc.
2. **Mental Health & Well-being** — stress, anxiety, depression awareness, self-esteem, grief, mindfulness, etc.
3. **Child & Adolescent Psychology** — development, parenting, school mental health, etc.
4. **Counselling & Psychotherapy Education** — counselling concepts, CBT/REBT concepts, therapeutic relationship, etc.

## University syllabus — internal reference only

The existing curriculum work remains in the repository:

| Path | Role |
| --- | --- |
| `docs/curriculum/source-pdfs/` | Source PDF archive |
| `docs/curriculum/extracted/` | Extracted text |
| `docs/curriculum/parsed-curriculum.json` | Parsed structure |
| `src/data/ai/knowledge/curriculum/` | Generated unit documents |
| `docs/curriculum/qa/` | QA reports |

Curriculum documents:

- Corpus: `ACADEMIC_CURRICULUM_REFERENCE`
- Governance: `approved: false`, `approval_state: REVIEW`
- **Hard-excluded from production retrieval** even if accidentally marked published
- Used only for internal coverage-gap analysis via `buildKnowledgeCoverageMap()`

No curriculum routing, public syllabus browsing, or university representation in Ask Dr. Vandana AI.

## Approval lifecycle

```
DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED
```

(`DRAFT` corresponds to newly imported material before human review.)

Only `APPROVED` or `PUBLISHED` documents in **non-blocked corpora** enter production retrieval.

Implementation:

- `src/lib/ai/knowledge/workflow.ts` — transitions
- `src/lib/ai/knowledge/library/semantics.ts` — `isProductionIndexable()`
- `src/lib/ai/knowledge/repository.ts` — default list excludes non-indexable documents

## Copyright policy

**Mandatory:**

- Do **not** ingest complete copyrighted textbooks, journal articles, paid courses, or publisher content without appropriate rights/licensing.
- For copyrighted academic sources, store bibliographic metadata (title, author, publisher/journal, year, DOI/URL where legitimately available), topic classification, and notes.
- Use legally available summaries, excerpts, or metadata where permitted.
- Set `copyright_status: METADATA_ONLY` when full text is not stored.

The system must not reproduce copyrighted books or journal articles.

## Internal coverage map

Machine-readable coverage analysis: `buildKnowledgeCoverageMap()` in `src/lib/ai/knowledge/library/coverage-map.ts`.

Each entry includes:

- `domain`, `topic`, optional `subtopic`
- optional `curriculum_reference` (internal only)
- `source_count`, `published_source_count` (from actual repository data)
- `coverage_status`: `NOT_STARTED` | `PARTIAL` | `ADEQUATE` | `REVIEW_REQUIRED`

Use this map to identify gaps (for example, topics with only one published source).

## Retrieval principles

Phase 2 does **not** redesign retrieval. Existing behaviour is preserved:

1. Only production-indexable documents enter the BM25 index.
2. Relevance gate filters unrelated documents before answer composition.
3. Source tier is available for future filtering but does **not** override relevance scoring.
4. Dr. Vandana-specific questions use only `DR_VANDANA_KNOWLEDGE`.

Future phases may add semantic/hybrid retrieval, source filtering, and richer attribution — the model supports this without forking the pipeline.

## Source attribution (live)

`formatPublicSourceAttribution()` in `src/lib/ai/knowledge/library/attribution.ts` is wired into `extractUsedSources()` in the live answer pipeline.

- Author / organization
- Title
- Year (when known)
- Optional public URL (`PublicKnowledgeSource.url`)
- Only chunks that pass the relevance gate and are used in the answer are attributed

Internal curriculum metadata is **not** exposed in default attribution.

## Source type (`source_type`)

Source type describes the **publication/material form** — distinct from source tier (authority) and evidence level (strength).

Typed values in `src/types/ai.ts` (`SourceType`):

| Source type | Example |
| --- | --- |
| `PUBLIC_HEALTH_FACT_SHEET` | WHO depression fact sheet |
| `PUBLIC_HEALTH_Q_AND_A` | WHO stress Q&A |
| `GOVERNMENT_HEALTH_EDUCATION` | NIMH, CDC, MedlinePlus, NCCIH health topics |
| `CLINICAL_GUIDELINE` | Formal clinical guideline documents only |
| `SYSTEMATIC_REVIEW` / `META_ANALYSIS` / `PEER_REVIEWED_RESEARCH` | Scholarly evidence (metadata/summary only when full text not licensed) |
| `TEXTBOOK` / `HANDBOOK` | Academic reference (metadata/permitted excerpts) |
| `INTERNAL_COVERAGE_REFERENCE` | Internal curriculum reference (non-indexable) |

Do not label a general fact sheet as `CLINICAL_GUIDELINE` unless the source is actually a guideline.

## Review-date governance

Published external sources (`PSYCHOLOGY_EVIDENCE_SOURCES`) include:

- `last_reviewed` — actual repository maintainer review date (never fabricated)
- `next_review_due` — default 12 months after `last_reviewed`
- `publication_date` — source publication/update date when verifiable (unchanged by repository review)

Implementation: `src/lib/ai/knowledge/library/review-governance.ts`

Regenerate gap analysis: `npm run knowledge:coverage-report` → `docs/ai/knowledge-coverage-report.json`

## Phase 4 — Controlled evidence library expansion (current)

### Purpose

Expand the Psychology Knowledge & Evidence Library across five priority domains in a **controlled, manually curated, source-governed** manner:

1. Self-esteem
2. Anxiety
3. Resilience / coping
4. Emotional regulation
5. Mindfulness

Quality over quantity. No web crawling, bulk ingestion, or vector database.

### Phase 4 sources (8 new — 12 total with Phase 3)

| ID | Organization | Topic | Source type | Tier | Evidence |
| --- | --- | --- | --- | --- | --- |
| `evidence-nimh-anxiety-disorders` | NIMH | anxiety | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-medlineplus-anxiety` | NIH MedlinePlus | anxiety | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-cdc-emotional-wellbeing-self-esteem` | CDC | self-esteem | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-nimh-caring-mental-health-self-esteem` | NIMH | self-esteem | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-cdc-mental-health-resilience` | CDC | resilience | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-nimh-coping-traumatic-events` | NIMH | resilience / coping | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-cdc-emotional-wellbeing-regulation` | CDC | emotional-regulation | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |
| `evidence-nccih-mindfulness-meditation` | NCCIH | mindfulness | GOVERNMENT_HEALTH_EDUCATION | TIER_1 | public-health-education |

Phase 3 WHO fact sheets reclassified from `guideline` to `public-health-education` evidence level (fact sheets are not clinical guidelines).

### Source diversity (published evidence)

Five organizations across 12 sources: WHO (3), NIMH (4), CDC (3), MedlinePlus (1), NCCIH (1).

### Coverage gap report

Machine-readable report generated from repository data:

`docs/ai/knowledge-coverage-report.json` (via `npm run knowledge:coverage-report`)

### Legacy metadata audit

28 legacy published documents (site educational, Dr. Vandana, case studies) lack full `source_metadata` provenance. Tier/scope are resolved at document creation — flagged in gap report `legacy_inferred_metadata` for conservative future migration.

### Testing

- `src/lib/ai/pipeline/ask-phase4.test.ts` — regression A–O, negative retrieval, review dates, URL validation
- `src/data/ai/knowledge/evidence-pilot/evidence-pilot.test.ts` — corpus provenance (12 sources)
- Existing Phase 2–3 tests unchanged

### Limitations

- Coping is covered via resilience-mapped sources; no standalone taxonomy topic for `coping`
- Emotional regulation has one dedicated external source (plus site educational content)
- No semantic/vector retrieval; lexical relevance gate unchanged
- No admin UI for source publishing

### Future expansion (Phase 5+)

- Optional TIER_2 systematic reviews with metadata-only ingestion
- Hybrid semantic retrieval behind existing interfaces
- Explicit metadata migration for legacy educational documents

## Phase 3 — Controlled evidence source pilot

### Purpose

Prove that a small number of verified, provenance-complete external sources can improve Ask AI answers without hallucination, unrelated retrieval, false attribution, or curriculum exposure.

### Source selection criteria

1. Authoritative public-health or government source
2. Publicly accessible with stable official URL
3. Relevant to psychology / mental well-being education
4. Clear reason for inclusion (not keyword matching alone)
5. Suitable for paraphrased educational use with attribution

### Pilot sources (4)

| ID | Organization | Tier | Evidence | Scope | URL verified |
| --- | --- | --- | --- | --- | --- |
| `evidence-who-stress-qanda` | World Health Organization | TIER_1_AUTHORITATIVE | public-health-education | MENTAL_WELLBEING | Yes |
| `evidence-who-depression-awareness` | World Health Organization | TIER_1_AUTHORITATIVE | public-health-education | MENTAL_WELLBEING | Yes |
| `evidence-who-mental-health-wellbeing` | World Health Organization | TIER_1_AUTHORITATIVE | public-health-education | PROFESSIONAL_GUIDANCE | Yes |
| `evidence-nimh-cbt-education` | NIMH (NIH) | TIER_1_AUTHORITATIVE | public-health-education | CLINICAL_EDUCATION | Yes |

Internal review notes: `src/data/ai/knowledge/evidence-pilot/review-notes.ts` (maintainer-only).

### Verification process

1. Confirm official source page on organization domain
2. Record only verifiable bibliographic fields
3. Write paraphrased educational summary (no full-text copy)
4. Set `verification_status: VERIFIED`, `approval_state: PUBLISHED`
5. Automated URL fetch test in `evidence-pilot.test.ts`

### Query boundaries

`src/lib/ai/knowledge/library/query-boundaries.ts`:

- Public university curriculum queries → knowledge gap (no retrieval)
- Clearly non-psychology queries (e.g. geography trivia) → knowledge gap

### Limitations

- Only four external topics covered in the pilot
- Self-esteem and many taxonomy topics still rely on site-authored educational content
- No semantic/vector retrieval yet
- No admin UI for source publishing

### Future scaling plan (Phase 4+)

- Add sources incrementally with the same verification workflow
- Expand topic coverage using `buildKnowledgeCoverageMap()` gap analysis
- Optional hybrid semantic retrieval behind existing interfaces
- Periodic source review dates and version bumps

## Dr. Vandana content boundary

`DR_VANDANA_KNOWLEDGE` is authoritative **only** for:

- Dr. Vandana's qualifications and professional profile
- Approved services and practice information
- Approved educational content explicitly attributed to her

It must **not** become a general psychology evidence source merely because it belongs to the website.

Conversely, external psychology sources must **not** be presented as Dr. Vandana's personal views unless explicitly approved as such.

## Future semantic retrieval plan

When ready (Phase 3+):

- Add embedding model via existing `EmbeddingService` interface
- Optional PostgreSQL + pgvector or external vector store via `VECTOR_DATABASE_URL`
- Hybrid lexical + semantic ranking with relevance gate unchanged
- Source tier / evidence / scope filters as optional retrieval constraints

No Phase 2 code depends on these features.

## Related documentation

- `docs/ASK_DR_VANDANA_AI.md` — Ask Dr. Vandana AI implementation overview
- `docs/curriculum/qa/` — Curriculum QA reports (Phase 1.5)

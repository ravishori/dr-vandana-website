# Ask Dr. Vandana AI

Educational psychology assistant for the professional website of Dr. Vandana Rajiv Chaudhary. This document is the implementation source of truth.

The assistant is **not** an AI psychologist, diagnostic tool, emergency service, or replacement for Dr. Vandana.

## Architecture

The existing site is Next.js App Router (TypeScript) under `src/app/`. There is no database, CMS, or authentication. This feature adds:

- File-based approved knowledge (RAG corpus)
- Lexical retrieval with a replaceable embedding/vector interface
- Provider-agnostic LLM layer (OpenAI-compatible HTTP or educational fallback)
- `POST /api/ai/ask` (server-only; API keys never ship to the browser)
- Public educational pages and a calm chat interface

```
USER QUESTION
  → INPUT VALIDATION
  → SAFETY CLASSIFICATION
  → QUERY REWRITING
  → KNOWLEDGE RETRIEVAL (published + approved only)
  → RELEVANCE FILTER
  → LLM OR EDUCATIONAL COMPOSER
  → SAFETY POST-PROCESSING
  → ANSWER + RELATED RESOURCES
```

## Data flow

1. The browser posts `{ question, conversation_id?, language }` to `/api/ai/ask`.
2. The API rate-limits by client IP, then runs `runAskPipeline`.
3. Questions are validated and obvious PII (email/phone/name hints) is redacted before retrieval or generation.
4. Safety classification chooses canned responses for crisis, diagnosis, medication, injection, privacy, and out-of-scope questions.
5. Remaining questions retrieve approved documents. Dr. Vandana-specific questions may use **only** `DR_VANDANA_KNOWLEDGE`.
6. Generation uses the configured AI provider, or the educational composer if no API key is set or the provider fails.
7. Logs record request ID, latency, model, retrieval count, and safety category — **not** the question or answer.

Private chats are never written to disk and never become public SEO pages.

## AI provider

`AIProvider` (`src/lib/ai/providers/types.ts`):

- `generateResponse()`
- optional `classifySafety()`
- optional `generateEmbedding()`

Modes (`AI_PROVIDER`):

| Value | Behaviour |
| --- | --- |
| `auto` (default) | OpenAI-compatible if `AI_API_KEY` is set, otherwise educational fallback |
| `openai` / `openai-compatible` | Chat Completions at `AI_API_BASE_URL` |
| `fallback` / `educational` | Retrieval-composed answers only |

The fallback is intentional: the site can serve accurate educational answers from the approved corpus without a vendor lock-in or a required paid key. When a key is added, the same RAG context is passed to the model as **untrusted data**.

## RAG and vector structure

Today:

- `KnowledgeRepository` — in-memory published documents
- `EmbeddingService` — lexical hash vectors (interface for a later embedding model)
- `RetrievalService` — BM25-style lexical ranking over approved documents

Later (no code rewrite required for callers):

- `VECTOR_DATABASE_URL` for PostgreSQL + pgvector or another store
- `EMBEDDING_MODEL` with the OpenAI-compatible embedding endpoint

Only documents with `approved: true` and `approval_state` of `APPROVED` or `PUBLISHED` enter the index.

## Knowledge sources

Five corpora:

| Corpus | May be stated as |
| --- | --- |
| `DR_VANDANA_KNOWLEDGE` | Verified public practice facts from `src/data/professional.ts` and `src/data/about.ts` |
| `PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE` | General educational psychology |
| `CASE_STUDY_KNOWLEDGE` | Fictional / anonymised teaching scenarios |
| `SAFETY_AND_ETHICS_RULES` | Safety behaviour (not shown as public citations) |
| `ACADEMIC_CURRICULUM_REFERENCE` | University of Mumbai M.A. Psychology (NEP 2020) official syllabus reference |

### Academic curriculum corpus (Phase 1)

Purpose: governed academic reference layer for the **University of Mumbai M.A. Psychology (NEP 2020)** syllabus. This corpus is **separate** from Dr. Vandana practice content and general educational psychology.

- Location: `src/data/ai/knowledge/curriculum/` (one `KnowledgeDocument` per syllabus **unit**)
- Source PDFs (provenance): `docs/curriculum/source-pdfs/` (Semesters I–IV uploads)
- Official web source: [University of Mumbai NEP 2020 syllabus index](https://mu.ac.in/nep-2020-syllabus)
- Generator script (maintainers): `scripts/generate-curriculum-ts.py` (rebuild from extracted text only; do not invent content)

Every curriculum document sets:

- `source`: `University of Mumbai — M.A. Psychology (NEP 2020) Official Syllabus`
- `institution`, `program`, `curriculum_version`, `semester`, `course_code`, `course_title`, `unit_number`, `unit_title`
- `course_objectives`, `course_outcomes`, `content_type`, `source_page`, `source_document`, `source_url`
- `study_books` / `reference_books` as **bibliographic references only** (`STUDY_BOOK`, `REFERENCE_BOOK`)

**Textbook policy:** syllabus-listed study and reference books are stored as title-level bibliographic metadata. Full copyrighted textbook text is **never** ingested, downloaded, or scraped.

**Separation from Dr. Vandana content:** curriculum documents describe university programme requirements only. They must not be cited as Dr. Vandana's clinical methods. Named therapies appearing in syllabus units (for example CBT/REBT coursework) remain academic references — not practice claims.

**Phase 1 scope:** corpus creation and metadata only. The main ASK AI pipeline is unchanged; dedicated academic routing is Phase 2.

If a visitor asks about Dr. Vandana's specific techniques and they are not in the approved corpus, the assistant must say:

> I don't have enough verified information about Dr. Vandana's specific approach to answer that accurately.

Named therapies (CBT, DBT, EMDR, and similar) are never inferred as her methods.

Citations are taken only from retrieved approved `source` fields. The system does not invent journal articles.

## Safety rules

Classifier categories (`src/lib/ai/safety/classifier.ts`):

- `SAFE_EDUCATIONAL`
- `PERSONAL_MENTAL_HEALTH` — general information, no diagnosis
- `DIAGNOSTIC_REQUEST` — refuse diagnosis
- `MEDICATION_REQUEST` — no prescribing or dose changes
- `CRISIS_OR_EMERGENCY` / `SELF_HARM_OR_SUICIDE` — calm, brief, seek local emergency help
- `VIOLENCE_OR_HARM` — refuse harm, encourage emergency help
- `CONFIDENTIALITY_REQUEST` — no patient records exist in this system
- `DR_VANDANA_SPECIFIC` — approved methodology only
- `OUT_OF_SCOPE` — polite redirect
- `PROMPT_INJECTION` — no prompts, keys, or hidden documents

Crisis copy reuses `src/data/emergency.ts` and does not invent helpline numbers.

## Privacy model

- Conversations are kept in process memory for 30 minutes (follow-ups only).
- Memory stores truncated, PII-stripped text — not clinical records.
- Default logging excludes question and answer bodies.
- No patient database, EHR, or training pipeline.

## API contract

`POST /api/ai/ask`

Request:

```json
{
  "question": "How does counselling work?",
  "conversation_id": "uuid-optional",
  "language": "en"
}
```

Success:

```json
{
  "answer": "markdown",
  "category": "SAFE_EDUCATIONAL",
  "sources": [{ "title": "...", "attribution": "..." }],
  "related_questions": ["..."],
  "safety_notice": "...",
  "conversation_id": "uuid",
  "show_support_cta": true,
  "case_study_slug": "workplace-burnout"
}
```

The response never includes system prompts, raw documents, or classifier internals beyond the public `category` label.

Validation errors: `400` empty/invalid, `413` too long, `429` rate limited, `503` limiter/provider unavailable.

## Admin workflow

No public admin UI is exposed (the site has no authentication).

Content lives in `src/data/ai/knowledge/` with states:

`DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED`

Helpers: `src/lib/ai/knowledge/workflow.ts`.

A future authenticated admin can swap `InMemoryKnowledgeRepository` for a database-backed store without changing the pipeline.

## Testing

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Coverage includes educational answers, methodology grounding, diagnosis/medication refusal, privacy, prompt injection, case-study framing, out-of-scope, empty input, and oversized input.

## Deployment

Same Next.js deployment as the rest of the site (Vercel or Node). Production rate limiting for this endpoint uses the existing Upstash configuration (`APPOINTMENT_RATE_LIMIT_STORE=upstash`). Without Upstash in production, asks fail closed (same policy as appointment abuse prevention).

## Environment variables

See `.env.example`. Never commit real secrets. Never prefix AI keys with `NEXT_PUBLIC_`.

## Public routes

| Path | Purpose |
| --- | --- |
| `/psychology/ask-dr-vandana-ai` | Chat UI |
| `/psychology/case-studies` | Case-study explorer |
| `/psychology/case-studies/[slug]` | Individual educational scenario |
| `/case-studies` | Redirect to the explorer |
| `/psychology/anxiety` | SEO education |
| `/psychology/stress-management` | SEO education |
| `/psychology/counselling` | SEO education |

## Multilingual

`language` accepts `en`, `hi`, `mr`. Answers are English until reviewed Hindi/Marathi knowledge exists. Psychological terms must not be machine-translated blindly.

## Known limitations

- Semantic vector search is abstracted but not yet backed by pgvector.
- Hindi and Marathi knowledge is not authored yet.
- LLM fluency depends on configuring `AI_API_KEY`; without it, answers are composed from the approved corpus.
- Admin publishing is code-reviewed data files, not a logged-in CMS.

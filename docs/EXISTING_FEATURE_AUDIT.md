# Existing Feature Audit — Dr. Vandana Rajiv Chaudhary Website

**Audit date:** 14 August 2026  
**Checkpoint branch:** `cursor/existing-feature-audit-d73b`  
**Code baseline:** `origin/cursor/counselling-faq-a302` (`b6211fe`)  
**Remote:** `https://github.com/ravishori/dr-vandana-website`  
**Scope:** AUDIT → VERIFY → TEST → DOCUMENT → COMMIT. No Patient & Practice Management System was implemented in this checkpoint.

---

## AUDIT SUMMARY

`main` contains only empty placeholder files (`README.md`, `LICENSE`, `CHANGELOG.md`, `.gitignore`, `.editorconfig`). All implemented website work lives in a stack of **unmerged draft pull requests**. None of those PRs have been merged to `main`.

This checkpoint copies the most complete **existing** product line (through Counselling FAQ, excluding the unmerged Patient & Practice Management implementation) onto a verified branch, documents the baseline, and applies only low-risk fixes.

The live product is a professional psychology **marketing and education website** with:

- Public pages, FAQ, contact, and an appointment **enquiry** form
- Ask Dr. Vandana AI (educational, not clinical)
- A public question form plus a single-admin psychologist portal
- A public crisis / helpline directory with psychologist admin

It is **not** a complete patient appointment management system.

---

## GIT SAFETY CHECK (performed first)

| Item | Result |
|---|---|
| Starting branch | `main` (up to date with `origin/main`) |
| Starting commit | `521e2e8739bfbeba3a52048d646b07f97ebf71f5` — “Initial website repository structure” |
| Working tree | Clean; no uncommitted, staged, or untracked project files |
| Merge conflicts | None |
| Stash | Empty |
| Remote | `origin` → `github.com/ravishori/dr-vandana-website` |
| Destructive git commands | Not used |

### Unmerged feature stack (newest last)

| PR | Branch | Status | Role |
|---|---|---|---|
| #1 | `cursor/about-page-milestone-4a` | Draft | Early site foundations (superseded by later stack) |
| #2 | `feature/dr-vandana-production-5d` | Draft vs `main` | Production website + enquiry backend + themes |
| #3 | `cursor/ask-dr-vandana-ai-a302` | Draft | Ask Dr. Vandana AI |
| #4 | `cursor/psychologist-question-portal-a302` | Draft | Psychologist login + question inbox |
| #5 | `cursor/mental-health-crisis-directory-a302` | Draft | Crisis helpline directory |
| #6 | `cursor/mental-wellness-resource-library-a302` | Draft **WIP** | Resource library scaffolding (sibling of #5, incomplete) |
| #7 | `cursor/counselling-faq-a302` | Draft | Counselling FAQ (this checkpoint baseline) |
| #8 | `cursor/patient-practice-management-plan-a302` | Draft | Architecture review **docs only** (HARD STOP) |
| #9 | `cursor/patient-practice-management-a302` | Draft | Option C PMS implementation — **out of scope for this checkpoint** |

PR #9 exists as a draft and was inspected for the audit report only. It was **not** merged and **not** included in this checkpoint.

---

## CURRENT ARCHITECTURE

### Frontend

- **Framework:** Next.js 16.3.0 App Router, React 19.2.8, TypeScript
- **Styling:** Tailwind CSS 4, CSS design tokens, six calm wellness themes (`calm-sage` default)
- **Fonts:** Plus Jakarta Sans + Playfair Display (`next/font`)
- **Routing:** file-based `src/app/**/page.tsx`
- **Layouts:** root `layout.tsx` + `SiteShell` (navbar, footer, mobile quick bar); psychologist layout adds portal nav when signed in
- **Client islands:** navigation drawer, theme switcher, FAQ explorer, appointment form, question form, Ask AI chat, DIGIPIN copy, crisis editor

### Backend

- Next.js Server Actions and two Route Handlers (`/api/ai/ask`, `/api/internal/errors`)
- No separate API framework, no Prisma/Drizzle ORM
- Nodemailer SMTP for appointment enquiries, question notifications, and psychologist replies
- Zod validation on public and admin writes
- Upstash Redis optional for distributed rate limits and JSON stores

### Database

- **No relational patient/appointment schema**
- Question portal: SQLite (`question_submissions`, fingerprints, audit) or Upstash or in-memory
- Crisis directory: SQLite/Upstash/memory JSON blobs
- Appointment enquiries: **not persisted** (email only)
- AI conversation memory: in-process `Map` (30-minute TTL)
- SQLite files and `/data` are gitignored

### Authentication

- Single psychologist account from environment variables (`PSYCHOLOGIST_LOGIN_EMAIL` + scrypt hash + `SESSION_SECRET`)
- HMAC session cookie (`drvandana_portal_session`), httpOnly, SameSite=strict, 8-hour TTL
- Middleware protects `/psychologist/*` except `/psychologist/login`
- **No patient accounts, OAuth, OTP, MFA, or registration** on this checkpoint

### Deployment

- Target domain in config: `https://drvandana.trinetra.net`
- Comments mention Vercel or a Node host; **no** `vercel.json`, Docker, Wrangler, or GitHub Actions in-repo
- Production rate limiting and question storage expect Upstash (fail-closed if misconfigured)
- Crisis public page can fall back to in-memory seed so the safety page still renders

---

## FEATURES VERIFIED

| Feature | Evidence |
|---|---|
| Home page | `src/app/page.tsx`, `src/data/home.ts` |
| About / professional profile | `src/app/about/page.tsx`, `src/data/professional.ts` |
| Qualifications (Ph.D. Naturopathy, M.A. Psychology) | `professionalProfile.qualifications` |
| Experience copy (6+ years) | `professionalProfile.experience` |
| Areas of support | `/areas-of-support` |
| Child & adolescent page | `/child-adolescent-psychology` |
| Stress, anxiety & wellness page | `/stress-anxiety-wellness` |
| Counselling FAQ + how counselling works | `/understanding-counselling` |
| Contact + verified Mumbai location / DIGIPIN | `/contact`, `src/data/contact.ts` |
| Appointment enquiry UI + SMTP backend | `/book-appointment`, `submitAppointmentEnquiry` |
| WhatsApp / call CTAs (manual off-site) | `wa.me` + Bitly booking URL |
| Privacy, disclaimer, terms | `/privacy-policy`, `/disclaimer`, `/terms` |
| Navigation, footer, mobile quick bar | `src/config/navigation.ts`, `SiteFooter`, `MobileQuickBar` |
| Multi-theme appearance switcher | `src/config/themes.ts` |
| SEO metadata, sitemap, robots | `layout.tsx`, `sitemap.ts`, `robots.ts` |
| Skip link, focus styles, semantic public pages | `SkipToContent`, `globals.css` |
| Ask Dr. Vandana AI | `/psychology/ask-dr-vandana-ai`, `POST /api/ai/ask` |
| Educational case studies | `/psychology/case-studies` |
| Public ask-a-question form | `/ask-a-question` |
| Psychologist login + question inbox | `/psychologist/*` |
| Crisis helpline directory + admin | `/mental-health-support`, `/psychologist/crisis` |
| Security headers + CSP | `next.config.ts` |
| Error reporting endpoint | `POST /api/internal/errors` |

### Verified professional facts (source of truth — not invented)

From `src/data/professional.ts` and `src/data/contact.ts`:

- Name: Dr. Vandana Rajiv Chaudhary
- Profession: Psychologist
- Qualifications: Ph.D. in Naturopathy; M.A. Psychology
- Experience: Over 6 years of professional experience in psychological counselling and emotional wellness
- Tagline: Your Mental Well-being Matters.
- Practice: 201, Vasant Krupa Building CHS, Poisar Market, S.V. Road, Near Our Lady High School, Poisar, Kandivali West, Mumbai – 400067, Maharashtra, India
- DIGIPIN: `4FK 29KJ F74`
- Coordinates: 19.21437645, 72.8520259
- WhatsApp / phone display: +91 93223 69829

Placeholders still shown or reserved: practice email, consultation hours, Instagram/LinkedIn/Facebook, qualification institution/year. Social URLs are **not rendered**. FAQ content is marked pending Dr. Vandana professional review.

---

## FEATURES PARTIALLY IMPLEMENTED

- Appointment **enquiry** (UI + email) without calendar, slots, confirmation, reschedule, or cancellation
- Email alerts to the practice for enquiries and new questions — **only when SMTP env is configured**
- Psychologist portal (questions + crisis admin) — single shared credential, no MFA, no session revocation
- Ask Dr. Vandana AI — works with educational fallback if `AI_API_KEY` is missing; vector DB / embeddings are stubs
- Crisis store in production without Upstash falls back to memory (public page works; admin writes may not persist)
- FAQ JSON-LD previously truncated; search is client-side only
- Resource library (`/resources`) — nav item disabled; WIP on PR #6, not in this checkpoint
- Workshops — nav item disabled, no route
- Error/empty states exist for forms; no route-level `loading.tsx`

---

## FEATURES NOT IMPLEMENTED (this checkpoint)

- Patient registration, email verification, mobile OTP
- Patient login / patient portal
- Psychologist MFA
- Appointment calendar / availability engine
- Appointment confirmation, reschedule, cancellation
- Automated WhatsApp Business alerts
- Patient appointment history
- Psychologist appointment management UI
- Patient records, consultation history, private clinical notes, document management
- RBAC beyond a single hardcoded `PSYCHOLOGIST` role
- Practice-wide audit logs (question/crisis audit exists; not a clinical audit trail)
- CI/CD (no GitHub Actions)
- Docker / Cloudflare Workers config

Draft PR #9 contains a prototype of several of the above. It is **not production-ready** (mocked OTP/WhatsApp, JSON snapshot store) and is **not part of this checkpoint**.

---

## APPOINTMENT SYSTEM STATUS

**Does the current application already have a complete patient appointment management system?**  
**NO**

What exists:

- Public page `/book-appointment` with an enquiry form (name, age group, preferred day/time, brief reason, privacy consent)
- Consultation mode options exist in data but are **all disabled**, so the mode field is omitted
- Contact method is WhatsApp only (phone and email disabled in config)
- Server Action `submitAppointmentEnquiry`: honeypot → IP rate limit → Zod → SMTP to `APPOINTMENT_TO_EMAIL`
- Success copy states the enquiry **does not confirm an appointment time**
- No appointment table, no slots, no psychologist calendar, no reschedule/cancel, no visitor confirmation email
- Separate off-site “Book Instantly on WhatsApp” CTA uses Bitly `https://bit.ly/4c2u9te` and `https://wa.me/919322369829`

| Item | Status |
|---|---|
| Appointment UI | Partial (enquiry form + WhatsApp CTA) |
| Appointment backend | Partial (enquiry email only) |
| Database | Missing |
| Availability | Missing |
| Confirmation | Missing (explicitly not a booking) |
| Rescheduling | Missing |
| Cancellation | Missing |
| Notifications | Partial (SMTP to practice if configured; no visitor email; no automated WhatsApp) |
| Patient appointment history | Missing |
| Psychologist appointment management | Missing |

---

## PATIENT MANAGEMENT STATUS

**Not implemented** on this checkpoint.

Public visitors can submit an appointment enquiry or a private psychology question without creating an account. Question records have a public reference (`QV-…`), optional name/email, internal notes, and an AI draft — this is a Q&A workflow, not a patient chart.

Privacy copy states the website does not create a patient database, portal, or clinical record from submissions.

| Item | Status |
|---|---|
| Patient registration | Missing |
| Patient profile | Missing |
| Patient portal | Missing |
| Patient history | Missing |
| Consultation records | Missing |
| Clinical notes | Missing (question `internalNotes` only) |
| Documents | Missing |
| Follow-ups | Missing (AI chat follow-up is unrelated in-memory conversation) |
| Patient search | Missing |
| Psychologist patient directory | Missing |

---

## AUTHENTICATION STATUS

### Patient authentication

| Question | Answer |
|---|---|
| Exists? | No |
| Functional? | No |
| Tested? | No patient-auth tests |
| Production-ready? | No |

### Psychologist authentication

| Question | Answer |
|---|---|
| Exists? | Yes — single env-configured account |
| Functional? | Yes, when `PSYCHOLOGIST_LOGIN_EMAIL`, `PSYCHOLOGIST_PASSWORD_HASH`, and `SESSION_SECRET` (≥32 chars) are set |
| Protected? | Yes — middleware + server-action `assertPsychologist` |
| MFA? | No |

Login rate limit: 5 attempts / 15 minutes per IP. Password: Node `scrypt` with salt and `timingSafeEqual`. Cookie: httpOnly, secure in production, SameSite=strict. Tests in `src/lib/question-portal/portal.test.ts`.

### Registration / verification

| Item | Status |
|---|---|
| Patient self-registration | Not implemented |
| Email verification | Not implemented |
| Mobile OTP | Not implemented |

---

## NOTIFICATION STATUS

| Channel | Status |
|---|---|
| Email — appointment enquiry to practice | Implemented in code; **CONFIGURATION REQUIRED** (SMTP + `APPOINTMENT_TO_EMAIL`) |
| Email — new question alert to practice | Implemented in code; **CONFIGURATION REQUIRED** (`QUESTION_NOTIFICATION_EMAIL` + SMTP). Email body does **not** include the question text |
| Email — psychologist reply to visitor | Implemented when visitor supplied email |
| Email — confirmation to the person who enquired | Not implemented |
| WhatsApp — automated practice alerts | Not implemented |
| WhatsApp — visitor CTA / Bitly booking | Manual off-site links only |

---

## SPECIFIC APPOINTMENT / ACCESS CONCLUSIONS

| Question | Answer |
|---|---|
| Complete patient appointment management system? | **NO** |
| Can Dr. Vandana currently receive appointment alerts by email? | **CONFIGURATION REQUIRED** (code exists; SMTP env must be set in the deployment) |
| Can Dr. Vandana currently receive WhatsApp alerts? | **NO** (only visitor-initiated `wa.me` / Bitly) |
| Can patients register themselves? | **NO** |
| Can patients verify email? | **NO** |
| Can patients verify mobile using OTP? | **NO** |
| Can patients log in? | **NO** |
| Can Dr. Vandana log in? | **PARTIAL** — psychologist portal login exists; requires env credentials; no MFA |
| Can Dr. Vandana view consultation history? | **NO** |
| Can Dr. Vandana view patient records? | **NO** |

---

## API INVENTORY

| API / action | Purpose | Auth | Role | Status |
|---|---|---|---|---|
| `POST /api/ai/ask` | Educational AI answer | Public + IP rate limit | None | Complete (fallback if no API key) |
| `GET /api/ai/ask` | Method guard | — | — | 405 |
| `POST /api/internal/errors` | Sanitized frontend error reports | Public + rate limit | None | Complete |
| `submitAppointmentEnquiry` | Email enquiry | Public + honeypot + rate limit | None | Complete for enquiry |
| `submitPublicQuestionAction` | Store private question + notify | Public + honeypot + rate limit | None | Complete |
| `psychologistLoginAction` / logout | Portal session | Rate-limited login | Psychologist | Complete |
| `updateQuestionAction` / archive / send / AI draft / load | Question review | Session | Psychologist | Complete |
| `saveCrisisResourceAction` / `flagOverdueCrisisResourcesAction` | Crisis CMS | Session | Psychologist | Complete |

No unused REST patient/appointment APIs exist on this checkpoint. Do not delete the current endpoints.

---

## DATABASE AUDIT — FUTURE PMS COMPATIBILITY

Current stores **cannot** host Patient + Appointment + Consultation + Document without a new bounded context.

Gaps: no user table, no patient IDs, no slot availability, no appointment lifecycle, no consultation notes visibility model, no document blob storage, no migrations framework.

SQLite + repository pattern could host a future schema; Upstash JSON is a poor fit for relational clinical data. Draft PR #9 used a `practice_snapshot` JSON blob — that is a prototype, not a production clinical database.

---

## SECURITY FINDINGS

No live API keys, passwords, tokens, or cloud credentials were found in tracked files. `.env*` is gitignored except `.env.example`.

| Finding | Severity | Notes |
|---|---|---|
| Psychologist auth is a single shared env credential | Medium | No user directory, lockout, or password reset |
| No MFA | Medium | Documented gap |
| Session `jti` unused — cannot revoke before 8h TTL | Low/Medium | |
| Session cookie `path: "/"` | Low | Cookie is sent on public pages |
| CSP allows `'unsafe-inline'` and `'unsafe-eval'` | Low | Needed for Next.js; extra script surface |
| Bitly booking URL was `http://` | Low | Fixed to `https://` in this checkpoint |
| SMTP / portal / Upstash must be set in deployment | Config | Fail-closed for appointment rate limit and question store in production |
| Public psychologist login URL | Accepted | Noindexed + robots disallowed; still in public site chrome when logged out |
| Honeypots + Zod + rate limits on public writes | Positive | |
| Question notification email omits question body | Positive | |

`.env.example` previously omitted SMTP and error-reporting variables; those names are now documented as empty placeholders (no secrets).

---

## SEO AUDIT

Present: per-page titles/descriptions, canonical URLs on public pages, Open Graph, Twitter card, `sitemap.ts`, `robots.ts` (disallow `/api/` and `/psychologist`), FAQPage JSON-LD, ProfessionalService JSON-LD on contact, psychologist layout `noindex`.

Limits: `html lang` was `en` (fixed to `en-IN`); sitemap `lastModified` is “now” on every request; `/psychology/counselling` overlaps `/understanding-counselling`; home has no JSON-LD; FAQ content still pending professional review. `public/og-image.png` exists. Favicon exists at `src/app/favicon.ico`.

Private dashboard routes are not in the sitemap and are robots-disallowed.

---

## ACCESSIBILITY AUDIT

Present: skip link, `:focus-visible`, reduced-motion, labelled appointment fields with `aria-invalid`, mobile drawer focus trap, `aria-current` nav, theme switcher ARIA.

Low-risk fixes in this checkpoint: FAQ category chips no longer claim `tablist` without tab keyboard behaviour; FAQ search is `type="search"` with `aria-describedby`; public question form fields now expose `aria-invalid` / `aria-describedby`.

Remaining: psychologist filter inputs use placeholders without labels; no route-level loading UI; FAQ content still editorial-draft.

---

## UI / UX AUDIT

Calm professional wellness visual system with six themes. Dense primary nav (10 items + CTA) wraps on laptop widths. Mobile quick bar provides Book / Help / WhatsApp / Call. Empty and error states exist for enquiry, questions, FAQ search, and Ask AI. Branding tagline is consistent; three components still hardcode the tagline string instead of importing `siteConfig`.

No redesign was performed.

---

## PERFORMANCE AUDIT

Public pages are mostly React Server Components. Heroes are CSS/SVG, not large raster photos. Unused Next.js starter SVGs remain in `public/` (not removed — not a functional defect). Ask AI chat is client-side. FAQ and crisis pages are `force-dynamic`. No major performance refactor was undertaken.

---

## DEPENDENCY AUDIT

From `package.json`: Next 16.3.0, React 19.2.8, Zod 4, nodemailer, Upstash Redis/Ratelimit, Tailwind 4, ESLint 9, TypeScript 5, tsx.

No Python/requirements backend. Lockfile: `package-lock.json`. Unused starter SVGs are assets, not npm packages. No large upgrades were performed. `npm audit` results are recorded under TEST RESULTS after install.

---

## ENVIRONMENT CONFIGURATION

| File | Status |
|---|---|
| `.env.example` | Present; SMTP / error-reporting names added in this checkpoint |
| `.env.local` | Not tracked (correct) |
| `vercel.json` | Absent |
| GitHub Actions | Absent |
| Docker | Absent |
| `.gitignore` | Ignores `.env*`, `/data`, `*.sqlite`, `.next`, `node_modules` (duplicate entries cleaned) |

---

## INFRASTRUCTURE

GitHub remote exists. No in-repo Vercel/Cloudflare/CI/Docker config. Next security headers are in `next.config.ts`. Deployment of email, portal auth, and production rate limits is **configuration-dependent**.

---

## COUNSELLING FAQ DETAIL

- Route: `/understanding-counselling` (nav label “FAQ”)
- **27** published static FAQs in `src/data/counselling-faq/faqs.ts`
- Client-side searchable and category-filterable (`FAQExplorer`)
- Mobile-friendly accordion; related questions and related pages
- Emergency FAQ points to `/mental-health-support` (no hard-coded extra helpline numbers)
- SEO: canonical + FAQPage JSON-LD (all non-emergency published FAQs after this checkpoint)
- Duplicate overlap with `/psychology/counselling` topic page
- Content governance: pending Dr. Vandana professional review
- Tests: `src/lib/counselling-faq/search.test.ts`

---

## DASHBOARD AUDIT

Who: the single configured psychologist account.  
Auth: required except `/psychologist/login`.  
Data: **real** question stats/list and crisis stats/resources from the configured store (not appointment/patient data).  
Empty states: “No matching submissions”; crisis verification queue hidden when empty.  
Loading: client pending labels only; no `loading.tsx`.  
Error: root `error.tsx` / `global-error.tsx`.  
Mobile: portal uses the public site chrome plus portal nav; usable but not a dedicated mobile admin app.

---

## FEATURE STATUS MATRIX

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Home page | COMPLETE | `src/app/page.tsx` | Professional marketing page |
| About / qualifications / experience | COMPLETE | `src/data/professional.ts` | Only verified facts |
| Areas of support | COMPLETE | `/areas-of-support` | Educational |
| Child & adolescent page | COMPLETE | `/child-adolescent-psychology` | Educational |
| Stress & wellness page | COMPLETE | `/stress-anxiety-wellness` | Educational |
| Contact + location | COMPLETE | `src/data/contact.ts` | Email/hours still placeholders |
| Privacy / terms / disclaimer | COMPLETE | `src/data/legal.ts` | |
| Navigation / footer / mobile bar | COMPLETE | `navigation.ts`, layout components | Resources/Workshops disabled |
| Theme system | COMPLETE | `themes.ts` | Six themes |
| Counselling FAQ | COMPLETE | `/understanding-counselling` | Pending professional copy review |
| Appointment enquiry UI | COMPLETE | `AppointmentForm` | Enquiry, not booking |
| Appointment enquiry backend | PARTIAL | SMTP Server Action | No persistence |
| Appointment calendar / slots | NOT IMPLEMENTED | — | |
| Appointment confirm / reschedule / cancel | NOT IMPLEMENTED | — | |
| WhatsApp visitor CTA | COMPLETE | `wa.me` + Bitly | Manual |
| WhatsApp automated alerts | NOT IMPLEMENTED | — | |
| Email alerts to practice | CONFIGURATION REQUIRED | `appointment-email.ts` | Code complete |
| Ask Dr. Vandana AI | PARTIAL | `/api/ai/ask` | Fallback without API key; embeddings stub |
| Case studies | COMPLETE | Educational composites | Not real patients |
| Public ask-a-question | COMPLETE | `/ask-a-question` | |
| Psychologist login | PARTIAL | Env single user, no MFA | |
| Psychologist question inbox | COMPLETE | `/psychologist/questions` | Real store |
| Crisis directory | COMPLETE | `/mental-health-support` | Seed + admin CMS |
| Patient registration / login / OTP | NOT IMPLEMENTED | — | Draft only on PR #9 |
| Patient portal / records / notes / docs | NOT IMPLEMENTED | — | |
| Resource library | NOT IMPLEMENTED | Nav disabled | WIP PR #6 |
| Workshops | NOT IMPLEMENTED | Nav disabled | |
| CI/CD | NOT IMPLEMENTED | No `.github/workflows` | |
| Social links | NOT IMPLEMENTED | Placeholders, not rendered | |

---

## SAFE FIXES IN THIS CHECKPOINT

1. Document existing stacked work and GitHub PR state (this file + README).
2. `html lang="en-IN"` to match site locale.
3. WhatsApp Bitly booking URL `http://` → `https://`.
4. FAQ JSON-LD includes all published non-emergency FAQs (removed `.slice(0, 20)`).
5. FAQ category filters use `role="group"` + `aria-pressed` instead of incomplete tabs.
6. FAQ search input `type="search"` + `aria-describedby`.
7. Public question form `aria-invalid` / `aria-describedby` on error fields.
8. `.env.example` documents SMTP and error-reporting variable names (empty values only).
9. Deduplicated `.gitignore`.

No Patient & Practice Management features were added.

---

## NEXT RECOMMENDED DEVELOPMENT PHASE

**Patient & Practice Management System**, including:

- Patient registration
- Email verification
- Mobile OTP
- Patient login
- Psychologist login/MFA
- Appointment management
- Calendar
- Rescheduling
- Cancellation
- Email notifications
- WhatsApp notifications
- Patient portal
- Consultation history
- Patient records
- Private clinical notes
- Document management
- RBAC
- Audit logs
- Security hardening

Do **not** treat draft PR #9 as production. Re-evaluate that prototype against this verified baseline before implementation work continues.

---

## GIT CHECKPOINT NOTE

This branch is based on `cursor/counselling-faq-a302` rather than empty `main`, so the GitHub checkpoint contains the actual website. Merging this PR into `main` is the recommended way to establish production `main` before the PMS phase.

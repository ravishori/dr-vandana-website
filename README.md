# Dr. Vandana Rajiv Chaudhary — Professional Psychology Website

Public website for Dr. Vandana Rajiv Chaudhary, Psychologist.

**Tagline:** Your Mental Well-being Matters.

Production URL: [https://drvandana.trinetra.net](https://drvandana.trinetra.net)

## What this repository contains

This is a Next.js App Router site with:

- Public professional pages (home, about, areas of support, child & adolescent, stress & wellness)
- Counselling FAQ (`/understanding-counselling`)
- Appointment **enquiry** form (email to the practice; not a booking calendar)
- Contact page with verified Mumbai practice location
- Ask Dr. Vandana AI educational assistant
- Public “Ask a Question” form and a private psychologist review portal
- Public mental-health crisis / helpline directory

It does **not** yet include a complete patient & practice management system (patient accounts, OTP, appointment calendar, clinical records, or WhatsApp Business alerts). See `docs/EXISTING_FEATURE_AUDIT.md`.

Phase 0 architecture (design only, not implemented): `docs/PATIENT_PRACTICE_MANAGEMENT_ARCHITECTURE.md`.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Zod validation
- Nodemailer (SMTP)
- Optional Upstash Redis for production rate limits / stores
- Optional `node:sqlite` for local question and crisis stores

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required production configuration is documented in `.env.example` (SMTP, psychologist portal credentials, Upstash, optional AI provider).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (`tsx --test`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

## Professional content

Verified professional facts live in `src/data/professional.ts` and `src/data/contact.ts`. Do not invent qualifications, registration numbers, testimonials, email addresses, or consultation hours.

Currently verified qualifications:

- Ph.D. in Naturopathy
- M.A. Psychology
- Over 6 years of professional experience in psychological counselling and emotional wellness

Email, consultation hours, and social URLs remain placeholders until confirmed.

## Security notes

- Never commit `.env.local` or live secrets.
- Psychologist portal routes are noindexed and disallowed in `robots.ts`.
- Appointment enquiries are not persisted; they are emailed to the practice inbox when SMTP is configured.

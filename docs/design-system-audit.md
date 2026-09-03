# Phase 0 — Design System Audit

**Project:** Dr. Vandana Rajiv Chaudhary Psychology Website  
**Date:** 2026-09-03  
**Branch base:** `cursor/smart-wellness-nav-382b`  
**Status:** Complete — written before implementation

---

## Stack snapshot

| Area | Finding |
| --- | --- |
| Framework | Next.js **16.3.0** (App Router, `src/app`) |
| React | **19.2.8** |
| TypeScript | **5.x**, strict, path alias `@/*` |
| Styling | **Tailwind CSS v4** via `@tailwindcss/postcss` |
| CSS architecture | `src/app/globals.css` — CSS variables + `@theme inline` |
| Package manager | **npm** (`package-lock.json`) |
| UI library | **Custom** — no shadcn, no Radix, no MUI |
| Icons | Custom SVG set in `src/components/ui/icons.tsx` |
| Animation | CSS only (`transition-*`, `home-reveal`, `wellness-hub-enter`, appearance slice); `prefers-reduced-motion` respected |
| Themes | Multi-theme via `data-theme` + `src/config/themes.ts` |

### Dependencies (runtime)

- `next`, `react`, `react-dom`, `zod`, `@upstash/ratelimit`, `@upstash/redis`, `nodemailer`

### Not present

- shadcn/ui / `components.json`
- Radix / Base UI
- Motion / Framer Motion
- React Bits
- `clsx` / `tailwind-merge` / `class-variance-authority`
- Duplicate icon libraries (Lucide, Heroicons, etc.)

---

## A. Existing reusable components

| Component | Path | Role |
| --- | --- | --- |
| `ButtonLink` | `src/components/ui/ButtonLink.tsx` | Primary CTA link variants |
| `Container` | `src/components/ui/Container.tsx` | Max-width page container |
| `Section` | `src/components/ui/Section.tsx` | Vertical section rhythm |
| Icons | `src/components/ui/icons.tsx` | Shared SVG icons |
| `SiteShell` | `src/components/layout/SiteShell.tsx` | Navbar + main + footer + quick bar |
| `MobileQuickBar` | `src/components/layout/MobileQuickBar.tsx` | Book / WhatsApp / Call |
| `Navbar` + desktop/mobile nav | `src/components/navigation/*` | Full navigation system |
| Smart Wellness Nav V2 | `MobileNavDrawer.tsx` + `wellness/*` | Mobile drawer hub |
| Theme system | `src/components/theme/*` | Theme provider + switcher |
| Domain sections | `home`, `about`, `support`, `appointment`, `ai`, etc. | Page-specific compositions |

---

## B. Existing design tokens

**Source of truth:** CSS custom properties in `src/app/globals.css`  
**TS mirror:** `src/config/design-tokens.ts`  
**Theme registry:** `src/config/themes.ts`

Already defined:

- Colors: brand, brand-muted, accent, background, surface, surface-soft, text, text-muted, border, focus-ring
- Radius: sm, md, lg, xl
- Shadows: sm, md, lg
- Motion: transition-fast, transition-base
- Spacing: page-x, section-y
- Touch: touch-target-min (2.75rem / 44px)

**Gaps for Design System V1:** elevated surface, success/warning/emergency semantics, denser spacing scale, radius-full/2xl, explicit motion duration scale, typography role tokens in TS.

---

## C. Existing dependencies

Lean by design. Prefer extending CSS tokens + small React wrappers over new libraries.

---

## D. Existing animation

- Theme color transitions
- Homepage `.home-reveal`
- Appearance panel slice animation
- Wellness hub card enter (`.wellness-hub-enter`, ~280ms)
- Global reduced-motion kill-switch

**Decision:** Do **not** install Motion unless a new interaction cannot be expressed in CSS.

---

## E. Responsive architecture

- Mobile-first Tailwind utilities
- Desktop nav from `xl:`
- Mobile drawer + quick bar below `xl`
- Safe-area padding on quick bar and drawer
- Main content bottom padding for quick bar offset

---

## F. Potential conflicts with shadcn

1. Tailwind v4 `@theme inline` already owns color/radius tokens — shadcn init would try to rewrite `globals.css` / add HSL token conventions.
2. No `cn()` based on `clsx`+`twMerge` (project has a simple join helper).
3. Custom multi-theme `data-theme` palettes differ from default shadcn zinc/neutral themes.
4. Blind `shadcn init` risks overwriting navigation and token CSS.

**Decision:** Do **not** run destructive shadcn init. Optionally configure MCP for future selective adds. Build wellness primitives on existing tokens.

---

## G. Components that can be standardized

- Button hierarchy (primary / secondary / tertiary / AI / emergency)
- Card language (support, resource, appointment, AI)
- Section + heading pattern
- FAQ disclosure
- Status / notice banners
- Focus treatment (already global; document + utility class)

---

## H. Components that must NOT be touched

- `src/components/navigation/**` (including Smart Wellness Navigation V2)
- `src/components/layout/MobileQuickBar.tsx` behavior/structure
- Desktop navigation behavior
- AI pipeline / auth / appointment API / email / rate-limit logic
- Existing verified routes and copy sources in `src/data/*`

---

## I. Dependencies that are genuinely necessary

**None required** for Design System V1 if we:

- Extend CSS variables
- Add TypeScript token maps
- Add presentational React components
- Add docs + optional showcase route

---

## J. Dependencies that should NOT be installed

- Paid / premium UI kits
- Figma runtime libraries
- Motion (until CSS is insufficient)
- React Bits npm package (copy patterns only if needed)
- Duplicate icon packs
- Full Radix suite “just in case”
- Extra CSS frameworks

---

## Recommended implementation approach

1. Keep CSS variables as the single runtime source of truth.
2. Add `src/design-system/` token exports that map to those variables.
3. Add `src/components/design-system/` wellness primitives that reuse `ButtonLink`, `Section`, `Container`, and existing icons.
4. Add `/design-system` showcase with `robots: noindex`.
5. Configure shadcn MCP without migrating the UI stack.
6. Leave Smart Wellness Navigation V2 untouched.

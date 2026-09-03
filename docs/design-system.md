# Dr. Vandana Wellness Design System V1

## Design principles

1. Calm and emotionally safe
2. Premium but approachable
3. Accessible by default
4. Reuse before inventing
5. No regression to navigation or booking flows

Tagline: **Your Mental Well-being Matters.**

## Most important rule

> Search existing components first.  
> Reuse existing components second.  
> Use shadcn third (selectively, when needed).  
> Use React Bits or Motion only when they provide meaningful value that cannot be achieved cleanly with the existing system.

## Architecture

| Layer | Location | Role |
| --- | --- | --- |
| CSS tokens (runtime source of truth) | `src/app/globals.css` | Theme palettes + semantic CSS variables |
| Existing TS token mirror | `src/config/design-tokens.ts` | Legacy documentation map |
| Design-system token exports | `src/design-system/` | Semantic token maps for new UI |
| Wellness primitives | `src/components/design-system/` | Buttons, cards, FAQ, notices, sections |
| Showcase | `/design-system` | `noindex` internal gallery |

## Color tokens

Semantic CSS variables (theme-aware unless noted):

- `--color-background`, `--color-surface`, `--color-surface-muted`, `--color-surface-elevated`
- `--color-primary`, `--color-primary-hover`, `--color-primary-foreground`
- `--color-secondary`, `--color-secondary-foreground`
- `--color-accent`, `--color-accent-muted`
- `--color-text`, `--color-text-muted`, `--color-border`, `--color-focus`
- Status (calm, fixed): `--color-success`, `--color-warning`, `--color-emergency` (+ soft variants)

Import maps from `@/design-system` (`colorTokens`).

## Typography

Roles: display, h1–h4, body, bodySmall, caption, label, button  
Fonts: Playfair Display (headings), Plus Jakarta Sans (body)  
See `typographyTokens` in `src/design-system/tokens.ts`.

## Spacing / radius / shadows / motion

- Spacing: `--space-xs` … `--space-3xl`, plus page/section rhythm
- Radius: sm → 2xl + full
- Shadows: none, subtle, card, elevated
- Motion: instant / fast / normal / slow + shared easing  
  Prefer **150–350ms**, no bounce, respect `prefers-reduced-motion`

## Core components

| Component | Use for |
| --- | --- |
| `WellnessButton` | Primary / secondary / tertiary / AI / emergency / ghost actions |
| `WellnessCard` | Shared card shell |
| `WellnessSection` + `SectionHeading` | Page section rhythm |
| `SupportCard` | Areas of support |
| `AppointmentCard` | Booking CTA |
| `AIWellnessCard` | Ask Dr. Vandana AI CTA (non-diagnostic disclaimer) |
| `ResourceCard` | Educational resources |
| `TestimonialCard` | Verified quotes only — never invent stories |
| `WellnessFaq` | Native disclosure FAQ |
| `StatusNotice` | Info / success / warning / emergency notices |

Import from `@/components/design-system`.

## Accessibility

- Semantic HTML
- Visible focus (`:focus-visible` + `focusRingClassName`)
- Minimum 44px touch targets (`--touch-target-min`)
- Keyboard-friendly controls
- Reduced-motion support
- Do not hide critical information behind hover-only interactions

## Psychology-specific content principles

Do **not** use:

- guaranteed cure / instant healing / 100% recovery
- fear-based or shame-based messaging
- manipulative urgency
- AI copy that implies diagnosis or emergency replacement

Emergency support must remain clearly accessible.

## When to use shadcn

- Project is **not** migrated to shadcn wholesale
- Existing custom UI + CSS tokens remain the foundation
- shadcn MCP is configured for **future selective** adds only
- Never run a destructive `shadcn init` that rewrites tokens, globals, or navigation

## When to use React Bits

**Not used in V1.** Prefer existing / design-system components. Copy a single free pattern only if it provides clear value and stays calm.

## When to use Motion

**Not used in V1.** CSS transitions and existing reduced-motion rules are sufficient. Do not replace Smart Wellness Navigation V2 animations.

## When NOT to add a library

- Functionality already exists
- It duplicates icons, CSS frameworks, or component kits
- It is paid / premium / Figma-runtime dependent
- It is added “just in case”

## Protected areas (do not regress)

- Smart Wellness Navigation V2 (`src/components/navigation/**`)
- Desktop navigation behavior
- Mobile quick bar behavior
- Existing routes and booking/AI/business logic

## Showcase

Visit `/design-system` (noindex). Demonstrates colors, buttons, cards, notices, FAQ, and principles.

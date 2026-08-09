# Theme system

Presentation-layer visual themes for the Dr. Vandana psychology website. Themes change colours and related tokens only — not routes, copy, SEO, or behaviour.

## Available themes

| ID | Name | Default |
| --- | --- | --- |
| `calm-sage` | Calm Sage | Yes |
| `professional-teal` | Professional Teal | |
| `serenity-blue` | Serenity Blue | |
| `warm-earth` | Warm Earth | |
| `elegant-minimal` | Elegant Minimal | |
| `nature-wellness` | Nature Wellness | |

## Architecture

1. **Registry** — `src/config/themes.ts`  
   Theme IDs, display names, descriptions, preview swatches, storage key, default ID.
2. **Palette tokens** — `src/app/globals.css`  
   Each theme sets `--palette-*` under `[data-theme="…"]`. Semantic aliases (`--color-brand`, etc.) and Tailwind `@theme inline` map utilities (`bg-brand`, `text-text`) to those variables.
3. **State** — `src/components/theme/ThemeProvider.tsx`  
   Lightweight React context; no Redux or extra state libraries.
4. **Persistence** — `src/lib/theme-storage.ts`  
   `localStorage` key: `dr-vandana-theme`. Invalid/missing values fall back to `calm-sage`. Storage failures are ignored so private browsing still works.
5. **FOUC prevention** — `src/components/theme/theme-bootstrap.ts`  
   Injected with `next/script` `beforeInteractive` to set `data-theme` on `<html>` before paint.
6. **UI** — `src/components/theme/ThemeSwitcher.tsx`  
   Popover control in the navbar; inline grid in the mobile drawer and footer.

## Token surface

Semantic CSS variables (theme-dependent unless noted):

- `--color-brand`, `--color-brand-muted`, `--color-accent`
- `--color-background`, `--color-surface`, `--color-surface-soft`
- `--color-text`, `--color-text-muted`, `--color-border`, `--color-focus-ring`
- Radius / motion remain shared (`--radius-*`, `--transition-*`)
- Shadows: `--shadow-sm|md|lg` (tint follows palette)

Components should use semantic utilities or `var(--color-*)`, never raw theme hex values.

## Adding a seventh theme

1. Add the ID to `themeIds` and a `ThemeDefinition` in `src/config/themes.ts`.
2. Add a `[data-theme="your-id"]` block in `src/app/globals.css` with a full `--palette-*` set (match existing keys).
3. Ensure preview swatches in the registry match the palette.
4. No page or route changes are required.

## Accessibility

- Theme options expose `aria-pressed` / `aria-selected` and visible selected state (border + check), not colour alone.
- Keyboard: trigger toggles the panel; Escape closes; options are focusable buttons.
- Focus rings use `--color-focus-ring`.
- `prefers-reduced-motion: reduce` short-circuits theme colour transitions and other motion.

## SEO

Themes are client-side presentation only. Canonical URLs, metadata, and structured data are unchanged.

/**
 * Central design-token map for the brand palette (BRD §5.1).
 * Runtime styling uses CSS custom properties defined in `src/app/globals.css`.
 * Prefer semantic token names in components — do not scatter raw hex values.
 */
export const brandPalette = {
  sageGreen: "#5A7361",
  softMint: "#88A090",
  softSand: "#D99B82",
  offWhite: "#FBF9F5",
  white: "#FFFFFF",
  deepCharcoal: "#2B332C",
  mutedSlateOlive: "#626E65",
} as const;

export const semanticColorTokens = {
  brand: {
    cssVar: "--color-brand",
    value: brandPalette.sageGreen,
  },
  brandMuted: {
    cssVar: "--color-brand-muted",
    value: brandPalette.softMint,
  },
  accent: {
    cssVar: "--color-accent",
    value: brandPalette.softSand,
  },
  background: {
    cssVar: "--color-background",
    value: brandPalette.offWhite,
  },
  surface: {
    cssVar: "--color-surface",
    value: brandPalette.white,
  },
  text: {
    cssVar: "--color-text",
    value: brandPalette.deepCharcoal,
  },
  textMuted: {
    cssVar: "--color-text-muted",
    value: brandPalette.mutedSlateOlive,
  },
} as const;

export const radiusTokens = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
} as const;

export const motionTokens = {
  durationFast: "150ms",
  durationBase: "200ms",
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export type BrandPaletteKey = keyof typeof brandPalette;
export type SemanticColorTokenKey = keyof typeof semanticColorTokens;

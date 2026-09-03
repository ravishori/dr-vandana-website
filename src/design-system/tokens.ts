/**
 * Dr. Vandana Wellness Design System V1 — token map.
 *
 * Runtime source of truth remains CSS custom properties in `src/app/globals.css`.
 * This module documents semantic roles for Cursor/developers and avoids
 * duplicating theme palette hex values.
 */

export const colorTokens = {
  background: "var(--color-background)",
  surface: "var(--color-surface)",
  surfaceMuted: "var(--color-surface-muted)",
  surfaceElevated: "var(--color-surface-elevated)",
  primary: "var(--color-primary)",
  primaryHover: "var(--color-primary-hover)",
  primaryForeground: "var(--color-primary-foreground)",
  secondary: "var(--color-secondary)",
  secondaryForeground: "var(--color-secondary-foreground)",
  accent: "var(--color-accent)",
  accentMuted: "var(--color-accent-muted)",
  text: "var(--color-text)",
  textMuted: "var(--color-text-muted)",
  border: "var(--color-border)",
  focus: "var(--color-focus)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  emergency: "var(--color-emergency)",
} as const;

export const typographyTokens = {
  display: {
    fontFamily: "var(--font-playfair)",
    fontSize: "clamp(2.25rem, 5vw, 3rem)",
    lineHeight: "1.2",
    fontWeight: "600",
  },
  h1: {
    fontFamily: "var(--font-playfair)",
    fontSize: "clamp(2rem, 4vw, 2.75rem)",
    lineHeight: "1.25",
    fontWeight: "600",
  },
  h2: {
    fontFamily: "var(--font-playfair)",
    fontSize: "clamp(1.5rem, 3vw, 2rem)",
    lineHeight: "1.25",
    fontWeight: "600",
  },
  h3: {
    fontFamily: "var(--font-playfair)",
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
    lineHeight: "1.3",
    fontWeight: "600",
  },
  h4: {
    fontFamily: "var(--font-playfair)",
    fontSize: "1.125rem",
    lineHeight: "1.35",
    fontWeight: "600",
  },
  body: {
    fontFamily: "var(--font-plus-jakarta)",
    fontSize: "1rem",
    lineHeight: "1.7",
    fontWeight: "400",
  },
  bodySmall: {
    fontFamily: "var(--font-plus-jakarta)",
    fontSize: "0.875rem",
    lineHeight: "1.6",
    fontWeight: "400",
  },
  caption: {
    fontFamily: "var(--font-plus-jakarta)",
    fontSize: "0.75rem",
    lineHeight: "1.5",
    fontWeight: "500",
  },
  label: {
    fontFamily: "var(--font-plus-jakarta)",
    fontSize: "0.8125rem",
    lineHeight: "1.4",
    fontWeight: "600",
  },
  button: {
    fontFamily: "var(--font-plus-jakarta)",
    fontSize: "0.875rem",
    lineHeight: "1.25",
    fontWeight: "600",
  },
} as const;

export const spacingTokens = {
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
  "3xl": "var(--space-3xl)",
  pageX: "var(--space-page-x)",
  sectionY: "var(--space-section-y)",
} as const;

export const radiusTokens = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  full: "var(--radius-full)",
} as const;

export const shadowTokens = {
  none: "var(--shadow-none)",
  subtle: "var(--shadow-subtle)",
  card: "var(--shadow-card)",
  elevated: "var(--shadow-elevated)",
} as const;

export const motionTokens = {
  instant: "var(--motion-instant)",
  fast: "var(--motion-fast)",
  normal: "var(--motion-normal)",
  slow: "var(--motion-slow)",
  ease: "var(--motion-ease)",
} as const;

export const breakpointTokens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1440px",
} as const;

export const touchTokens = {
  minTarget: "var(--touch-target-min)",
} as const;

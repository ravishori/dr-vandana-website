/**
 * Multi-theme registry — single source of truth for theme IDs and metadata.
 * Palette values live in `src/app/globals.css` as CSS custom properties.
 */

export const THEME_STORAGE_KEY = "dr-vandana-theme";

export const DEFAULT_THEME_ID = "calm-sage" as const;

export const themeIds = [
  "calm-sage",
  "professional-teal",
  "serenity-blue",
  "warm-earth",
  "elegant-minimal",
  "nature-wellness",
] as const;

export type ThemeId = (typeof themeIds)[number];

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  /** Preview swatches: brand, accent, background */
  preview: readonly [string, string, string];
};

export const themes: readonly ThemeDefinition[] = [
  {
    id: "calm-sage",
    name: "Calm Sage",
    description: "Peaceful & natural",
    preview: ["#5A7361", "#D99B82", "#FBF9F5"],
  },
  {
    id: "professional-teal",
    name: "Professional Teal",
    description: "Modern & trustworthy",
    preview: ["#0F766E", "#E8A87C", "#F4FAF9"],
  },
  {
    id: "serenity-blue",
    name: "Serenity Blue",
    description: "Gentle & reassuring",
    preview: ["#3B6D9A", "#C4A484", "#F5F8FC"],
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    description: "Warm & grounded",
    preview: ["#6B7F5A", "#C4785A", "#F8F4EE"],
  },
  {
    id: "elegant-minimal",
    name: "Elegant Minimal",
    description: "Refined & premium",
    preview: ["#3D4A45", "#6B8F7A", "#FAFAF9"],
  },
  {
    id: "nature-wellness",
    name: "Nature Wellness",
    description: "Forest calm",
    preview: ["#2F5D3A", "#D4A574", "#F3F7F2"],
  },
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (themeIds as readonly string[]).includes(value)
  );
}

export function resolveThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  const found = themes.find((theme) => theme.id === id);
  return found ?? themes[0];
}

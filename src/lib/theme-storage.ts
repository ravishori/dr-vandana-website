import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  resolveThemeId,
  type ThemeId,
} from "@/config/themes";

/** Read persisted theme; safe when localStorage is unavailable. */
export function readStoredThemeId(): ThemeId {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_THEME_ID;
    }
    return resolveThemeId(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/** Persist theme selection; ignores storage failures (private mode, etc.). */
export function writeStoredThemeId(themeId: ThemeId): void {
  try {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Persistence is optional — theme still applies for the session.
  }
}

export function applyThemeToDocument(themeId: ThemeId): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute("data-theme", themeId);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME_ID,
  getThemeDefinition,
  resolveThemeId,
  type ThemeDefinition,
  type ThemeId,
} from "@/config/themes";
import {
  applyThemeToDocument,
  readStoredThemeId,
  writeStoredThemeId,
} from "@/lib/theme-storage";

type ThemeContextValue = {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setThemeId: (themeId: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

const listeners = new Set<() => void>();
let memoryThemeId: ThemeId | null = null;

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientThemeSnapshot(): ThemeId {
  if (memoryThemeId) {
    return memoryThemeId;
  }

  const resolved = readStoredThemeId();
  memoryThemeId = resolved;
  applyThemeToDocument(resolved);
  return resolved;
}

function getServerThemeSnapshot(): ThemeId {
  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeId = useSyncExternalStore(
    subscribeTheme,
    getClientThemeSnapshot,
    getServerThemeSnapshot,
  );

  const setThemeId = useCallback((next: ThemeId) => {
    const resolved = resolveThemeId(next);
    memoryThemeId = resolved;
    applyThemeToDocument(resolved);
    writeStoredThemeId(resolved);
    emitThemeChange();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      theme: getThemeDefinition(themeId),
      setThemeId,
    }),
    [themeId, setThemeId],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

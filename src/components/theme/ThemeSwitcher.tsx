"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { themes, type ThemeId } from "@/config/themes";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  /**
   * popover — compact header control
   * inline — always-visible list (mobile drawer)
   * panel — collapsible slice-in/out Appearance section (footer)
   */
  variant?: "popover" | "inline" | "panel";
  className?: string;
  /** Called after a theme is chosen (e.g. close mobile menu). */
  onThemeSelected?: () => void;
};

function ThemePreviewSwatches({
  colors,
  selected,
}: {
  colors: readonly [string, string, string];
  selected: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-full items-end gap-1 overflow-hidden rounded-md border px-1.5 pb-1.5 pt-1",
        selected ? "border-brand shadow-sm" : "border-brand-muted/35",
      )}
      style={{ backgroundColor: colors[2] }}
      aria-hidden="true"
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: colors[0] }}
      />
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: colors[1] }}
      />
      <span className="h-3 w-3 rounded-full border border-black/10 bg-white" />
    </span>
  );
}

function ThemeOptionButton({
  themeId,
  name,
  description,
  preview,
  selected,
  onSelect,
  className,
}: {
  themeId: ThemeId;
  name: string;
  description: string;
  preview: readonly [string, string, string];
  selected: boolean;
  onSelect: (id: ThemeId) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(themeId)}
      className={cn(
        "appearance-theme-card relative flex w-full flex-col gap-2 rounded-[var(--radius-md)] border p-2.5 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--transition-fast)] motion-reduce:transition-none",
        selected
          ? "border-brand bg-surface-soft shadow-sm"
          : "border-brand-muted/30 bg-surface hover:border-brand-muted/60 hover:bg-background",
        className,
      )}
    >
      <ThemePreviewSwatches colors={preview} selected={selected} />
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="text-text block text-sm font-medium leading-tight">
            {name}
          </span>
          <span className="text-text-muted mt-0.5 block text-xs leading-snug">
            {description}
          </span>
        </span>
        {selected ? (
          <span
            className="bg-brand text-surface mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <CheckIcon className="h-3 w-3" />
          </span>
        ) : (
          <span
            className="mt-0.5 inline-block h-5 w-5 shrink-0"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="sr-only">
        {selected ? `${name}, currently selected` : `Select ${name}`}
      </span>
    </button>
  );
}

function ThemeOptionsGrid({
  themeId,
  onSelect,
  labelledBy,
  cardClassName,
}: {
  themeId: ThemeId;
  onSelect: (id: ThemeId) => void;
  labelledBy: string;
  cardClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:grid-cols-3"
    >
      {themes.map((theme) => (
        <ThemeOptionButton
          key={theme.id}
          themeId={theme.id}
          name={theme.name}
          description={theme.description}
          preview={theme.preview}
          selected={theme.id === themeId}
          onSelect={onSelect}
          className={cardClassName}
        />
      ))}
    </div>
  );
}

function AppearancePanel({
  className,
  onThemeSelected,
}: {
  className?: string;
  onThemeSelected?: () => void;
}) {
  const { themeId, theme, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (id: ThemeId) => {
    setThemeId(id);
    onThemeSelected?.();
    // Keep panel open so visitors can compare themes.
  };

  return (
    <div
      id="site-appearance"
      className={cn(
        "border-brand-muted/30 bg-surface w-full overflow-hidden rounded-[var(--radius-lg)] border",
        className,
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        className="text-text hover:bg-background/80 flex min-h-[var(--touch-target-min)] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span
            id={labelId}
            className="text-text-muted block text-xs font-semibold tracking-[0.16em] uppercase"
          >
            Appearance
          </span>
          <span className="text-text mt-0.5 block truncate text-sm font-medium">
            {theme.name}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "text-text-muted h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id={panelId}
        className="appearance-slice"
        data-open={open ? "true" : "false"}
        inert={open ? undefined : true}
      >
        <div className="appearance-slice__clip">
          <div className="appearance-slice__body border-brand-muted/25 border-t px-3 pt-3 pb-4 sm:px-4">
            <p className="text-text-muted mb-3 text-xs leading-relaxed">
              Choose a visual style. Content and navigation stay the same.
            </p>
            <ThemeOptionsGrid
              themeId={themeId}
              onSelect={handleSelect}
              labelledBy={labelId}
              cardClassName="appearance-slice__card"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeSwitcher({
  variant = "popover",
  className,
  onThemeSelected,
}: ThemeSwitcherProps) {
  const { themeId, theme, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (id: ThemeId) => {
    setThemeId(id);
    onThemeSelected?.();
    if (variant === "popover") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!open || variant !== "popover") {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  if (variant === "panel") {
    return (
      <AppearancePanel className={className} onThemeSelected={onThemeSelected} />
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("w-full", className)}>
        <p
          id={labelId}
          className="text-text-muted mb-2 text-xs font-semibold tracking-wide uppercase"
        >
          Appearance
        </p>
        <ThemeOptionsGrid
          themeId={themeId}
          onSelect={handleSelect}
          labelledBy={labelId}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="text-text-muted hover:bg-surface hover:text-text inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-[var(--radius-md)] border border-transparent px-2 text-sm no-underline"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Appearance. Current theme: ${theme.name}. Open theme selector.`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {theme.preview.map((color, index) => (
            <span
              key={`${theme.id}-${index}`}
              className="h-2.5 w-2.5 rounded-full border border-black/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={labelId}
          className="border-brand-muted/30 bg-surface absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(calc(100vw-2rem),22rem)] rounded-[var(--radius-lg)] border p-3 shadow-[var(--shadow-lg)]"
        >
          <p id={labelId} className="text-text mb-2 text-sm font-medium">
            Appearance
          </p>
          <p className="text-text-muted mb-3 text-xs leading-relaxed">
            Choose a visual style. Content and navigation stay the same.
          </p>
          <ThemeOptionsGrid
            themeId={themeId}
            onSelect={handleSelect}
            labelledBy={labelId}
          />
        </div>
      ) : null}
    </div>
  );
}

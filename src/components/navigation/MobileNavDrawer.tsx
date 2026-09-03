"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/BrandMark";
import {
  WellnessHubCard,
  WellnessNavRow,
} from "@/components/navigation/wellness/WellnessHubParts";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ChevronLeftIcon, CloseIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { wellnessNavigationConfig } from "@/config/wellness-navigation";
import { cn } from "@/lib/utils";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type PanelId = "root" | "support" | "resources";

/**
 * Smart Wellness Navigation V2 — premium mobile drawer with nested panels.
 * Desktop navigation remains unchanged in Navbar.
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const panelRefState = useRef<PanelId>("root");
  const [panel, setPanel] = useState<PanelId>("root");
  const config = wellnessNavigationConfig;

  const updatePanel = (next: PanelId) => {
    panelRefState.current = next;
    setPanel(next);
  };

  useEffect(() => {
    if (!open) {
      const resetTimer = window.setTimeout(() => {
        panelRefState.current = "root";
        setPanel("root");
      }, 320);
      return () => window.clearTimeout(resetTimer);
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (panelRefState.current !== "root") {
          updatePanel("root");
          return;
        }
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  const activeNested =
    panel === "support" || panel === "resources"
      ? config.panels[panel]
      : null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 xl:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close wellness navigation"
        className={cn(
          "absolute inset-0 bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)] transition-opacity duration-[280ms] ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "bg-surface absolute inset-y-0 right-0 flex w-[min(100%,22.5rem)] flex-col shadow-[0_8px_40px_rgba(43,51,44,0.14)] transition-transform duration-[300ms] ease-out motion-reduce:transition-none",
          "pt-[env(safe-area-inset-top)] pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-brand-muted/25 flex items-start justify-between gap-3 border-b px-4 pt-4 pb-3">
          <div className="min-w-0">
            <div id={titleId}>
              <BrandMark compact />
            </div>
            <p className="text-text-muted mt-1.5 text-xs leading-relaxed">
              {siteConfig.tagline}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-text hover:bg-background inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "flex h-full w-[200%] transition-transform duration-[280ms] ease-out motion-reduce:transition-none",
              panel === "root" ? "translate-x-0" : "-translate-x-1/2",
            )}
          >
            <div className="flex h-full w-1/2 flex-col overflow-y-auto overscroll-contain px-4 py-4">
              <div className="mb-4">
                <p className="text-brand font-serif text-lg leading-snug font-semibold tracking-tight">
                  {config.greeting}
                </p>
                <p className="text-text-muted mt-1 text-sm leading-relaxed">
                  {config.supportingText}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {config.hubActions.map((action, index) => (
                  <WellnessHubCard
                    key={action.id}
                    label={action.label}
                    description={action.description}
                    icon={action.icon}
                    emphasis={action.emphasis}
                    ctaLabel={action.ctaLabel}
                    href={action.kind === "link" ? action.href : undefined}
                    delayMs={open && panel === "root" ? index * 40 : 0}
                    onActivate={() => {
                      if (action.kind === "panel" && action.panelId) {
                        updatePanel(action.panelId);
                        return;
                      }
                      onClose();
                    }}
                  />
                ))}
              </div>

              <div className="border-brand-muted/20 mt-5 border-t pt-3">
                <p className="text-text-muted mb-1 px-1 text-[0.7rem] font-medium tracking-[0.14em] uppercase">
                  Practice
                </p>
                <ul className="flex flex-col">
                  {config.secondaryLinks.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="text-text hover:text-brand flex min-h-11 items-center justify-between rounded-lg px-2 text-sm font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
                      >
                        {link.label}
                        <span aria-hidden className="text-brand-muted">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-brand-muted/20 mt-4 border-t px-1 pt-4 pb-2">
                <ThemeSwitcher variant="inline" onThemeSelected={onClose} />
              </div>
            </div>

            <div className="flex h-full w-1/2 flex-col overflow-y-auto overscroll-contain px-4 py-4">
              <button
                type="button"
                onClick={() => updatePanel("root")}
                className="text-brand hover:bg-background mb-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back
              </button>

              {activeNested ? (
                <>
                  <div className="mb-3">
                    <h2 className="font-serif text-xl leading-snug font-semibold tracking-tight">
                      {activeNested.title}
                    </h2>
                    <p className="text-text-muted mt-1 text-sm leading-relaxed">
                      {activeNested.intro}
                    </p>
                  </div>

                  <ul className="flex flex-col gap-0.5">
                    {activeNested.items.map((item) => (
                      <li key={item.id}>
                        <WellnessNavRow
                          label={item.label}
                          description={item.description}
                          href={item.href}
                          icon={item.icon}
                          tone={item.tone === "support" ? "support" : "default"}
                          onNavigate={onClose}
                        />
                      </li>
                    ))}
                  </ul>

                  {activeNested.footer ? (
                    <div className="border-brand-muted/20 mt-4 border-t px-1 pt-3">
                      {activeNested.footer.description ? (
                        <p className="text-text-muted text-xs">
                          {activeNested.footer.description}
                        </p>
                      ) : null}
                      <Link
                        href={activeNested.footer.href}
                        onClick={onClose}
                        className="text-brand mt-1 inline-flex min-h-11 items-center text-sm font-medium no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
                      >
                        {activeNested.footer.label}
                        <span aria-hidden className="ml-1">
                          →
                        </span>
                      </Link>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

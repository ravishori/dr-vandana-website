"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/BrandMark";
import { NavLinkItem } from "@/components/navigation/NavLinkItem";
import { CloseIcon } from "@/components/ui/icons";
import type { NavCta, NavItem } from "@/types/navigation";
import { cn } from "@/lib/utils";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  cta: NavCta | null;
};

export function MobileNavDrawer({
  open,
  onClose,
  items,
  cta,
}: MobileNavDrawerProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
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

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation menu"
        className={cn(
          "absolute inset-0 bg-text/45 transition-opacity duration-[var(--transition-base)] motion-reduce:transition-none",
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
          "bg-surface absolute inset-y-0 right-0 flex w-[min(100%,20.5rem)] flex-col shadow-lg transition-transform duration-[var(--transition-base)] motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-brand-muted/30 flex items-start justify-between gap-3 border-b px-4 py-4">
          <div id={titleId}>
            <BrandMark compact />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-text hover:bg-background inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-md"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Mobile primary" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLinkItem
                  item={item}
                  onNavigate={onClose}
                  className="block w-full px-3 py-3 text-base"
                />
              </li>
            ))}
          </ul>
        </nav>

        {cta ? (
          <div className="border-brand-muted/30 border-t px-4 py-4">
            <Link
              href={cta.href}
              onClick={onClose}
              className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium no-underline"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type NavDropdownProps = {
  id: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wider panel for mega-menu layouts */
  mega?: boolean;
  children: ReactNode;
  className?: string;
};

export function NavDropdown({
  id,
  label,
  open,
  onOpenChange,
  mega = false,
  children,
  className,
}: NavDropdownProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [alignEnd, setAlignEnd] = useState(false);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        const trigger = rootRef.current?.querySelector<HTMLButtonElement>(
          "button[aria-haspopup='menu']",
        );
        trigger?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const panel = rootRef.current?.querySelector<HTMLElement>(
        "[data-nav-panel]",
      );
      if (!panel) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      const overflowRight = rect.right > window.innerWidth - 12;
      setAlignEnd(overflowRight);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, mega]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenChange(true);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          onOpenChange(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          onOpenChange(false);
        }
      }}
    >
      <button
        type="button"
        id={`${id}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palette-focus-ring)] focus-visible:ring-offset-2",
          open ? "text-brand" : "text-text-muted hover:text-brand",
        )}
      >
        {label}
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 opacity-70 transition-transform duration-[180ms] motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="menu"
        aria-labelledby={`${id}-trigger`}
        aria-hidden={!open}
        inert={!open}
        data-nav-panel
        className={cn(
          "absolute top-full z-50 pt-2",
          alignEnd ? "right-0" : "left-0",
          mega
            ? "w-[min(36rem,calc(100vw-2rem))]"
            : "w-[min(20rem,calc(100vw-2rem))]",
          open
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible",
        )}
      >
        <div
          className={cn(
            "border-brand-muted/30 bg-surface overflow-hidden rounded-[12px] border",
            "shadow-[0_8px_28px_rgba(43,51,44,0.08),0_1px_3px_rgba(43,51,44,0.04)]",
            "origin-top transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none",
            open
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

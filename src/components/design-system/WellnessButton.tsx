import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WellnessButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ai"
  | "emergency"
  | "ghost";

export type WellnessButtonProps = {
  children: ReactNode;
  variant?: WellnessButtonVariant;
  href?: string;
  external?: boolean;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  loading?: boolean;
  "aria-label"?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

const variantClasses: Record<WellnessButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-subtle)] hover:bg-[var(--color-primary-hover)] border border-transparent",
  secondary:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border border-[color-mix(in_srgb,var(--color-brand-muted)_45%,transparent)] hover:border-[var(--color-brand)] hover:bg-[var(--color-background)]",
  tertiary:
    "bg-transparent text-[var(--color-brand)] border border-transparent underline-offset-4 hover:underline",
  ai: "bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))] text-[var(--color-brand)] border border-[color-mix(in_srgb,var(--color-brand-muted)_40%,transparent)] hover:border-[var(--color-brand)]",
  emergency:
    "bg-[var(--color-emergency-soft)] text-[var(--color-emergency)] border border-[color-mix(in_srgb,var(--color-emergency)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-emergency)_18%,var(--color-surface))]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] border border-transparent hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-soft)]",
};

const baseClassName =
  "inline-flex min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-semibold no-underline transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--motion-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none active:scale-[0.99] motion-reduce:active:scale-100";

/**
 * Design-system button for new wellness UI.
 * Prefer this for new surfaces; leave existing `ButtonLink` usages intact.
 */
export function WellnessButton({
  children,
  variant = "primary",
  href,
  external = false,
  className,
  type = "button",
  disabled = false,
  loading = false,
  "aria-label": ariaLabel,
  onClick,
}: WellnessButtonProps) {
  const classes = cn(baseClassName, variantClasses[variant], className);
  const content = (
    <>
      {loading ? (
        <span
          className="inline-block h-4 w-4 animate-pulse rounded-full bg-current opacity-70 motion-reduce:animate-none"
          aria-hidden
        />
      ) : null}
      <span>{children}</span>
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          aria-disabled={disabled || loading || undefined}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading || undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

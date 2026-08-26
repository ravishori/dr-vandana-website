import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  className?: string;
  /** Opens in a new tab with noopener noreferrer when true. */
  external?: boolean;
  "aria-label"?: string;
};

const variantClasses = {
  primary:
    "bg-accent text-text hover:bg-accent/90 border border-transparent shadow-sm",
  secondary:
    "bg-surface text-brand border-brand-muted hover:border-brand hover:bg-background border",
  ghost:
    "text-brand hover:text-brand-muted border-transparent bg-transparent underline-offset-4 hover:underline",
  inverse:
    "bg-surface text-brand hover:bg-background border border-transparent",
} as const;

const baseClassName =
  "inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  external = false,
  "aria-label": ariaLabel,
}: ButtonLinkProps) {
  const classes = cn(baseClassName, variantClasses[variant], className);

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

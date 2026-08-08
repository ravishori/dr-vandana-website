import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  className?: string;
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

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

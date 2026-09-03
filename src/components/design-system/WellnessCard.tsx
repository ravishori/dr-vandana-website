import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WellnessCardProps = {
  children: ReactNode;
  className?: string;
  as?: "article" | "div" | "li" | "section" | "blockquote";
  padding?: "sm" | "md" | "lg";
  interactive?: boolean;
};

const paddingClasses = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

/**
 * Shared card shell — calm surface, soft border, optional interaction lift.
 */
export function WellnessCard({
  children,
  className,
  as: Component = "article",
  padding = "md",
  interactive = false,
}: WellnessCardProps) {
  return (
    <Component
      className={cn(
        "rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--color-brand-muted)_28%,transparent)] bg-[var(--color-surface)] shadow-[var(--shadow-subtle)]",
        paddingClasses[padding],
        interactive &&
          "transition-[transform,box-shadow,border-color] duration-[var(--motion-normal)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-brand-muted)_45%,transparent)] hover:shadow-[var(--shadow-card)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </Component>
  );
}

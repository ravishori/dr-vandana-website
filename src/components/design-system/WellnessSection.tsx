import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

export type WellnessSectionProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  "aria-labelledby"?: string;
  tone?: "default" | "soft" | "brand-soft";
};

/**
 * Section rhythm wrapper reusing existing `Section` + `Container`.
 */
export function WellnessSection({
  children,
  className,
  containerClassName,
  id,
  "aria-labelledby": ariaLabelledBy,
  tone = "default",
}: WellnessSectionProps) {
  return (
    <Section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        tone === "soft" && "bg-[var(--color-surface-soft)]",
        tone === "brand-soft" &&
          "bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-background))]",
        className,
      )}
    >
      <Container className={containerClassName}>{children}</Container>
    </Section>
  );
}

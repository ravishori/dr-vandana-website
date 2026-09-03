import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
  titleId?: string;
  actions?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleAs: TitleTag = "h2",
  titleId,
  actions,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-8 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-[var(--color-text-muted)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag
        id={titleId}
        className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-snug font-semibold tracking-tight text-[var(--color-brand)]"
      >
        {title}
      </TitleTag>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-[var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div
          className={cn(
            "mt-5 flex flex-wrap gap-3",
            align === "center" && "justify-center",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

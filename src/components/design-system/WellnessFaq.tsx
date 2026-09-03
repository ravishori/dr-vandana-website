import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WellnessFaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

export type WellnessFaqProps = {
  items: WellnessFaqItem[];
  className?: string;
  heading?: string;
  headingId?: string;
};

/**
 * Accessible FAQ using native disclosure — no extra dialog dependency.
 */
export function WellnessFaq({
  items,
  className,
  heading = "Frequently asked questions",
  headingId = "wellness-faq-heading",
}: WellnessFaqProps) {
  return (
    <section className={cn("w-full", className)} aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="font-serif text-2xl font-semibold text-[var(--color-brand)]"
      >
        {heading}
      </h2>
      <div className="mt-5 divide-y divide-[color-mix(in_srgb,var(--color-brand-muted)_25%,transparent)] border-y border-[color-mix(in_srgb,var(--color-brand-muted)_25%,transparent)]">
        {items.map((item) => (
          <details
            key={item.id}
            className="group py-3 open:bg-[color-mix(in_srgb,var(--color-brand)_4%,transparent)]"
          >
            <summary className="flex min-h-[var(--touch-target-min)] cursor-pointer list-none items-center justify-between gap-3 px-1 text-left text-base font-medium text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden
                className="text-[var(--color-brand)] transition-transform duration-[var(--motion-fast)] group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <div className="px-1 pt-2 pb-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

import { WellnessCard } from "@/components/design-system/WellnessCard";
import { WellnessButton } from "@/components/design-system/WellnessButton";
import { cn } from "@/lib/utils";

export type SupportCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: ComponentType<{ className?: string; title?: string }>;
  ctaLabel?: string;
  className?: string;
};

/**
 * Areas-of-support style card. Links only to caller-provided existing routes.
 */
export function SupportCard({
  title,
  description,
  href,
  icon: Icon,
  ctaLabel = "Learn more",
  className,
}: SupportCardProps) {
  return (
    <WellnessCard interactive className={cn("h-full", className)}>
      <div className="flex h-full flex-col gap-4">
        {Icon ? (
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-brand-muted)_35%,transparent)] bg-[var(--color-surface-soft)] text-[var(--color-brand)]"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="flex-1">
          <h3 className="font-serif text-lg font-semibold text-[var(--color-brand)]">
            <Link
              href={href}
              className="text-inherit no-underline hover:underline focus-visible:outline-none"
            >
              {title}
            </Link>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
        <WellnessButton href={href} variant="tertiary" className="self-start px-0">
          {ctaLabel}
        </WellnessButton>
      </div>
    </WellnessCard>
  );
}

export type AppointmentCardProps = {
  title?: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  footnote?: ReactNode;
  className?: string;
};

export function AppointmentCard({
  title = "Book an Appointment",
  description = "Schedule a calm, confidential consultation with Dr. Vandana.",
  href = "/book-appointment",
  ctaLabel = "Schedule Consultation",
  footnote,
  className,
}: AppointmentCardProps) {
  return (
    <WellnessCard
      className={cn(
        "border-[color-mix(in_srgb,var(--color-brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))]",
        className,
      )}
      padding="lg"
    >
      <h3 className="font-serif text-xl font-semibold text-[var(--color-brand)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-5">
        <WellnessButton href={href} variant="primary">
          {ctaLabel}
        </WellnessButton>
      </div>
      {footnote ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">{footnote}</p>
      ) : null}
    </WellnessCard>
  );
}

export type AIWellnessCardProps = {
  title?: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  disclaimer?: string;
  className?: string;
};

export function AIWellnessCard({
  title = "Ask Dr. Vandana AI",
  description = "Explore educational mental-wellness information. This assistant does not diagnose or replace professional care.",
  href = "/psychology/ask-dr-vandana-ai",
  ctaLabel = "Start Chat",
  disclaimer = "Educational guidance only — not emergency support.",
  className,
}: AIWellnessCardProps) {
  return (
    <WellnessCard
      className={cn(
        "border-[color-mix(in_srgb,var(--color-brand-muted)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))]",
        className,
      )}
      padding="lg"
    >
      <h3 className="font-serif text-xl font-semibold text-[var(--color-brand)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-5">
        <WellnessButton href={href} variant="ai">
          {ctaLabel}
        </WellnessButton>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]" role="note">
        {disclaimer}
      </p>
    </WellnessCard>
  );
}

export type ResourceCardProps = {
  title: string;
  description: string;
  href: string;
  meta?: string;
  className?: string;
};

export function ResourceCard({
  title,
  description,
  href,
  meta,
  className,
}: ResourceCardProps) {
  return (
    <WellnessCard interactive className={cn("h-full", className)} as="article">
      {meta ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--color-text-muted)] uppercase">
          {meta}
        </p>
      ) : null}
      <h3 className="font-serif text-lg font-semibold text-[var(--color-brand)]">
        <Link href={href} className="text-inherit no-underline hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
    </WellnessCard>
  );
}

export type TestimonialCardProps = {
  quote: string;
  attribution: string;
  context?: string;
  className?: string;
};

/**
 * Structural testimonial card. Do not invent patient stories —
 * only pass verified or clearly labelled illustrative content.
 */
export function TestimonialCard({
  quote,
  attribution,
  context,
  className,
}: TestimonialCardProps) {
  return (
    <WellnessCard className={className} as="blockquote">
      <p className="font-serif text-lg leading-relaxed text-[var(--color-text)]">
        “{quote}”
      </p>
      <footer className="mt-4 text-sm text-[var(--color-text-muted)]">
        <cite className="not-italic font-medium text-[var(--color-brand)]">
          {attribution}
        </cite>
        {context ? <span className="block mt-1">{context}</span> : null}
      </footer>
    </WellnessCard>
  );
}

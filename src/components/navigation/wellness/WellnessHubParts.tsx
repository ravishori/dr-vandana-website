"use client";

import type { CSSProperties, ComponentType } from "react";
import Link from "next/link";

import {
  AwarenessIcon,
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  FamilyIcon,
  HeartIcon,
  LeafIcon,
  ListenIcon,
  PersonIcon,
  ShieldIcon,
  SparkleIcon,
  WorkIcon,
} from "@/components/ui/icons";
import type { WellnessIconKey } from "@/types/wellness-navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<
  WellnessIconKey,
  ComponentType<{ className?: string; title?: string }>
> = {
  heart: HeartIcon,
  book: BookIcon,
  sparkle: SparkleIcon,
  calendar: CalendarIcon,
  person: PersonIcon,
  family: FamilyIcon,
  work: WorkIcon,
  leaf: LeafIcon,
  shield: ShieldIcon,
  awareness: AwarenessIcon,
  listen: ListenIcon,
  chevronRight: ChevronRightIcon,
};

function WellnessIcon({
  name,
  className,
}: {
  name: WellnessIconKey;
  className?: string;
}) {
  const Icon = iconMap[name];
  return <Icon className={className} />;
}

type WellnessHubCardProps = {
  label: string;
  description: string;
  icon: WellnessIconKey;
  emphasis?: "default" | "ai" | "appointment";
  ctaLabel?: string;
  href?: string;
  onActivate?: () => void;
  delayMs?: number;
};

export function WellnessHubCard({
  label,
  description,
  icon,
  emphasis = "default",
  ctaLabel,
  href,
  onActivate,
  delayMs = 0,
}: WellnessHubCardProps) {
  const className = cn(
    "group flex w-full items-start gap-3 rounded-[1.15rem] border px-4 py-3.5 text-left no-underline transition-[transform,background-color,border-color] duration-200 motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
    "active:scale-[0.99] motion-reduce:active:scale-100",
    emphasis === "default" &&
      "border-brand-muted/25 bg-surface hover:border-brand-muted/45 hover:bg-background",
    emphasis === "ai" &&
      "border-brand-muted/35 bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] hover:border-brand-muted/55",
    emphasis === "appointment" &&
      "border-brand/30 bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] hover:border-brand/50",
  );

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
          emphasis === "appointment"
            ? "border-brand/25 bg-brand text-white"
            : "border-brand-muted/30 bg-background text-brand",
        )}
      >
        <WellnessIcon name={icon} className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-text flex items-center justify-between gap-2">
          <span className="font-serif text-[1.05rem] leading-snug font-semibold tracking-tight">
            {label}
          </span>
          <ChevronRightIcon className="text-brand-muted h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
        <span className="text-text-muted mt-1 block text-sm leading-relaxed">
          {description}
        </span>
        {ctaLabel ? (
          <span
            className={cn(
              "mt-2.5 inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium",
              emphasis === "appointment"
                ? "bg-brand text-white"
                : "border-brand-muted/30 text-brand border bg-background",
            )}
          >
            {ctaLabel}
          </span>
        ) : null}
      </span>
    </>
  );

  const style: CSSProperties | undefined = delayMs
    ? { animationDelay: `${delayMs}ms` }
    : undefined;

  if (href) {
    return (
      <Link
        href={href}
        onClick={onActivate}
        className={cn(className, "wellness-hub-enter")}
        style={style}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(className, "wellness-hub-enter")}
      style={style}
    >
      {content}
    </button>
  );
}

type WellnessNavRowProps = {
  label: string;
  description?: string;
  href: string;
  icon: WellnessIconKey;
  tone?: "default" | "support";
  onNavigate?: () => void;
};

export function WellnessNavRow({
  label,
  description,
  href,
  icon,
  tone = "default",
  onNavigate,
}: WellnessNavRowProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-11 items-start gap-3 rounded-[0.9rem] px-3 py-2.5 no-underline transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
        tone === "support"
          ? "bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-surface))] hover:bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface))]"
          : "hover:bg-background",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
          tone === "support"
            ? "border-brand/20 bg-surface text-brand"
            : "border-brand-muted/25 bg-surface text-brand",
        )}
      >
        <WellnessIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-text flex items-center justify-between gap-2 text-sm font-medium">
          {label}
          <ChevronRightIcon className="text-brand-muted h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
        {description ? (
          <span className="text-text-muted mt-0.5 block text-xs leading-relaxed">
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

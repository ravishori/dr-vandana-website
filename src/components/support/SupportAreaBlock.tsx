import {
  WellnessButton,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import {
  AwarenessIcon,
  FamilyIcon,
  HeartIcon,
  WorkIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { SupportAreaDetail } from "@/types/support";

const areaIcons = {
  heart: HeartIcon,
  awareness: AwarenessIcon,
  family: FamilyIcon,
  work: WorkIcon,
} as const;

type SupportAreaBlockProps = {
  area: SupportAreaDetail;
  tone?: "default" | "muted";
};

/**
 * Areas of Support section block — Design System V1 adoption.
 * Preserves existing anchors, headings, topic content, and CTAs.
 */
export function SupportAreaBlock({
  area,
  tone = "default",
}: SupportAreaBlockProps) {
  const Icon = areaIcons[area.icon];
  const headingId = `${area.id}-heading`;

  return (
    <WellnessSection
      id={area.id}
      aria-labelledby={headingId}
      tone={tone === "muted" ? "soft" : "default"}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-brand-muted)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-brand)]"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="max-w-3xl">
          <h2
            id={headingId}
            className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-snug font-semibold tracking-tight text-[var(--color-brand)]"
          >
            {area.heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-text)] md:text-lg">
            {area.introduction}
          </p>
        </div>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {area.topics.map((topic) => (
          <WellnessCard
            key={topic.id}
            as="li"
            padding="sm"
            className={cn(
              "shadow-none",
              tone === "muted"
                ? "bg-[var(--color-background)]"
                : "bg-[var(--color-surface)]",
            )}
          >
            <h3 className="font-serif text-lg font-semibold text-[var(--color-brand)] md:text-xl">
              {topic.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">
              {topic.description}
            </p>
          </WellnessCard>
        ))}
      </ul>

      {area.closingNote ? (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {area.closingNote}
        </p>
      ) : null}

      {area.cta ? (
        <div className="mt-8">
          <WellnessButton href={area.cta.href} variant="secondary">
            {area.cta.label}
          </WellnessButton>
        </div>
      ) : null}
    </WellnessSection>
  );
}

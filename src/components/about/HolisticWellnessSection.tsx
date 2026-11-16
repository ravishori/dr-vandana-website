import {
  SectionHeading,
  WellnessSection,
} from "@/components/design-system";
import { LeafIcon } from "@/components/ui/icons";
import { aboutHolisticWellness } from "@/data/about";

/**
 * Holistic wellness — prose + nature cue; no card wrapping.
 */
export function HolisticWellnessSection() {
  return (
    <WellnessSection
      aria-labelledby="about-holistic-heading"
      tone="soft"
      containerClassName="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-12"
    >
      <div
        className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-brand-muted)_25%,transparent)] bg-[var(--color-background)] text-[var(--color-brand)]"
        aria-hidden="true"
      >
        <LeafIcon className="h-6 w-6" />
      </div>

      <div className="max-w-3xl">
        <SectionHeading
          title={aboutHolisticWellness.heading}
          titleId="about-holistic-heading"
          className="mb-6"
        />
        <div className="space-y-5">
          {aboutHolisticWellness.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-base leading-relaxed text-[var(--color-text)] md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </WellnessSection>
  );
}

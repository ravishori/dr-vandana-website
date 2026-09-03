import {
  SectionHeading,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import { homePhilosophy } from "@/data/home";

export function PhilosophySection() {
  return (
    <WellnessSection
      aria-labelledby="home-philosophy-heading"
      tone="soft"
      containerClassName="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start lg:gap-14"
    >
      <SectionHeading
        title={homePhilosophy.heading}
        titleId="home-philosophy-heading"
        description={homePhilosophy.lead}
        className="mb-0 max-w-2xl"
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {homePhilosophy.principles.map((principle) => (
          <WellnessCard
            key={principle}
            as="li"
            padding="sm"
            className="border-dashed shadow-none"
          >
            <p className="flex items-center gap-3 text-sm text-[var(--color-text)] md:text-base">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-brand-muted)_40%,transparent)]"
                aria-hidden="true"
              />
              {principle}
            </p>
          </WellnessCard>
        ))}
      </ul>
    </WellnessSection>
  );
}

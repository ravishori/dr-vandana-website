import {
  SectionHeading,
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import { aboutQualifications } from "@/data/about";

export function QualificationsSection() {
  return (
    <WellnessSection
      aria-labelledby="about-qualifications-heading"
      tone="soft"
    >
      <SectionHeading
        title={aboutQualifications.heading}
        titleId="about-qualifications-heading"
        description={aboutQualifications.description}
        className="max-w-2xl"
      />

      <ul className="grid gap-4 md:grid-cols-2">
        {aboutQualifications.items.map((qualification) => (
          <WellnessCard
            key={qualification}
            as="li"
            padding="md"
            className="shadow-none border-l-[3px] border-l-[var(--color-brand)] bg-[var(--color-background)]"
          >
            <p className="font-serif text-xl text-[var(--color-brand)] md:text-2xl">
              {qualification}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              [Institution and year to be confirmed]
            </p>
          </WellnessCard>
        ))}
      </ul>
    </WellnessSection>
  );
}

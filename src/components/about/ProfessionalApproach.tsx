import {
  SectionHeading,
  WellnessSection,
} from "@/components/design-system";
import { aboutApproach } from "@/data/about";

/**
 * Professional approach — open theme grid without cards
 * to avoid a card-heavy, promotional feel.
 */
export function ProfessionalApproach() {
  return (
    <WellnessSection
      aria-labelledby="about-approach-heading"
      tone="soft"
    >
      <SectionHeading
        title={aboutApproach.heading}
        titleId="about-approach-heading"
        description={aboutApproach.lead}
        className="max-w-2xl"
      />

      <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {aboutApproach.themes.map((theme) => (
          <li key={theme.id} className="max-w-md">
            <h3 className="font-serif text-xl font-semibold text-[var(--color-brand)]">
              {theme.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)] md:text-base">
              {theme.description}
            </p>
          </li>
        ))}
      </ul>
    </WellnessSection>
  );
}

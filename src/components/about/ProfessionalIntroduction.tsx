import {
  SectionHeading,
  WellnessSection,
} from "@/components/design-system";
import { aboutIntroduction } from "@/data/about";

/**
 * Professional introduction — prose-first.
 * Uses WellnessSection + SectionHeading; paragraphs stay uncarded for readability.
 */
export function ProfessionalIntroduction() {
  return (
    <WellnessSection
      aria-labelledby="about-introduction-heading"
      containerClassName="max-w-3xl"
    >
      <SectionHeading
        title={aboutIntroduction.heading}
        titleId="about-introduction-heading"
        className="mb-6"
      />
      <div className="space-y-5">
        {aboutIntroduction.paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="text-base leading-relaxed text-[var(--color-text)] md:text-lg"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </WellnessSection>
  );
}

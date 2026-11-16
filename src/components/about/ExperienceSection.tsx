import {
  WellnessCard,
  WellnessSection,
} from "@/components/design-system";
import { aboutExperience } from "@/data/about";

export function ExperienceSection() {
  return (
    <WellnessSection aria-labelledby="about-experience-heading">
      <WellnessCard
        padding="lg"
        className="mx-auto max-w-3xl text-center shadow-none"
      >
        <h2
          id="about-experience-heading"
          className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-snug font-semibold tracking-tight text-[var(--color-brand)]"
        >
          {aboutExperience.heading}
        </h2>
        <p className="mt-6 font-serif text-2xl leading-snug text-[var(--color-brand)] md:text-3xl">
          {aboutExperience.statement}
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {aboutExperience.note}
        </p>
      </WellnessCard>
    </WellnessSection>
  );
}

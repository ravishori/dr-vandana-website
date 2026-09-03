import {
  SectionHeading,
  WellnessButton,
  WellnessSection,
} from "@/components/design-system";
import { homeStressWellness } from "@/data/home";

export function StressWellnessHighlight() {
  return (
    <WellnessSection aria-labelledby="home-stress-heading">
      <div className="grid gap-8 rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--color-brand-muted)_25%,transparent)] bg-[var(--color-surface)] px-5 py-8 md:grid-cols-[minmax(0,1.3fr)_auto] md:items-end md:px-8 md:py-10">
        <SectionHeading
          title={homeStressWellness.heading}
          titleId="home-stress-heading"
          description={homeStressWellness.description}
          className="mb-0 max-w-2xl"
        />
        <WellnessButton href={homeStressWellness.href} variant="secondary">
          {homeStressWellness.ctaLabel}
        </WellnessButton>
      </div>
    </WellnessSection>
  );
}

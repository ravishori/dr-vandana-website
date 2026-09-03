import {
  WellnessButton,
  WellnessSection,
} from "@/components/design-system";
import { aboutCta } from "@/data/about";

export function AboutCta() {
  return (
    <WellnessSection
      aria-labelledby="about-cta-heading"
      className="pb-16 md:pb-20"
    >
      <div className="rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--color-brand-muted)_30%,transparent)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-brand-muted)_16%,var(--color-background)),var(--color-background))] px-5 py-10 text-center md:px-10 md:py-14">
        <h2
          id="about-cta-heading"
          className="mx-auto max-w-2xl font-serif text-[clamp(1.6rem,3vw,2.25rem)] font-semibold tracking-tight text-[var(--color-brand)]"
        >
          {aboutCta.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)] md:text-lg">
          {aboutCta.description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <WellnessButton href={aboutCta.primaryCta.href} variant="primary">
            {aboutCta.primaryCta.label}
          </WellnessButton>
          <WellnessButton
            href={aboutCta.secondaryCta.href}
            variant="secondary"
          >
            {aboutCta.secondaryCta.label}
          </WellnessButton>
        </div>
      </div>
    </WellnessSection>
  );
}

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutCta } from "@/data/about";

export function AboutCta() {
  return (
    <Section
      aria-labelledby="about-cta-heading"
      className="pb-16 md:pb-20"
    >
      <Container>
        <div className="border-brand-muted/30 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-brand-muted)_16%,var(--color-background)),var(--color-background))] rounded-[var(--radius-xl)] border px-5 py-10 text-center md:px-10 md:py-14">
          <h2
            id="about-cta-heading"
            className="mx-auto max-w-2xl text-[clamp(1.6rem,3vw,2.25rem)]"
          >
            {aboutCta.heading}
          </h2>
          <p className="text-text-muted mx-auto mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
            {aboutCta.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={aboutCta.primaryCta.href}>
              {aboutCta.primaryCta.label}
            </ButtonLink>
            <ButtonLink href={aboutCta.secondaryCta.href} variant="secondary">
              {aboutCta.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

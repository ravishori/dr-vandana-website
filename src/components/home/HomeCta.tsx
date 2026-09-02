import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homeFinalCta } from "@/data/home";

export function HomeCta() {
  return (
    <Section aria-labelledby="home-final-cta-heading" className="pb-12 sm:pb-16 md:pb-20">
      <Container>
        <div className="border-brand-muted/25 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-brand-muted)_16%,var(--color-background)),var(--color-surface))] rounded-[var(--radius-xl)] border px-4 py-8 text-center shadow-[var(--shadow-sm)] sm:px-6 sm:py-10 md:px-10 md:py-14">
          <h2
            id="home-final-cta-heading"
            className="mx-auto max-w-2xl text-[clamp(1.55rem,4vw,2.25rem)]"
          >
            {homeFinalCta.heading}
          </h2>
          <p className="text-text-muted mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:mt-5 md:text-lg">
            {homeFinalCta.description}
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <ButtonLink href={homeFinalCta.primaryCta.href} className="w-full sm:w-auto">
              {homeFinalCta.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={homeFinalCta.secondaryCta.href}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {homeFinalCta.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

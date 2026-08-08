import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homeFinalCta } from "@/data/home";

export function HomeCta() {
  return (
    <Section aria-labelledby="home-final-cta-heading" className="pb-16 md:pb-20">
      <Container>
        <div className="bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-brand-muted)_18%,var(--color-background)),var(--color-background))] border-brand-muted/30 rounded-[var(--radius-xl)] border px-5 py-10 text-center md:px-10 md:py-14">
          <h2
            id="home-final-cta-heading"
            className="mx-auto max-w-2xl text-[clamp(1.6rem,3vw,2.25rem)]"
          >
            {homeFinalCta.heading}
          </h2>
          <p className="text-text-muted mx-auto mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
            {homeFinalCta.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={homeFinalCta.primaryCta.href}>
              {homeFinalCta.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={homeFinalCta.secondaryCta.href}
              variant="secondary"
            >
              {homeFinalCta.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

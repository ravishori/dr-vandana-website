import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { counsellingFaqHero } from "@/data/counselling-faq/copy";

export function CounsellingHero() {
  return (
    <section
      aria-labelledby="counselling-faq-hero-heading"
      className="border-brand-muted/20 relative overflow-hidden border-b"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_18%,transparent),transparent_45%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_10%,var(--color-background)))]"
        aria-hidden="true"
      />
      <Container className="relative max-w-3xl py-14 md:py-16 lg:py-20">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          {counsellingFaqHero.eyebrow}
        </p>
        <h1
          id="counselling-faq-hero-heading"
          className="mt-4 text-[clamp(2rem,4.5vw,3.1rem)] leading-[1.15]"
        >
          {counsellingFaqHero.heading}
        </h1>
        <p className="text-brand-muted mt-4 font-serif text-xl md:text-2xl">
          {counsellingFaqHero.subheading}
        </p>
        <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
          {counsellingFaqHero.supportingText}
        </p>
        <p className="text-brand-muted mt-4 font-serif text-lg">
          Your Mental Well-being Matters.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href={counsellingFaqHero.primaryCta.href}>
            {counsellingFaqHero.primaryCta.label}
          </ButtonLink>
          <ButtonLink
            href={counsellingFaqHero.secondaryCta.href}
            variant="secondary"
          >
            {counsellingFaqHero.secondaryCta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

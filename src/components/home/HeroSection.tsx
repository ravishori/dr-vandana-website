import { HeroVisual } from "@/components/home/HeroVisual";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { homeHero } from "@/data/home";

export function HeroSection() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden border-b border-brand-muted/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_20%,transparent),transparent_50%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_70%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative grid items-stretch gap-8 py-12 sm:py-14 md:grid-cols-2 md:gap-8 md:py-16 lg:gap-12 lg:py-20 xl:gap-16">
        <div className="home-reveal flex max-w-xl flex-col justify-center md:max-w-none md:pr-2 lg:pr-4">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            {homeHero.eyebrow}
          </p>
          <h1
            id="home-hero-heading"
            className="mt-3 text-[clamp(2.1rem,6vw,3.5rem)] leading-[1.1] sm:mt-4"
          >
            {homeHero.heading}
          </h1>
          <p className="text-text mt-4 text-base leading-relaxed sm:mt-5 sm:text-lg">
            {homeHero.supportingStatement}
          </p>
          <p className="text-brand-muted mt-4 font-serif text-xl leading-snug sm:text-2xl">
            {homeHero.tagline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href={homeHero.primaryCta.href} className="w-full sm:w-auto">
              {homeHero.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={homeHero.secondaryCta.href}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {homeHero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="home-reveal home-reveal-delay min-h-[18rem] sm:min-h-[20rem] md:min-h-[24rem] lg:min-h-[28rem] xl:min-h-[32rem]">
          <HeroVisual />
        </div>
      </Container>
    </section>
  );
}

import { HeroVisual } from "@/components/home/HeroVisual";
import { WellnessButton } from "@/components/design-system";
import { Container } from "@/components/ui/Container";
import { homeHero } from "@/data/home";

/**
 * Homepage hero — high-risk surface.
 * Preserves layout, wording, hierarchy, and HeroVisual while aligning
 * typography/CTA controls with Design System tokens.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden border-b border-brand-muted/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_22%,transparent),transparent_42%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_10%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative grid items-center gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-20">
        <div className="home-reveal max-w-xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-text-muted)] uppercase">
            {homeHero.eyebrow}
          </p>
          <h1
            id="home-hero-heading"
            className="mt-3 font-serif text-[clamp(2.15rem,5vw,3.4rem)] leading-[1.12] font-semibold tracking-tight text-[var(--color-brand)]"
          >
            {homeHero.heading}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[var(--color-text)] md:text-lg">
            {homeHero.supportingStatement}
          </p>
          <p className="mt-4 font-serif text-xl text-[var(--color-brand-muted)] md:text-2xl">
            {homeHero.tagline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <WellnessButton href={homeHero.primaryCta.href} variant="primary">
              {homeHero.primaryCta.label}
            </WellnessButton>
            <WellnessButton
              href={homeHero.secondaryCta.href}
              variant="secondary"
            >
              {homeHero.secondaryCta.label}
            </WellnessButton>
          </div>
        </div>

        <div className="home-reveal home-reveal-delay min-h-[16rem] lg:min-h-[28rem]">
          <HeroVisual />
        </div>
      </Container>
    </section>
  );
}

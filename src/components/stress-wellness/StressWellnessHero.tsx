import { AboutNatureVisual } from "@/components/about/AboutNatureVisual";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { stressWellnessHero } from "@/data/stress-wellness";

export function StressWellnessHero() {
  return (
    <section
      aria-labelledby="stress-wellness-hero-heading"
      className="border-brand-muted/20 relative overflow-hidden border-b"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_18%,transparent),transparent_40%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_8%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative grid items-center gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12 lg:py-20">
        <div className="home-reveal max-w-2xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            {stressWellnessHero.eyebrow}
          </p>
          <h1
            id="stress-wellness-hero-heading"
            className="mt-4 text-[clamp(2rem,4.5vw,3.1rem)] leading-[1.15]"
          >
            {stressWellnessHero.heading}
          </h1>
          <p className="text-text mt-5 max-w-xl text-base leading-relaxed md:text-lg">
            {stressWellnessHero.supportingText}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href={stressWellnessHero.primaryCta.href}>
              {stressWellnessHero.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={stressWellnessHero.secondaryCta.href}
              variant="secondary"
            >
              {stressWellnessHero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="home-reveal home-reveal-delay min-h-[15rem] lg:min-h-[24rem]">
          <AboutNatureVisual
            caption="Steady breath. Clearer space."
            detail="A calm visual placeholder until an approved professional photograph is available."
          />
        </div>
      </Container>
    </section>
  );
}

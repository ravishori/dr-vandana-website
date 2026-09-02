import { AboutNatureVisual } from "@/components/about/AboutNatureVisual";
import { Container } from "@/components/ui/Container";
import { aboutHero } from "@/data/about";

export function AboutHero() {
  return (
    <section
      aria-labelledby="about-hero-heading"
      className="border-brand-muted/20 relative overflow-hidden border-b"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_18%,transparent),transparent_48%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_65%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative grid items-stretch gap-8 py-12 sm:py-14 md:gap-10 md:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <div className="home-reveal flex max-w-2xl flex-col justify-center lg:max-w-none">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            {aboutHero.subheading}
          </p>
          <h1
            id="about-hero-heading"
            className="mt-3 text-[clamp(2rem,5.5vw,3.1rem)] leading-[1.12] sm:mt-4"
          >
            {aboutHero.heading}
          </h1>
          <p className="text-text mt-4 max-w-xl text-base leading-relaxed sm:mt-5 md:text-lg">
            {aboutHero.supportingMessage}
          </p>
        </div>

        <div className="home-reveal home-reveal-delay min-h-[16rem] sm:min-h-[18rem] md:min-h-[22rem] lg:min-h-[26rem]">
          <AboutNatureVisual />
        </div>
      </Container>
    </section>
  );
}

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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_18%,transparent),transparent_40%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_8%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative grid items-center gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12 lg:py-20">
        <div className="home-reveal max-w-2xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            {aboutHero.subheading}
          </p>
          <h1
            id="about-hero-heading"
            className="mt-4 text-[clamp(2rem,4.5vw,3.1rem)] leading-[1.15]"
          >
            {aboutHero.heading}
          </h1>
          <p className="text-text mt-5 max-w-xl text-base leading-relaxed md:text-lg">
            {aboutHero.supportingMessage}
          </p>
        </div>

        <div className="home-reveal home-reveal-delay min-h-[15rem] lg:min-h-[24rem]">
          <AboutNatureVisual />
        </div>
      </Container>
    </section>
  );
}

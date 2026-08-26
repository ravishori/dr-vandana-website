import { Container } from "@/components/ui/Container";
import { supportHero } from "@/data/support";

export function SupportHero() {
  return (
    <section
      aria-labelledby="support-hero-heading"
      className="border-brand-muted/20 relative overflow-hidden border-b"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_16%,transparent),transparent_42%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_8%,var(--color-background)))]"
        aria-hidden="true"
      />

      <Container className="relative max-w-3xl py-14 md:py-16 lg:py-20">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Psychological counselling
        </p>
        <h1
          id="support-hero-heading"
          className="mt-4 text-[clamp(2rem,4.5vw,3.1rem)] leading-[1.15]"
        >
          {supportHero.heading}
        </h1>
        <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
          {supportHero.supportingText}
        </p>
      </Container>
    </section>
  );
}

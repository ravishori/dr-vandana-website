import { Container } from "@/components/ui/Container";

export function AskHero() {
  return (
    <section
      aria-labelledby="ask-ai-heading"
      className="relative overflow-hidden border-b border-brand-muted/20"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-brand-muted)_18%,transparent),transparent_44%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-brand-muted)_8%,var(--color-background)))]"
        aria-hidden="true"
      />
      <Container className="relative py-12 md:py-16">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Educational psychology assistant
        </p>
        <h1 id="ask-ai-heading" className="mt-4 max-w-3xl">
          Ask Dr. Vandana AI
        </h1>
        <p className="text-brand-muted mt-4 font-serif text-xl md:text-2xl">
          Understand psychology. Learn. Reflect. Explore.
        </p>
        <p className="text-text mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
          Ask educational questions about counselling, emotional well-being and
          how a psychologist may conceptually approach common concerns. This is
          not a diagnosis, treatment, or a replacement for Dr. Vandana.
        </p>
      </Container>
    </section>
  );
}

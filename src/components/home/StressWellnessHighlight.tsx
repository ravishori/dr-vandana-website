import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homeStressWellness } from "@/data/home";

export function StressWellnessHighlight() {
  return (
    <Section aria-labelledby="home-stress-heading">
      <Container>
        <div className="border-brand-muted/25 bg-surface grid gap-8 rounded-[var(--radius-xl)] border px-5 py-8 md:grid-cols-[minmax(0,1.3fr)_auto] md:items-end md:px-8 md:py-10">
          <div className="max-w-2xl">
            <h2 id="home-stress-heading">{homeStressWellness.heading}</h2>
            <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
              {homeStressWellness.description}
            </p>
          </div>
          <ButtonLink href={homeStressWellness.href} variant="secondary">
            {homeStressWellness.ctaLabel}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}

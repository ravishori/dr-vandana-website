import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homePhilosophy } from "@/data/home";

export function PhilosophySection() {
  return (
    <Section
      aria-labelledby="home-philosophy-heading"
      className="bg-surface-soft/60"
    >
      <Container className="grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-14">
        <div className="max-w-2xl">
          <h2 id="home-philosophy-heading">{homePhilosophy.heading}</h2>
          <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
            {homePhilosophy.lead}
          </p>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-3">
          {homePhilosophy.principles.map((principle) => (
            <li
              key={principle}
              className="border-brand-muted/25 bg-surface text-text flex min-h-[var(--touch-target-min)] items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm shadow-[var(--shadow-sm)] md:text-base"
            >
              <span
                className="bg-brand-muted/50 h-2 w-2 shrink-0 rounded-full"
                aria-hidden="true"
              />
              {principle}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { homePhilosophy } from "@/data/home";

export function PhilosophySection() {
  return (
    <Section
      aria-labelledby="home-philosophy-heading"
      className="bg-surface/70"
    >
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start lg:gap-14">
        <div className="max-w-2xl">
          <h2 id="home-philosophy-heading">{homePhilosophy.heading}</h2>
          <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
            {homePhilosophy.lead}
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {homePhilosophy.principles.map((principle) => (
            <li
              key={principle}
              className="border-brand-muted/30 text-text flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-sm md:text-base"
            >
              <span
                className="bg-brand-muted/40 h-2 w-2 shrink-0 rounded-full"
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

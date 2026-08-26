import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { healthyCoping } from "@/data/stress-wellness";

export function HealthyCopingSection() {
  return (
    <Section
      aria-labelledby="healthy-coping-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-3xl">
          <h2 id="healthy-coping-heading">{healthyCoping.heading}</h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {healthyCoping.lead}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {healthyCoping.practices.map((practice) => (
            <li
              key={practice.id}
              className="border-brand-muted/25 bg-background rounded-[var(--radius-lg)] border px-5 py-5"
            >
              <h3 className="font-serif text-lg text-[var(--color-brand)] md:text-xl">
                {practice.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {practice.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

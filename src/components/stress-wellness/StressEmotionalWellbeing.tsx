import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { stressEmotionalWellbeing } from "@/data/stress-wellness";

export function StressEmotionalWellbeing() {
  return (
    <Section
      aria-labelledby="stress-emotional-wellbeing-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-3xl">
          <h2 id="stress-emotional-wellbeing-heading">
            {stressEmotionalWellbeing.heading}
          </h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {stressEmotionalWellbeing.lead}
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stressEmotionalWellbeing.influences.map((item) => (
            <li
              key={item}
              className="border-brand-muted/30 text-text rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-sm md:text-base"
            >
              {item}
            </li>
          ))}
        </ul>

        <p className="text-text-muted mt-8 max-w-3xl text-sm leading-relaxed md:text-base">
          {stressEmotionalWellbeing.copingNote}
        </p>
      </Container>
    </Section>
  );
}

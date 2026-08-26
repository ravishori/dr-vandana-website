import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { depressionAwareness } from "@/data/stress-wellness";

export function DepressionAwarenessSection() {
  return (
    <Section
      aria-labelledby="depression-awareness-heading"
      className="bg-surface/70"
    >
      <Container className="max-w-3xl">
        <h2 id="depression-awareness-heading">
          {depressionAwareness.heading}
        </h2>
        <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
          {depressionAwareness.lead}
        </p>
        <p className="text-text mt-6 text-base leading-relaxed">
          {depressionAwareness.experiencesIntro}
        </p>
        <ul className="mt-4 space-y-3">
          {depressionAwareness.experiences.map((item) => (
            <li
              key={item.id}
              className="text-text flex items-start gap-3 text-base leading-relaxed"
            >
              <span
                className="bg-brand-muted/50 mt-2 h-2 w-2 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <aside
          className="border-brand-muted/40 bg-background mt-8 rounded-[var(--radius-lg)] border px-5 py-4"
          aria-label="Depression awareness note"
        >
          <p className="text-text-muted text-sm leading-relaxed md:text-base">
            {depressionAwareness.disclaimer}
          </p>
        </aside>
      </Container>
    </Section>
  );
}

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import {
  counsellingJourneyDisclaimer,
  counsellingJourneySteps,
  counsellingJourneySummary,
} from "@/data/counselling-faq/copy";

export function CounsellingJourney() {
  return (
    <Section aria-labelledby="counselling-journey-heading">
      <Container>
        <div className="max-w-3xl">
          <h2 id="counselling-journey-heading">How counselling works</h2>
          <p className="text-brand-muted mt-3 font-serif text-xl">
            {counsellingJourneySummary}
          </p>
          <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
            {counsellingJourneyDisclaimer}
          </p>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {counsellingJourneySteps.map((step, index) => (
            <li
              key={step.id}
              className="border-brand-muted/30 bg-surface rounded-[var(--radius-xl)] border p-5 shadow-[var(--shadow-sm)]"
            >
              <p className="text-text-muted text-xs font-medium tracking-[0.14em] uppercase">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-xl">{step.title}</h3>
              <p className="text-text-muted mt-3 text-sm leading-relaxed">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

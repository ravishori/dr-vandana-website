import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { stressUnderstanding } from "@/data/stress-wellness";

export function StressUnderstandingSection() {
  return (
    <Section aria-labelledby="stress-understanding-heading">
      <Container className="max-w-3xl">
        <h2 id="stress-understanding-heading">
          {stressUnderstanding.heading}
        </h2>
        <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
          {stressUnderstanding.lead}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="border-brand-muted/25 bg-surface rounded-[var(--radius-lg)] border px-5 py-5">
            <h3 className="font-serif text-xl text-[var(--color-brand)]">
              Short-term stress
            </h3>
            <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
              {stressUnderstanding.shortTermNote}
            </p>
          </div>
          <div className="border-brand-muted/25 bg-surface rounded-[var(--radius-lg)] border px-5 py-5">
            <h3 className="font-serif text-xl text-[var(--color-brand)]">
              Ongoing stress
            </h3>
            <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
              {stressUnderstanding.ongoingNote}
            </p>
          </div>
        </div>
        <p className="text-text-muted mt-6 text-sm leading-relaxed md:text-base">
          {stressUnderstanding.closingNote}
        </p>
      </Container>
    </Section>
  );
}

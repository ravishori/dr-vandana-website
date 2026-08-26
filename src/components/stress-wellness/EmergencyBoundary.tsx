import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { stressEmergencyBoundary } from "@/data/stress-wellness";

export function EmergencyBoundary() {
  return (
    <Section aria-labelledby="emergency-boundary-heading" className="py-10">
      <Container>
        <aside
          className="border-brand-muted/40 bg-background rounded-[var(--radius-lg)] border px-5 py-5 md:px-6"
          aria-label="Emergency information"
        >
          <h2
            id="emergency-boundary-heading"
            className="font-sans text-base font-semibold tracking-wide text-[var(--color-brand)]"
          >
            {stressEmergencyBoundary.title}
          </h2>
          <p className="text-text mt-3 text-sm leading-relaxed md:text-base">
            {stressEmergencyBoundary.message}
          </p>
          <p className="text-text-muted mt-3 text-sm leading-relaxed">
            {stressEmergencyBoundary.clarification}
          </p>
          <p className="text-text-muted mt-2 text-xs leading-relaxed">
            {stressEmergencyBoundary.note}
          </p>
        </aside>
      </Container>
    </Section>
  );
}

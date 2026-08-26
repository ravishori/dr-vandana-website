import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { whenProfessionalSupport } from "@/data/stress-wellness";

export function WhenProfessionalSupportMayHelp() {
  return (
    <Section
      aria-labelledby="when-professional-support-heading"
      className="bg-surface/70"
    >
      <Container className="max-w-3xl">
        <h2 id="when-professional-support-heading">
          {whenProfessionalSupport.heading}
        </h2>
        <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
          {whenProfessionalSupport.introduction}
        </p>
        <ul className="mt-6 space-y-3">
          {whenProfessionalSupport.points.map((point) => (
            <li
              key={point}
              className="text-text flex items-start gap-3 text-base leading-relaxed"
            >
              <span
                className="bg-brand-muted/50 mt-2 h-2 w-2 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="text-text-muted mt-6 text-sm leading-relaxed md:text-base">
          {whenProfessionalSupport.closingNote}
        </p>
      </Container>
    </Section>
  );
}

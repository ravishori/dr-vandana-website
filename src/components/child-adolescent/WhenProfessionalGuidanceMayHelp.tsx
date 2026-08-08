import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { whenGuidanceMayHelp } from "@/data/child-adolescent";

export function WhenProfessionalGuidanceMayHelp() {
  return (
    <Section aria-labelledby="when-guidance-may-help-heading">
      <Container className="max-w-3xl">
        <h2 id="when-guidance-may-help-heading">
          {whenGuidanceMayHelp.heading}
        </h2>
        <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
          {whenGuidanceMayHelp.introduction}
        </p>
        <ul className="mt-6 space-y-3">
          {whenGuidanceMayHelp.points.map((point) => (
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
          {whenGuidanceMayHelp.closingNote}
        </p>
      </Container>
    </Section>
  );
}

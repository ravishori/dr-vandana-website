import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { whenSupportMayHelp } from "@/data/support";

export function WhenSupportMayHelp() {
  return (
    <Section aria-labelledby="when-support-may-help-heading">
      <Container className="max-w-3xl">
        <h2 id="when-support-may-help-heading">{whenSupportMayHelp.heading}</h2>
        <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
          {whenSupportMayHelp.introduction}
        </p>
        <ul className="mt-6 space-y-3">
          {whenSupportMayHelp.points.map((point) => (
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
          {whenSupportMayHelp.closingNote}
        </p>
      </Container>
    </Section>
  );
}

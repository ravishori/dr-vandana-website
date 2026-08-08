import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { developmentSection } from "@/data/child-adolescent";

export function DevelopmentSection() {
  return (
    <Section aria-labelledby="development-heading">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <div className="max-w-2xl">
          <h2 id="development-heading">{developmentSection.heading}</h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {developmentSection.lead}
          </p>
          <p className="text-text-muted mt-5 text-sm leading-relaxed md:text-base">
            {developmentSection.closingNote}
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {developmentSection.themes.map((theme) => (
            <li
              key={theme}
              className="border-brand-muted/30 text-text flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-sm md:text-base"
            >
              <span
                className="bg-brand-muted/40 h-2 w-2 shrink-0 rounded-full"
                aria-hidden="true"
              />
              {theme}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

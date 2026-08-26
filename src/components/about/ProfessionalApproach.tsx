import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutApproach } from "@/data/about";

export function ProfessionalApproach() {
  return (
    <Section
      aria-labelledby="about-approach-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id="about-approach-heading">{aboutApproach.heading}</h2>
          <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
            {aboutApproach.lead}
          </p>
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {aboutApproach.themes.map((theme) => (
            <li key={theme.id} className="max-w-md">
              <h3 className="font-serif text-xl text-[var(--color-brand)]">
                {theme.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {theme.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

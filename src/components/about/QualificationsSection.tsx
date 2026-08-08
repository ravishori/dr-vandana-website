import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutQualifications } from "@/data/about";

export function QualificationsSection() {
  return (
    <Section
      aria-labelledby="about-qualifications-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-2xl">
          <h2 id="about-qualifications-heading">
            {aboutQualifications.heading}
          </h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed">
            {aboutQualifications.description}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {aboutQualifications.items.map((qualification) => (
            <li
              key={qualification}
              className="border-brand-muted/30 border-l-[3px] border-l-[var(--color-brand)] bg-background px-5 py-5"
            >
              <p className="font-serif text-xl text-[var(--color-brand)] md:text-2xl">
                {qualification}
              </p>
              <p className="text-text-muted mt-2 text-sm">
                [Institution and year to be confirmed]
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

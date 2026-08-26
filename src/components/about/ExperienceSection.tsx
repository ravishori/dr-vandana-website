import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutExperience } from "@/data/about";

export function ExperienceSection() {
  return (
    <Section aria-labelledby="about-experience-heading">
      <Container>
        <div className="border-brand-muted/25 bg-surface mx-auto max-w-3xl rounded-[var(--radius-xl)] border px-6 py-10 text-center md:px-10 md:py-12">
          <h2 id="about-experience-heading">{aboutExperience.heading}</h2>
          <p className="text-brand mt-6 font-serif text-2xl leading-snug md:text-3xl">
            {aboutExperience.statement}
          </p>
          <p className="text-text-muted mx-auto mt-5 max-w-2xl text-sm leading-relaxed">
            {aboutExperience.note}
          </p>
        </div>
      </Container>
    </Section>
  );
}

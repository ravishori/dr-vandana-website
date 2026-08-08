import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { aboutIntroduction } from "@/data/about";

export function ProfessionalIntroduction() {
  return (
    <Section aria-labelledby="about-introduction-heading">
      <Container className="max-w-3xl">
        <h2 id="about-introduction-heading">{aboutIntroduction.heading}</h2>
        <div className="mt-6 space-y-5">
          {aboutIntroduction.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-text text-base leading-relaxed md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </Section>
  );
}

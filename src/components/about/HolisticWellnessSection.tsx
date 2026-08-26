import { Container } from "@/components/ui/Container";
import { LeafIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { aboutHolisticWellness } from "@/data/about";

export function HolisticWellnessSection() {
  return (
    <Section
      aria-labelledby="about-holistic-heading"
      className="bg-surface/70"
    >
      <Container className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div
          className="bg-background text-brand border-brand-muted/25 inline-flex h-14 w-14 items-center justify-center rounded-full border"
          aria-hidden="true"
        >
          <LeafIcon className="h-6 w-6" />
        </div>

        <div className="max-w-3xl">
          <h2 id="about-holistic-heading">{aboutHolisticWellness.heading}</h2>
          <div className="mt-6 space-y-5">
            {aboutHolisticWellness.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-text text-base leading-relaxed md:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { LegalPageContent } from "@/data/legal";

type LegalDocumentProps = {
  content: LegalPageContent;
};

export function LegalDocument({ content }: LegalDocumentProps) {
  return (
    <>
      <section
        aria-labelledby="legal-document-heading"
        className="border-brand-muted/20 border-b"
      >
        <Container className="max-w-3xl py-14 md:py-16">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Legal information
          </p>
          <h1
            id="legal-document-heading"
            className="mt-4 text-[clamp(2rem,4vw,2.75rem)]"
          >
            {content.title}
          </h1>
          <p className="text-text mt-5 text-base leading-relaxed md:text-lg">
            {content.intro}
          </p>
        </Container>
      </section>

      <Section aria-labelledby="legal-document-sections">
        <Container className="max-w-3xl">
          <h2 id="legal-document-sections" className="sr-only">
            {content.title} details
          </h2>
          <div className="space-y-10">
            {content.sections.map((section) => {
              const headingId = section.heading
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

              return (
              <section key={section.heading} aria-labelledby={headingId}>
                <h3
                  id={headingId}
                  className="font-serif text-xl text-[var(--color-brand)] md:text-2xl"
                >
                  {section.heading}
                </h3>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-text text-base leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
              );
            })}
          </div>
          <p className="text-text-muted mt-10 text-sm leading-relaxed">
            {content.closingNote}
          </p>
        </Container>
      </Section>
    </>
  );
}

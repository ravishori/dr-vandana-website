import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export function ResourcesHighlight() {
  return (
    <Section aria-labelledby="home-resources-heading">
      <Container>
        <div className="border-brand-muted/30 bg-surface max-w-3xl rounded-[var(--radius-xl)] border px-5 py-8 md:px-8">
          <h2 id="home-resources-heading">Explore Mental Wellness Resources</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed">
            Discover carefully selected books, research, articles and trusted
            resources to support learning and awareness around mental
            well-being.
          </p>
          <div className="mt-6">
            <ButtonLink href="/resources" variant="secondary">
              Explore Resource Library
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

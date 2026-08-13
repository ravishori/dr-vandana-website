import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { isCounsellingRightForMe } from "@/data/counselling-faq/copy";

export function IsCounsellingRightForMe() {
  return (
    <Section aria-labelledby="is-counselling-right-heading">
      <Container>
        <div className="border-brand-muted/30 bg-surface max-w-3xl rounded-[var(--radius-xl)] border px-5 py-8 md:px-8">
          <h2 id="is-counselling-right-heading">
            {isCounsellingRightForMe.heading}
          </h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed">
            {isCounsellingRightForMe.text}
          </p>
          <div className="mt-6">
            <ButtonLink href={isCounsellingRightForMe.cta.href} variant="secondary">
              {isCounsellingRightForMe.cta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

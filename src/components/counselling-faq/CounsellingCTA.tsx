import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { counsellingFaqClosing } from "@/data/counselling-faq/copy";

export function CounsellingCTA() {
  return (
    <Section aria-labelledby="counselling-faq-closing-heading">
      <Container>
        <div className="border-brand-muted/30 bg-surface-soft max-w-3xl rounded-[var(--radius-xl)] border px-5 py-8 md:px-8">
          <h2 id="counselling-faq-closing-heading">
            {counsellingFaqClosing.heading}
          </h2>
          <p className="mt-4 text-base leading-relaxed">
            {counsellingFaqClosing.text}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href={counsellingFaqClosing.primaryCta.href}>
              {counsellingFaqClosing.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={counsellingFaqClosing.secondaryCta.href}
              variant="secondary"
            >
              {counsellingFaqClosing.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}

import { AskSupportCta } from "@/components/ai/AskSupportCta";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { CaseStudyRecord } from "@/types/ai";

function ListBlock({
  heading,
  items,
}: {
  heading: string;
  items: readonly string[];
}) {
  const headingId = heading.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-2xl">
        {heading}
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        {items.map((item) => (
          <li key={item} className="text-text leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseStudyView({ study }: { study: CaseStudyRecord }) {
  return (
    <>
      <Section className="border-b border-brand-muted/20 pt-12 md:pt-16">
        <Container className="max-w-3xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Educational case study
          </p>
          <h1 className="mt-4">{study.title}</h1>
          <p className="text-brand-muted mt-3 font-serif text-xl">
            {study.ageRange}
          </p>
          <p
            className="border-accent/40 bg-surface-soft mt-6 rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed"
            role="note"
          >
            {study.disclaimer}
          </p>
          <p className="mt-6 text-base leading-relaxed md:text-lg">
            {study.generalContext}
          </p>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-3xl space-y-10">
          <ListBlock heading="Presenting concerns" items={study.presentingConcerns} />
          <ListBlock
            heading="Factors a psychologist may explore"
            items={study.backgroundFactors}
          />
          <ListBlock
            heading="Assessment considerations"
            items={study.assessmentConsiderations}
          />
          <ListBlock heading="Formulation concepts" items={study.formulation} />
          <ListBlock heading="Possible approaches" items={study.possibleApproaches} />
          <ListBlock heading="Monitoring" items={study.monitoring} />
          <ListBlock
            heading="Referral considerations"
            items={study.referralConsiderations}
          />
          <ListBlock heading="Educational takeaway" items={study.educationalLessons} />

          <AskSupportCta />

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/psychology/case-studies" variant="secondary">
              All educational case studies
            </ButtonLink>
            <ButtonLink href="/psychology/ask-dr-vandana-ai">
              Ask Dr. Vandana AI
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

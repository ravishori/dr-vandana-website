import type { Metadata } from "next";

import { PublicQuestionForm } from "@/components/question-portal/PublicQuestionForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { questionPortalCopy } from "@/data/question-portal";

export const metadata: Metadata = {
  title: questionPortalCopy.seo.title,
  description: questionPortalCopy.seo.description,
  alternates: { canonical: "/ask-a-question" },
  openGraph: {
    title: questionPortalCopy.seo.title.absolute,
    description: questionPortalCopy.seo.description,
    url: "/ask-a-question",
  },
};

export default function AskAQuestionPage() {
  return (
    <>
      <Section className="border-b border-brand-muted/20 pt-12 md:pt-16">
        <Container className="max-w-3xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            {questionPortalCopy.hero.eyebrow}
          </p>
          <h1 className="mt-4">{questionPortalCopy.hero.heading}</h1>
          <p className="mt-5 text-base leading-relaxed md:text-lg">
            {questionPortalCopy.hero.supportingText}
          </p>
          <p className="text-brand-muted mt-4 font-serif text-xl">
            Your Mental Well-being Matters.
          </p>
          <div className="mt-8">
            <ButtonLink href="/psychology/ask-dr-vandana-ai" variant="secondary">
              Explore educational Ask AI instead
            </ButtonLink>
          </div>
        </Container>
      </Section>
      <PublicQuestionForm />
    </>
  );
}

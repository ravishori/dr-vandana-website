import { AskSupportCta } from "@/components/ai/AskSupportCta";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { PsychologyTopicPage } from "@/data/ai/seo-topics";

export function PsychologyTopicView({ page }: { page: PsychologyTopicPage }) {
  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          {page.eyebrow}
        </p>
        <h1 className="mt-4">{page.heading}</h1>
        <p className="mt-5 text-base leading-relaxed md:text-lg">{page.intro}</p>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-10 space-y-3">
          <h2>Ask a related question</h2>
          <ul className="list-disc space-y-2 pl-5">
            {page.relatedQuestions.map((question) => (
              <li key={question}>
                <ButtonLink
                  href="/psychology/ask-dr-vandana-ai"
                  variant="ghost"
                  className="px-0"
                >
                  {question}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={page.relatedHref} variant="secondary">
            Related practice page
          </ButtonLink>
          <ButtonLink href="/psychology/ask-dr-vandana-ai">
            Ask Dr. Vandana AI
          </ButtonLink>
        </div>
        <div className="mt-10">
          <AskSupportCta />
        </div>
      </Container>
    </Section>
  );
}

import type { Metadata } from "next";

import { CaseStudyCard } from "@/components/case-studies/CaseStudyCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { caseStudyRecords } from "@/data/ai/knowledge/case-studies";
import { professionalProfile } from "@/data/professional";

const title = `Educational Case Studies | ${professionalProfile.name}`;
const description =
  "Fictional, anonymised educational psychology case studies that illustrate how a psychologist may conceptually approach common concerns. Not diagnoses or treatment recommendations.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/psychology/case-studies",
  },
  openGraph: {
    title,
    description,
    url: "/psychology/case-studies",
  },
};

export default function CaseStudiesIndexPage() {
  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Psychology education
        </p>
        <h1 className="mt-4 max-w-3xl">Educational case studies</h1>
        <p className="text-text mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
          These scenarios are fictional teaching examples. They are not real
          patient records and they are not diagnoses or treatment
          recommendations.
        </p>
        <p
          className="border-accent/40 bg-surface-soft mt-6 max-w-2xl rounded-[var(--radius-md)] border px-4 py-3 text-sm leading-relaxed"
          role="note"
        >
          Educational case study — not a diagnosis or treatment recommendation.
        </p>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {caseStudyRecords.map((study) => (
            <li key={study.slug}>
              <CaseStudyCard study={study} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <ButtonLink href="/psychology/ask-dr-vandana-ai">
            Ask Dr. Vandana AI
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}

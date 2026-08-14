import type { Metadata } from "next";

import { ConfidentialityNotice } from "@/components/counselling-faq/ConfidentialityNotice";
import { CounsellingCTA } from "@/components/counselling-faq/CounsellingCTA";
import { CounsellingHero } from "@/components/counselling-faq/CounsellingHero";
import { CounsellingJourney } from "@/components/counselling-faq/CounsellingJourney";
import { EmergencySupportCard } from "@/components/counselling-faq/EmergencySupportCard";
import { FAQExplorer } from "@/components/counselling-faq/FAQExplorer";
import { IsCounsellingRightForMe } from "@/components/counselling-faq/IsCounsellingRightForMe";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { counsellingFaqSeo } from "@/data/counselling-faq/copy";
import { getPublishedFaqs } from "@/data/counselling-faq/faqs";
import { listPublicCrisisResources } from "@/lib/crisis/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: counsellingFaqSeo.title },
  description: counsellingFaqSeo.description,
  alternates: { canonical: counsellingFaqSeo.path },
  openGraph: {
    title: counsellingFaqSeo.title,
    description: counsellingFaqSeo.description,
    url: counsellingFaqSeo.path,
  },
};

export default async function UnderstandingCounsellingPage() {
  const faqs = getPublishedFaqs();
  const { resources } = await listPublicCrisisResources();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((faq) => !faq.emergencyRelated)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <CounsellingHero />
      <CounsellingJourney />
      <Section aria-labelledby="faq-heading">
        <Container>
          <div className="max-w-3xl">
            <h2 id="faq-heading">Common questions</h2>
            <p className="text-text-muted mt-3 text-sm leading-relaxed md:text-base">
              Browse by category or search for a question. Answers are
              educational and do not replace individual psychological assessment
              or counselling.
            </p>
          </div>
          <div className="mt-8">
            <FAQExplorer faqs={faqs} />
          </div>
        </Container>
      </Section>
      <ConfidentialityNotice />
      <EmergencySupportCard resources={resources} />
      <IsCounsellingRightForMe />
      <CounsellingCTA />
    </>
  );
}

import type { Metadata } from "next";

import { CrisisSupportPageContent } from "@/components/crisis/CrisisSupportPageContent";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { professionalProfile } from "@/data/professional";
import { listPublicCrisisResources } from "@/lib/crisis/service";

export const dynamic = "force-dynamic";

const title = `Mental Health Support & Emergency Helplines in India | ${professionalProfile.name}`;
const description =
  "Find verified mental-health, emergency and support helplines in India, including Tele-MANAS, emergency 112 and Child Helpline 1098.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/mental-health-support" },
  openGraph: {
    title,
    description,
    url: "/mental-health-support",
  },
};

export default async function MentalHealthSupportPage() {
  const { resources, usedFallback } = await listPublicCrisisResources();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What number should I call in immediate danger in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If there is an immediate risk to life or serious danger, call 112, India's unified emergency response number (https://112.gov.in/).",
        },
      },
      {
        "@type": "Question",
        name: "What is Tele-MANAS?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tele-MANAS is a Government of India 24×7 tele-mental-health support service. Call 14416 or 1800-89-14416. Official information is published by MoHFW/DGHS.",
        },
      },
      {
        "@type": "Question",
        name: "What is Child Helpline 1098?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Child Helpline 1098 is a Government of India service for children in need of care and protection under Mission Vatsalya, integrated with ERSS 112.",
        },
      },
    ],
  };

  return (
    <Section className="pt-12 md:pt-16">
      <Container>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <CrisisSupportPageContent
          resources={resources}
          usedFallback={usedFallback}
        />
      </Container>
    </Section>
  );
}

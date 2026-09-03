import type { Metadata } from "next";

import { AskHero } from "@/components/ai/AskHero";
import { AskInterface } from "@/components/ai/AskInterface";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/config/site";
import { quickQuestionCards } from "@/data/ai/quick-questions";
import { professionalProfile } from "@/data/professional";

const title = `Ask Dr. Vandana AI | ${professionalProfile.name}`;
const description =
  "Ask educational questions about psychology, counselling and emotional well-being. This assistant does not diagnose, treat, or replace a consultation with Dr. Vandana Rajiv Chaudhary.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/psychology/ask-dr-vandana-ai",
  },
  openGraph: {
    title,
    description,
    url: "/psychology/ask-dr-vandana-ai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AskDrVandanaAiPage() {
  return (
    <>
      <AskHero />
      <Section>
        <Container className="max-w-5xl">
          <AskInterface cards={quickQuestionCards} />
          <p className="text-text-muted mt-10 text-sm">
            Private conversations are not published as pages on{" "}
            {siteConfig.domain}. Educational articles and case studies are
            prepared separately from any chat.
          </p>
        </Container>
      </Section>
    </>
  );
}

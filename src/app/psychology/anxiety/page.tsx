import type { Metadata } from "next";

import { PsychologyTopicView } from "@/components/ai/PsychologyTopicView";
import { getPsychologyTopicPage } from "@/data/ai/seo-topics";

const page = getPsychologyTopicPage("anxiety");

export const metadata: Metadata = {
  title: { absolute: page.title },
  description: page.description,
  alternates: { canonical: "/psychology/anxiety" },
  openGraph: {
    title: page.title,
    description: page.description,
    url: "/psychology/anxiety",
  },
};

export default function AnxietyTopicPage() {
  return <PsychologyTopicView page={page} />;
}

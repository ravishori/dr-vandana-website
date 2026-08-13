import type { Metadata } from "next";

import { PsychologyTopicView } from "@/components/ai/PsychologyTopicView";
import { getPsychologyTopicPage } from "@/data/ai/seo-topics";

const page = getPsychologyTopicPage("counselling");

export const metadata: Metadata = {
  title: { absolute: page.title },
  description: page.description,
  alternates: { canonical: "/psychology/counselling" },
  openGraph: {
    title: page.title,
    description: page.description,
    url: "/psychology/counselling",
  },
};

export default function CounsellingTopicPage() {
  return <PsychologyTopicView page={page} />;
}

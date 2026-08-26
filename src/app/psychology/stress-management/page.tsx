import type { Metadata } from "next";

import { PsychologyTopicView } from "@/components/ai/PsychologyTopicView";
import { getPsychologyTopicPage } from "@/data/ai/seo-topics";

const page = getPsychologyTopicPage("stress-management");

export const metadata: Metadata = {
  title: { absolute: page.title },
  description: page.description,
  alternates: { canonical: "/psychology/stress-management" },
  openGraph: {
    title: page.title,
    description: page.description,
    url: "/psychology/stress-management",
  },
};

export default function StressManagementTopicPage() {
  return <PsychologyTopicView page={page} />;
}

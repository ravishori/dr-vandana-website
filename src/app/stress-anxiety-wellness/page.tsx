import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Stress & Wellness",
  description:
    "Stress, anxiety, and emotional wellness information. Full page content will follow in a later milestone.",
};

export default function StressAnxietyWellnessPage() {
  return (
    <PlaceholderPage
      title="Stress, Anxiety & Emotional Wellness"
      description="Educational wellness content will be added in a later milestone."
    />
  );
}

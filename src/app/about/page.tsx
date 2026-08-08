import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Dr. Vandana Rajiv Chaudhary, Psychologist. Full biography content will follow in a later milestone.",
};

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      description="Professional biography and approach content will be added in a later milestone."
    />
  );
}

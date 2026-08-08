import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Website disclaimer. Full legal content will follow in a later milestone.",
};

export default function DisclaimerPage() {
  return (
    <PlaceholderPage
      title="Disclaimer"
      description="Full disclaimer content will be added in a later milestone. This website is not an emergency service."
    />
  );
}

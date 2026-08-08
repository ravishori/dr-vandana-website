import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact information for Dr. Vandana Rajiv Chaudhary. Verified contact details will follow in a later milestone.",
};

export default function ContactPage() {
  return (
    <PlaceholderPage
      title="Contact"
      description="Verified contact details and location information will be added when confirmed."
    />
  );
}

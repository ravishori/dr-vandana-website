import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for drvandana.trinetra.net. Full legal content will follow in a later milestone.",
};

export default function PrivacyPolicyPage() {
  return (
    <PlaceholderPage
      title="Privacy Policy"
      description="Full privacy policy content will be added in a later milestone."
    />
  );
}

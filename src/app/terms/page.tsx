import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Website terms. Full legal content will follow in a later milestone.",
};

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Terms"
      description="Full terms content will be added in a later milestone."
    />
  );
}

import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Areas of Support",
  description:
    "Areas of psychological support. Detailed practice areas will follow in a later milestone.",
};

export default function AreasOfSupportPage() {
  return (
    <PlaceholderPage
      title="Areas of Support"
      description="Detailed support areas will be added in a later milestone."
    />
  );
}

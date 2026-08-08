import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Child & Adolescent Psychology",
  description:
    "Child and adolescent psychology information. Full page content will follow in a later milestone.",
};

export default function ChildAdolescentPsychologyPage() {
  return (
    <PlaceholderPage
      title="Child & Adolescent Psychology"
      description="Child and adolescent support content will be added in a later milestone."
    />
  );
}

import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { privacyPolicyContent } from "@/data/legal";

export const metadata: Metadata = {
  title: {
    absolute: privacyPolicyContent.absoluteTitle,
  },
  description: privacyPolicyContent.description,
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: privacyPolicyContent.absoluteTitle,
    description: privacyPolicyContent.description,
    url: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return <LegalDocument content={privacyPolicyContent} />;
}

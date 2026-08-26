import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { termsContent } from "@/data/legal";

export const metadata: Metadata = {
  title: {
    absolute: termsContent.absoluteTitle,
  },
  description: termsContent.description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: termsContent.absoluteTitle,
    description: termsContent.description,
    url: "/terms",
  },
};

export default function TermsPage() {
  return <LegalDocument content={termsContent} />;
}

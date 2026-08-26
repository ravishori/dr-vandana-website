import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { disclaimerContent } from "@/data/legal";

export const metadata: Metadata = {
  title: {
    absolute: disclaimerContent.absoluteTitle,
  },
  description: disclaimerContent.description,
  alternates: {
    canonical: "/disclaimer",
  },
  openGraph: {
    title: disclaimerContent.absoluteTitle,
    description: disclaimerContent.description,
    url: "/disclaimer",
  },
};

export default function DisclaimerPage() {
  return <LegalDocument content={disclaimerContent} />;
}

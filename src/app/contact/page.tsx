import type { Metadata } from "next";

import { ContactPageView } from "@/components/contact/ContactPageView";
import { contactSeo } from "@/data/contact";
import { getPracticeJsonLd } from "@/lib/seo/practice-json-ld";

export const metadata: Metadata = {
  title: contactSeo.title,
  description: contactSeo.description,
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: contactSeo.title.absolute,
    description: contactSeo.description,
    url: "/contact",
  },
};

export default function ContactPage() {
  const jsonLd = getPracticeJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactPageView />
    </>
  );
}

import type { Metadata } from "next";

import { ContactPageView } from "@/components/contact/ContactPageView";
import { contactSeo } from "@/data/contact";

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
  return <ContactPageView />;
}

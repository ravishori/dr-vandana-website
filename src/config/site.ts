import { practiceContact } from "@/data/contact";
import type { SiteConfig } from "@/types/site";

/**
 * Central site configuration.
 * Verified contact/location values are sourced from practiceContact.
 * Remaining unverified fields stay as placeholders — do not invent details.
 */
export const siteConfig: SiteConfig = {
  name: "Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice",
  professionalName: practiceContact.practiceName,
  profession: practiceContact.profession,
  tagline: "Your Mental Well-being Matters.",
  domain: "drvandana.trinetra.net",
  url: "https://drvandana.trinetra.net",
  description:
    "Compassionate, confidential and evidence-informed psychological support with Dr. Vandana Rajiv Chaudhary, Psychologist.",
  locale: "en_IN",
  contact: {
    email: practiceContact.email,
    phone: practiceContact.whatsappDisplay,
    whatsapp: practiceContact.whatsappDisplay,
  },
  location: {
    city: practiceContact.address.city,
    address: practiceContact.addressLines.join("\n"),
    consultationHours: {
      isPlaceholder: true,
      value: "[Consultation hours to be confirmed]",
    },
  },
  social: {
    instagram: {
      isPlaceholder: true,
      value: "[Instagram URL to be confirmed]",
    },
    linkedin: {
      isPlaceholder: true,
      value: "[LinkedIn URL to be confirmed]",
    },
    facebook: {
      isPlaceholder: true,
      value: "[Facebook URL to be confirmed]",
    },
  },
};

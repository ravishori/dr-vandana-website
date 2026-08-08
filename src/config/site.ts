import type { SiteConfig } from "@/types/site";

/**
 * Central site configuration.
 * Contact, social, and location fields use placeholders until verified.
 * Do not invent live clinic details.
 */
export const siteConfig: SiteConfig = {
  name: "Dr. Vandana Rajiv Chaudhary — Professional Psychology Practice",
  professionalName: "Dr. Vandana Rajiv Chaudhary",
  profession: "Psychologist",
  tagline: "Your Mental Well-being Matters.",
  domain: "drvandana.trinetra.net",
  url: "https://drvandana.trinetra.net",
  description:
    "Compassionate, confidential and evidence-informed psychological support with Dr. Vandana Rajiv Chaudhary, Psychologist.",
  locale: "en_IN",
  contact: {
    email: {
      isPlaceholder: true,
      value: "[Email to be confirmed]",
    },
    phone: {
      isPlaceholder: true,
      value: "[Phone to be confirmed]",
    },
    whatsapp: {
      isPlaceholder: true,
      value: "[WhatsApp number to be confirmed]",
    },
  },
  location: {
    city: {
      isPlaceholder: true,
      value: "[City to be confirmed]",
    },
    address: {
      isPlaceholder: true,
      value: "[Clinic address to be confirmed]",
    },
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

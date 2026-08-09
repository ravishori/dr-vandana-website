import { professionalProfile } from "@/data/professional";

/**
 * Verified public practice contact and location details.
 * Single source of truth — do not duplicate these values in components.
 */
export const practiceContact = {
  practiceName: professionalProfile.name,
  profession: professionalProfile.profession,
  addressLines: [
    "201, Vasant Krupa Building CHS",
    "Poisar Market, S.V. Road",
    "Near Our Lady High School",
    "Poisar, Kandivali West",
    "Mumbai – 400067",
  ] as const,
  locality: "Poisar, Kandivali West",
  city: "Mumbai",
  pinCode: "400067",
  cityWithPin: "Mumbai – 400067",
  digipin: "4FK 29KJ F74",
  googleMapsUrl: "https://maps.google.com/?q=6V72%2BJRC",
  /** User-facing WhatsApp / phone display. */
  whatsappDisplay: "+91 93223 69829",
  /** Normalized digits for tel: / wa.me — never display to users. */
  phoneDigits: "919322369829",
  phoneTelHref: "tel:+919322369829",
  whatsappUrl: "https://wa.me/919322369829",
  /** Primary instant booking CTA (Bitly). Do not silently replace. */
  bookingUrl: "http://bit.ly/4c2u9te",
  labels: {
    digipin: "DIGIPIN",
    bookInstantly: "Book Instantly on WhatsApp",
    viewOnMaps: "View on Google Maps",
    call: "Call",
    whatsapp: "WhatsApp",
    mapsAria: "View Dr. Vandana's location on Google Maps",
    callAria: "Call Dr. Vandana at +91 93223 69829",
    whatsappAria: "Contact Dr. Vandana on WhatsApp",
    bookingAria: "Book an appointment on WhatsApp",
    copyDigipin: "Copy DIGIPIN",
    digipinCopied: "DIGIPIN copied",
  },
} as const;

export const contactSeo = {
  title: {
    absolute: `Contact ${professionalProfile.name} | Psychologist`,
  },
  description:
    "Contact Dr. Vandana Rajiv Chaudhary, Psychologist, in Poisar, Kandivali West, Mumbai for appointment enquiries and psychological counselling information.",
} as const;

export const contactPage = {
  heading: "Contact",
  introduction:
    "You can reach Dr. Vandana Rajiv Chaudhary’s psychology practice in Poisar, Kandivali West, Mumbai using the verified contact options below.",
  enquiryNote:
    "For a structured appointment enquiry, you may also use the website enquiry form. Please do not include sensitive clinical information in general messages.",
  privacyNote:
    "Please do not include detailed medical history, diagnosis information, therapy notes or other sensitive clinical information in a general website enquiry.",
  /** Still unverified — do not invent. */
  unverified: {
    email: "[Email to be confirmed]",
    consultationHours: "[Consultation hours to be confirmed]",
  },
  primaryCta: {
    label: practiceContact.labels.bookInstantly,
    href: practiceContact.bookingUrl,
    external: true,
    ariaLabel: practiceContact.labels.bookingAria,
  },
  secondaryCta: {
    label: "Appointment enquiry form",
    href: "/book-appointment",
  },
  tertiaryCta: {
    label: "Back to Areas of Support",
    href: "/areas-of-support",
  },
} as const;

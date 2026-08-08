import { professionalProfile } from "@/data/professional";
import { resolveDisplayValue } from "@/types/site";
import { siteConfig } from "@/config/site";

export const contactSeo = {
  title: {
    absolute: `Contact | ${professionalProfile.name}`,
  },
  description:
    "Contact information for Dr. Vandana Rajiv Chaudhary, Psychologist. Verified phone, email and location details will be published when confirmed. Appointment enquiries can begin through the appointment enquiry process.",
} as const;

export const contactPage = {
  heading: "Contact",
  introduction:
    "Thank you for your interest in connecting with Dr. Vandana Rajiv Chaudhary. Verified phone, WhatsApp, email, clinic address and consultation timings are not yet published on this website.",
  enquiryNote:
    "For now, contact and appointment-related requests should begin through the appointment enquiry process. Once verified details are available, they will be added here.",
  privacyNote:
    "Please do not include detailed medical history, diagnosis information, therapy notes or other sensitive clinical information in a general website enquiry.",
  placeholders: {
    email: resolveDisplayValue(siteConfig.contact.email),
    phone: resolveDisplayValue(siteConfig.contact.phone),
    whatsapp: resolveDisplayValue(siteConfig.contact.whatsapp),
    city: resolveDisplayValue(siteConfig.location.city),
    address: resolveDisplayValue(siteConfig.location.address),
    hours: resolveDisplayValue(siteConfig.location.consultationHours),
  },
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  },
  secondaryCta: {
    label: "Back to Areas of Support",
    href: "/areas-of-support",
  },
} as const;

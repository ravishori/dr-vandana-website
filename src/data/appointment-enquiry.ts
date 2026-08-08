import { professionalProfile } from "@/data/professional";

export const appointmentEnquirySeo = {
  title: {
    absolute: `Appointment Enquiry | ${professionalProfile.name}`,
  },
  description:
    "Information about the appointment enquiry process for Dr. Vandana Rajiv Chaudhary. The enquiry form will collect only the minimum information needed to respond and is not yet available.",
} as const;

export const appointmentEnquiryPage = {
  heading: "Appointment enquiry",
  introduction:
    "To help us understand how to assist you, the appointment enquiry process will collect only the minimum information needed to respond.",
  privacyBoundary:
    "Please do not include detailed medical history, diagnosis information, therapy notes, medication details or other sensitive clinical information in a general website enquiry.",
  statusNote:
    "The interactive appointment enquiry form is not available yet. This page explains what to expect when the enquiry process opens.",
  expectations: [
    "A short enquiry focused on contact details and preferred consultation category",
    "No clinical records or therapy notes collected through the public website",
    "A calm, respectful process for requesting a response about counselling support",
  ],
  primaryCta: {
    label: "Appointment enquiry coming soon",
    href: "/book-appointment",
  },
  secondaryCta: {
    label: "About Dr. Vandana",
    href: "/about",
  },
} as const;

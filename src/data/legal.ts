import { practiceContact } from "@/data/contact";
import { professionalProfile } from "@/data/professional";

export type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type LegalPageContent = {
  title: string;
  absoluteTitle: string;
  description: string;
  intro: string;
  sections: readonly LegalSection[];
  closingNote: string;
};

const publicContactReference = `${practiceContact.whatsappDisplay} (WhatsApp) or the Contact page`;

export const privacyPolicyContent: LegalPageContent = {
  title: "Privacy Policy",
  absoluteTitle: `Privacy Policy | ${professionalProfile.name}`,
  description:
    "Privacy information for the public website and optional patient practice portal of Dr. Vandana Rajiv Chaudhary.",
  intro:
    "This Privacy Policy explains how the public website at drvandana.trinetra.net and the optional secure patient/practice portal are intended to work. It is informational and does not constitute legal advice.",
  sections: [
    {
      heading: "Informational website",
      paragraphs: [
        "This website is primarily informational. It provides educational content about psychological counselling and emotional wellness support offered by Dr. Vandana Rajiv Chaudhary.",
      ],
    },
    {
      heading: "Public website forms (appointment enquiry)",
      paragraphs: [
        "The public appointment enquiry form collects only the minimum information reasonably needed to respond, such as name, age-group preference, optional preferred day/time, optional brief non-clinical note, and privacy acknowledgement.",
        "Validated enquiry details are delivered by secure email to the practice for response. Submitting an enquiry does not confirm an appointment time and does not establish a therapist–client relationship by itself.",
        "The public enquiry form is separate from the optional patient practice portal described below.",
      ],
    },
    {
      heading: "Patient & practice portal (optional clinical practice tools)",
      paragraphs: [
        "When enabled, registered patients and the psychologist may use a secure practice portal for account registration, appointment requests and confirmations, consultation summaries the psychologist chooses to share, and documents the psychologist marks as patient-visible.",
        "Psychologist private clinical notes and private documents are intended for practice use only and are not shown to patients through the portal.",
        "Portal accounts require authentication. Mobile one-time passwords (OTP), WhatsApp transactional messages, and multi-factor authentication may be used depending on configuration. Production SMS/WhatsApp delivery requires separate provider credentials and is not automatic.",
        "Practice portal records are stored using a durable store configured for the deployment (for example SQLite on a persistent host). Ephemeral serverless disk is not appropriate for long-term clinical practice data.",
        "By creating a portal account and accepting the portal privacy acknowledgement, you consent to processing of the account and appointment information needed to operate these practice tools.",
      ],
    },
    {
      heading: "Sensitive clinical information",
      paragraphs: [
        "Do not use public enquiry forms to submit detailed medical history, diagnosis details, medication lists, therapy notes, or crisis content that requires immediate emergency response.",
        "Portal notes and documents are managed by the practice under professional confidentiality expectations, subject to applicable ethical and legal limits (including safety-related disclosures).",
      ],
    },
    {
      heading: "Retention and access",
      paragraphs: [
        "Account, appointment, consultation, and document records are retained for as long as needed for clinical continuity, professional obligations, and legitimate practice administration, unless a longer or shorter period is required by applicable law or professional standards.",
        "Patients may request access corrections for their account profile through verified contact channels. Some clinical records may be retained even after an account is deactivated where retention is required.",
      ],
    },
    {
      heading: "Third-party services",
      paragraphs: [
        "Website hosting, email-delivery infrastructure, optional SMS/OTP providers, and optional WhatsApp Business API providers may process messages as needed to operate the site and portal.",
        "This public website does not currently use marketing analytics, advertising pixels, or AI processing of portal clinical notes.",
      ],
    },
    {
      heading: "Emergency and helpline directory",
      paragraphs: [
        "The Mental Health Support & Emergency Help page lists publicly available government and authorized helpline information for safety awareness.",
        "Dr. Vandana Rajiv Chaudhary and this website do not operate those external helplines or emergency services and cannot guarantee their availability, response times, or confidentiality practices.",
        "Calling a third-party or government service is subject to that service's own terms and privacy practices. This website does not collect account details to browse the directory and does not store crisis-search history from that page.",
        "In urgent situations, contact emergency services directly (for example 112 in India) rather than relying on this website.",
      ],
    },
    {
      heading: "Contact about privacy",
      paragraphs: [
        `If you have questions about this Privacy Policy, please use the verified contact channels on the Contact page. Current public contact reference: ${publicContactReference}.`,
      ],
    },
  ],
  closingNote:
    "This policy may be updated as website and portal functionality changes. Continued use of the website or portal after updates means the revised policy applies to future visits and portal use.",
};

export const disclaimerContent: LegalPageContent = {
  title: "Disclaimer",
  absoluteTitle: `Disclaimer | ${professionalProfile.name}`,
  description:
    "Important disclaimer for the public website of Dr. Vandana Rajiv Chaudhary. Website content is educational and does not replace professional psychological assessment.",
  intro:
    "Please read this disclaimer carefully before using the website. It is informational and does not constitute legal advice.",
  sections: [
    {
      heading: "Educational and informational content",
      paragraphs: [
        "Website content is educational and informational. It is intended to help visitors understand areas of psychological support and emotional wellness in general terms.",
      ],
    },
    {
      heading: "Not a substitute for professional assessment",
      paragraphs: [
        "Content on this website does not replace professional psychological assessment, counselling or other appropriate professional care.",
      ],
    },
    {
      heading: "No diagnosis through website content",
      paragraphs: [
        "No diagnosis is provided through website content. Reading about common concerns or support areas does not mean a visitor has any particular condition.",
      ],
    },
    {
      heading: "Not an emergency service",
      paragraphs: [
        "This website does not provide emergency or crisis services. If you are in immediate danger or experiencing a mental-health emergency, seek urgent help through your local emergency medical service or the nearest emergency medical facility.",
      ],
    },
    {
      heading: "No therapist-client relationship from browsing",
      paragraphs: [
        "Reading website content, submitting a general enquiry in the future, or contacting the practice through public channels does not by itself establish a therapist-client relationship.",
      ],
    },
  ],
  closingNote:
    "If you are unsure whether professional support may be appropriate for your situation, please seek guidance from a qualified professional through appropriate channels.",
};

export const termsContent: LegalPageContent = {
  title: "Terms",
  absoluteTitle: `Terms | ${professionalProfile.name}`,
  description:
    "Terms of use for the public website of Dr. Vandana Rajiv Chaudhary. The website provides informational content and limited public functionality.",
  intro:
    "These Terms describe acceptable use of this website. They are informational and do not constitute legal advice. Verified jurisdiction-specific regulatory claims are not stated here.",
  sections: [
    {
      heading: "Acceptable use",
      paragraphs: [
        "You agree to use this website lawfully and respectfully. You must not attempt to disrupt the website, misuse enquiry features when available, or submit harmful, abusive or unlawful content.",
      ],
    },
    {
      heading: "Informational nature",
      paragraphs: [
        "The website provides informational content about psychological counselling and emotional wellness. It does not guarantee personal outcomes and does not replace professional care.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "Text, branding, layout and other materials on this website are protected by applicable intellectual property laws. You may not copy or reuse site materials for commercial purposes without permission.",
      ],
    },
    {
      heading: "External links",
      paragraphs: [
        "The website may include links to external resources in the future. External sites are outside the control of this practice, and their content or privacy practices are their own responsibility.",
      ],
    },
    {
      heading: "Limitation of website functionality",
      paragraphs: [
        "Website features may be limited, incomplete or temporarily unavailable. Appointment enquiry, contact channels and related public tools may change over time.",
      ],
    },
    {
      heading: "Changes to website content",
      paragraphs: [
        "Website content may be updated, corrected or removed at any time to improve accuracy, clarity or professional presentation.",
      ],
    },
    {
      heading: "No guarantee of outcomes",
      paragraphs: [
        "Nothing on this website guarantees counselling results, recovery or any specific personal outcome.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For website-related questions, please use the verified contact channels on the Contact page. Current public contact reference: ${publicContactReference}.`,
      ],
    },
  ],
  closingNote:
    "If any part of these Terms is found unenforceable, the remaining parts continue to apply to the extent permitted.",
};

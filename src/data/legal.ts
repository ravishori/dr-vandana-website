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
    "Privacy information for the public website of Dr. Vandana Rajiv Chaudhary. This site is primarily informational and is not used to maintain clinical records.",
  intro:
    "This Privacy Policy explains how the public website at drvandana.trinetralab.net is intended to work. It is informational and does not constitute legal advice.",
  sections: [
    {
      heading: "Informational website",
      paragraphs: [
        "This website is primarily informational. It provides educational content about psychological counselling and emotional wellness support offered by Dr. Vandana Rajiv Chaudhary.",
      ],
    },
    {
      heading: "No clinical records through the public website",
      paragraphs: [
        "No clinical records, therapy notes, diagnostic records or electronic health records are maintained through this public website.",
        "Information submitted through this website is not stored as an electronic health record (EHR/EMR) by the website application.",
      ],
    },
    {
      heading: "Sensitive clinical information",
      paragraphs: [
        "This site should not be used to submit sensitive clinical information. Users should avoid including detailed medical history, diagnosis details, medication information, therapy notes or session content in any general website enquiry.",
      ],
    },
    {
      heading: "Appointment enquiry information",
      paragraphs: [
        "The appointment enquiry form collects only the minimum information reasonably needed to respond, such as name, age-group preference, optional preferred day/time, optional brief non-clinical note, and privacy acknowledgement.",
        "Validated enquiry details are delivered by secure email to the practice for response. The website application does not create a patient database, patient portal, or clinical record from these submissions.",
        "Submitting an enquiry does not confirm an appointment time and does not establish a therapist–client relationship by itself.",
      ],
    },
    {
      heading: "Third-party services",
      paragraphs: [
        "Website hosting and email-delivery infrastructure may process enquiry messages as needed to operate the site and deliver messages to the practice.",
        "This public website does not currently use marketing analytics, advertising pixels, or AI processing of enquiry content.",
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
    "This policy may be updated as website functionality changes. Continued use of the website after updates means the revised policy applies to future visits.",
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

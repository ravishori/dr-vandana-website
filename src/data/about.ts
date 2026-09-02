import { professionalProfile } from "@/data/professional";
import type {
  AboutApproachTheme,
  AboutCtaLink,
  AboutValue,
} from "@/types/about";

export const aboutSeo = {
  title: `About ${professionalProfile.name} | ${professionalProfile.profession}`,
  description:
    "Learn about Dr. Vandana Rajiv Chaudhary, Psychologist, offering compassionate, confidential and evidence-informed psychological support for emotional wellness.",
} as const;

export const aboutHero = {
  heading: `About ${professionalProfile.name}`,
  subheading: professionalProfile.profession,
  supportingMessage:
    "A compassionate and respectful approach to psychological counselling and emotional wellness.",
} as const;

export const aboutIntroduction = {
  heading: "Professional introduction",
  paragraphs: [
    `${professionalProfile.name} is a ${professionalProfile.profession.toLowerCase()} who provides ${professionalProfile.positioning.replace(/\.$/, "").toLowerCase()}.`,
    "Her work centres on listening carefully, understanding each person's circumstances and creating a respectful space where emotional well-being can be explored with care.",
    "Psychological counselling is approached with professional boundaries, warmth and regard for the individuality of each person's experience — without pressure, judgment or promises about outcomes.",
  ],
} as const;

export const aboutQualifications = {
  heading: "Qualifications",
  description:
    "The following verified qualifications are listed as provided. Institution names and dates will be added only when confirmed.",
  items: professionalProfile.qualifications,
} as const;

export const aboutExperience = {
  heading: "Professional experience",
  statement: professionalProfile.experience,
  note: "This statement reflects verified professional experience. No patient volumes, success rates or outcome claims are published on this website.",
} as const;

export const aboutApproach = {
  heading: "Professional approach",
  lead: "Support is offered in a warm, non-judgmental and hopeful atmosphere that prioritises emotional well-being and respect for each person's pace.",
  themes: [
    {
      id: "compassion",
      title: "Compassion",
      description:
        "Concerns are met with care and understanding rather than urgency or pressure.",
    },
    {
      id: "listening",
      title: "Active listening",
      description:
        "Time and attention are given so experiences can be shared and understood more clearly.",
    },
    {
      id: "respect",
      title: "Respect",
      description:
        "Individual circumstances, values and boundaries are treated with care.",
    },
    {
      id: "confidentiality",
      title: "Confidentiality",
      description:
        "Privacy is handled with professional regard appropriate to counselling practice.",
    },
    {
      id: "evidence",
      title: "Evidence-informed practice",
      description:
        "Support draws on appropriate professional knowledge while remaining responsive to the person.",
    },
    {
      id: "individualized",
      title: "Individualized support",
      description:
        "Conversations are shaped around personal concerns, goals and life context.",
    },
    {
      id: "wellbeing",
      title: "Emotional well-being",
      description:
        "The focus remains on understanding emotions and developing healthier ways of coping.",
    },
  ] satisfies readonly AboutApproachTheme[],
} as const;

export const aboutValues: readonly AboutValue[] = [
  {
    id: "empathy",
    title: "Empathy",
    description:
      "A willingness to understand experiences with care and without unnecessary judgment.",
    icon: "empathy",
  },
  {
    id: "respect",
    title: "Respect",
    description:
      "Regard for personal dignity, pace and the uniqueness of each circumstance.",
    icon: "respect",
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    description: "Respect for privacy and professional confidentiality.",
    icon: "confidentiality",
  },
  {
    id: "evidence",
    title: "Evidence-Informed Support",
    description:
      "Psychological support grounded in appropriate professional knowledge and practice.",
    icon: "evidence",
  },
] as const;

export const aboutHolisticWellness = {
  heading: "A holistic wellness perspective",
  paragraphs: [
    "Alongside psychological counselling, Dr. Vandana brings a background in naturopathy. Where appropriate, wellness-oriented practices may complement psychological support as part of a broader conversation about emotional and everyday well-being.",
    "This perspective is offered carefully and educationally. It does not claim that naturopathy cures mental illness, that natural remedies replace psychological care, that meditation resolves depression or anxiety on its own, or that wellness practices replace medical treatment when medical care is needed.",
    "Psychological support remains the core of the practice, with complementary wellness ideas considered only where they may reasonably support a person's overall sense of balance.",
  ],
} as const;

export const aboutCta = {
  heading: professionalProfile.tagline,
  description:
    "If you would like to explore psychological counselling and emotional wellness support, you can learn more about the areas of support offered.",
  primaryCta: {
    label: "Explore Areas of Support",
    href: "/areas-of-support",
  } satisfies AboutCtaLink,
  secondaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies AboutCtaLink,
} as const;

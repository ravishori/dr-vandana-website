import { professionalProfile } from "@/data/professional";
import type {
  ExpectationItem,
  HomeCtaLink,
  HomeHighlight,
  SupportArea,
} from "@/types/home";

export const homeHero = {
  eyebrow: professionalProfile.profession,
  heading: professionalProfile.name,
  supportingStatement:
    "Compassionate, confidential and evidence-informed psychological support for children, adolescents, adults, couples and families.",
  tagline: professionalProfile.tagline,
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies HomeCtaLink,
  secondaryCta: {
    label: "About Dr. Vandana",
    href: "/about",
  } satisfies HomeCtaLink,
} as const;

export const homeHighlights: readonly HomeHighlight[] = [
  {
    id: "experience",
    value: "6+ Years",
    label: "Professional experience",
  },
  {
    id: "psychology",
    value: "M.A.",
    label: "Psychology",
  },
  {
    id: "naturopathy",
    value: "Ph.D.",
    label: "in Naturopathy",
  },
  {
    id: "confidential",
    value: "Confidential",
    label: "Professional space",
  },
] as const;

export const homePhilosophy = {
  heading: "A respectful space for understanding and growth",
  lead: "Every person experiences life's challenges differently. Psychological support can provide a respectful space to understand emotions, explore concerns and develop healthier ways of coping.",
  principles: [
    "Active listening",
    "Empathy",
    "Respect",
    "Confidentiality",
    "Individualized support",
    "Evidence-informed practice",
  ],
} as const;

export const homeSupportAreasIntro = {
  heading: "Areas of Psychological Support",
  description:
    "Support may be helpful across different stages and circumstances of life.",
} as const;

export const homeSupportAreas: readonly SupportArea[] = [
  {
    id: "emotional-wellbeing",
    title: "Emotional Well-being",
    description:
      "Support around stress, emotional regulation, self-esteem, confidence and personal growth.",
    href: "/areas-of-support",
    icon: "heart",
  },
  {
    id: "mental-health-awareness",
    title: "Mental Health Awareness & Support",
    description:
      "Compassionate support and education around concerns such as anxiety, depression awareness, burnout, anger and grief.",
    href: "/areas-of-support",
    icon: "awareness",
  },
  {
    id: "relationships-family",
    title: "Relationships & Family",
    description:
      "Support for communication, relationship concerns, family dynamics and parenting challenges.",
    href: "/areas-of-support",
    icon: "family",
  },
  {
    id: "workplace-wellbeing",
    title: "Workplace Well-being",
    description:
      "Support around workplace stress, burnout, resilience and healthier work-life integration.",
    href: "/areas-of-support",
    icon: "work",
  },
] as const;

export const homeChildAdolescent = {
  heading: "Supporting Children & Adolescents",
  description:
    "Parents and caregivers sometimes seek guidance when a child or teenager is navigating academic pressure, emotional development, behavioural concerns, peer relationships, self-confidence or broader teenage emotional well-being. Thoughtful parenting guidance can also form part of this support.",
  href: "/child-adolescent-psychology",
  ctaLabel: "Explore Child & Adolescent Support",
} as const;

export const homeStressWellness = {
  heading: "Understanding Stress, Anxiety & Emotional Wellness",
  description:
    "Everyday stress can affect emotional well-being. Understanding common signs, developing healthy coping habits and seeking appropriate professional support when needed can be a valuable step toward greater steadiness and care.",
  href: "/stress-anxiety-wellness",
  ctaLabel: "Explore Stress & Wellness",
} as const;

export const homeExpectationsIntro = {
  heading: "What You Can Expect",
  description:
    "A calm introduction to the kind of professional atmosphere visitors can anticipate — without promises about outcomes.",
} as const;

export const homeExpectations: readonly ExpectationItem[] = [
  {
    id: "listening",
    title: "Respectful Listening",
    description:
      "A space where concerns can be expressed without unnecessary judgment.",
    icon: "listen",
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    description:
      "Professional care with appropriate respect for privacy and confidentiality.",
    icon: "shield",
  },
  {
    id: "individualized",
    title: "Individualized Support",
    description:
      "Support that considers the person's circumstances, concerns and goals.",
    icon: "person",
  },
  {
    id: "evidence",
    title: "Evidence-Informed Approach",
    description:
      "Psychological support grounded in appropriate professional knowledge and practice.",
    icon: "book",
  },
] as const;

export const homeFinalCta = {
  heading: "Taking the first step can begin with a conversation.",
  description:
    "If you would like to explore whether psychological counselling may be appropriate for your situation, you can begin by making an appointment enquiry.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies HomeCtaLink,
  secondaryCta: {
    label: "Contact & location",
    href: "/contact",
  } satisfies HomeCtaLink,
} as const;

export const homeSeo = {
  title: `${professionalProfile.name} | ${professionalProfile.profession}`,
  description:
    "Professional psychology practice of Dr. Vandana Rajiv Chaudhary offering compassionate, confidential and evidence-informed psychological support for children, adolescents, adults, couples and families.",
} as const;

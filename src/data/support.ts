import { professionalProfile } from "@/data/professional";
import type { SupportAreaDetail, SupportCtaLink } from "@/types/support";

export const supportSeo = {
  title: `Areas of Psychological Support | ${professionalProfile.name}`,
  description:
    "Explore areas of psychological counselling and emotional wellness support, including emotional well-being, mental health awareness, relationships and family, and workplace well-being.",
} as const;

export const supportHero = {
  heading: "Areas of Psychological Support",
  supportingText:
    "Different stages and circumstances of life can bring emotional, personal, relationship or workplace challenges. Psychological counselling can provide a respectful space to understand concerns, develop healthier coping strategies and work toward personal well-being.",
} as const;

export const emotionalWellbeingArea: SupportAreaDetail = {
  id: "emotional-wellbeing",
  heading: "Emotional Well-being",
  introduction:
    "Emotional well-being support focuses on understanding everyday feelings, building healthier coping habits and developing a steadier sense of self over time. These topics are presented as areas where psychological guidance may be helpful — not as diagnoses.",
  icon: "heart",
  topics: [
    {
      id: "stress",
      title: "Stress",
      description:
        "Support for understanding stress responses and exploring practical ways to manage pressure in daily life.",
    },
    {
      id: "emotional-regulation",
      title: "Emotional regulation",
      description:
        "Exploring how emotions rise and settle, and developing skills that support calmer, more intentional responses.",
    },
    {
      id: "self-esteem",
      title: "Low self-esteem",
      description:
        "Space to examine self-critical patterns and gently strengthen a more balanced sense of personal worth.",
    },
    {
      id: "confidence",
      title: "Confidence",
      description:
        "Support for building confidence in personal choices, communication and day-to-day decision-making.",
    },
    {
      id: "personal-growth",
      title: "Personal growth",
      description:
        "Guidance for reflecting on values, habits and goals that support meaningful personal development.",
    },
    {
      id: "emotional-awareness",
      title: "Emotional awareness",
      description:
        "Learning to notice and name emotions more clearly as a foundation for healthier coping.",
    },
    {
      id: "healthy-coping",
      title: "Healthy coping",
      description:
        "Exploring coping approaches that support emotional steadiness without relying on avoidance or self-criticism.",
    },
  ],
  cta: {
    label: "Explore Stress & Wellness",
    href: "/stress-anxiety-wellness",
  },
};

export const mentalHealthSupportArea: SupportAreaDetail = {
  id: "mental-health-awareness",
  heading: "Mental Health Awareness & Support",
  introduction:
    "This area focuses on awareness, education and compassionate psychological support. Experiences related to anxiety, low mood, burnout, anger or grief can vary widely from person to person. Persistent concerns that significantly affect daily functioning may benefit from professional assessment.",
  icon: "awareness",
  topics: [
    {
      id: "anxiety-awareness",
      title: "Anxiety awareness",
      description:
        "Understanding common experiences of worry, tension or unease, and exploring supportive ways of managing them.",
    },
    {
      id: "depression-awareness",
      title: "Depression awareness",
      description:
        "Learning about changes in mood, motivation or energy that can affect daily life, without assuming a diagnosis.",
    },
    {
      id: "burnout",
      title: "Burnout",
      description:
        "Support for recognising prolonged exhaustion and exploring healthier ways to restore balance and recovery habits.",
    },
    {
      id: "anger-management",
      title: "Anger management",
      description:
        "Exploring anger as a meaningful emotional signal and developing constructive ways to express and manage it.",
    },
    {
      id: "grief",
      title: "Grief support",
      description:
        "A respectful space to process loss, change and mourning at a pace that fits the individual.",
    },
    {
      id: "emotional-distress",
      title: "Emotional distress",
      description:
        "Support when emotional strain feels overwhelming, confusing or difficult to navigate alone.",
    },
  ],
  closingNote:
    "Experiences and concerns can vary. When concerns persist or significantly affect daily functioning, professional assessment may be appropriate. This page does not provide diagnosis or a self-assessment score.",
};

export const relationshipsFamilyArea: SupportAreaDetail = {
  id: "relationships-family",
  heading: "Relationships & Family",
  introduction:
    "Relationship and family support focuses on communication, understanding and healthier ways of relating. Conversations are approached with inclusivity and respect, without assuming conflict type, trauma history or any diagnosis.",
  icon: "family",
  topics: [
    {
      id: "relationship-concerns",
      title: "Relationship concerns",
      description:
        "Support for navigating closeness, distance, expectations and recurring patterns within important relationships.",
    },
    {
      id: "communication",
      title: "Communication",
      description:
        "Exploring clearer, more respectful ways of expressing needs, listening and resolving misunderstandings.",
    },
    {
      id: "family-dynamics",
      title: "Family dynamics",
      description:
        "Understanding roles, expectations and interaction patterns that shape family life.",
    },
    {
      id: "couples-support",
      title: "Couples support",
      description:
        "A space for partners to explore connection, conflict and shared goals with guided conversation.",
    },
    {
      id: "parenting-guidance",
      title: "Parenting guidance",
      description:
        "Support for caregivers seeking calmer, more constructive approaches to parenting challenges.",
    },
    {
      id: "conflict-management",
      title: "Conflict management",
      description:
        "Guidance for approaching disagreements with greater clarity, respect and emotional awareness.",
    },
  ],
};

export const workplaceWellbeingArea: SupportAreaDetail = {
  id: "workplace-wellbeing",
  heading: "Workplace Well-being",
  introduction:
    "Workplace well-being support addresses the emotional impact of work demands, pressure and balance. This guidance is educational and psychological in nature and does not provide employment or legal advice.",
  icon: "work",
  topics: [
    {
      id: "workplace-stress",
      title: "Workplace stress",
      description:
        "Support for managing pressure, deadlines and demanding work environments in healthier ways.",
    },
    {
      id: "burnout-awareness",
      title: "Burnout awareness",
      description:
        "Recognising signs of prolonged work-related strain and exploring restorative coping strategies.",
    },
    {
      id: "work-life-balance",
      title: "Work-life balance",
      description:
        "Reflecting on boundaries between work and personal life to support sustainable well-being.",
    },
    {
      id: "resilience",
      title: "Resilience",
      description:
        "Building emotional flexibility and steadier responses to workplace challenges over time.",
    },
    {
      id: "emotional-wellbeing-at-work",
      title: "Emotional well-being at work",
      description:
        "Support for navigating emotions that arise in professional settings with greater awareness.",
    },
    {
      id: "healthy-boundaries",
      title: "Healthy boundaries",
      description:
        "Exploring practical boundaries that protect energy, focus and personal well-being at work.",
    },
  ],
};

export const childAdolescentTeaser = {
  heading: "Children & Adolescents",
  description:
    "Parents and caregivers may seek guidance when a child or teenager is navigating academic pressure, emotional development, behavioural concerns, peer relationships, self-confidence or teenage emotional well-being. Parenting guidance can also form part of this support.",
  href: "/child-adolescent-psychology",
  ctaLabel: "Explore Child & Adolescent Support",
} as const;

export const whenSupportMayHelp = {
  heading: "When professional support may help",
  introduction:
    "Professional psychological support may be worth considering when emotional or personal difficulties:",
  points: [
    "persist over time",
    "feel difficult to manage alone",
    "interfere with everyday functioning",
    "affect relationships",
    "affect work or study",
    "cause significant emotional distress",
  ],
  closingNote:
    "Only a qualified professional can determine what kind of support may be appropriate for an individual's circumstances. This information is educational and is not a diagnostic test.",
} as const;

export const counsellingBenefits = {
  heading: "What counselling can offer",
  introduction:
    "Psychological counselling can offer a structured, respectful form of support. What becomes helpful varies from person to person, and no specific outcome is promised.",
  offerings: [
    "A confidential professional space",
    "Active listening",
    "Reflection and self-understanding",
    "Coping strategies",
    "Emotional awareness",
    "Communication skills",
    "Personal growth",
    "Support during difficult life circumstances",
  ],
} as const;

export const supportPageCta = {
  heading: professionalProfile.tagline,
  description:
    "If you would like to explore whether psychological counselling may be appropriate for your situation, you can begin with an appointment enquiry.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies SupportCtaLink,
  secondaryCta: {
    label: "About Dr. Vandana",
    href: "/about",
  } satisfies SupportCtaLink,
} as const;

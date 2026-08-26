import { professionalProfile } from "@/data/professional";
import type {
  ConcernCard,
  ExpectationItem,
  GuidanceItem,
  PageCtaLink,
} from "@/types/child-adolescent";

export const childAdolescentSeo = {
  title: `Child & Adolescent Psychological Support | ${professionalProfile.name}`,
  description:
    "Educational information on child and adolescent psychological support for parents, caregivers and educators, including academic pressure, emotional development, peer relationships and parenting guidance.",
} as const;

export const childAdolescentHero = {
  eyebrow: "For parents, caregivers & educators",
  heading: "Child & Adolescent Psychological Support",
  supportingMessage:
    "Children and teenagers experience emotional, social and academic challenges in different ways. A supportive professional space can help children, adolescents and families better understand concerns and develop healthier ways of coping.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies PageCtaLink,
  secondaryCta: {
    label: "Contact",
    href: "/contact",
  } satisfies PageCtaLink,
} as const;

export const developmentSection = {
  heading: "Understanding children & adolescents",
  lead: "Childhood and adolescence involve important emotional, social and developmental changes. Many of these experiences are part of growing up and do not automatically indicate a mental-health condition.",
  themes: [
    "Growing independence",
    "Changing emotions",
    "Academic expectations",
    "Friendships and peer relationships",
    "Family dynamics",
    "Developing self-confidence",
    "Adjusting to new situations",
  ],
  closingNote:
    "A reassuring approach focuses on understanding what a child or teenager may be experiencing, rather than labelling ordinary developmental changes as illnesses.",
} as const;

export const commonConcernsIntro = {
  heading: "Common areas of concern",
  description:
    "Parents and caregivers sometimes seek guidance around the following areas. These topics are presented as possible areas of support — not as diagnoses or checklists.",
} as const;

export const commonConcerns: readonly ConcernCard[] = [
  {
    id: "academic-pressure",
    title: "Academic Pressure",
    description:
      "School demands can feel intense at times. Academic difficulty alone does not indicate a disorder.",
    icon: "academic",
    points: [
      "Study pressure and workload",
      "Exam-related stress",
      "Expectations from self or others",
      "Maintaining healthier routines around rest, study and balance",
    ],
  },
  {
    id: "emotional-development",
    title: "Emotional Development",
    description:
      "Support may focus on helping children and adolescents understand and express feelings more clearly.",
    icon: "emotional",
    points: [
      "Understanding emotions",
      "Emotional expression",
      "Coping skills",
      "Developing emotional awareness",
    ],
  },
  {
    id: "behavioural-concerns",
    title: "Behavioural Concerns",
    description:
      "Changes in behaviour can have many meanings. Guidance can explore communication and regulation without diagnostic labels.",
    icon: "behavioural",
    points: [
      "Changes in behaviour",
      "Communication difficulties",
      "Emotional regulation",
      "Family interactions",
    ],
  },
  {
    id: "peer-relationships",
    title: "Peer Relationships",
    description:
      "Friendships and belonging are important parts of growing up and can bring both connection and challenge.",
    icon: "peer",
    points: [
      "Friendships",
      "Belonging",
      "Social confidence",
      "Peer-related challenges",
    ],
  },
  {
    id: "self-confidence",
    title: "Self-confidence",
    description:
      "Support may help strengthen self-belief and a healthier sense of identity over time.",
    icon: "confidence",
    points: [
      "Self-esteem",
      "Self-belief",
      "Healthy identity development",
      "Positive communication",
    ],
  },
] as const;

export const teenWellbeing = {
  heading: "Teenage emotional well-being",
  lead: "Adolescence can bring meaningful change as teenagers navigate identity, relationships and future decisions. Teenagers are not inherently problematic or rebellious — they are developing through a complex stage of life.",
  themes: [
    {
      title: "Academic expectations",
      description:
        "Balancing school demands with rest, interests and emotional well-being.",
    },
    {
      title: "Changing relationships",
      description:
        "Shifts in friendships, dating and family roles can bring both opportunity and strain.",
    },
    {
      title: "Identity development",
      description:
        "Exploring values, preferences and a sense of self with growing independence.",
    },
    {
      title: "Peer pressure & social comparison",
      description:
        "Navigating influence from peers and comparison in social or online spaces.",
    },
    {
      title: "Emotional changes",
      description:
        "Understanding stronger or more fluctuating emotions as part of adolescent development.",
    },
    {
      title: "Future-related concerns",
      description:
        "Thinking about exams, career paths or life decisions that can feel uncertain.",
    },
    {
      title: "Communication with parents",
      description:
        "Finding respectful ways for teenagers and caregivers to stay connected through change.",
    },
  ],
} as const;

export const parentGuidance = {
  heading: "How parents can support their child",
  introduction:
    "These points are general educational ideas. They are not a substitute for professional assessment when concerns persist or significantly affect daily life.",
  items: [
    {
      id: "listen",
      title: "Listen before immediately giving advice",
      description:
        "A calm listening space can help a child feel understood before solutions are discussed.",
    },
    {
      id: "conversations",
      title: "Create opportunities for calm conversations",
      description:
        "Gentle, low-pressure moments often make it easier for children and teenagers to open up.",
    },
    {
      id: "acknowledge",
      title: "Acknowledge emotions even when behaviour needs boundaries",
      description:
        "Feelings can be recognised while clear, respectful limits remain in place.",
    },
    {
      id: "comparisons",
      title: "Avoid comparisons with siblings or peers",
      description:
        "Comparisons can increase pressure; focusing on the child’s own pace is often more supportive.",
    },
    {
      id: "routines",
      title: "Encourage healthy routines",
      description:
        "Sleep, meals, rest and balanced activity can support emotional steadiness.",
    },
    {
      id: "notice",
      title: "Notice meaningful changes in behaviour or mood",
      description:
        "Observing lasting changes with care can help families decide when further guidance may help.",
    },
    {
      id: "home",
      title: "Create a supportive home environment",
      description:
        "Warmth, predictability and respectful communication can strengthen a child’s sense of safety.",
    },
    {
      id: "seek-help",
      title: "Seek professional guidance when needed",
      description:
        "Professional support may be appropriate when concerns persist or significantly affect daily life.",
    },
  ] satisfies readonly GuidanceItem[],
} as const;

export const whenGuidanceMayHelp = {
  heading: "When professional guidance may help",
  introduction:
    "Professional guidance may be worth considering when concerns:",
  points: [
    "persist over time",
    "significantly affect school or daily activities",
    "affect relationships",
    "create ongoing emotional distress",
    "are difficult for the child or family to manage",
    "represent a meaningful change from the child's usual behaviour",
  ],
  closingNote:
    "Only a qualified professional can determine what type of support may be appropriate for a particular child or adolescent. This information is educational and is not a symptom checklist or diagnostic tool.",
} as const;

export const parentExpectationsIntro = {
  heading: "What parents can expect",
  description:
    "A calm introduction to the kind of professional atmosphere families can anticipate — without promises about outcomes.",
} as const;

export const parentExpectations: readonly ExpectationItem[] = [
  {
    id: "listening",
    title: "Respectful Listening",
    description:
      "A space where parents and young people can share concerns without unnecessary judgment.",
    icon: "listen",
  },
  {
    id: "communication",
    title: "Age-appropriate communication",
    description:
      "Conversations adapted to a child’s or teenager’s developmental stage and understanding.",
    icon: "person",
  },
  {
    id: "family",
    title: "Family-sensitive guidance",
    description:
      "Support that considers family relationships, routines and caregiving contexts.",
    icon: "family",
  },
  {
    id: "privacy",
    title: "Confidential professional space",
    description:
      "Privacy and confidentiality are handled with appropriate professional and ethical considerations, including the needs and safety of children and adolescents.",
    icon: "shield",
  },
  {
    id: "individualized",
    title: "Individualized support",
    description:
      "Guidance shaped around the young person’s circumstances, concerns and family context.",
    icon: "heart",
  },
] as const;

export const childAdolescentCta = {
  heading: "Supporting a child's emotional well-being begins with understanding.",
  description:
    "If you have concerns about a child's or teenager's emotional well-being, you can explore whether professional psychological guidance may be appropriate.",
  primaryCta: {
    label: "Book an Appointment",
    href: "/book-appointment",
  } satisfies PageCtaLink,
  secondaryCta: {
    label: "Explore Areas of Support",
    href: "/areas-of-support",
  } satisfies PageCtaLink,
} as const;

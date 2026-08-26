import type { FaqCategory } from "@/types/counselling-faq";

export const faqCategoryLabels: Record<FaqCategory, string> = {
  "about-counselling": "About Counselling",
  "first-session": "Your First Session",
  "counselling-approach": "Counselling Approach",
  "stress-anxiety": "Stress & Anxiety",
  "emotional-well-being": "Emotional Well-being",
  "relationships-family": "Relationships & Family",
  "children-adolescents": "Children & Adolescents",
  parenting: "Parenting",
  "workplace-burnout": "Workplace Stress & Burnout",
  "self-esteem": "Self-esteem & Confidence",
  "grief-life-changes": "Grief & Life Changes",
  "sessions-appointments": "Sessions & Appointments",
  "privacy-confidentiality": "Privacy & Confidentiality",
  "online-counselling": "Online Counselling",
  "when-to-seek-help": "When to Seek Professional Help",
  "emergency-crisis": "Emergency & Crisis Support",
};

export const counsellingFaqSeo = {
  title: "Psychology Counselling FAQ | Dr. Vandana Rajiv Chaudhary",
  description:
    "Understand psychological counselling, what happens during a session, confidentiality, counselling approaches and common questions before starting therapy with Dr. Vandana Rajiv Chaudhary.",
  path: "/understanding-counselling",
} as const;

export const counsellingFaqHero = {
  eyebrow: "Patient-friendly guide",
  heading: "Understanding Counselling",
  subheading:
    "A safe space to talk, understand what you're experiencing, and explore meaningful steps forward.",
  supportingText:
    "Starting counselling can feel unfamiliar, especially if it is your first experience. This guide explains what counselling involves, what you can expect from a session, and how Dr. Vandana approaches psychological support.",
  primaryCta: { label: "Book a Counselling Session", href: "/book-appointment" },
  secondaryCta: { label: "Explore Common Questions", href: "#faq-search" },
} as const;

export const counsellingJourneySteps = [
  {
    id: "listen",
    title: "Listen",
    description:
      "Your concerns, experiences and feelings are heard with respect and without unnecessary judgement.",
  },
  {
    id: "understand",
    title: "Understand",
    description:
      "Together, we explore the situations, thoughts, emotions, relationships or life circumstances that may be affecting your well-being.",
  },
  {
    id: "goals",
    title: "Identify Goals",
    description:
      "Counselling goals are discussed according to your needs, circumstances and what you hope to achieve.",
  },
  {
    id: "strategies",
    title: "Develop Strategies",
    description:
      "Depending on your concerns, counselling may include practical psychological strategies, emotional skills, reflection, behavioural approaches, mindfulness-based practices or other appropriate interventions.",
  },
  {
    id: "review",
    title: "Review & Support",
    description:
      "Progress is reviewed over time and the counselling process can be adapted according to your evolving needs.",
  },
] as const;

export const counsellingJourneySummary =
  "Listen → Understand → Explore → Support → Grow";

export const counsellingJourneyDisclaimer =
  "Every person is different. The counselling process may vary according to individual needs and circumstances.";

export const isCounsellingRightForMe = {
  heading: "Not sure whether counselling may be helpful?",
  text: "You don't need to make a diagnosis yourself. If something is affecting your emotional well-being, relationships, work, studies or everyday life, discussing it with a qualified professional can help you understand your options.",
  cta: { label: "Explore Counselling Support", href: "/areas-of-support" },
} as const;

export const counsellingFaqClosing = {
  heading: "You don't have to figure everything out alone.",
  text: "Taking the first step can simply mean having a conversation about what you're experiencing.",
  primaryCta: { label: "Book a Counselling Session", href: "/book-appointment" },
  secondaryCta: { label: "Contact Dr. Vandana", href: "/contact" },
} as const;

export const faqEmptyState = {
  heading: "We couldn't find that question.",
  text: "Try using different words, or explore the categories below. If your concern is not covered, you can contact Dr. Vandana to discuss whether counselling may be appropriate.",
} as const;

export const faqErrorState = {
  heading: "We're having trouble loading the questions right now.",
  text: "Please try again shortly.",
} as const;

export const faqContentGovernance = {
  reviewNote:
    "Mental-health educational content should be reviewed periodically by an appropriately qualified professional before publication.",
  lastBulkReviewAt: "2026-08-14",
  reviewedBy: "Editorial draft pending Dr. Vandana professional review",
} as const;

/** Synonyms expand search without inventing clinical claims. */
export const faqSearchSynonyms: Record<string, readonly string[]> = {
  nervous: ["anxiety", "stress", "first-session", "worried"],
  scared: ["anxiety", "first-session", "judged"],
  worried: ["anxiety", "stress", "first-session"],
  teen: ["teenager", "adolescent", "children-adolescents"],
  teenager: ["adolescent", "teen", "children-adolescents"],
  kid: ["child", "parenting", "children"],
  child: ["parenting", "children-adolescents"],
  marriage: ["couples", "relationships", "family"],
  confidential: ["privacy", "confidentiality", "private"],
  private: ["confidentiality", "privacy"],
  burnout: ["workplace", "stress", "exhaustion"],
  sad: ["grief", "emotional", "low mood"],
  crying: ["emotional", "session", "feelings"],
  online: ["online-counselling", "virtual", "video"],
  zoom: ["online", "online-counselling"],
  medicine: ["psychiatric", "medical", "medication"],
  medication: ["psychiatric", "medical"],
  emergency: ["suicide", "crisis", "self-harm", "112"],
  suicide: ["emergency", "crisis", "self-harm"],
};

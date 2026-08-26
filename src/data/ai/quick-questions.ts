import type { QuickQuestionCard } from "@/types/ai";

export const quickQuestionCards: readonly QuickQuestionCard[] = [
  {
    id: "anxiety",
    title: "Understanding Anxiety",
    question: "How are anxiety concerns explored in counselling?",
    description: "Learn how worry and tension may be understood.",
    icon: "anxiety",
  },
  {
    id: "stress",
    title: "Stress Management",
    question: "What are healthy ways to understand and manage stress?",
    description: "Educational ideas for everyday strain.",
    icon: "stress",
  },
  {
    id: "relationships",
    title: "Relationship Counselling",
    question: "How does relationship counselling work?",
    description: "Communication, conflict and feeling heard.",
    icon: "relationships",
  },
  {
    id: "parenting",
    title: "Parenting & Children",
    question: "How can parents support a child's emotional well-being?",
    description: "Guidance for caregivers, not a child diagnosis.",
    icon: "parenting",
  },
  {
    id: "adolescents",
    title: "Adolescents",
    question: "How can families support a teenager's mental health?",
    description: "Academic pressure, mood and growing independence.",
    icon: "adolescents",
  },
  {
    id: "burnout",
    title: "Workplace Burnout",
    question: "How might a psychologist approach workplace burnout?",
    description: "Exhaustion, recovery and work strain.",
    icon: "burnout",
  },
  {
    id: "mindfulness",
    title: "Mindfulness",
    question: "What is mindfulness, and how might it support well-being?",
    description: "Present-moment practices with clear limits.",
    icon: "mindfulness",
  },
  {
    id: "esteem",
    title: "Self-Esteem",
    question: "How can counselling support self-esteem and confidence?",
    description: "Self-criticism, worth and gradual change.",
    icon: "esteem",
  },
  {
    id: "cases",
    title: "Case Studies",
    question:
      "Can you explain an educational case study of workplace burnout?",
    description: "Fictional teaching scenarios, not real patients.",
    icon: "cases",
  },
  {
    id: "counselling",
    title: "How Counselling Works",
    question: "How does counselling work, and what happens in the first session?",
    description: "A calm introduction to the process.",
    icon: "counselling",
  },
] as const;

export const suggestedStarterQuestions = [
  "How does counselling work?",
  "How are anxiety concerns explored?",
  "What happens in the first counselling session?",
  "How might a psychologist approach burnout?",
] as const;

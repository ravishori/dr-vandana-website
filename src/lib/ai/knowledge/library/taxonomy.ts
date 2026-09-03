/**
 * Internal psychology domain taxonomy for knowledge organization and retrieval.
 * This is NOT a public University of Mumbai curriculum.
 */

export type PsychologyDomainId =
  | "FOUNDATIONAL_PSYCHOLOGY"
  | "MENTAL_HEALTH_WELLBEING"
  | "CHILD_ADOLESCENT_PSYCHOLOGY"
  | "COUNSELLING_PSYCHOTHERAPY_EDUCATION";

export type PsychologyTopic = {
  id: string;
  label: string;
  /** Optional internal curriculum cross-reference for coverage planning only. */
  curriculum_reference?: string;
};

export type PsychologyDomain = {
  id: PsychologyDomainId;
  label: string;
  topics: readonly PsychologyTopic[];
};

export const PSYCHOLOGY_DOMAIN_TAXONOMY: readonly PsychologyDomain[] = [
  {
    id: "FOUNDATIONAL_PSYCHOLOGY",
    label: "Foundational Psychology",
    topics: [
      { id: "personality", label: "Personality", curriculum_reference: "PERSONALITY PSYCHOLOGY" },
      { id: "cognition", label: "Cognition" },
      { id: "emotion", label: "Emotion" },
      { id: "learning", label: "Learning" },
      { id: "memory", label: "Memory" },
      { id: "motivation", label: "Motivation" },
      { id: "intelligence", label: "Intelligence" },
      { id: "perception", label: "Perception" },
      { id: "attention", label: "Attention" },
      { id: "human-development", label: "Human development" },
      { id: "social-behaviour", label: "Social behaviour" },
      { id: "psychology-fundamentals", label: "Psychology fundamentals" },
    ],
  },
  {
    id: "MENTAL_HEALTH_WELLBEING",
    label: "Mental Health & Well-being",
    topics: [
      { id: "stress", label: "Stress" },
      { id: "anxiety", label: "Anxiety" },
      { id: "depression-awareness", label: "Depression awareness" },
      { id: "emotional-regulation", label: "Emotional regulation" },
      { id: "self-esteem", label: "Self-esteem" },
      { id: "confidence", label: "Confidence" },
      { id: "resilience", label: "Resilience" },
      { id: "burnout", label: "Burnout" },
      { id: "grief", label: "Grief" },
      { id: "mindfulness", label: "Mindfulness" },
      { id: "positive-psychology", label: "Positive psychology" },
      { id: "life-skills", label: "Life skills" },
      { id: "mental-wellbeing", label: "Mental health and well-being" },
      { id: "anger", label: "Anger" },
      { id: "relationships", label: "Relationships" },
      { id: "romantic-love", label: "Romantic love" },
      { id: "womens-mental-health", label: "Women's mental health" },
    ],
  },
  {
    id: "CHILD_ADOLESCENT_PSYCHOLOGY",
    label: "Child & Adolescent Psychology",
    topics: [
      { id: "child-development", label: "Child development" },
      { id: "adolescent-development", label: "Adolescent development" },
      { id: "parenting", label: "Parenting" },
      { id: "child-behaviour", label: "Behaviour" },
      { id: "emotional-development", label: "Emotional development" },
      { id: "school-mental-health", label: "School mental health" },
      { id: "peer-relationships", label: "Peer relationships" },
      { id: "parenting-and-children", label: "Parenting and children" },
      { id: "adolescent-mental-health", label: "Adolescent mental health" },
    ],
  },
  {
    id: "COUNSELLING_PSYCHOTHERAPY_EDUCATION",
    label: "Counselling & Psychotherapy Education",
    topics: [
      { id: "counselling-concepts", label: "Counselling concepts" },
      { id: "how-counselling-works", label: "How counselling works" },
      { id: "first-session", label: "First session" },
      { id: "therapeutic-relationship", label: "Therapeutic relationship" },
      { id: "cbt-concepts", label: "CBT concepts" },
      { id: "rebt-concepts", label: "REBT concepts" },
      { id: "behavioural-approaches", label: "Behavioural approaches" },
      { id: "cognitive-approaches", label: "Cognitive approaches" },
      { id: "humanistic-approaches", label: "Humanistic approaches" },
      { id: "psychotherapy-concepts", label: "Other psychotherapy concepts" },
      { id: "case-approach-framework", label: "Case approach framework" },
    ],
  },
] as const;

export function findDomainForTopic(topicId: string): PsychologyDomain | undefined {
  return PSYCHOLOGY_DOMAIN_TAXONOMY.find((domain) =>
    domain.topics.some((topic) => topic.id === topicId),
  );
}

export function listAllTaxonomyTopics(): readonly PsychologyTopic[] {
  return PSYCHOLOGY_DOMAIN_TAXONOMY.flatMap((domain) => domain.topics);
}

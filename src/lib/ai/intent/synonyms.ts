/** Controlled topic synonym dictionary for retrieval and relevance. */
export const TOPIC_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  "cbt-concepts": [
    "cbt",
    "cognitive behavioural therapy",
    "cognitive behavioral therapy",
  ],
  visualization: ["visualisation", "mental imagery", "guided imagery", "imagery"],
  "self-esteem": ["self esteem", "self worth", "self-worth", "self confidence"],
  confidence: ["self confidence", "self-confidence"],
  mindfulness: ["meditation", "present moment awareness"],
  meditation: ["mindfulness", "breath awareness"],
  anxiety: ["worry", "nervousness", "unease", "anxious"],
  resilience: ["coping", "bounce back", "adaptation", "protective factors"],
  "emotional-regulation": [
    "emotion regulation",
    "manage emotions",
    "difficult emotions",
    "emotional awareness",
  ],
  stress: ["pressure", "overwhelm", "tension"],
  anger: ["anger management", "irritability"],
  grief: ["loss", "bereavement", "mourning"],
  burnout: ["workplace burnout", "emotional exhaustion"],
  counselling: ["counseling", "psychological support"],
  "first-session": ["first session", "first counselling session", "initial session"],
  relationships: ["relationship counselling", "marriage", "communication"],
  parenting: ["child psychology", "parenting support"],
  adolescents: ["teen", "teenager", "adolescent mental health"],
};

export function normalizeTopicKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function expandTopicTerms(topic: string): string[] {
  const key = normalizeTopicKey(topic);
  const terms = new Set<string>([key, topic.toLowerCase()]);
  for (const [canonical, aliases] of Object.entries(TOPIC_SYNONYMS)) {
    const all = [canonical, ...aliases].map((item) => item.toLowerCase());
    if (all.some((item) => item.includes(key) || key.includes(item))) {
      for (const alias of all) {
        terms.add(alias);
      }
      terms.add(canonical);
    }
  }
  return [...terms];
}

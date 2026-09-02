/**
 * Internal maintainer review notes for Phase 3 evidence pilot sources.
 * Not exposed through Ask Dr. Vandana AI responses.
 */

export type EvidencePilotReviewNote = {
  source_id: string;
  selection_reason: string;
  topics_supported: readonly string[];
  trustworthiness: string;
  limitations: string;
  evidence_classification: string;
  copyright_licensing: string;
};

export const EVIDENCE_PILOT_REVIEW_NOTES: readonly EvidencePilotReviewNote[] = [
  {
    source_id: "evidence-who-stress-qanda",
    selection_reason:
      "Official WHO public Q&A on stress with practical coping guidance suitable for educational responses.",
    topics_supported: ["stress", "stress-management", "coping", "mental-wellbeing"],
    trustworthiness:
      "World Health Organization official news-room content; URL verified March 2026.",
    limitations:
      "Paraphrased summary only; not a substitute for individualized assessment or emergency care.",
    evidence_classification: "TIER_1 authoritative public-health guidance (guideline-level educational reference).",
    copyright_licensing:
      "WHO website content used as paraphrased educational summary with attribution; full page text not reproduced.",
  },
  {
    source_id: "evidence-who-depression-awareness",
    selection_reason:
      "WHO depression fact sheet supports depression awareness and when-to-seek-help education without diagnosis.",
    topics_supported: ["depression-awareness", "mental-wellbeing", "when-to-seek-help"],
    trustworthiness:
      "World Health Organization official fact sheet; URL verified March 2026.",
    limitations:
      "Awareness/education only; does not diagnose or prescribe; symptoms described illustratively.",
    evidence_classification: "TIER_1 authoritative public-health guidance.",
    copyright_licensing:
      "WHO website content used as paraphrased educational summary with attribution; full fact sheet not reproduced.",
  },
  {
    source_id: "evidence-who-mental-health-wellbeing",
    selection_reason:
      "WHO mental health overview supports general well-being, promotion/prevention, and care-seeking context.",
    topics_supported: ["mental-wellbeing", "life-skills", "when-to-seek-help"],
    trustworthiness:
      "World Health Organization official fact sheet; URL verified March 2026.",
    limitations:
      "Population-level guidance; not individualized treatment advice.",
    evidence_classification: "TIER_1 authoritative public-health guidance.",
    copyright_licensing:
      "WHO website content used as paraphrased educational summary with attribution.",
  },
  {
    source_id: "evidence-nimh-cbt-education",
    selection_reason:
      "U.S. NIMH public educational page explaining psychotherapy and CBT concepts for general clinical education.",
    topics_supported: ["cbt-concepts", "psychotherapy-concepts", "clinical-education"],
    trustworthiness:
      "U.S. National Institute of Mental Health (NIH) official health topic page; URL verified March 2026.",
    limitations:
      "Describes CBT as an evidence-based psychotherapy approach; does not describe Dr. Vandana's personal practice.",
    evidence_classification: "TIER_1 government public-health education.",
    copyright_licensing:
      "NIMH states most site content is public domain; paraphrased summary with attribution; images not copied.",
  },
] as const;

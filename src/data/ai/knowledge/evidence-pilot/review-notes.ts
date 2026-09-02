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
    evidence_classification: "TIER_1 authoritative public-health education (fact sheet/Q&A — not clinical guideline).",
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
    evidence_classification: "TIER_1 authoritative public-health education.",
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
    evidence_classification: "TIER_1 authoritative public-health education.",
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

export const EVIDENCE_PHASE4_REVIEW_NOTES: readonly EvidencePilotReviewNote[] = [
  {
    source_id: "evidence-nimh-anxiety-disorders",
    selection_reason:
      "Official NIMH anxiety disorders overview distinguishing normal anxiety from disorders; supports educational responses without diagnosis.",
    topics_supported: ["anxiety", "anxiety-awareness", "when-to-seek-help"],
    trustworthiness:
      "U.S. NIMH official health topic; URL verified September 2026; page last reviewed December 2024.",
    limitations:
      "Population-level education; cannot assess whether any individual has an anxiety disorder.",
    evidence_classification:
      "TIER_1 government health education; source_type GOVERNMENT_HEALTH_EDUCATION; evidence_level public-health-education.",
    copyright_licensing:
      "NIMH public-domain content; paraphrased summary with attribution.",
  },
  {
    source_id: "evidence-medlineplus-anxiety",
    selection_reason:
      "NIH MedlinePlus anxiety topic provides accessible definitions, types, symptoms, and treatment overview from National Library of Medicine.",
    topics_supported: ["anxiety", "anxiety-awareness", "self-help", "when-to-seek-help"],
    trustworthiness:
      "NIH MedlinePlus official health topic; URL verified September 2026.",
    limitations:
      "Educational summary; diagnosis requires professional assessment.",
    evidence_classification:
      "TIER_1 government health education; distinct from TIER_2 research.",
    copyright_licensing:
      "U.S. government MedlinePlus content; paraphrased summary.",
  },
  {
    source_id: "evidence-cdc-emotional-wellbeing-self-esteem",
    selection_reason:
      "CDC emotional well-being page links positive well-being to self-esteem and describes skills supporting healthy functioning.",
    topics_supported: ["self-esteem", "confidence", "mental-wellbeing"],
    trustworthiness:
      "U.S. CDC official emotional well-being page; URL verified September 2026; dated May 2024.",
    limitations:
      "Does not define self-esteem as a clinical construct; benefits described associatively.",
    evidence_classification: "TIER_1 government health education.",
    copyright_licensing: "CDC public-domain content; paraphrased summary.",
  },
  {
    source_id: "evidence-nimh-caring-mental-health-self-esteem",
    selection_reason:
      "NIMH self-care guidance includes challenging unhelpful thoughts and practical well-being habits relevant to self-esteem improvement questions.",
    topics_supported: ["self-esteem", "self-help", "mental-wellbeing"],
    trustworthiness:
      "U.S. NIMH official page; URL verified September 2026; last reviewed April 2026.",
    limitations:
      "Self-care tips are general; not a structured self-esteem intervention protocol.",
    evidence_classification: "TIER_1 government health education.",
    copyright_licensing: "NIMH public-domain content; paraphrased summary.",
  },
  {
    source_id: "evidence-cdc-mental-health-resilience",
    selection_reason:
      "CDC mental health overview describes protective factors, coping, and resilience concepts at population level.",
    topics_supported: ["resilience", "coping", "mental-wellbeing", "life-skills"],
    trustworthiness:
      "U.S. CDC official mental health page; URL verified September 2026; updated August 2026.",
    limitations:
      "Resilience framed as adaptability, not invulnerability.",
    evidence_classification: "TIER_1 government health education.",
    copyright_licensing: "CDC public-domain content; paraphrased summary.",
  },
  {
    source_id: "evidence-nimh-coping-traumatic-events",
    selection_reason:
      "NIMH coping page describes healthy adaptation strategies after difficult events — relevant to resilience/coping education.",
    topics_supported: ["resilience", "coping", "stress-management", "when-to-seek-help"],
    trustworthiness:
      "U.S. NIMH official page; URL verified September 2026; last reviewed May 2024.",
    limitations:
      "Trauma-focused; general coping principles extracted for broader resilience education.",
    evidence_classification: "TIER_1 government health education.",
    copyright_licensing: "NIMH public-domain content; paraphrased summary.",
  },
  {
    source_id: "evidence-cdc-emotional-wellbeing-regulation",
    selection_reason:
      "CDC emotional well-being page describes emotion identification, processing, and healthy expression — core regulation concepts.",
    topics_supported: ["emotional-regulation", "emotional-intelligence", "mental-wellbeing"],
    trustworthiness:
      "Same CDC source as self-esteem document; focused paraphrase on regulation skills only.",
    limitations:
      "Regulation does not mean emotion suppression; same source URL as related self-esteem document.",
    evidence_classification: "TIER_1 government health education.",
    copyright_licensing: "CDC public-domain content; paraphrased summary.",
  },
  {
    source_id: "evidence-nccih-mindfulness-meditation",
    selection_reason:
      "NCCIH provides NIH-reviewed overview of mindfulness/meditation evidence, popularity, benefits, and safety limitations.",
    topics_supported: ["mindfulness", "meditation", "stress-management"],
    trustworthiness:
      "NIH NCCIH official health topic; URL verified September 2026.",
    limitations:
      "Research mixed quality; mindfulness not a cure; does not imply Dr. Vandana practice.",
    evidence_classification:
      "TIER_1 government health education summarizing TIER_2 research findings.",
    copyright_licensing: "NCCIH public-domain content; paraphrased summary.",
  },
] as const;

export const ALL_EVIDENCE_REVIEW_NOTES = [
  ...EVIDENCE_PILOT_REVIEW_NOTES,
  ...EVIDENCE_PHASE4_REVIEW_NOTES,
] as const;

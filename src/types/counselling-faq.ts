export const FAQ_CATEGORIES = [
  "about-counselling",
  "first-session",
  "counselling-approach",
  "stress-anxiety",
  "emotional-well-being",
  "relationships-family",
  "children-adolescents",
  "parenting",
  "workplace-burnout",
  "self-esteem",
  "grief-life-changes",
  "sessions-appointments",
  "privacy-confidentiality",
  "online-counselling",
  "when-to-seek-help",
  "emergency-crisis",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_AUDIENCES = [
  "children",
  "adolescents",
  "parents",
  "adults",
  "couples",
  "families",
  "working_professionals",
  "senior_citizens",
] as const;

export type FaqAudience = (typeof FAQ_AUDIENCES)[number];

export type CounsellingFaq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string[];
  relatedFaqIds: string[];
  audience: FaqAudience[];
  priority: number;
  published: boolean;
  emergencyRelated: boolean;
  lastReviewedAt: string;
  reviewedBy: string;
  sourceReference: string | null;
  relatedPageHrefs: string[];
};

export type CounsellingJourneyStep = {
  id: string;
  title: string;
  description: string;
};

/**
 * Mental-health educational content should be reviewed periodically by an
 * appropriately qualified professional before publication.
 */
export type FaqContentGovernance = {
  reviewNote: string;
  lastBulkReviewAt: string;
  reviewedBy: string;
};
